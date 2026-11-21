/* eslint-disable react-refresh/only-export-components -- module intentionally co-exports helpers with its components; affects only dev fast refresh. */
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
import { isAuthRetryableFetchError, type Session, type User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { readStoredSessionWhileOffline } from "@/lib/traveler/offline-session";
import { clearOfflineTripCopy } from "@/lib/traveler/offline-trip-copy";
import { clearAllOfflineDocuments } from "@/lib/traveler/offline-documents";
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
  return [...roles].sort((a, b) => ROLE_PRIORITY.indexOf(b) - ROLE_PRIORITY.indexOf(a))[0];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  // Identidad (perfil + roles) en vuelo: evita redirecciones por rol con
  // `roles = []` justo después de SIGNED_IN (founder caía en /mi-viaje).
  const [identityLoading, setIdentityLoading] = useState(false);

  const loadIdentity = useCallback(async (uid: string | null) => {
    if (!uid) {
      setProfile(null);
      setRoles([]);
      setIdentityLoading(false);
      return;
    }
    setIdentityLoading(true);
    try {
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
    } finally {
      setIdentityLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    /* Sin señal la sesión vencida no puede renovarse: se reconoce la cuenta
       guardada en el teléfono para que el viajero vea su copia de Mi Viaje. */
    const isOffline = () => typeof navigator !== "undefined" && navigator.onLine === false;
    const resolveSession = async (): Promise<{ session: Session | null; offlineCopy: boolean }> => {
      const pending = supabase.auth.getSession();
      // Sin señal no se espera la renovación del acceso (reintenta hasta 30 s).
      const result = isOffline()
        ? await Promise.race([
            pending,
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
          ])
        : await pending;
      if (result?.data.session) return { session: result.data.session, offlineCopy: false };
      const noSignal = isOffline() || !result || isAuthRetryableFetchError(result.error);
      const stored = noSignal ? readStoredSessionWhileOffline() : null;
      return { session: stored, offlineCopy: Boolean(stored) };
    };
    (async () => {
      const { session: s, offlineCopy } = await resolveSession();
      if (!active) return;
      setSession(s);
      // Sin señal no se piden perfil ni roles: esperarían la renovación.
      await loadIdentity(offlineCopy ? null : (s?.user.id ?? null));
      setLoading(false);
    })();
    /* Al volver la señal, la sesión real reemplaza a la guardada. */
    const onOnline = () => {
      void resolveSession().then(({ session: s, offlineCopy }) => {
        if (!active || offlineCopy) return;
        setSession(s);
        void loadIdentity(s?.user.id ?? null);
      });
    };
    if (typeof window !== "undefined") window.addEventListener("online", onOnline);

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      if (event === "SIGNED_OUT") {
        // La copia de Mi Viaje sin señal nunca sobrevive al cierre de sesión.
        clearOfflineTripCopy();
        clearAllOfflineDocuments();
      }
      setSession(s);
      // Marca identidad en vuelo de inmediato: los consumidores no deben
      // decidir rol/destino con los roles del estado anterior.
      if (s?.user) setIdentityLoading(true);
      // No await: defer to microtask to avoid deadlocks
      setTimeout(() => {
        void loadIdentity(s?.user.id ?? null);
      }, 0);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
      if (typeof window !== "undefined") window.removeEventListener("online", onOnline);
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
      loading: loading || identityLoading,
      session,
      user,
      profile,
      roles,
      role,
      authUser,
      signOut,
      refresh,
    };
  }, [loading, identityLoading, session, profile, roles, signOut, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/**
 * Lectura tolerante del contexto de sesión para superficies decorativas
 * (p. ej. el disparador flotante de Alux) que pueden renderizarse en SSR
 * dentro de chunks perezosos. Nunca lanza: devuelve `null` si no hay
 * proveedor disponible en ese árbol.
 */
export function useOptionalAuth(): AuthContextValue | null {
  return useContext(AuthContext) ?? null;
}
