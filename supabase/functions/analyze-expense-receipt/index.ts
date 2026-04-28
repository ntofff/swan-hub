import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const asNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", ".").replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    const model = Deno.env.get("OPENAI_RECEIPT_MODEL") || "gpt-4o-mini";
    if (!supabaseUrl || !anonKey || !serviceKey) return json({ error: "Supabase env missing" }, 500);

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: "Non authentifié" }, 401);

    const { receipt_id } = await req.json();
    if (!receipt_id || typeof receipt_id !== "string") return json({ error: "receipt_id requis" }, 400);

    const { data: receipt, error: receiptError } = await adminClient
      .from("expense_receipts")
      .select("*")
      .eq("id", receipt_id)
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (receiptError || !receipt) return json({ error: receiptError?.message || "Note de frais introuvable" }, 404);
    if (!receipt.document_path) return json({ error: "Aucun document à analyser" }, 400);

    if (!openAiKey) {
      await adminClient
        .from("expense_receipts")
        .update({
          analysis_status: "a_connecter",
          analysis_payload: { error: "OPENAI_API_KEY manquante" },
        })
        .eq("id", receipt_id);
      return json({ error: "Analyse IA non configurée côté serveur" }, 500);
    }

    if (!String(receipt.document_mime_type || "").startsWith("image/")) {
      await adminClient
        .from("expense_receipts")
        .update({
          analysis_status: "a_verifier",
          analysis_payload: { warning: "Analyse automatique réservée aux images pour le moment." },
        })
        .eq("id", receipt_id);
      return json({ error: "L'analyse automatique accepte une photo/image. Le PDF reste stocké et annotable." }, 400);
    }

    const { data: signed, error: signedError } = await adminClient.storage
      .from("business-documents")
      .createSignedUrl(receipt.document_path, 600);
    if (signedError || !signed?.signedUrl) return json({ error: signedError?.message || "URL signée impossible" }, 500);

    await adminClient.from("expense_receipts").update({ analysis_status: "analyse_en_cours" }).eq("id", receipt_id);

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text:
                  "Analyse cette facture ou ce ticket en français. Retourne uniquement un JSON valide avec vendor, expense_date au format YYYY-MM-DD si visible, category, amount_ht, amount_ttc, vat_amount, currency, confidence entre 0 et 1, notes. Mets null si absent.",
              },
              { type: "input_image", image_url: signed.signedUrl, detail: "high" },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      await adminClient
        .from("expense_receipts")
        .update({ analysis_status: "erreur", analysis_payload: { status: response.status, body: text.slice(0, 500) } })
        .eq("id", receipt_id);
      return json({ error: "Erreur analyse IA" }, response.status);
    }

    const data = await response.json();
    const raw = data.output_text || data.output?.[0]?.content?.[0]?.text || "{}";
    const match = String(raw).match(/\{[\s\S]*\}/);
    const extracted = JSON.parse(match?.[0] || "{}");

    const amountHt = asNumber(extracted.amount_ht);
    const amountTtc = asNumber(extracted.amount_ttc);
    const vatAmount = asNumber(extracted.vat_amount) ?? (
      amountHt !== null && amountTtc !== null ? Number((amountTtc - amountHt).toFixed(2)) : null
    );

    const patch = {
      vendor: typeof extracted.vendor === "string" ? extracted.vendor : receipt.vendor,
      expense_date: typeof extracted.expense_date === "string" ? extracted.expense_date : receipt.expense_date,
      category: typeof extracted.category === "string" ? extracted.category : receipt.category,
      currency: typeof extracted.currency === "string" ? extracted.currency : receipt.currency,
      amount_ht: amountHt ?? receipt.amount_ht,
      amount_ttc: amountTtc ?? receipt.amount_ttc,
      vat_amount: vatAmount ?? receipt.vat_amount,
      annotation: extracted.notes ? `${receipt.annotation || ""}${receipt.annotation ? "\n" : ""}IA: ${extracted.notes}` : receipt.annotation,
      analysis_status: "analyse_ok",
      analysis_payload: extracted,
      status: "A verifier",
    };

    const { error: updateError } = await adminClient.from("expense_receipts").update(patch).eq("id", receipt_id);
    if (updateError) return json({ error: updateError.message }, 500);

    return json({ ok: true, extracted });
  } catch (error) {
    console.error("analyze-expense-receipt error:", error);
    return json({ error: error instanceof Error ? error.message : "Erreur inconnue" }, 500);
  }
});
