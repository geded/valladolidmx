/**
 * Mi Viaje · mesas apartadas en restaurantes de la plataforma.
 * Reutiliza el enlace privado `/reservacion-mesa/$token` para cambiar o cancelar.
 */
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Utensils, ArrowRight } from "lucide-react";
import { listMyTableReservations } from "@/lib/commerce/table-booking.functions";
import { formatTableDate, formatTableTime } from "@/lib/commerce/table-booking";

export function TableReservationsCard() {
  const list = useServerFn(listMyTableReservations);
  const q = useQuery({ queryKey: ["my-table-reservations"], queryFn: () => list(), staleTime: 60_000 });
  const rows = q.data ?? [];
  if (!rows.length) return null;
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 font-serif text-lg text-foreground">
        <Utensils className="h-4 w-4 text-primary" /> Mesas apartadas
      </h2>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{r.restaurant}</p>
                <p className="text-sm text-muted-foreground">
                  {formatTableDate(r.startsAt)} · {formatTableTime(r.startsAt)} · {r.partySize}{" "}
                  {r.partySize === 1 ? "persona" : "personas"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Folio {r.folio} · {r.status === "pendiente" ? "Esperando confirmación" : "Confirmada"}
                </p>
              </div>
              <Link
                to="/reservacion-mesa/$token"
                params={{ token: r.manageToken }}
                className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary"
              >
                Ver o cambiar <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
