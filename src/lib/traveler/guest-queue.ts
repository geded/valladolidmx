/**
 * guest-queue — cola en localStorage para invitados de "Mi Viaje"
 * (Iniciativa 7 · Sub-ola D).
 *
 * Espejo del contrato usado por `AddToTravelPlanButton` (Sub-ola C).
 * Centralizado para permitir migración post-login desde el Workspace
 * del Viajero sin duplicar constantes ni parseo.
 */
import type { TravelItemKind } from "./travel-plans.functions";

export const GUEST_QUEUE_KEY = "travel_plan_guest_queue";

export interface GuestQueueItem {
  kind: TravelItemKind;
  targetId: string | null;
  title?: string | null;
  slug?: string | null;
  imageUrl?: string | null;
  subtitle?: string | null;
  notes?: string | null;
  ts: number;
}

export function readGuestQueue(): GuestQueueItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(GUEST_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as GuestQueueItem[]) : [];
  } catch {
    return [];
  }
}

export function writeGuestQueue(items: GuestQueueItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GUEST_QUEUE_KEY, JSON.stringify(items));
  } catch {
    /* storage lleno / bloqueado → silencioso */
  }
}

export function clearGuestQueue(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(GUEST_QUEUE_KEY);
  } catch {
    /* noop */
  }
}