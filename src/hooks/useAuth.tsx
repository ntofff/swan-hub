// ============================================================
// SWAN · HUB — Hook d'authentification
// Gère : Auth Supabase · Profil · VIP · Plan · Anti-phishing
// ============================================================

import {
  createContext, useContext, useEffect, useState, useCallback,
  ReactNode,
} from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────
export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  plan: 'free' | 'carte' | 'pro';
  trial_ends_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  subscription_current_period_end: string | null;
  plan_updated_at: string | null;
  active_plugins: string[];
  trial_plugin_ids: string[];
  paid_plugin_ids: string[];
  visible_plugin_ids: string[];
  subscription_cancel_at_period_end: boolean;
  trial_reminder_sent_at: string | null;
  manual_access_until: string | null;
  manual_access_note: string | null;
  trade: string | null;              // 'btp', 'services', etc.
  theme: string;
  is_vip: boolean;
  is_beta: boolean;
  vip_granted_at: string | null;
  anti_phishing_code: string | null;
  free_export_used: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  isVip: boolean;
  isBeta: boolean;
  hasAccessToPlugin: (pluginId: string) => boolean;

  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; blocked?: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;

  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  setAntiPhishingCode: (code: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Provider ─────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // ── Récupération du profil ─────────────────────────────────
  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Erreur fetchProfile:', error);
      return;
    }
    if (data) setProfile(data as Profile);
  }, []);

  // ── Vérification admin ─────────────────────────────────────
  const checkAdmin = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    setIsAdmin(data?.some((r: any) => r.role === 'admin') ?? false);
  }, []);

  // ── Initialisation session ─────────────────────────────────
  useEffect(() => {
    // Écoute changements auth (login, logout, refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Déferre les fetches pour éviter deadlock supabase
        setTimeout(() => {
          fetchProfile(session.user.id);
          checkAdmin(session.user.id);
        }, 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    // Récupère la session existante
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        checkAdmin(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, checkAdmin]);

  // ── Signup ─────────────────────────────────────────────────
  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    return { error };
  };

  // ── Signin avec détection de blocage ───────────────────────
  const signIn = async (email: string, password: string) => {
    // 1. Vérification d'abord si l'IP n'est pas bloquée
    const { data: blockCheck } = await supabase
      .rpc('check_login_block', { check_email: email })
      .single() as any;

    if (blockCheck?.is_blocked) {
      return {
        error: new Error('Votre compte est temporairement verrouillé suite à plusieurs tentatives échouées.'),
        blocked: true,
      };
    }

    // 2. Tentative de login
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    // 3. Si échec, on enregistre la tentative
    if (error) {
      await supabase.rpc('log_failed_login', { login_email: email });
    }

    return { error };
  };

  // ── Signout ────────────────────────────────────────────────
  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setIsAdmin(false);
  };

  // ── Reset password ─────────────────────────────────────────
  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  // ── Update password ────────────────────────────────────────
  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  };

  // ── Update profile ─────────────────────────────────────────
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('Non connecté') };
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id);
    if (!error) await fetchProfile(user.id);
    return { error };
  };

  // ── Code anti-phishing ─────────────────────────────────────
  const setAntiPhishingCode = async (code: string) => {
    if (!user) return { error: new Error('Non connecté') };

    // Validation côté client
    const clean = code.trim();
    if (clean.length < 4 || clean.length > 20) {
      return { error: new Error('Le code doit contenir entre 4 et 20 caractères.') };
    }
    if (/\s/.test(clean)) {
      return { error: new Error('Le code ne doit pas contenir d\'espace.') };
    }

    const { error } = await supabase
      .from('profiles')
      .update({ anti_phishing_code: clean })
      .eq('user_id', user.id);

    if (!error) {
      // Log l'historique
      await supabase.from('anti_phishing_history').insert({
        user_id: user.id,
      });
      await fetchProfile(user.id);
    }
    return { error };
  };

  // ── Refresh profile ────────────────────────────────────────
  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  // ── Vérifier accès à un plugin ─────────────────────────────
  const hasAccessToPlugin = useCallback(
    (pluginId: string): boolean => {
      if (!profile) return false;
      if (isAdmin) return true;
      if (profile.is_vip) return true;
      const now = Date.now();
      const trialActive = profile.trial_ends_at ? new Date(profile.trial_ends_at).getTime() > now : false;
      const periodActive = profile.subscription_current_period_end
        ? new Date(profile.subscription_current_period_end).getTime() > now
        : false;
      const manualActive = profile.manual_access_until
        ? new Date(profile.manual_access_until).getTime() > now
        : false;
      const paidPlanUsable = manualActive || (
        ['active', 'trialing'].includes(profile.subscription_status || '') &&
        (!profile.subscription_current_period_end || periodActive)
      );

      if (profile.plan === 'pro') return paidPlanUsable;
      if (profile.plan === 'free') {
        return trialActive && (profile.trial_plugin_ids || []).includes(pluginId);
      }
      if (profile.plan === 'carte') {
        return paidPlanUsable && (profile.paid_plugin_ids || []).includes(pluginId);
      }
      return false;
    },
    [profile, isAdmin]
  );

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading,
    isAdmin,
    isVip: profile?.is_vip ?? false,
    isBeta: profile?.is_beta ?? false,
    hasAccessToPlugin,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    setAntiPhishingCode,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Hook ─────────────────────────────────────────────────────
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
