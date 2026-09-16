/**
 * Estudio de Propuesta del Concierge (2026-09-14).
 *
 * Pantalla propia para armar una propuesta profesional a partir de:
 *  - lo que el viajero guardó al navegar el territorio (Arma tu viaje),
 *  - las cotizaciones recibidas de empresas,
 *  - partidas propias del Concierge con precios ya acordados.
 *
 * Cada partida puede llevar día, hora local del destino (America/Merida) y
 * duración, de modo que al aceptar la propuesta el itinerario pase al viaje.
 * No sustituye ninguna superficie aprobada: el expediente sigue igual y sólo
 * abre esta pantalla con un botón.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createConciergeProposal } from "@/lib/concierge/concierge.functions";
import { aluxSuggestProposalSchedule } from "@/lib/concierge/proposal-studio.functions";
import {
  dayLabel,
  formatDurationLabel,
  formatMoneyCents,
  normalizeTime,
  parseAmountToCents,
  tripDayCount,
  PROPOSAL_CURRENCY,
} from "./format";

/* ----------------------------- Contratos UI ----------------------------- */

export interface StudioCaseFile {
  case: { id: string; summary: string | null; status: string };
  viewer: { is_internal: boolean };
  traveler?: { display_name?: string | null; email?: string | null } | null;
  travel_plan?: {
    id: string;
    title?: string | null;
    party_size?: number | null;
    start_date?: string | null;
    end_date?: string | null;
    notes?: string | null;
    items?: Array<{
      id: string;
      item_kind: string;
      target_id?: string | null;
      title?: string | null;
      subtitle?: string | null;
      notes?: string | null;
    }>;
  } | null;
  quotes?: Array<{
    quote_id: string;
    request_title: string;
    business_name?: string | null;
    status: string;
    total_amount_cents: number | null;
    currency: string;
  }>;
  proposals?: Array<{ proposal_id: string; version: number }>;
}

type LineSource = "quote" | "manual" | "alux";
type TargetKind = "destination" | "business" | "product" | "event" | "route" | "place" | "note";

interface StudioLine {
  key: string;
  source: LineSource;
  quoteId?: string;
  title: string;
  notes: string;
  amount: string;
  isSuggestion: boolean;
  dayIndex: number | null;
  startsAt: string;
  durationMinutes: string;
  targetKind: TargetKind | null;
  targetId: string | null;
}

