import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const getEnv = (name: string) => Deno.env.get(name) || "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const secretKey = getEnv("STRIPE_SECRET_KEY");
    if (!secretKey) throw new Error("Stripe n'est pas encore configuré.");

    const supabaseAdmin = createClient(
      getEnv("SUPABASE_URL"),
      getEnv("SUPABASE_SERVICE_ROLE_KEY")
    );

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return json({ error: "Non authentifié" }, 401);

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile?.stripe_customer_id) throw new Error("Aucun abonnement Stripe trouvé.");

    const appUrl = getEnv("APP_URL") || req.headers.get("origin") || "http://localhost:5173";
    const body = new URLSearchParams({
      customer: profile.stripe_customer_id,
      return_url: `${appUrl}/pricing`,
    });

    const res = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || "Erreur Stripe");

    return json({ url: data.url });
  } catch (e) {
    console.error("create-portal-session error:", e);
    return json({ error: e instanceof Error ? e.message : "Erreur interne" }, 400);
  }
});
