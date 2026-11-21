/**
 * TripItineraryDocument — Itinerario de viaje con la marca oficial.
 *
 * Una sola autoridad visual para el itinerario compartido, su PDF y la
 * vista «Itinerario con marca» de Mi Viaje. Organiza las paradas ya
 * guardadas por día y hora; el viajero marca lo que ya vivió (sólo en su
 * teléfono). Al imprimir oculta el resto del sitio y cada día empieza en
 * una hoja con el logotipo.
 */
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  CalendarDays,
  Check,
  Clock,
  Footprints,
  Car,
  Landmark,
  MapPin,
  Navigation,
  Package,
  Printer,
  StickyNote,
  Users,
  Headset,
  CircleCheck,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useBrand } from "@/lib/brand/brand-context";
import {
  formatLeg,
  type ItineraryModel,
  type ItineraryStop,
} from "@/lib/traveler/itinerary-document";
import { useItineraryProgress } from "@/lib/traveler/itinerary-progress";

export const ITINERARY_DOC_ID = "vmx-itinerary-doc";

const KIND_LABEL: Record<string, string> = {
  destination: "Destino",
  business: "Lugar",
  place: "Lugar",
  product: "Experiencia",
  event: "Evento",
  route: "Ruta",
};

function KindIcon({ kind, className }: { kind: string; className?: string }) {
  const cls = className ?? "size-3.5";
  if (kind === "destination") return <MapPin className={cls} aria-hidden />;
  if (kind === "product") return <Package className={cls} aria-hidden />;
  if (kind === "event") return <CalendarDays className={cls} aria-hidden />;
  return <Landmark className={cls} aria-hidden />;
}

function formatRange(start: string | null, end: string | null): string | null {
  const fmt = (v: string) =>
    new Date(`${v}T12:00:00Z`).toLocaleDateString("es-MX", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  if (start && end && start !== end) return `${fmt(start)} — ${fmt(end)}`;
  if (start ?? end) return fmt((start ?? end) as string);
  return null;
}

function useQr(value: string | null): string | null {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!value) return;
    let cancel = false;
    QRCode.toDataURL(value, { width: 176, margin: 1, errorCorrectionLevel: "M" })
      .then((url) => !cancel && setSrc(url))
      .catch(() => !cancel && setSrc(null));
    return () => {
      cancel = true;
    };
  }, [value]);
  return value ? src : null;
}

export interface TripItineraryDocumentProps {
  planId: string;
  title: string;
  startDate: string | null;
  endDate: string | null;
  partySize: number | null;
  model: ItineraryModel;
  /** Enlace público vigente del itinerario (para el código QR del PDF). */
  shareUrl: string | null;
  /** Sólo dentro de Mi Viaje: folio del viaje confirmado. */
  folio?: string | null;
  /** Sólo dentro de Mi Viaje: enlace a la conversación con el concierge. */
  showConciergeLink?: boolean;
  /** Texto del pie (cambia entre vista pública y Mi Viaje). */
  footerNote: string;
}

