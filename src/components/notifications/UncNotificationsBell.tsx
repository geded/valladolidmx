/**
 * UncNotificationsBell — Campana única del Centro de Notificaciones (UNC).
 *
 * Consume exclusivamente los server-fn oficiales del UNC
 * (`listMyNotificationDeliveries`, `countMyUnreadNotifications`,
 * `markNotificationDeliveryRead`). No crea estados, tablas ni canales
 * nuevos: sólo presenta el Delivery Ledger propio del usuario.
 *
 * Caso de uso inmediato (21-sep): el administrador ve al momento las
 * imágenes enviadas a aprobación (`media.review_requested`) sin cambiar
 * el flujo editorial aprobado.
 */
import { useMemo, useState } from "react";
import { Bell, CheckCircle2, Image as ImageIcon } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  listMyNotificationDeliveries,
  countMyUnreadNotifications,
  markNotificationDeliveryRead,
} from "@/lib/notifications/notifications.functions";
import { uncEventTitle } from "@/lib/notifications/event-titles";
import { PushEnableButton } from "./PushEnableButton";

interface DeliveryRow {
  id: string;
  event_type: string;
  channel: string;
  created_at: string;
  read_at: string | null;
  payload_ref: Record<string, unknown> | null;
}

function titleFor(row: DeliveryRow): string {
  return uncEventTitle(row.event_type);
}

function detailFor(row: DeliveryRow): string {
  const alt = row.payload_ref?.["alt_text"];
  if (typeof alt === "string" && alt.trim()) return alt;
  return "Abre para revisar el detalle.";
}

function urlFor(row: DeliveryRow): string | null {
  const url = row.payload_ref?.["url"];
  return typeof url === "string" && url.startsWith("/") ? url : null;
}

function relative(iso: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.floor(hours / 24)} d`;
}

export function UncNotificationsBell() {
  const fetchList = useServerFn(listMyNotificationDeliveries);
  const fetchCount = useServerFn(countMyUnreadNotifications);
  const markRead = useServerFn(markNotificationDeliveryRead);
  const queryClient = useQueryClient();
  const router = useRouter();

  const unread = useQuery({
    queryKey: ["unc", "unread-count"],
    queryFn: () => fetchCount({}),
    staleTime: 15_000,
    refetchInterval: 30_000,
    retry: false,
  });

  const list = useQuery({
    queryKey: ["unc", "deliveries", "bell"],
    queryFn: () => fetchList({ data: { limit: 30 } }),
    staleTime: 15_000,
    refetchInterval: 60_000,
    retry: false,
  });

  const rows = useMemo(
    () => ((list.data?.items ?? []) as DeliveryRow[]).filter((r) => r.channel === "in_app"),
    [list.data],
  );
  const count = unread.data?.unread ?? 0;

  async function open(row: DeliveryRow) {
    const target = urlFor(row);
    if (!row.read_at) {
      try {
        await markRead({ data: { deliveryId: row.id } });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["unc", "unread-count"] }),
          queryClient.invalidateQueries({ queryKey: ["unc", "deliveries", "bell"] }),
        ]);
      } catch {
        /* el aviso se puede abrir aunque falle el marcado */
      }
    }
    if (target) void router.navigate({ to: target });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Avisos (${count} sin leer)`}
          className="relative grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <Bell className="h-4 w-4" aria-hidden />
          {count > 0 ? (
            <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
              {count > 9 ? "9+" : count}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="border-b px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Centro de avisos
          </p>
          <p className="text-sm text-foreground">
            {count === 0
              ? "Sin avisos pendientes"
              : count === 1
                ? "1 aviso sin leer"
                : `${count} avisos sin leer`}
          </p>
        </div>
        <ul className="max-h-[60vh] divide-y overflow-y-auto text-sm">
          {rows.slice(0, 12).map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => void open(row)}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-accent"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                  {row.event_type.startsWith("media.") ? (
                    <ImageIcon className="size-4" aria-hidden />
                  ) : (
                    <CheckCircle2 className="size-4" aria-hidden />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {titleFor(row)}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {detailFor(row)}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {relative(row.created_at)}
                  </span>
                </span>
                {!row.read_at ? (
                  <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" aria-hidden />
                ) : null}
              </button>
            </li>
          ))}
          {rows.length === 0 ? (
            <li className="px-4 py-6 text-center text-xs text-muted-foreground">
              Aquí aparecerán las aprobaciones pendientes y otros avisos de la plataforma.
            </li>
          ) : null}
        </ul>
        <PushEnableButton />
      </PopoverContent>
    </Popover>
  );
}
