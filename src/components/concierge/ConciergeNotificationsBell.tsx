/**
 * Centro de avisos del Concierge.
 * Muestra los mensajes de viajeros que siguen sin respuesta,
 * con acceso directo al expediente. Sólo lectura.
 */
import { Bell, MessageSquare } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  listConciergePendingQuestions,
  type PendingQuestionRow,
} from "@/lib/concierge/concierge.functions";

function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.floor(diff / 60_000));
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

export function ConciergeNotificationsBell() {
  const fetchPending = useServerFn(listConciergePendingQuestions);
  const q = useQuery({
    queryKey: ["concierge", "pending-questions", "bell"],
    queryFn: () => fetchPending({}),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const rows = (q.data ?? []) as PendingQuestionRow[];
  const count = rows.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Avisos (${count})`}
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
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Centro de avisos
          </p>
          <p className="text-sm text-foreground">
            {count === 0
              ? "Sin mensajes por responder"
              : count === 1
                ? "1 viajero espera respuesta"
                : `${count} viajeros esperan respuesta`}
          </p>
        </div>
        <ul className="max-h-96 divide-y overflow-y-auto text-sm">
          {rows.slice(0, 8).map((r) => (
            <li key={r.case_id}>
              <Link
                to="/concierge/expedientes/$caseId"
                params={{ caseId: r.case_id }}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-accent"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                  <MessageSquare className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {r.traveler_name ?? "Viajero"}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {r.body}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {relative(r.asked_at)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
          {count === 0 ? (
            <li className="px-4 py-6 text-center text-xs text-muted-foreground">
              Todo contestado. Los nuevos mensajes de viajeros aparecerán aquí.
            </li>
          ) : null}
        </ul>
        <div className="border-t px-4 py-2">
          <Link
            to="/concierge/preguntas"
            className="text-xs font-medium text-primary hover:underline"
          >
            Ver todas las preguntas
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