export function TripItineraryDocument(props: TripItineraryDocumentProps) {
  const { model } = props;
  const brand = useBrand();
  const { done, toggle } = useItineraryProgress(props.planId);
  const qr = useQr(props.shareUrl);
  const range = formatRange(props.startDate, props.endDate);
  const doneCount = model.days.reduce(
    (n, d) => n + d.stops.filter((s) => done.has(s.id)).length,
    0,
  );
  const pct = model.stopCount ? Math.round((doneCount / model.stopCount) * 100) : 0;

  return (
    <article id={ITINERARY_DOC_ID} className="vmx-itinerary-doc text-foreground">
      <ItineraryPrintStyles />

      {/* Portada */}
      <header className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft print:rounded-none print:border-0 print:shadow-none">
        <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-secondary/40 px-5 py-3 sm:px-8">
          <BrandLogo size="md" />
          <p className="text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            Itinerario de viaje
          </p>
        </div>
        <div className="px-5 py-5 sm:px-8 sm:py-7">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Oriente Maya de Yucatán
          </p>
          <h1 className="mt-1 text-balance font-serif text-2xl font-semibold leading-tight sm:text-3xl">
            {props.title}
          </h1>
          <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
            {range ? (
              <div className="inline-flex items-center gap-1.5">
                <dt className="sr-only">Fechas</dt>
                <CalendarDays className="size-4 text-primary" aria-hidden />
                <dd>{range}</dd>
              </div>
            ) : null}
            {props.partySize ? (
              <div className="inline-flex items-center gap-1.5">
                <dt className="sr-only">Personas</dt>
                <Users className="size-4 text-primary" aria-hidden />
                <dd>
                  {props.partySize} persona{props.partySize === 1 ? "" : "s"}
                </dd>
              </div>
            ) : null}
            {props.folio ? (
              <div className="inline-flex items-center gap-1.5">
                <dt className="text-xs uppercase tracking-wider">Folio</dt>
                <dd className="font-mono font-semibold tracking-[0.12em] text-foreground">
                  {props.folio}
                </dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <SummaryCell
              value={model.datedDayCount || "—"}
              label={model.datedDayCount === 1 ? "día" : "días"}
            />
            <SummaryCell
              value={model.stopCount}
              label={model.stopCount === 1 ? "parada" : "paradas"}
            />
            <SummaryCell
              value={model.destinations.length || "—"}
              label={model.destinations.length === 1 ? "destino" : "destinos"}
            />
          </div>
          {model.destinations.length ? (
            <p className="mt-3 text-sm text-muted-foreground">
              <MapPin className="mr-1 inline size-3.5 text-primary" aria-hidden />
              {model.destinations.join(" · ")}
            </p>
          ) : null}

          {model.stopCount > 0 ? (
            <div className="mt-4 print:hidden" aria-live="polite">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">Tu avance</span>
                <span className="text-muted-foreground">
                  {doneCount} de {model.stopCount} paradas hechas
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-pill bg-muted">
                <div
                  className="h-full rounded-pill bg-success transition-[width] duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2 print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-h-11 items-center gap-2 rounded-pill bg-primary px-4 text-sm font-medium text-primary-foreground shadow-soft transition hover:opacity-95"
            >
              <Printer className="size-4" aria-hidden />
              Guardar PDF / Imprimir
            </button>
            {props.showConciergeLink ? (
              <Link
                to="/cuenta/mi-viaje"
                search={{ vista: "concierge" }}
                className="inline-flex min-h-11 items-center gap-2 rounded-pill border border-border bg-background px-4 text-sm font-medium transition hover:bg-accent"
              >
                <Headset className="size-4 text-primary" aria-hidden />
                Hablar con tu concierge
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      {/* Días */}
      {model.days.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Este itinerario aún no tiene paradas.
        </p>
      ) : (
        <div className="mt-6 space-y-5">
          {model.days.map((day, dayPos) => {
            const dayDone = day.stops.filter((s) => done.has(s.id)).length;
            return (
              <section
                key={day.key}
                aria-labelledby={`itin-${day.key}`}
                className={`vmx-itin-day overflow-hidden rounded-2xl border border-border bg-card ${dayPos > 0 ? "vmx-itin-day-break" : ""}`}
              >
                <div className="hidden items-center justify-between border-b border-border/70 px-5 py-2 print:flex">
                  <BrandLogo size="sm" />
                  <span className="text-[10px] text-muted-foreground">{props.title}</span>
                </div>
                <div className="flex items-center gap-3 border-b border-border/70 bg-secondary/30 px-4 py-3 sm:px-6">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary font-serif text-base font-semibold text-primary-foreground">
                    {day.dayIndex === null ? "•" : day.dayIndex + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2
                      id={`itin-${day.key}`}
                      className="font-serif text-lg font-semibold leading-tight"
                    >
                      {day.title}
                    </h2>
                    {day.dateLabel ? (
                      <p className="text-sm text-muted-foreground">{day.dateLabel}</p>
                    ) : null}
                  </div>
                  <span className="shrink-0 rounded-pill border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground print:hidden">
                    {dayDone}/{day.stops.length}
                  </span>
                </div>
                <ol className="px-4 py-4 sm:px-6">
                  {day.stops.map((stop, idx) => (
                    <StopRow
                      key={stop.id}
                      stop={stop}
                      last={idx === day.stops.length - 1}
                      dayHasTimes={day.stops.some((s) => s.time)}
                      done={done.has(stop.id)}
                      onToggle={() => toggle(stop.id)}
                    />
                  ))}
                </ol>
              </section>
            );
          })}
        </div>
      )}

      {model.notes.length ? (
        <section
          className="mt-5 rounded-2xl border border-border bg-card p-5 sm:p-6"
          aria-labelledby="itin-notes"
        >
          <h2 id="itin-notes" className="flex items-center gap-2 font-serif text-lg font-semibold">
            <StickyNote className="size-4 text-primary" aria-hidden /> Notas del viaje
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {model.notes.map((n) => (
              <li key={n.id}>
                <span className="font-medium">{n.title}</span>
                {n.body ? <span className="text-muted-foreground"> · {n.body}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Pie de marca */}
      <footer className="vmx-itin-footer mt-6 flex flex-col gap-4 rounded-2xl border border-border bg-secondary/30 p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="min-w-0 flex-1">
          <BrandLogo size="sm" />
          <p className="mt-2 text-xs font-medium text-foreground">{brand.tagline}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{props.footerNote}</p>
        </div>
        {qr ? (
          <div className="flex shrink-0 items-center gap-3">
            <img
              src={qr}
              alt="Código QR del itinerario"
              width={88}
              height={88}
              className="rounded-md border border-border bg-background p-1"
            />
            <p className="max-w-[9rem] text-[11px] leading-snug text-muted-foreground">
              Escanea para ver tu itinerario al día en el celular.
            </p>
          </div>
        ) : null}
      </footer>
    </article>
  );
}

function SummaryCell({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background px-2 py-2">
      <p className="font-serif text-xl font-semibold leading-none">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function StopRow({
  stop,
  last,
  done,
  onToggle,
  dayHasTimes,
}: {
  stop: ItineraryStop;
  last: boolean;
  dayHasTimes: boolean;
  done: boolean;
  onToggle: () => void;
}) {
  return (
    <li
      className={`vmx-itin-stop grid gap-x-3 ${dayHasTimes ? "grid-cols-[3.25rem_1fr]" : "grid-cols-[0.75rem_1fr]"}`}
    >
      {/* Hora + línea de tiempo */}
      <div className="relative flex flex-col items-center">
        <span
          className={`text-center text-xs font-semibold tabular-nums ${stop.time ? "text-foreground" : "text-muted-foreground"}`}
        >
          {stop.time ?? (dayHasTimes ? "Sin hora" : "")}
        </span>
        {stop.endTime ? (
          <span className="text-[10px] tabular-nums text-muted-foreground">{stop.endTime}</span>
        ) : null}
        <span
          className={`mt-1.5 size-3 shrink-0 rounded-full border-2 ${done ? "border-success bg-success" : "border-primary bg-background"}`}
          aria-hidden
        />
        {!last ? <span className="w-px flex-1 bg-border" aria-hidden /> : null}
      </div>

      <div className={`min-w-0 ${last ? "" : "pb-4"}`}>
        <div
          className={`rounded-xl border p-3 transition-colors ${done ? "border-success/40 bg-success/5" : "border-border/70 bg-background"}`}
        >
          <div className="flex gap-3">
            {stop.imageUrl ? (
              <img
                src={stop.imageUrl}
                alt=""
                loading="lazy"
                className="size-16 shrink-0 rounded-lg object-cover sm:size-20"
              />
            ) : (
              <div className="grid size-16 shrink-0 place-items-center rounded-lg bg-secondary/60 text-primary sm:size-20">
                <KindIcon kind={stop.kind} className="size-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <KindIcon kind={stop.kind} className="size-3" />
                {KIND_LABEL[stop.kind] ?? "Parada"}
                {stop.durationMinutes ? (
                  <span className="normal-case tracking-normal">
                    · <Clock className="-mt-0.5 inline size-3" aria-hidden /> {stop.durationMinutes}{" "}
                    min
                  </span>
                ) : null}
              </p>
              <h3
                className={`text-[15px] font-semibold leading-snug ${done ? "text-muted-foreground line-through decoration-success/60" : ""}`}
              >
                {stop.title}
              </h3>
              {stop.subtitle ? (
                <p className="truncate text-xs text-muted-foreground">{stop.subtitle}</p>
              ) : null}
              {stop.reserved ? (
                <p className="mt-1 inline-flex items-center gap-1 rounded-pill bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                  <CircleCheck className="size-3 text-success" aria-hidden /> Reservado con tu
                  concierge
                </p>
              ) : null}
              {stop.note ? <p className="mt-1 text-xs text-muted-foreground">{stop.note}</p> : null}
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onToggle}
              aria-pressed={done}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-pill border px-3 text-xs font-medium transition print:hidden ${done ? "border-success bg-success text-success-foreground" : "border-border bg-card hover:bg-accent"}`}
            >
              <Check className="size-3.5" aria-hidden />
              {done ? "Hecho" : "Marcar hecho"}
            </button>
            <a
              href={stop.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-pill border border-border bg-card px-3 text-xs font-medium text-primary transition hover:bg-accent print:hidden"
            >
              <Navigation className="size-3.5" aria-hidden />
              Cómo llegar
            </a>
            <span className="hidden items-center gap-1.5 text-xs print:inline-flex">
              <span
                className="inline-block size-3.5 rounded-sm border border-foreground/60"
                aria-hidden
              />
              Hecho
            </span>
          </div>
        </div>
        {stop.legToNext ? (
          <p className="mt-2 inline-flex items-center gap-1.5 pl-1 text-[11px] text-muted-foreground">
            {stop.legToNext.mode === "walk" ? (
              <Footprints className="size-3.5" aria-hidden />
            ) : (
              <Car className="size-3.5" aria-hidden />
            )}
            {formatLeg(stop.legToNext)} a la siguiente parada
          </p>
        ) : null}
      </div>
    </li>
  );
}

/**
 * Impresión: sólo el itinerario (oculta encabezado, pie, Alux y paneles
 * del sitio), colores de marca y cada día desde una hoja nueva.
 */
function ItineraryPrintStyles() {
  return (
    <style>{`
      @media print {
        @page { margin: 12mm 12mm 14mm; }
        html, body { background: #fff !important; }
        body:has(#${ITINERARY_DOC_ID}) *:not(#${ITINERARY_DOC_ID}):not(#${ITINERARY_DOC_ID} *):not(:has(#${ITINERARY_DOC_ID})) { display: none !important; }
        body:has(#${ITINERARY_DOC_ID}) *:has(#${ITINERARY_DOC_ID}) { margin: 0 !important; padding: 0 !important; max-width: none !important; border: 0 !important; box-shadow: none !important; background: transparent !important; position: static !important; overflow: visible !important; height: auto !important; min-height: 0 !important; transform: none !important; }
        #${ITINERARY_DOC_ID} { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 11pt; }
        #${ITINERARY_DOC_ID} .vmx-itin-day-break { break-before: page; }
        #${ITINERARY_DOC_ID} .vmx-itin-stop, #${ITINERARY_DOC_ID} .vmx-itin-footer { break-inside: avoid; }
      }
    `}</style>
  );
}
