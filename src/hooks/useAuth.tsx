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
const themes: Record<string, Record<string, string>> = {
  "dark-night": {
    "--background": "0 0% 3.5%",
    "--foreground": "40 15% 90%",
    "--card": "0 0% 7%",
    "--card-foreground": "40 15% 90%",
    "--primary": "38 50% 58%",
    "--primary-foreground": "0 0% 3.5%",
    "--secondary": "0 0% 11%",
    "--secondary-foreground": "40 15% 85%",
    "--muted": "0 0% 14%",
    "--muted-foreground": "0 0% 50%",
    "--accent": "38 50% 58%",
    "--border": "0 0% 14%",
    "--input": "0 0% 14%",
    "--ring": "38 50% 58%",
  },
  corporate: {
    "--background": "220 20% 6%",
    "--foreground": "210 20% 92%",
    "--card": "220 18% 10%",
    "--card-foreground": "210 20% 92%",
    "--primary": "210 80% 55%",
    "--primary-foreground": "0 0% 100%",
    "--secondary": "220 15% 15%",
    "--secondary-foreground": "210 15% 85%",
    "--muted": "220 15% 18%",
    "--muted-foreground": "210 10% 50%",
    "--accent": "210 80% 55%",
    "--border": "220 15% 18%",
    "--input": "220 15% 18%",
    "--ring": "210 80% 55%",
  },
  professional: {
    "--background": "0 0% 4%",
    "--foreground": "0 0% 92%",
    "--card": "0 0% 8%",
    "--card-foreground": "0 0% 92%",
    "--primary": "0 0% 75%",
    "--primary-foreground": "0 0% 4%",
    "--secondary": "0 0% 12%",
    "--secondary-foreground": "0 0% 82%",
    "--muted": "0 0% 16%",
    "--muted-foreground": "0 0% 48%",
    "--accent": "0 0% 75%",
    "--border": "0 0% 16%",
    "--input": "0 0% 16%",
    "--ring": "0 0% 75%",
  },
  artistic: {
    "--background": "280 20% 5%",
    "--foreground": "300 15% 90%",
    "--card": "280 18% 9%",
    "--card-foreground": "300 15% 90%",
    "--primary": "280 65% 60%",
    "--primary-foreground": "0 0% 100%",
    "--secondary": "280 15% 14%",
    "--secondary-foreground": "300 10% 82%",
    "--muted": "280 12% 18%",
    "--muted-foreground": "280 10% 48%",
    "--accent": "320 65% 55%",
    "--border": "280 12% 18%",
    "--input": "280 12% 18%",
    "--ring": "280 65% 60%",
  },
  sunset: {
    "--background": "15 25% 5%",
    "--foreground": "30 20% 90%",
    "--card": "15 20% 9%",
    "--card-foreground": "30 20% 90%",
    "--primary": "20 85% 55%",
    "--primary-foreground": "0 0% 100%",
    "--secondary": "15 15% 14%",
    "--secondary-foreground": "30 15% 82%",
    "--muted": "15 12% 18%",
    "--muted-foreground": "15 10% 48%",
    "--accent": "35 90% 55%",
    "--border": "15 12% 18%",
    "--input": "15 12% 18%",
    "--ring": "20 85% 55%",
  },
  gaming: {
    "--background": "240 15% 4%",
    "--foreground": "180 20% 92%",
    "--card": "240 15% 8%",
    "--card-foreground": "180 20% 92%",
    "--primary": "160 100% 45%",
    "--primary-foreground": "0 0% 0%",
    "--secondary": "240 12% 13%",
    "--secondary-foreground": "180 10% 82%",
    "--muted": "240 10% 17%",
    "--muted-foreground": "240 8% 48%",
    "--accent": "280 80% 55%",
    "--border": "240 10% 17%",
    "--input": "240 10% 17%",
    "--ring": "160 100% 45%",
  },
};

function applyTheme(themeId: string) {
  const vars = themes[themeId] || themes["dark-night"];
  const root = document.documentElement;
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}
