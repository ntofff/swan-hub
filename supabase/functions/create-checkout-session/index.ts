import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const getEnv = (name: string) => Deno.env.get(name) || "";

const stripeRequest = async (path: string, params: Record<string, string | number | boolean>) => {
  const secretKey = getEnv("STRIPE_SECRET_KEY");
  if (!secretKey) throw new Error("Stripe n'est pas encore configuré.");

  const body = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => body.append(key, String(value)));

  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Erreur Stripe");
  return data;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { planId, pluginCount } = await req.json();
    if (planId !== "carte" && planId !== "pro") {
      return json({ error: "Plan invalide" });
    }

    const supabaseAdmin = createClient(
      getEnv("SUPABASE_URL"),
      getEnv("SUPABASE_SERVICE_ROLE_KEY")
    );

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return json({ error: "Non authentifié" });

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("user_id, email, full_name, stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profileError) throw profileError;

    const appUrl = getEnv("APP_URL") || req.headers.get("origin") || "http://localhost:5173";
    const proPrice = getEnv("STRIPE_PRICE_PRO_MONTHLY") || getEnv("STRIPE_PRICE_PRO");
    const pluginPrice = getEnv("STRIPE_PRICE_PLUGIN_MONTHLY") || getEnv("STRIPE_PRICE_CARTE_MONTHLY") || getEnv("STRIPE_PRICE_CARTE");
    const priceId = planId === "pro" ? proPrice : pluginPrice;
    if (!priceId) throw new Error("Prix Stripe manquant pour ce plan.");

    const paidPluginCount = Math.max(1, Number(pluginCount || 0) - 3);
    const quantity = planId === "carte" ? paidPluginCount : 1;

    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripeRequest("customers", {
        email: user.email || profile?.email || "",
        name: profile?.full_name || "",
        "metadata[user_id]": user.id,
      });
      customerId = customer.id;

      await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("user_id", user.id);
    }

    const session = await stripeRequest("checkout/sessions", {
      mode: "subscription",
      customer: customerId,
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": quantity,
      success_url: `${appUrl}/pricing?checkout=success`,
      cancel_url: `${appUrl}/pricing?checkout=cancel`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      "customer_update[address]": "auto",
      "metadata[user_id]": user.id,
      "metadata[plan_id]": planId,
      "metadata[plugin_count]": String(pluginCount || ""),
      "subscription_data[metadata][user_id]": user.id,
      "subscription_data[metadata][plan_id]": planId,
      "subscription_data[metadata][plugin_count]": String(pluginCount || ""),
    });

    return json({ url: session.url });
  } catch (e) {
    console.error("create-checkout-session error:", e);
    return json({ error: e instanceof Error ? e.message : "Erreur interne" });
  }
});
