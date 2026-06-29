/**
 * useAuth — Contexto global de identidad (Bloque C / 13.3).
 *
 * Expone sesión Supabase + perfil + rol primario.
 * Suscribe onAuthStateChange y mantiene el cache de roles fresco.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_PRIORITY, type AppRole, type AuthUserShape } from "@/types/auth";

interface ProfileRow {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

interface AuthContextValue {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: ProfileRow | null;
  roles: AppRole[];
  role: AppRole | null;
  authUser: AuthUserShape | null;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function primaryRole(roles: AppRole[]): AppRole | null {
  if (!roles.length) return null;
  return [...roles].sort(
    (a, b) => ROLE_PRIORITY.indexOf(b) - ROLE_PRIORITY.indexOf(a),
  )[0];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const loadIdentity = useCallback(async (uid: string | null) => {
    if (!uid) {
      setProfile(null);
      setRoles([]);
      return;
    }
    const [{ data: prof }, { data: r }] = await Promise.all([
      supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, email")
        .eq("user_id", uid)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile((prof as ProfileRow | null) ?? null);
    setRoles(((r ?? []) as { role: AppRole }[]).map((x) => x.role));
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSession(data.session);
      await loadIdentity(data.session?.user.id ?? null);
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (
        event !== "SIGNED_IN" &&
        event !== "SIGNED_OUT" &&
        event !== "USER_UPDATED"
      )
        return;
      setSession(s);
      // No await: defer to microtask to avoid deadlocks
      setTimeout(() => {
        void loadIdentity(s?.user.id ?? null);
      }, 0);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadIdentity]);

  const refresh = useCallback(async () => {
    await loadIdentity(session?.user.id ?? null);
  }, [loadIdentity, session?.user.id]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setRoles([]);
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const role = primaryRole(roles);
    const user = session?.user ?? null;
    const authUser: AuthUserShape | null = user
      ? {
          id: user.id,
          email: user.email ?? profile?.email ?? "",
          display_name: profile?.display_name ?? undefined,
          avatar_url: profile?.avatar_url ?? undefined,
          role,
        }
      : null;
    return {
      loading,
      session,
      user,
      profile,
      roles,
      role,
      authUser,
      signOut,
      refresh,
    };
  }, [loading, session, profile, roles, signOut, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}