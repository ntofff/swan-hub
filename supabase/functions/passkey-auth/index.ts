import { createClient } from "npm:@supabase/supabase-js@2";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "npm:@simplewebauthn/server@10.0.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function b64urlDecode(s: string): Uint8Array {
  const b = s.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b + "=".repeat((4 - (b.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function b64urlEncode(buf: Uint8Array): string {
  let bin = "";
  for (const b of buf) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecodeStr(s: string): string {
  const bytes = b64urlDecode(s);
  return new TextDecoder().decode(bytes);
}

async function hmacKey() {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function signChallenge(challenge: string): Promise<string> {
  const key = await hmacKey();
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(challenge));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function verifyChallengeToken(challenge: string, token: string): Promise<boolean> {
  const key = await hmacKey();
  const sig = Uint8Array.from(atob(token), (c) => c.charCodeAt(0));
  return crypto.subtle.verify("HMAC", key, sig, new TextEncoder().encode(challenge));
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action } = body;
    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || "";
    let rpID: string;
    try { rpID = new URL(origin).hostname; } catch { throw new Error("Origin invalide"); }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const getUser = async () => {
      const authHeader = req.headers.get("authorization") || "";
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !user) throw new Error("Non authentifié");
      return user;
    };

    switch (action) {
      case "register-options": {
        const user = await getUser();
        const { data: existing } = await supabaseAdmin
          .from("user_passkeys").select("credential_id").eq("user_id", user.id);

        const options = await generateRegistrationOptions({
          rpName: "SWAN",
          rpID,
          userID: new TextEncoder().encode(user.id),
          userName: user.email || user.id,
          attestationType: "none",
          authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
          excludeCredentials: (existing || []).map((k: any) => ({
            id: b64urlDecode(k.credential_id),
            type: "public-key" as const,
          })),
        });

        const challengeToken = await signChallenge(options.challenge);
        return json({ options, challengeToken });
      }

      case "register-verify": {
        const user = await getUser();
        const { credential, challengeToken, deviceName } = body;
        const cdj = JSON.parse(b64urlDecodeStr(credential.response.clientDataJSON));
        if (!(await verifyChallengeToken(cdj.challenge, challengeToken))) throw new Error("Challenge invalide");

        const verification = await verifyRegistrationResponse({
          response: credential,
          expectedChallenge: cdj.challenge,
          expectedOrigin: origin,
          expectedRPID: rpID,
        });

        if (!verification.verified || !verification.registrationInfo) throw new Error("Vérification échouée");
        const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;

        const { error: insertErr } = await supabaseAdmin.from("user_passkeys").insert({
          user_id: user.id,
          credential_id: b64urlEncode(credentialID),
          public_key: b64urlEncode(credentialPublicKey),
          counter,
          device_name: deviceName || "Appareil",
          transports: credential.response?.transports || [],
        });
        if (insertErr) throw insertErr;
        return json({ success: true });
      }

      case "login-options": {
        const options = await generateAuthenticationOptions({
          rpID,
          userVerification: "preferred",
        });
        const challengeToken = await signChallenge(options.challenge);
        return json({ options, challengeToken });
      }

      case "login-verify": {
        const { credential, challengeToken } = body;
        const cdj = JSON.parse(b64urlDecodeStr(credential.response.clientDataJSON));
        if (!(await verifyChallengeToken(cdj.challenge, challengeToken))) throw new Error("Challenge invalide");

        const { data: passkey } = await supabaseAdmin
          .from("user_passkeys").select("*").eq("credential_id", credential.id).single();
        if (!passkey) throw new Error("Passkey non reconnue");

        const verification = await verifyAuthenticationResponse({
          response: credential,
          expectedChallenge: cdj.challenge,
          expectedOrigin: origin,
          expectedRPID: rpID,
          authenticator: {
            credentialID: b64urlDecode(passkey.credential_id),
            credentialPublicKey: b64urlDecode(passkey.public_key),
            counter: passkey.counter,
            transports: passkey.transports || [],
          },
        });
        if (!verification.verified) throw new Error("Authentification échouée");

        await supabaseAdmin.from("user_passkeys")
          .update({ counter: verification.authenticationInfo.newCounter }).eq("id", passkey.id);

        const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(passkey.user_id);
        if (!user?.email) throw new Error("Utilisateur introuvable");

        const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink", email: user.email,
        });
        if (linkErr) throw linkErr;

        return json({ success: true, token_hash: linkData.properties?.hashed_token });
      }

      default: return json({ error: "Action invalide" }, 400);
    }
  } catch (e: any) {
    console.error("passkey-auth error:", e);
    return json({ error: e.message || "Erreur interne" }, 400);
  }
});