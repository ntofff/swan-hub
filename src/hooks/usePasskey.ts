import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

const b64urlToBuffer = (s: string): ArrayBuffer => {
  const b = s.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b + "=".repeat((4 - (b.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
};

const bufferToB64url = (buf: ArrayBuffer): string => {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

function getDeviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Mac/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows";
  return "Navigateur";
}

export const usePasskey = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [passkeys, setPasskeys] = useState<any[]>([]);

  const isAvailable =
    typeof window !== "undefined" &&
    !!window.PublicKeyCredential &&
    typeof window.PublicKeyCredential === "function";

  const fetchPasskeys = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_passkeys")
      .select("id, device_name, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setPasskeys(data || []);
  }, [user]);

  useEffect(() => {
    fetchPasskeys();
  }, [fetchPasskeys]);

  const register = useCallback(
    async (deviceName?: string) => {
      if (!user) { toast.error("Connectez-vous d'abord"); return false; }
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("passkey-auth", {
          body: { action: "register-options" },
        });
        if (error || data?.error) throw new Error(data?.error || "Erreur serveur");

        const opts = data.options;
        const publicKeyOpts: PublicKeyCredentialCreationOptions = {
          challenge: b64urlToBuffer(opts.challenge),
          rp: opts.rp,
          user: {
            id: b64urlToBuffer(opts.user.id),
            name: opts.user.name,
            displayName: opts.user.displayName,
          },
          pubKeyCredParams: opts.pubKeyCredParams,
          authenticatorSelection: opts.authenticatorSelection,
          attestation: opts.attestation || "none",
          timeout: opts.timeout || 60000,
          excludeCredentials: (opts.excludeCredentials || []).map((c: any) => ({
            id: b64urlToBuffer(c.id),
            type: c.type,
          })),
        };

        const cred = (await navigator.credentials.create({ publicKey: publicKeyOpts })) as PublicKeyCredential;
        if (!cred) throw new Error("Aucune clé créée");

        const attestation = cred.response as AuthenticatorAttestationResponse;
        const credJSON = {
          id: cred.id,
          rawId: bufferToB64url(cred.rawId),
          type: cred.type,
          response: {
            clientDataJSON: bufferToB64url(attestation.clientDataJSON),
            attestationObject: bufferToB64url(attestation.attestationObject),
            transports: attestation.getTransports?.() || [],
          },
          clientExtensionResults: cred.getClientExtensionResults(),
        };

        const { data: vd, error: ve } = await supabase.functions.invoke("passkey-auth", {
          body: {
            action: "register-verify",
            credential: credJSON,
            challengeToken: data.challengeToken,
            deviceName: deviceName || getDeviceName(),
          },
        });
        if (ve || vd?.error) throw new Error(vd?.error || "Erreur de vérification");

        toast.success("Passkey enregistrée ! 🎉");
        await fetchPasskeys();
        return true;
      } catch (e: any) {
        if (e.name === "NotAllowedError") return false;
        toast.error(e.message || "Erreur d'enregistrement");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user, fetchPasskeys]
  );

  const login = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/passkey-auth`;
      const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const optResp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: apiKey },
        body: JSON.stringify({ action: "login-options" }),
      });
      const optData = await optResp.json();
      if (optData.error) throw new Error(optData.error);

      const opts = optData.options;
      const publicKeyOpts: PublicKeyCredentialRequestOptions = {
        challenge: b64urlToBuffer(opts.challenge),
        rpId: opts.rpId,
        userVerification: opts.userVerification || "preferred",
        timeout: opts.timeout || 60000,
        allowCredentials: (opts.allowCredentials || []).map((c: any) => ({
          id: b64urlToBuffer(c.id),
          type: c.type,
        })),
      };

      const cred = (await navigator.credentials.get({ publicKey: publicKeyOpts })) as PublicKeyCredential;
      if (!cred) throw new Error("Aucune clé trouvée");

      const assertion = cred.response as AuthenticatorAssertionResponse;
      const credJSON = {
        id: cred.id,
        rawId: bufferToB64url(cred.rawId),
        type: cred.type,
        response: {
          clientDataJSON: bufferToB64url(assertion.clientDataJSON),
          authenticatorData: bufferToB64url(assertion.authenticatorData),
          signature: bufferToB64url(assertion.signature),
          userHandle: assertion.userHandle ? bufferToB64url(assertion.userHandle) : null,
        },
        clientExtensionResults: cred.getClientExtensionResults(),
      };

      const verifyResp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: apiKey },
        body: JSON.stringify({
          action: "login-verify",
          credential: credJSON,
          challengeToken: optData.challengeToken,
        }),
      });
      const verifyData = await verifyResp.json();
      if (verifyData.error) throw new Error(verifyData.error);

      const { error: otpErr } = await supabase.auth.verifyOtp({
        token_hash: verifyData.token_hash,
        type: "magiclink",
      });
      if (otpErr) throw otpErr;

      return true;
    } catch (e: any) {
      if (e.name === "NotAllowedError") return false;
      toast.error(e.message || "Erreur de connexion biométrique");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const removePasskey = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("user_passkeys").delete().eq("id", id);
      if (error) { toast.error("Erreur de suppression"); return; }
      toast.success("Passkey supprimée");
      await fetchPasskeys();
    },
    [fetchPasskeys]
  );

  return { isAvailable, register, login, removePasskey, loading, passkeys };
};