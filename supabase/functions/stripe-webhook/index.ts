import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const getEnv = (name: string) => Deno.env.get(name) || "";

const toHex = (buffer: ArrayBuffer) =>
  [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");

const timingSafeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

async function verifyStripeSignature(payload: string, signatureHeader: string, secret: string) {
  const parts = signatureHeader.split(",").reduce<Record<string, string[]>>((acc, part) => {
    const [key, value] = part.split("=");
    if (!key || !value) return acc;
    acc[key] = [...(acc[key] || []), value];
    return acc;
  }, {});

  const timestamp = parts.t?.[0];
  const signatures = parts.v1 || [];
  if (!timestamp || signatures.length === 0) return false;

  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > 300) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signedPayload = `${timestamp}.${payload}`;
  const expected = toHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload)));
  return signatures.some((signature) => timingSafeEqual(signature, expected));
}

const toDate = (seconds?: number | null) =>
  seconds ? new Date(seconds * 1000).toISOString() : null;

const normalizePlan = (plan?: string | null) =>
  plan === "pro" || plan === "carte" ? plan : "free";

const stripeId = (value: unknown) =>
  typeof value === "string" ? value : typeof value === "object" && value && "id" in value ? String((value as { id: string }).id) : "";

const parsePluginIds = (value?: string | null) =>
  value
    ? [...new Set(value.split(",").map((id) => id.trim()).filter(Boolean))]
    : [];

const buildEntitlementUpdates = (plan: string, pluginIds: string[]) => ({
  paid_plugin_ids: plan === "carte" ? pluginIds : [],
  active_plugins: plan === "carte" ? pluginIds : pluginIds,
  visible_plugin_ids: pluginIds,
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const webhookSecret = getEnv("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) throw new Error("Webhook Stripe non configuré.");

    const signature = req.headers.get("stripe-signature") || "";
    const payload = await req.text();
    const verified = await verifyStripeSignature(payload, signature, webhookSecret);
    if (!verified) return json({ error: "Signature invalide" }, 400);

    const event = JSON.parse(payload);
    const supabaseAdmin = createClient(
      getEnv("SUPABASE_URL"),
      getEnv("SUPABASE_SERVICE_ROLE_KEY")
    );

    const updateByCustomer = async (customerId: string, updates: Record<string, unknown>) => {
      if (!customerId) return;
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ ...updates, plan_updated_at: new Date().toISOString() })
        .eq("stripe_customer_id", customerId);
      if (error) throw error;
    };

    const updateByUser = async (userId: string, updates: Record<string, unknown>) => {
      if (!userId) return;
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ ...updates, plan_updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      if (error) throw error;
    };

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = String(session.metadata?.user_id || "");
        if (!userId) throw new Error("Session Stripe sans user_id.");
        const plan = normalizePlan(session.metadata?.plan_id);
        const pluginIds = parsePluginIds(session.metadata?.plugin_ids);
        await updateByUser(userId, {
          plan,
          stripe_customer_id: stripeId(session.customer),
          stripe_subscription_id: stripeId(session.subscription),
          subscription_status: "active",
          subscription_cancel_at_period_end: false,
          ...buildEntitlementUpdates(plan, pluginIds),
        });
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const plan = normalizePlan(subscription.metadata?.plan_id);
        const pluginIds = parsePluginIds(subscription.metadata?.plugin_ids);
        const status = subscription.status;
        const isActive = status === "active" || status === "trialing";
        const isEnded = status === "canceled" || status === "unpaid" || status === "incomplete_expired";
        const updates = {
          plan: isEnded ? "free" : isActive ? plan : plan,
          stripe_subscription_id: isEnded ? null : subscription.id,
          subscription_status: status,
          subscription_current_period_end: toDate(subscription.current_period_end),
          subscription_cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
          ...(isEnded ? { paid_plugin_ids: [] } : buildEntitlementUpdates(plan, pluginIds)),
        };

        if (subscription.metadata?.user_id) await updateByUser(subscription.metadata.user_id, updates);
        else await updateByCustomer(stripeId(subscription.customer), updates);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const updates = {
          plan: "free",
          stripe_subscription_id: null,
          subscription_status: "canceled",
          subscription_current_period_end: toDate(subscription.current_period_end),
          subscription_cancel_at_period_end: false,
          paid_plugin_ids: [],
        };

        if (subscription.metadata?.user_id) await updateByUser(subscription.metadata.user_id, updates);
        else await updateByCustomer(stripeId(subscription.customer), updates);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        await updateByCustomer(stripeId(invoice.customer), { subscription_status: "past_due" });
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object;
        await updateByCustomer(stripeId(invoice.customer), { subscription_status: "active" });
        break;
      }

      default:
        break;
    }

    return json({ received: true });
  } catch (e) {
    console.error("stripe-webhook error:", e);
    return json({ error: e instanceof Error ? e.message : "Erreur interne" }, 400);
  }
});
