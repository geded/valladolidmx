/**
 * track.ts — Registro de exposición y acciones sobre fichas de empresa.
 *
 * Fuente única: `business_view_events` vía la RPC oficial
 * `record_business_view_event`. No crea tablas ni contadores paralelos.
 *
 * Reglas:
 *  - Sólo se ejecuta en el navegador; nunca durante SSR/prerender.
 *  - Nunca bloquea ni altera la interfaz: fire-and-forget silencioso.
 *  - La impresión de una misma ficha en la misma superficie se registra
 *    una sola vez por sesión del navegador (anti-inflado).
 *  - Identificador de sesión anónimo y rotativo por pestaña; no guarda
 *    datos personales.
 */
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type BusinessEventType =
  | "impression"
  | "click_card"
  | "click_whatsapp"
  | "click_map"
  | "click_web"
  | "click_phone"
  | "alux_mention"
  | "share"
  | "add_to_trip"
  | "reserve_intent";

export type BusinessPlacement = "contratado" | "fijado" | "editorial" | "organico";

export interface TrackBusinessEventInput {
  businessId: string | null | undefined;
  eventType: BusinessEventType;
  /** Superficie pública donde ocurrió (p. ej. `perfil-empresa`, `que-hacer`). */
  surface?: string | null;
  /** Carril o sección dentro de la superficie. */
  rail?: string | null;
  placement?: BusinessPlacement | null;
  grantId?: string | null;
  entityKind?: string | null;
  entityId?: string | null;
}

const SESSION_KEY = "vmx.visibility.session.v1";

function sessionHash(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let value = window.sessionStorage.getItem(SESSION_KEY);
    if (!value) {
      value =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.sessionStorage.setItem(SESSION_KEY, value);
    }
    return value;
  } catch {
    return null;
  }
}

function alreadySeen(key: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    const storageKey = `vmx.visibility.seen.${key}`;
    if (window.sessionStorage.getItem(storageKey)) return true;
    window.sessionStorage.setItem(storageKey, "1");
    return false;
  } catch {
    return false;
  }
}

export function trackBusinessEvent(input: TrackBusinessEventInput): void {
  if (typeof window === "undefined") return;
  const businessId = input.businessId;
  if (!businessId) return;

  void (async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).rpc("record_business_view_event", {
        _business_id: businessId,
        _event_type: input.eventType,
        _source: document.referrer ? "referral" : "direct",
        _country_code: null,
        _session_hash: sessionHash(),
        _referer: document.referrer || null,
        _surface: input.surface ?? null,
        _rail: input.rail ?? null,
        _placement: input.placement ?? null,
        _grant_id: input.grantId ?? null,
        _entity_kind: input.entityKind ?? null,
        _entity_id: input.entityId ?? null,
      });
    } catch {
      /* La medición jamás interrumpe la experiencia del visitante. */
    }
  })();
}

/**
 * Registra una impresión de ficha al montar, una vez por sesión y
 * combinación (empresa · superficie · entidad).
 */
export function useBusinessImpression(input: TrackBusinessEventInput): void {
  const { businessId, surface, entityKind, entityId } = input;
  useEffect(() => {
    if (!businessId) return;
    const key = `${businessId}:${surface ?? "-"}:${entityKind ?? "-"}:${entityId ?? "-"}`;
    if (alreadySeen(key)) return;
    trackBusinessEvent({ ...input, eventType: "impression" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, surface, entityKind, entityId]);
}
