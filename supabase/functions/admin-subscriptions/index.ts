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

const randomPassword = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!?#";
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join("");
};

const sanitizePlugins = (value: unknown) =>
  Array.isArray(value)
    ? [...new Set(value.map(String).filter(Boolean))]
    : [];

const addMonths = (months: number) => {
  const date = new Date();
  date.setMonth(date.getMonth() + Math.max(1, months || 1));
  return date.toISOString();
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"));
    const token = (req.headers.get("authorization") || "").replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return json({ error: "Non authentifié" });

    const { data: roles, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    if (roleError) throw roleError;
    if (!roles?.some((role: { role: string }) => role.role === "admin")) {
      return json({ error: "Accès admin requis" });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "list");

    if (action === "list") {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("user_id, full_name, email, plan, trial_ends_at, trial_plugin_ids, paid_plugin_ids, visible_plugin_ids, subscription_status, subscription_current_period_end, subscription_cancel_at_period_end, manual_access_until, manual_access_note, stripe_customer_id, stripe_subscription_id, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return json({ users: data || [] });
    }

    if (action === "grant") {
      const targetUserId = String(body.userId || "");
      const plan = body.plan === "pro" ? "pro" : body.plan === "carte" ? "carte" : "free";
      const pluginIds = sanitizePlugins(body.pluginIds);
      const months = Number(body.months || 1);
      const until = addMonths(months);

      if (!targetUserId) return json({ error: "Utilisateur manquant" });
      if (plan === "carte" && pluginIds.length === 0) return json({ error: "Sélectionnez au moins un plugin" });

      const updates = {
        plan,
        paid_plugin_ids: plan === "carte" ? pluginIds : [],
        visible_plugin_ids: plan === "pro" ? pluginIds : pluginIds,
        active_plugins: plan === "pro" ? pluginIds : pluginIds,
        subscription_status: "active",
        subscription_current_period_end: until,
        manual_access_until: until,
        manual_access_note: String(body.note || "Accès manuel admin"),
        plan_updated_at: new Date().toISOString(),
      };

      const { error } = await supabaseAdmin
        .from("profiles")
        .update(updates)
        .eq("user_id", targetUserId);
      if (error) throw error;

      await supabaseAdmin.from("admin_subscription_actions").insert({
        admin_user_id: user.id,
        target_user_id: targetUserId,
        action: "grant",
        details: { plan, pluginIds, months, until },
      });

      return json({ ok: true, until });
    }

    if (action === "reset-password") {
      const targetUserId = String(body.userId || "");
      const password = String(body.password || randomPassword());
      if (!targetUserId) return json({ error: "Utilisateur manquant" });
      if (password.length < 8) return json({ error: "Le mot de passe doit faire au moins 8 caractères" });

      const { error } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, { password });
      if (error) throw error;

      await supabaseAdmin.from("admin_subscription_actions").insert({
        admin_user_id: user.id,
        target_user_id: targetUserId,
        action: "reset-password",
        details: { generated: !body.password },
      });

      return json({ ok: true, temporaryPassword: password });
    }

    return json({ error: "Action inconnue" });
  } catch (e) {
    console.error("admin-subscriptions error:", e);
    return json({ error: e instanceof Error ? e.message : "Erreur interne" });
  }
});
