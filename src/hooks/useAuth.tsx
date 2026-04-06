// @refresh reset
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  plan: string;
  theme: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  profile: Profile | null;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
  updateProfile: (updates: Partial<Pick<Profile, "full_name" | "theme">>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, user_id, full_name, plan, theme")
      .eq("user_id", userId)
      .single();
    if (data) {
      setProfile(data as Profile);
      applyTheme(data.theme || "dark-night");
    }
  }, []);

  const checkAdmin = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    setIsAdmin(data?.some((r) => r.role === "admin") ?? false);
  }, []);

  const updateProfile = async (updates: Partial<Pick<Profile, "full_name" | "theme">>) => {
    if (!user) return;
    await supabase.from("profiles").update(updates).eq("user_id", user.id);
    if (updates.theme) applyTheme(updates.theme);
    await fetchProfile(user.id);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
            checkAdmin(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setIsAdmin(false);
        }
        setLoading(false);
      }
    );

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

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => { await supabase.auth.signOut(); };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, profile, signUp, signIn, signOut, resetPassword, updatePassword, updateProfile, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

// ── Theme Engine ──
// Styles define accent colors, modes define background/foreground
type ThemeVars = Record<string, string>;

const darkBase: ThemeVars = {
  "--background": "0 0% 3.5%",
  "--foreground": "40 15% 90%",
  "--card": "0 0% 7%",
  "--card-foreground": "40 15% 90%",
  "--popover": "0 0% 7%",
  "--popover-foreground": "40 15% 90%",
  "--secondary": "0 0% 11%",
  "--secondary-foreground": "40 15% 85%",
  "--muted": "0 0% 14%",
  "--muted-foreground": "0 0% 50%",
  "--border": "0 0% 14%",
  "--input": "0 0% 14%",
};

const lightBase: ThemeVars = {
  "--background": "0 0% 98%",
  "--foreground": "0 0% 12%",
  "--card": "0 0% 100%",
  "--card-foreground": "0 0% 12%",
  "--popover": "0 0% 100%",
  "--popover-foreground": "0 0% 12%",
  "--secondary": "0 0% 94%",
  "--secondary-foreground": "0 0% 25%",
  "--muted": "0 0% 90%",
  "--muted-foreground": "0 0% 45%",
  "--border": "0 0% 88%",
  "--input": "0 0% 88%",
};

interface StyleDef {
  primary: string;
  accent: string;
  primaryFg?: string;
  // optional dark overrides
  darkBg?: string; darkCard?: string; darkFg?: string;
  darkSecondary?: string; darkMuted?: string; darkBorder?: string;
}

const styles: Record<string, StyleDef> = {
  "dark-night": { primary: "38 50% 58%", accent: "38 50% 58%" },
  corporate: {
    primary: "210 80% 55%", accent: "210 80% 55%", primaryFg: "0 0% 100%",
    darkBg: "220 20% 6%", darkCard: "220 18% 10%", darkFg: "210 20% 92%",
    darkSecondary: "220 15% 15%", darkMuted: "220 15% 18%", darkBorder: "220 15% 18%",
  },
  professional: {
    primary: "0 0% 75%", accent: "0 0% 75%",
    darkBg: "0 0% 4%", darkCard: "0 0% 8%", darkFg: "0 0% 92%",
    darkSecondary: "0 0% 12%", darkMuted: "0 0% 16%", darkBorder: "0 0% 16%",
  },
  artistic: {
    primary: "280 65% 60%", accent: "320 65% 55%", primaryFg: "0 0% 100%",
    darkBg: "280 20% 5%", darkCard: "280 18% 9%", darkFg: "300 15% 90%",
    darkSecondary: "280 15% 14%", darkMuted: "280 12% 18%", darkBorder: "280 12% 18%",
  },
  sunset: {
    primary: "20 85% 55%", accent: "35 90% 55%", primaryFg: "0 0% 100%",
    darkBg: "15 25% 5%", darkCard: "15 20% 9%", darkFg: "30 20% 90%",
    darkSecondary: "15 15% 14%", darkMuted: "15 12% 18%", darkBorder: "15 12% 18%",
  },
  gaming: {
    primary: "160 100% 45%", accent: "280 80% 55%", primaryFg: "0 0% 0%",
    darkBg: "240 15% 4%", darkCard: "240 15% 8%", darkFg: "180 20% 92%",
    darkSecondary: "240 12% 13%", darkMuted: "240 10% 17%", darkBorder: "240 10% 17%",
  },
  fun: {
    primary: "330 85% 60%", accent: "180 90% 50%", primaryFg: "0 0% 100%",
    darkBg: "260 30% 6%", darkCard: "260 25% 10%", darkFg: "300 20% 92%",
    darkSecondary: "260 20% 14%", darkMuted: "260 15% 18%", darkBorder: "260 15% 18%",
  },
};

export function parseTheme(themeId: string): { style: string; mode: "dark" | "light" } {
  // Legacy compat: "light" alone → dark-night + light
  if (themeId === "light") return { style: "dark-night", mode: "light" };
  if (themeId.endsWith("-light")) {
    const style = themeId.replace(/-light$/, "");
    return { style: styles[style] ? style : "dark-night", mode: "light" };
  }
  return { style: styles[themeId] ? themeId : "dark-night", mode: "dark" };
}

export function buildThemeId(style: string, mode: "dark" | "light"): string {
  return mode === "light" ? `${style}-light` : style;
}

export const availableStyles = Object.keys(styles);

function applyTheme(themeId: string) {
  const { style, mode } = parseTheme(themeId);
  const s = styles[style] || styles["dark-night"];
  const base = mode === "light" ? { ...lightBase } : { ...darkBase };

  // Apply dark overrides for the style when in dark mode
  if (mode === "dark") {
    if (s.darkBg) base["--background"] = s.darkBg;
    if (s.darkCard) { base["--card"] = s.darkCard; base["--popover"] = s.darkCard; }
    if (s.darkFg) { base["--foreground"] = s.darkFg; base["--card-foreground"] = s.darkFg; base["--popover-foreground"] = s.darkFg; }
    if (s.darkSecondary) base["--secondary"] = s.darkSecondary;
    if (s.darkMuted) { base["--muted"] = s.darkMuted; base["--muted-foreground"] = s.darkMuted.replace(/18%$/, "48%"); }
    if (s.darkBorder) { base["--border"] = s.darkBorder; base["--input"] = s.darkBorder; }
  }

  const vars: ThemeVars = {
    ...base,
    "--primary": s.primary,
    "--primary-foreground": s.primaryFg || (mode === "light" ? "0 0% 100%" : "0 0% 3.5%"),
    "--accent": s.accent,
    "--accent-foreground": s.primaryFg || (mode === "light" ? "0 0% 100%" : "0 0% 3.5%"),
    "--ring": s.primary,
  };

  const root = document.documentElement;
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}
