/**
 * ReserveOnlineButton — Reservación en línea de una experiencia
 * (paso 5 · "Experiencias: la sección que vende en línea").
 *
 * El viajero elige fecha, hora y número de personas; se apartan los
 * lugares con vencimiento y se abre la confirmación del viaje, donde hoy
 * la forma de pago vigente es el efectivo con el concierge.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { listAvailableDepartures, startBooking } from "@/lib/commerce/booking.functions";

function genId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function dayKey(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function dayLabel(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "long",
  }).format(new Date(iso));
}

function timeLabel(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function ReserveOnlineButton({
  productId,
  label = "Reservar en línea",
  className,
}: {
  productId: string;
  label?: string;
  className?: string;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fetchDepartures = useServerFn(listAvailableDepartures);
  const reserve = useServerFn(startBooking);

  const [open, setOpen] = useState(false);
  const [day, setDay] = useState<string | null>(null);
  const [departureId, setDepartureId] = useState<string | null>(null);
  const [people, setPeople] = useState(1);
  const [busy, setBusy] = useState(false);

  const departuresQ = useQuery({
    queryKey: ["commerce", "public-departures", productId],
    queryFn: () => fetchDepartures({ data: { productId } }),
    enabled: open,
    staleTime: 60_000,
  });

  const departures = departuresQ.data ?? [];

  const days = useMemo(() => {
    const map = new Map<string, { key: string; label: string; iso: string }>();
    for (const d of departures) {
      const key = dayKey(d.starts_at, d.timezone);
      if (!map.has(key)) {
        map.set(key, { key, label: dayLabel(d.starts_at, d.timezone), iso: d.starts_at });
      }
    }
    return Array.from(map.values());
  }, [departures]);

  const times = useMemo(
    () => departures.filter((d) => dayKey(d.starts_at, d.timezone) === day),
    [departures, day],
  );

  const selected = departures.find((d) => d.id === departureId) ?? null;
  const maxPeople = selected?.available ?? 10;

  async function handleReserve() {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    setBusy(true);
    try {
      const res = await reserve({
        data: {
          productId,
          departureId: departureId ?? null,
          quantity: people,
          clientRequestId: genId(),
        },
      });
      setOpen(false);
      navigate({ to: "/cuenta/checkout/$orderId", params: { orderId: res.order_id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No pudimos apartar tus lugares");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button type="button" size="sm" className={className} onClick={() => setOpen(true)}>
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Elige tu fecha</DialogTitle>
            <DialogDescription>
              Apartamos tus lugares mientras confirmas tu reservación.
            </DialogDescription>
          </DialogHeader>

          {departuresQ.isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Buscando horarios…</p>
          ) : departures.length === 0 ? (
            <div className="space-y-2 py-4 text-sm">
              <p>Esta experiencia aún no tiene fechas abiertas en línea.</p>
              <p className="text-xs text-muted-foreground">
                Puedes agregarla a Mi Viaje y tu concierge la coordina contigo.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Fecha
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {days.map((d) => (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => {
                        setDay(d.key);
                        setDepartureId(null);
                      }}
                      className={[
                        "rounded-pill border px-3 py-1.5 text-xs font-medium transition",
                        day === d.key
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card hover:bg-accent",
                      ].join(" ")}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {day ? (
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Hora
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {times.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setDepartureId(t.id);
                          setPeople((p) => Math.min(p, t.available));
                        }}
                        className={[
                          "rounded-pill border px-3 py-1.5 text-xs font-medium transition",
                          departureId === t.id
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card hover:bg-accent",
                        ].join(" ")}
                      >
                        {timeLabel(t.starts_at, t.timezone)} · {t.available} lugares
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {departureId ? (
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Personas
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPeople((p) => Math.max(1, p - 1))}
                    >
                      −
                    </Button>
                    <span className="min-w-8 text-center text-sm font-medium">{people}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPeople((p) => Math.min(maxPeople, p + 1))}
                    >
                      +
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Máximo {maxPeople} en este horario
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleReserve} disabled={busy || !departureId}>
              {busy ? "Apartando lugares…" : "Continuar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