function newLine(patch: Partial<StudioLine> = {}): StudioLine {
  return {
    key: `l-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    source: "manual",
    title: "",
    notes: "",
    amount: "",
    isSuggestion: false,
    dayIndex: null,
    startsAt: "",
    durationMinutes: "",
    targetKind: null,
    targetId: null,
    ...patch,
  };
}

const PLAN_KIND_TO_TARGET: Record<string, TargetKind> = {
  destination: "destination",
  business: "business",
  product: "product",
  event: "event",
  route: "route",
  place: "place",
  note: "note",
};

/* ------------------------------ Componente ------------------------------ */

export function ProposalStudio({ data }: { data: StudioCaseFile }) {
  const router = useRouter();
  const createFn = useServerFn(createConciergeProposal);
  const scheduleFn = useServerFn(aluxSuggestProposalSchedule);
  const caseId = data.case.id;
  const plan = data.travel_plan ?? null;
  const quotes = (data.quotes ?? []).filter((q) => q.status === "submitted");
  const storageKey = `vll:proposal-studio:v1:${caseId}`;

  const [lines, setLines] = useState<StudioLine[]>([]);
  const [summary, setSummary] = useState("");
  const [terms, setTerms] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [busy, setBusy] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const restored = useRef(false);

  const days = tripDayCount(plan?.start_date, plan?.end_date);
  const version = (data.proposals?.length ?? 0) + 1;

  /* Borrador local: se recupera al volver y se guarda solo. */
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        lines?: StudioLine[];
        summary?: string;
        terms?: string;
        validUntil?: string;
      };
      if (Array.isArray(saved.lines) && saved.lines.length > 0) setLines(saved.lines);
      if (saved.summary) setSummary(saved.summary);
      if (saved.terms) setTerms(saved.terms);
      if (saved.validUntil) setValidUntil(saved.validUntil);
    } catch {
      /* borrador local opcional */
    }
  }, [storageKey]);

  useEffect(() => {
    if (!restored.current) return;
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ lines, summary, terms, validUntil }),
      );
    } catch {
      /* almacenamiento no disponible */
    }
  }, [storageKey, lines, summary, terms, validUntil]);

  const update = useCallback((key: string, patch: Partial<StudioLine>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }, []);

  const remove = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const addQuote = useCallback(
    (quote: NonNullable<StudioCaseFile["quotes"]>[number]) => {
      setLines((prev) =>
        prev.some((l) => l.quoteId === quote.quote_id)
          ? prev
          : [
              ...prev,
              newLine({
                source: "quote",
                quoteId: quote.quote_id,
                title: `${quote.business_name ?? "Empresa"} · ${quote.request_title}`,
                amount: ((quote.total_amount_cents ?? 0) / 100).toFixed(2),
              }),
            ],
      );
    },
    [],
  );

  const addPlanItem = useCallback(
    (item: NonNullable<NonNullable<StudioCaseFile["travel_plan"]>["items"]>[number]) => {
      const kind = PLAN_KIND_TO_TARGET[item.item_kind] ?? null;
      setLines((prev) => [
        ...prev,
        newLine({
          title: item.title ?? "Actividad",
          notes: item.subtitle ?? "",
          targetKind: kind && kind !== "note" ? kind : null,
          targetId: kind && kind !== "note" ? (item.target_id ?? null) : null,
        }),
      ]);
    },
    [],
  );

  /* --------------------------- Validación y total -------------------------- */

  const prepared = useMemo(
    () =>
      lines
        .map((line) => {
          const title = line.title.trim();
          const cents = line.isSuggestion ? 0 : parseAmountToCents(line.amount);
          const time = normalizeTime(line.startsAt);
          const duration = line.durationMinutes ? Number(line.durationMinutes) : null;
          const valid =
            line.source === "quote" ? Boolean(line.quoteId) : title.length >= 3 && cents !== null;
          return { line, title, cents, time, duration, valid };
        })
        .filter((entry) => entry.valid),
    [lines],
  );

  const totalCents = prepared.reduce(
    (sum, entry) => sum + (entry.line.isSuggestion ? 0 : (entry.cents ?? 0)),
    0,
  );

  /* Avisos: choques de horario y partidas sin día. */
  const warnings = useMemo(() => {
    const list: string[] = [];
    const byDay = new Map<number, Array<{ title: string; start: number; end: number }>>();
    for (const entry of prepared) {
      const { line } = entry;
      if (line.dayIndex == null || !entry.time) continue;
      const [h, m] = entry.time.split(":").map(Number);
      const start = h * 60 + m;
      const end = start + (entry.duration && entry.duration > 0 ? entry.duration : 60);
      const day = byDay.get(line.dayIndex) ?? [];
      day.push({ title: entry.title || "Partida", start, end });
      byDay.set(line.dayIndex, day);
    }
    for (const [day, items] of byDay) {
      const sorted = [...items].sort((a, b) => a.start - b.start);
      for (let i = 1; i < sorted.length; i += 1) {
        if (sorted[i].start < sorted[i - 1].end) {
          list.push(
            `${dayLabel(day, plan?.start_date)}: "${sorted[i - 1].title}" se encima con "${sorted[i].title}".`,
          );
        }
      }
    }
    const sinDia = prepared.filter((e) => e.line.dayIndex == null).length;
    if (sinDia > 0) {
      list.push(
        `${sinDia} partida(s) sin día asignado: el viajero las verá sin horario en su itinerario.`,
      );
    }
    return list;
  }, [prepared, plan?.start_date]);

  /* ------------------- Alux · propone día y hora del destino ------------------- */

  const suggestSchedule = useCallback(async () => {
    if (scheduling) return;
    const candidates = lines
      .map((line, index) => ({ line, index }))
      .filter((e) => e.line.title.trim().length >= 3);
    if (candidates.length === 0) return;
    setScheduling(true);
    try {
      const res = await scheduleFn({
        data: {
          days,
          startDate: plan?.start_date ?? null,
          items: candidates.map((e) => ({
            index: e.index,
            title: e.line.title.trim(),
            ...(e.line.notes.trim() ? { notes: e.line.notes.trim().slice(0, 400) } : {}),
            dayIndex: e.line.dayIndex,
            ...(normalizeTime(e.line.startsAt) ? { startsAt: normalizeTime(e.line.startsAt)! } : {}),
            durationMinutes: e.line.durationMinutes ? Number(e.line.durationMinutes) : null,
          })),
        },
      });
      const byIndex = new Map(res.items.map((s) => [s.index, s]));
      setLines((prev) =>
        prev.map((line, index) => {
          const s = byIndex.get(index);
          if (!s) return line;
          return {
            ...line,
            dayIndex: line.dayIndex ?? s.dayIndex,
            startsAt: normalizeTime(line.startsAt) ? line.startsAt : s.startsAt,
            durationMinutes: line.durationMinutes
              ? line.durationMinutes
              : s.durationMinutes
                ? String(s.durationMinutes)
                : "",
          };
        }),
      );
      toast.success(
        `Alux propuso día y hora para ${res.items.length} partida(s). Revísalas y ajusta lo que haga falta.`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      toast.error(
        msg.includes("forbidden")
          ? "Sólo el equipo interno puede pedirle a Alux que arme la agenda."
          : "Alux no pudo armar la agenda ahora. Inténtalo de nuevo en un momento.",
      );
    } finally {
      setScheduling(false);
    }
  }, [scheduling, lines, scheduleFn, days, plan?.start_date]);

  /* ------------------------------ Guardar ------------------------------ */

  const saveDraft = useCallback(async () => {
    if (prepared.length === 0 || busy) return;
    setBusy(true);
    try {
      const items = prepared.map((entry) => {
        const base = {
          notes: entry.line.notes.trim() || null,
          day_index: entry.line.dayIndex,
          starts_at_local: entry.time,
          duration_minutes: entry.duration && entry.duration > 0 ? entry.duration : null,
          target_kind: entry.line.targetKind,
          target_id: entry.line.targetId,
        };
        if (entry.line.source === "quote") {
          return { ...base, quote_id: entry.line.quoteId!, title: entry.title || null };
        }
        return {
          ...base,
          title: entry.title,
          amount_cents: entry.line.isSuggestion ? 0 : (entry.cents ?? 0),
          currency: PROPOSAL_CURRENCY,
          is_suggestion: entry.line.isSuggestion,
          source: entry.line.isSuggestion ? ("alux" as const) : ("manual" as const),
        };
      });
      await createFn({
        data: {
          caseId,
          items,
          summary: summary.trim() || null,
          terms: terms.trim() || null,
          validUntil: validUntil ? new Date(`${validUntil}T23:59:59`).toISOString() : null,
        },
      });
      window.localStorage.removeItem(storageKey);
      toast.success("Borrador creado. Revísalo en el expediente antes de enviarlo al viajero.");
      await router.invalidate();
      await router.navigate({
        to: "/concierge/expedientes/$caseId",
        params: { caseId },
        hash: "case-proposals",
      });
    } catch (error) {
      toast.error("No fue posible crear el borrador", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }, [prepared, busy, createFn, caseId, summary, terms, validUntil, storageKey, router]);

  /* Atajos: Ctrl+Enter guarda borrador, Ctrl+D duplica la última partida. */
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key === "Enter") {
        event.preventDefault();
        void saveDraft();
      }
      if (event.key.toLowerCase() === "d") {
        event.preventDefault();
        setLines((prev) => {
          const last = prev[prev.length - 1];
          return last ? [...prev, newLine({ ...last, key: undefined as never })] : prev;
        });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveDraft]);

  if (!data.viewer.is_internal) {
    return (
      <p className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
        Esta pantalla es del equipo Concierge.
      </p>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)_320px]">
      {/* Columna 1 · lo que quiere el viajero */}
      <aside className="grid content-start gap-3">
        <Panel title="Lo que pidió el viajero">
          <dl className="grid gap-1 text-xs text-muted-foreground">
            <div className="flex justify-between gap-2">
              <dt>Personas</dt>
              <dd className="text-foreground">{plan?.party_size ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Días</dt>
              <dd className="text-foreground">{days}</dd>
            </div>
          </dl>
          {plan?.notes ? (
            <p className="mt-2 whitespace-pre-line text-xs text-foreground/80">{plan.notes}</p>
          ) : null}
          {data.case.summary ? (
            <p className="mt-2 text-xs text-muted-foreground">{data.case.summary}</p>
          ) : null}
        </Panel>

        <Panel title="Guardado en Arma tu viaje">
          {(plan?.items ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">
              El viajero todavía no guardó lugares en su viaje.
            </p>
          ) : (
            <ul className="grid gap-1.5">
              {(plan?.items ?? []).map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border/70 bg-background/70 px-2 py-1.5 text-xs"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-foreground">
                      {item.title ?? "Actividad"}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{item.item_kind}</span>
                  </span>
                  <Button type="button" size="sm" variant="outline" onClick={() => addPlanItem(item)}>
                    Agregar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Cotizaciones recibidas">
          {quotes.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Sin cotizaciones recibidas. Si necesitas el precio de una empresa, solicítalo desde el
              expediente.
            </p>
          ) : (
            <ul className="grid gap-1.5">
              {quotes.map((quote) => (
                <li
                  key={quote.quote_id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border/70 bg-background/70 px-2 py-1.5 text-xs"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-foreground">
                      {quote.business_name ?? "Empresa"} · {quote.request_title}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {formatMoneyCents(quote.total_amount_cents, quote.currency)}
                    </span>
                  </span>
                  <Button type="button" size="sm" variant="outline" onClick={() => addQuote(quote)}>
                    Agregar
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <Link
            to="/concierge/expedientes/$caseId"
            params={{ caseId }}
            hash="case-requests"
            className="mt-2 inline-block text-[11px] font-medium text-primary underline-offset-2 hover:underline"
          >
            Solicitar cotización a una empresa
          </Link>
        </Panel>
      </aside>

      {/* Columna 2 · partidas de la propuesta */}
      <section className="grid content-start gap-3">
        <Panel title={`Partidas de la propuesta (v${version})`}>
          {lines.length === 0 ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Agrega partidas desde lo que guardó el viajero, desde una cotización recibida o
              escríbelas tú con el precio que ya tienes acordado. Cada partida puede llevar día,
              hora del destino y duración para armar el itinerario.
            </p>
          ) : (
            <ul className="grid gap-2">
              {lines.map((line) => (
                <LineRow
                  key={line.key}
                  line={line}
                  days={days}
                  startDate={plan?.start_date ?? null}
                  onChange={(patch) => update(line.key, patch)}
                  onRemove={() => remove(line.key)}
                />
              ))}
            </ul>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setLines((p) => [...p, newLine()])}>
              Agregar partida
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setLines((p) => [...p, newLine({ isSuggestion: true, amount: "0" })])}
            >
              Agregar sugerencia sin costo
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={scheduling || lines.filter((l) => l.title.trim().length >= 3).length === 0}
              onClick={suggestSchedule}
            >
              {scheduling ? "Alux está armando la agenda…" : "Armar agenda con Alux"}
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Alux propone día, hora del destino y duración para cada partida; puedes ajustar todo
            antes de guardar. Atajos: Ctrl/Cmd + Enter guarda el borrador · Ctrl/Cmd + D duplica la
            última partida.
          </p>
        </Panel>
      </section>

      {/* Columna 3 · resumen y envío */}
      <aside className="grid content-start gap-3">
        <Panel title="Resumen del itinerario">
          <DaySummary lines={prepared.map((e) => ({ ...e.line, resolvedTitle: e.title, time: e.time }))} days={days} startDate={plan?.start_date ?? null} />
        </Panel>

        {warnings.length > 0 ? (
          <Panel title="Revisa antes de enviar">
            <ul className="grid gap-1 text-[11px] text-foreground/80">
              {warnings.map((w) => (
                <li key={w}>• {w}</li>
              ))}
            </ul>
          </Panel>
        ) : null}

        <Panel title="Cierre de la propuesta">
          <p className="text-sm font-semibold text-foreground">
            Total: {formatMoneyCents(totalCents)}
          </p>
          <p className="mb-2 text-[11px] text-muted-foreground">
            Las sugerencias sin costo no suman al total.
          </p>
          <textarea
            className="w-full rounded border border-border bg-background p-2 text-xs"
            rows={3}
            maxLength={1000}
            placeholder="Mensaje al viajero: qué incluye esta propuesta"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
          <textarea
            className="mt-2 w-full rounded border border-border bg-background p-2 text-xs"
            rows={3}
            maxLength={4000}
            placeholder="Condiciones, cambios y consideraciones"
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
          />
          <label className="mt-2 grid gap-1 text-xs font-medium text-muted-foreground">
            Vigencia
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="h-10 rounded border border-border bg-background px-2 text-foreground"
            />
          </label>
          <Button
            type="button"
            className="mt-3 w-full"
            disabled={busy || prepared.length === 0}
            onClick={() => void saveDraft()}
          >
            Guardar borrador
          </Button>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            El envío al viajero se hace desde el expediente, después de revisar el borrador.
          </p>
        </Panel>
      </aside>
    </div>
  );
}

/* ------------------------------ Subcomponentes ------------------------------ */

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </h2>
      {children}
    </div>
  );
}

function LineRow({
  line,
  days,
  startDate,
  onChange,
  onRemove,
}: {
  line: StudioLine;
  days: number;
  startDate: string | null;
  onChange: (patch: Partial<StudioLine>) => void;
  onRemove: () => void;
}) {
  const sourceLabel =
    line.source === "quote"
      ? "Cotización de empresa"
      : line.isSuggestion
        ? "Sugerencia sin costo"
        : "Partida del Concierge";

  return (
    <li className="rounded-md border border-border/70 bg-background/70 p-2.5">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          {sourceLabel}
        </span>
        <Button type="button" size="sm" variant="outline" className="ml-auto" onClick={onRemove}>
          Quitar
        </Button>
      </div>
      <input
        className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs"
        placeholder="Concepto (ej. Tour a Ek Balam con transporte y guía)"
        maxLength={200}
        value={line.title}
        onChange={(e) => onChange({ title: e.target.value })}
      />
      <textarea
        className="mt-2 w-full rounded border border-border bg-background p-2 text-xs"
        rows={2}
        maxLength={1000}
        placeholder="Descripción para el viajero: qué incluye, punto de encuentro, condiciones"
        value={line.notes}
        onChange={(e) => onChange({ notes: e.target.value })}
      />
      <div className="mt-2 grid gap-2 sm:grid-cols-4">
        <label className="grid gap-1 text-[11px] text-muted-foreground">
          Día
          <select
            className="h-9 rounded border border-border bg-background px-2 text-xs text-foreground"
            value={line.dayIndex == null ? "" : String(line.dayIndex)}
            onChange={(e) => onChange({ dayIndex: e.target.value === "" ? null : Number(e.target.value) })}
          >
            <option value="">Sin día</option>
            {Array.from({ length: days }, (_, i) => (
              <option key={i} value={i}>
                {dayLabel(i, startDate)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-[11px] text-muted-foreground">
          Hora (Mérida)
          <input
            type="time"
            className="h-9 rounded border border-border bg-background px-2 text-xs text-foreground"
            value={line.startsAt}
            onChange={(e) => onChange({ startsAt: e.target.value })}
          />
        </label>
        <label className="grid gap-1 text-[11px] text-muted-foreground">
          Duración (min)
          <input
            type="number"
            min={1}
            max={1440}
            step={15}
            inputMode="numeric"
            className="h-9 rounded border border-border bg-background px-2 text-xs text-foreground"
            placeholder="90"
            value={line.durationMinutes}
            onChange={(e) => onChange({ durationMinutes: e.target.value })}
          />
        </label>
        <label className="grid gap-1 text-[11px] text-muted-foreground">
          Precio (MXN)
          <input
            type="text"
            inputMode="decimal"
            className="h-9 rounded border border-border bg-background px-2 text-right font-mono text-xs text-foreground disabled:opacity-60"
            placeholder="0.00"
            disabled={line.isSuggestion || line.source === "quote"}
            value={line.isSuggestion ? "0.00" : line.amount}
            onChange={(e) => onChange({ amount: e.target.value })}
            onBlur={(e) => {
              const cents = parseAmountToCents(e.target.value);
              if (cents != null) onChange({ amount: (cents / 100).toFixed(2) });
            }}
          />
        </label>
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        {line.isSuggestion
          ? "Se mostrará como recomendación sin costo."
          : `Importe: ${formatMoneyCents(parseAmountToCents(line.amount))}`}
        {line.durationMinutes ? ` · ${formatDurationLabel(Number(line.durationMinutes))}` : ""}
      </p>
    </li>
  );
}

function DaySummary({
  lines,
  days,
  startDate,
}: {
  lines: Array<StudioLine & { resolvedTitle: string; time: string | null }>;
  days: number;
  startDate: string | null;
}) {
  if (lines.length === 0) {
    return <p className="text-xs text-muted-foreground">Todavía no hay partidas.</p>;
  }
  return (
    <div className="grid gap-2">
      {Array.from({ length: days }, (_, day) => {
        const items = lines
          .filter((l) => l.dayIndex === day)
          .sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99"));
        if (items.length === 0) return null;
        return (
          <div key={day}>
            <p className="text-[11px] font-semibold text-foreground">{dayLabel(day, startDate)}</p>
            <ul className="mt-1 grid gap-1">
              {items.map((item) => (
                <li key={item.key} className="flex gap-2 text-[11px] text-muted-foreground">
                  <span className="w-12 shrink-0 font-mono text-foreground/80">
                    {item.time ?? "--:--"}
                  </span>
                  <span className="min-w-0 truncate">{item.resolvedTitle || "Partida"}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      {lines.some((l) => l.dayIndex == null) ? (
        <p className="text-[11px] text-muted-foreground">
          {lines.filter((l) => l.dayIndex == null).length} partida(s) sin día.
        </p>
      ) : null}
    </div>
  );
}
