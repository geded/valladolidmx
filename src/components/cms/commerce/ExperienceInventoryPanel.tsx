/**
 * ExperienceInventoryPanel
 *
 * Paso 4 · Calendario, horarios y cupo real de una experiencia.
 * Se monta dentro de la ficha comercial `/cms/experiencias/$productId`.
 * No duplica el editor editorial: sólo administra inventario.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  DEPARTURE_STATUS_LABEL,
  WEEKDAY_LABELS,
  adjustDepartureCapacity,
  deleteBlackout,
  expireStaleHolds,
  generateDepartures,
  getProductInventory,
  saveBlackout,
  saveScheduleTemplate,
  setDepartureStatus,
  type ScheduleTemplateRow,
} from "@/lib/commerce/inventory.functions";

const fmtDateTime = (value: string, timezone: string) =>
  new Date(value).toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone || "America/Merida",
  });

const todayISO = () => new Date().toISOString().slice(0, 10);

interface DraftTemplate {
  id?: string;
  label: string;
  weekdays: number[];
  startTimes: string;
  durationMinutes: number;
  capacityTotal: number;
  capacityReservable: string;
  minParticipants: number;
  maxParticipants: string;
  minLeadHours: number;
  saleHorizonDays: number;
  cutoffMinutes: number;
  validFrom: string;
  validUntil: string;
  active: boolean;
}

const emptyDraft = (): DraftTemplate => ({
  label: "",
  weekdays: [1, 2, 3, 4, 5, 6, 0],
  startTimes: "09:00, 15:00",
  durationMinutes: 120,
  capacityTotal: 12,
  capacityReservable: "",
  minParticipants: 1,
  maxParticipants: "",
  minLeadHours: 24,
  saleHorizonDays: 120,
  cutoffMinutes: 0,
  validFrom: todayISO(),
  validUntil: "",
  active: true,
});

const fromRow = (t: ScheduleTemplateRow): DraftTemplate => ({
  id: t.id,
  label: t.label ?? "",
  weekdays: t.weekdays ?? [],
  startTimes: (t.start_times ?? []).map((s) => s.slice(0, 5)).join(", "),
  durationMinutes: t.duration_minutes,
  capacityTotal: t.capacity_total,
  capacityReservable: t.capacity_reservable == null ? "" : String(t.capacity_reservable),
  minParticipants: t.min_participants,
  maxParticipants: t.max_participants == null ? "" : String(t.max_participants),
  minLeadHours: t.min_lead_hours,
  saleHorizonDays: t.sale_horizon_days,
  cutoffMinutes: t.cutoff_minutes,
  validFrom: t.valid_from,
  validUntil: t.valid_until ?? "",
  active: t.active,
});

const inputClass =
  "h-9 w-full rounded-md border bg-background px-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const btn =
  "inline-flex h-9 items-center rounded-md border px-3 text-xs font-semibold hover:bg-muted disabled:opacity-50";

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-4 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

export function ExperienceInventoryPanel({ productId }: { productId: string }) {
  const qc = useQueryClient();
  const load = useServerFn(getProductInventory);
  const saveTemplate = useServerFn(saveScheduleTemplate);
  const generate = useServerFn(generateDepartures);
  const setStatus = useServerFn(setDepartureStatus);
  const adjust = useServerFn(adjustDepartureCapacity);
  const addBlackout = useServerFn(saveBlackout);
  const removeBlackout = useServerFn(deleteBlackout);
  const expire = useServerFn(expireStaleHolds);

  const [draft, setDraft] = useState<DraftTemplate | null>(null);
  const [blackoutDraft, setBlackoutDraft] = useState({ startsAt: "", endsAt: "", reason: "" });

  const inventory = useQuery({
    queryKey: ["cms", "commerce-inventory", productId],
    queryFn: () => load({ data: { productId } }),
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["cms", "commerce-inventory", productId] });

  const run = <T,>(fn: (payload: T) => Promise<unknown>, ok: string) =>
    useMutationLike(fn, ok, invalidate);

  const templateMutation = useMutation({
    mutationFn: (payload: DraftTemplate) =>
      saveTemplate({
        data: {
          ...(payload.id ? { id: payload.id } : {}),
          productId,
          label: payload.label,
          weekdays: payload.weekdays,
          startTimes: payload.startTimes
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          durationMinutes: Number(payload.durationMinutes),
          capacityTotal: Number(payload.capacityTotal),
          capacityReservable:
            payload.capacityReservable === "" ? null : Number(payload.capacityReservable),
          minParticipants: Number(payload.minParticipants),
          maxParticipants: payload.maxParticipants === "" ? null : Number(payload.maxParticipants),
          minLeadHours: Number(payload.minLeadHours),
          saleHorizonDays: Number(payload.saleHorizonDays),
          cutoffMinutes: Number(payload.cutoffMinutes),
          validFrom: payload.validFrom,
          validUntil: payload.validUntil || null,
          active: payload.active,
        },
      }),
    onSuccess: () => {
      toast.success("Patrón de salidas guardado.");
      setDraft(null);
      void invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "No se pudo guardar."),
  });

  const generateMutation = useMutation({
    mutationFn: (templateId: string) => generate({ data: { templateId } }),
    onSuccess: (r) => {
      toast.success(`${(r as { created: number }).created} salidas generadas.`);
      void invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "No se pudo generar."),
  });

  const statusMutation = useMutation({
    mutationFn: (v: { departureId: string; status: "scheduled" | "closed" | "cancelled"; reason?: string }) =>
      setStatus({ data: v }),
    onSuccess: () => {
      toast.success("Salida actualizada.");
      void invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "No se pudo actualizar."),
  });

  const adjustMutation = useMutation({
    mutationFn: (v: { departureId: string; delta: number; reason: string }) => adjust({ data: v }),
    onSuccess: () => {
      toast.success("Cupo ajustado y registrado.");
      void invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "No se pudo ajustar."),
  });

  const blackoutMutation = useMutation({
    mutationFn: () =>
      addBlackout({
        data: {
          productId,
          startsAt: new Date(blackoutDraft.startsAt).toISOString(),
          endsAt: new Date(blackoutDraft.endsAt).toISOString(),
          reason: blackoutDraft.reason,
        },
      }),
    onSuccess: () => {
      toast.success("Cierre de venta registrado.");
      setBlackoutDraft({ startsAt: "", endsAt: "", reason: "" });
      void invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "No se pudo registrar."),
  });

  const removeBlackoutMutation = useMutation({
    mutationFn: (id: string) => removeBlackout({ data: { id } }),
    onSuccess: () => {
      toast.success("Cierre eliminado.");
      void invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "No se pudo eliminar."),
  });

  const expireMutation = useMutation({
    mutationFn: () => expire({}),
    onSuccess: (r) => {
      toast.success(`${(r as { expired: number }).expired} apartados liberados.`);
      void invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "No se pudo liberar."),
  });

  const data = inventory.data;
  const totals = useMemo(() => {
    const rows = data?.departures ?? [];
    return {
      salidas: rows.length,
      abiertas: rows.filter((d) => d.status === "scheduled" && !d.blacked_out).length,
      disponibles: rows.reduce((a, d) => a + d.available, 0),
      apartados: rows.reduce((a, d) => a + d.held, 0),
      confirmados: rows.reduce((a, d) => a + d.confirmed, 0),
    };
  }, [data]);

  if (inventory.isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando calendario…</p>;
  }
  if (inventory.isError) {
    return (
      <p className="text-sm text-destructive">
        No se pudo cargar el calendario:{" "}
        {inventory.error instanceof Error ? inventory.error.message : "error desconocido"}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <Section
        title="Patrones de salida"
        action={
          <button type="button" className={btn} onClick={() => setDraft(emptyDraft())}>
            Nuevo patrón
          </button>
        }
      >
        {(data?.templates.length ?? 0) === 0 && !draft ? (
          <p className="text-sm text-muted-foreground">
            Sin horarios configurados. Crea un patrón con los días, las horas y el cupo por salida.
          </p>
        ) : (
          <ul className="space-y-2">
            {(data?.templates ?? []).map((t) => (
              <li key={t.id} className="rounded-lg border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {t.label || "Horario"} {t.active ? "" : "· inactivo"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(t.weekdays ?? []).map((d) => WEEKDAY_LABELS[d]).join(" · ")} ·{" "}
                      {(t.start_times ?? []).map((s) => s.slice(0, 5)).join(", ")} ·{" "}
                      {t.duration_minutes} min · cupo {t.capacity_total}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={btn} onClick={() => setDraft(fromRow(t))}>
                      Editar
                    </button>
                    <button
                      type="button"
                      className={btn}
                      disabled={generateMutation.isPending || !t.active}
                      onClick={() => generateMutation.mutate(t.id)}
                    >
                      Generar salidas
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {draft && (
          <form
            className="mt-4 space-y-3 rounded-lg border bg-muted/30 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              templateMutation.mutate(draft);
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Labeled label="Nombre del horario">
                <input
                  className={inputClass}
                  value={draft.label}
                  onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                  placeholder="Salidas diarias"
                />
              </Labeled>
              <Labeled label="Horas de salida (separadas por coma)">
                <input
                  className={inputClass}
                  value={draft.startTimes}
                  onChange={(e) => setDraft({ ...draft, startTimes: e.target.value })}
                  placeholder="09:00, 15:00"
                  required
                />
              </Labeled>
              <Labeled label="Duración (minutos)">
                <input
                  type="number"
                  min={15}
                  className={inputClass}
                  value={draft.durationMinutes}
                  onChange={(e) => setDraft({ ...draft, durationMinutes: Number(e.target.value) })}
                />
              </Labeled>
              <Labeled label="Cupo total por salida">
                <input
                  type="number"
                  min={1}
                  className={inputClass}
                  value={draft.capacityTotal}
                  onChange={(e) => setDraft({ ...draft, capacityTotal: Number(e.target.value) })}
                />
              </Labeled>
              <Labeled label="Lugares a la venta (opcional)">
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={draft.capacityReservable}
                  onChange={(e) => setDraft({ ...draft, capacityReservable: e.target.value })}
                  placeholder="Igual al cupo total"
                />
              </Labeled>
              <Labeled label="Mínimo de personas">
                <input
                  type="number"
                  min={1}
                  className={inputClass}
                  value={draft.minParticipants}
                  onChange={(e) => setDraft({ ...draft, minParticipants: Number(e.target.value) })}
                />
              </Labeled>
              <Labeled label="Máximo por reserva (opcional)">
                <input
                  type="number"
                  min={1}
                  className={inputClass}
                  value={draft.maxParticipants}
                  onChange={(e) => setDraft({ ...draft, maxParticipants: e.target.value })}
                />
              </Labeled>
              <Labeled label="Anticipación mínima (horas)">
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={draft.minLeadHours}
                  onChange={(e) => setDraft({ ...draft, minLeadHours: Number(e.target.value) })}
                />
              </Labeled>
              <Labeled label="Horizonte de venta (días)">
                <input
                  type="number"
                  min={1}
                  max={365}
                  className={inputClass}
                  value={draft.saleHorizonDays}
                  onChange={(e) => setDraft({ ...draft, saleHorizonDays: Number(e.target.value) })}
                />
              </Labeled>
              <Labeled label="Cierre de ventas antes de salir (minutos)">
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={draft.cutoffMinutes}
                  onChange={(e) => setDraft({ ...draft, cutoffMinutes: Number(e.target.value) })}
                />
              </Labeled>
              <Labeled label="Vigente desde">
                <input
                  type="date"
                  className={inputClass}
                  value={draft.validFrom}
                  onChange={(e) => setDraft({ ...draft, validFrom: e.target.value })}
                />
              </Labeled>
              <Labeled label="Vigente hasta (opcional)">
                <input
                  type="date"
                  className={inputClass}
                  value={draft.validUntil}
                  onChange={(e) => setDraft({ ...draft, validUntil: e.target.value })}
                />
              </Labeled>
            </div>

            <fieldset>
              <legend className="text-xs text-muted-foreground">Días de operación</legend>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {WEEKDAY_LABELS.map((label, index) => {
                  const on = draft.weekdays.includes(index);
                  return (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={on}
                      className={`h-8 rounded-pill border px-3 text-xs font-semibold ${
                        on ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                      }`}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          weekdays: on
                            ? draft.weekdays.filter((d) => d !== index)
                            : [...draft.weekdays, index].sort((a, b) => a - b),
                        })
                      }
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
              />
              Patrón activo
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className={`${btn} bg-primary text-primary-foreground hover:bg-primary/90`}
                disabled={templateMutation.isPending}
              >
                Guardar patrón
              </button>
              <button type="button" className={btn} onClick={() => setDraft(null)}>
                Cancelar
              </button>
            </div>
          </form>
        )}
      </Section>

      <Section
        title="Salidas y cupo"
        action={
          <button
            type="button"
            className={btn}
            disabled={expireMutation.isPending}
            onClick={() => expireMutation.mutate()}
          >
            Liberar apartados vencidos
          </button>
        }
      >
        <p className="text-xs text-muted-foreground">
          {totals.salidas} salidas · {totals.abiertas} abiertas · {totals.disponibles} lugares
          disponibles · {totals.apartados} apartados · {totals.confirmados} confirmados
        </p>

        {(data?.departures.length ?? 0) === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Todavía no hay salidas generadas para las próximas fechas.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-1.5 pr-3">Salida</th>
                  <th className="py-1.5 pr-3">Estado</th>
                  <th className="py-1.5 pr-3">Cupo</th>
                  <th className="py-1.5 pr-3">Apartados</th>
                  <th className="py-1.5 pr-3">Confirmados</th>
                  <th className="py-1.5 pr-3">Disponibles</th>
                  <th className="py-1.5">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {(data?.departures ?? []).map((d) => (
                  <tr key={d.id} className="border-t align-top">
                    <td className="py-2 pr-3">{fmtDateTime(d.starts_at, d.timezone)}</td>
                    <td className="py-2 pr-3 text-muted-foreground">
                      {DEPARTURE_STATUS_LABEL[d.status] ?? d.status}
                      {d.blacked_out && (
                        <span className="ml-1 text-warning">· sin venta</span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      {d.capacity_reservable}
                      {d.adjustments !== 0 && (
                        <span className="text-muted-foreground">
                          {" "}
                          ({d.adjustments > 0 ? "+" : ""}
                          {d.adjustments})
                        </span>
                      )}
                      <span className="text-muted-foreground"> / {d.capacity_total}</span>
                    </td>
                    <td className="py-2 pr-3">{d.held}</td>
                    <td className="py-2 pr-3">{d.confirmed}</td>
                    <td className="py-2 pr-3 font-semibold">{d.available}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-1.5">
                        {d.status !== "cancelled" && (
                          <button
                            type="button"
                            className={btn}
                            disabled={statusMutation.isPending}
                            onClick={() =>
                              statusMutation.mutate({
                                departureId: d.id,
                                status: d.status === "closed" ? "scheduled" : "closed",
                              })
                            }
                          >
                            {d.status === "closed" ? "Reabrir" : "Cerrar"}
                          </button>
                        )}
                        {d.status !== "cancelled" && (
                          <button
                            type="button"
                            className={btn}
                            disabled={statusMutation.isPending}
                            onClick={() => {
                              const reason = window.prompt("Motivo de la cancelación:");
                              if (!reason) return;
                              statusMutation.mutate({
                                departureId: d.id,
                                status: "cancelled",
                                reason,
                              });
                            }}
                          >
                            Cancelar
                          </button>
                        )}
                        <button
                          type="button"
                          className={btn}
                          disabled={adjustMutation.isPending}
                          onClick={() => {
                            const raw = window.prompt(
                              "Lugares a sumar o restar (ejemplo: 2 o -2):",
                            );
                            if (!raw) return;
                            const delta = Number(raw);
                            if (!Number.isInteger(delta) || delta === 0) {
                              toast.error("Escribe un número entero distinto de cero.");
                              return;
                            }
                            const reason = window.prompt("Motivo del ajuste:");
                            if (!reason || reason.trim().length < 3) {
                              toast.error("El motivo es obligatorio.");
                              return;
                            }
                            adjustMutation.mutate({ departureId: d.id, delta, reason });
                          }}
                        >
                          Ajustar cupo
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Cierres de venta">
        <form
          className="grid gap-3 sm:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            blackoutMutation.mutate();
          }}
        >
          <Labeled label="Desde">
            <input
              type="datetime-local"
              className={inputClass}
              value={blackoutDraft.startsAt}
              onChange={(e) => setBlackoutDraft({ ...blackoutDraft, startsAt: e.target.value })}
              required
            />
          </Labeled>
          <Labeled label="Hasta">
            <input
              type="datetime-local"
              className={inputClass}
              value={blackoutDraft.endsAt}
              onChange={(e) => setBlackoutDraft({ ...blackoutDraft, endsAt: e.target.value })}
              required
            />
          </Labeled>
          <Labeled label="Motivo">
            <input
              className={inputClass}
              value={blackoutDraft.reason}
              onChange={(e) => setBlackoutDraft({ ...blackoutDraft, reason: e.target.value })}
              placeholder="Mantenimiento del cenote"
              required
            />
          </Labeled>
          <div className="flex items-end">
            <button type="submit" className={btn} disabled={blackoutMutation.isPending}>
              Agregar cierre
            </button>
          </div>
        </form>

        {(data?.blackouts.length ?? 0) === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Sin cierres registrados.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {(data?.blackouts ?? []).map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
              >
                <span className="min-w-0">
                  <span className="font-medium">
                    {fmtDateTime(b.starts_at, "America/Merida")} →{" "}
                    {fmtDateTime(b.ends_at, "America/Merida")}
                  </span>
                  <span className="block text-xs text-muted-foreground">{b.reason}</span>
                </span>
                <button
                  type="button"
                  className={btn}
                  disabled={removeBlackoutMutation.isPending}
                  onClick={() => removeBlackoutMutation.mutate(b.id)}
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

// Helper reservado para futuras acciones de inventario.
function useMutationLike<T>(
  fn: (payload: T) => Promise<unknown>,
  ok: string,
  invalidate: () => Promise<void> | void,
) {
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      toast.success(ok);
      void invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Operación fallida."),
  });
}
