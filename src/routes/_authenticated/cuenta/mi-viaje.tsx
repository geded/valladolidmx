/**
 * /cuenta/mi-viaje — Workspace del Viajero (Iniciativa 7 · Sub-ola D).
 *
 * Convierte "Mi Viaje" en el expediente real del turista sobre el
 * Travel Workspace. Toda operación pasa por travel-plans.functions.ts
 * (Sub-ola B); ninguna UI escribe directo a la BD.
 *
 * Alcance v1:
 *  - Lectura del plan activo (getMyActivePlan).
 *  - Editor de metadatos del plan (título, fechas, party_size, notas).
 *  - Items agrupados por kind (destinos, empresas, productos, eventos, notas).
 *  - Eliminar item, editar notas del item.
 *  - Migración de cola de invitados (localStorage → plan activo).
 *  - Envío al Concierge sin cambiar la lógica del módulo (Sub-ola E).
 */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Trash2, Save, Users, Calendar, MapPin, Building2, ShoppingBag, Ticket, StickyNote, Plus, Share2, Copy, ExternalLink, Printer, Headset, CheckCircle2, Circle, Bell, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  addPlanItem,
  disableShareLink,
  enableShareLink,
  getMyActivePlan,
  promotePlanToCase,
  removePlanItem,
  updatePlanItem,
  updatePlanMeta,
  type TravelItemKind,
  type TravelPlanItem,
  type TravelPlanWithItems,
} from "@/lib/traveler/travel-plans.functions";
import { getAluxConciergeContext } from "@/lib/alux/concierge-context.functions";
import { getMyConfirmedTravel } from "@/lib/concierge/orders.functions";
import {
  clearGuestQueue,
  readGuestQueue,
  type GuestQueueItem,
} from "@/lib/traveler/guest-queue";
import { ccListMyCases } from "@/lib/concierge/cc.functions";
import { AluxTravelerPanel } from "@/components/traveler/AluxTravelerPanel";
import { AluxPlanProposalsInbox } from "@/components/traveler/AluxPlanProposalsInbox";
import { CalendarCheck, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cuenta/mi-viaje")({
  component: MiViajePage,
});

const KIND_META: Record<
  TravelItemKind,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  destination: { label: "Destinos", icon: MapPin },
  business: { label: "Empresas", icon: Building2 },
  product: { label: "Productos", icon: ShoppingBag },
  event: { label: "Eventos", icon: Ticket },
  note: { label: "Notas", icon: StickyNote },
};
const KIND_ORDER: TravelItemKind[] = ["destination", "business", "product", "event", "note"];

function MiViajePage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const fetchActive = useServerFn(getMyActivePlan);
  const fetchCases = useServerFn(ccListMyCases);
  const fetchConcierge = useServerFn(getAluxConciergeContext);
  const fetchConfirmed = useServerFn(getMyConfirmedTravel);

  const activeQ = useQuery({
    queryKey: ["traveler", "active-plan", user?.id],
    queryFn: () => fetchActive(),
    staleTime: 15_000,
  });
  const { data: cases = [] } = useQuery({
    queryKey: ["cc", "my-cases"],
    queryFn: () => fetchCases(),
    staleTime: 30_000,
  });
  const { data: concierge } = useQuery({
    queryKey: ["alux", "concierge-ctx", user?.id],
    queryFn: () => fetchConcierge(),
    staleTime: 30_000,
  });
  const { data: confirmed } = useQuery({
    queryKey: ["traveler", "confirmed-travel", user?.id],
    queryFn: () => fetchConfirmed(),
    staleTime: 30_000,
  });
  const reservedIds = useMemo(() => {
    const s = new Set<string>();
    if (!concierge?.has_concierge) return s;
    for (const arr of [
      concierge.reserved_business_ids,
      concierge.reserved_product_ids,
      concierge.reserved_event_ids,
      concierge.reserved_destination_ids,
    ]) {
      for (const id of arr) s.add(id);
    }
    return s;
  }, [concierge]);

  const invalidatePlan = () =>
    {
      qc.invalidateQueries({ queryKey: ["traveler", "active-plan", user?.id] });
      // A15 · notifica al Concierge para refrescar snapshot inmediato.
      void import("@/lib/alux/plan-signals").then(({ notifyPlanChanged }) =>
        notifyPlanChanged("mi-viaje"),
      );
    };

  return (
    <div className="max-w-5xl space-y-8">
      <header>
        <h1 className="text-3xl font-semibold">Mi Viaje</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tu expediente personal del Oriente Maya. Todo lo que guardas desde
          las tarjetas del ecosistema aparece aquí, listo para enviarlo a tu
          Concierge cuando estés listo.
        </p>
      </header>

      <GuestImportBanner onImported={invalidatePlan} />

      {confirmed && confirmed.status !== "refunded" ? (
        <>
          <ConfirmedTravelBanner data={confirmed} />
          <TripPhaseCard data={confirmed} />
          <ConfirmedTripTimeline data={confirmed} />
        </>
      ) : null}

      <AluxPlanProposalsInbox onChanged={invalidatePlan} />

      {activeQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando tu plan…</p>
      ) : activeQ.data ? (
        <>
          <PlanMetaEditor data={activeQ.data} onSaved={invalidatePlan} />
          <PlanItemsSection
            data={activeQ.data}
            onChanged={invalidatePlan}
            reservedIds={reservedIds}
          />
          <ShareExportSection data={activeQ.data} onChanged={invalidatePlan} />
          <AluxTravelerPanel />
          <ConciergeSection data={activeQ.data} cases={cases} onChanged={invalidatePlan} />
        </>
      ) : (
        <p className="text-sm text-destructive">
          No pudimos cargar tu plan. Recarga la página.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Guest queue → migración post-login                                  */
/* ------------------------------------------------------------------ */

function GuestImportBanner({ onImported }: { onImported: () => void }) {
  const addItem = useServerFn(addPlanItem);
  const [queue, setQueue] = useState<GuestQueueItem[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setQueue(readGuestQueue());
  }, []);

  if (queue.length === 0) return null;

  async function handleImport() {
    setBusy(true);
    let ok = 0;
    let fail = 0;
    for (const it of queue) {
      if (it.kind !== "note" && !it.targetId) {
        fail += 1;
        continue;
      }
      try {
        await addItem({
          data: {
            kind: it.kind,
            targetId: it.targetId ?? undefined,
            snapshot: {
              title: it.title ?? null,
              slug: it.slug ?? null,
              image_url: it.imageUrl ?? null,
              subtitle: it.subtitle ?? null,
            },
            notes: it.notes ?? null,
          },
        });
        ok += 1;
      } catch {
        fail += 1;
      }
    }
    clearGuestQueue();
    setQueue([]);
    setBusy(false);
    onImported();
    toast.success(`Se importaron ${ok} elementos a Mi Viaje`, {
      description: fail > 0 ? `${fail} no pudieron migrarse.` : undefined,
    });
  }

  function handleDiscard() {
    clearGuestQueue();
    setQueue([]);
    toast("Elementos provisionales descartados");
  }

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">
            Tienes {queue.length} elemento{queue.length === 1 ? "" : "s"} guardado{queue.length === 1 ? "" : "s"} en este dispositivo
          </p>
          <p className="text-xs text-muted-foreground">
            Fueron agregados antes de iniciar sesión. ¿Los movemos a Mi Viaje?
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleDiscard}
            disabled={busy}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
          >
            Descartar
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={busy}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Importando…" : "Importar a Mi Viaje"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Viaje confirmado (CV4.3-narrativa · Etapa 7 Timeline)              */
/* ------------------------------------------------------------------ */

function ConfirmedTravelBanner({
  data,
}: {
  data: {
    folio: string;
    editorial_title: string | null;
    destination_name: string | null;
    plan_start_date: string | null;
    plan_end_date: string | null;
    party_size: number | null;
    days_to_trip: number | null;
  };
}) {
  const dateFmt = (iso: string | null) =>
    iso
      ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("es-MX", {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        })
      : null;
  const startTxt = dateFmt(data.plan_start_date);
  const endTxt = dateFmt(data.plan_end_date);
  const dateRange =
    startTxt && endTxt
      ? `${startTxt} – ${endTxt}`
      : startTxt
        ? `Desde el ${startTxt}`
        : "Fechas por confirmar con tu concierge";

  const countdown =
    typeof data.days_to_trip === "number"
      ? data.days_to_trip > 0
        ? `Faltan ${data.days_to_trip} días para tu llegada al Oriente Maya de Yucatán`
        : data.days_to_trip === 0
          ? "Hoy comienza tu viaje al Oriente Maya de Yucatán"
          : "Tu viaje al Oriente Maya está en curso o recién concluyó"
      : "Tu concierge confirmará las fechas contigo";

  return (
    <section className="overflow-hidden rounded-2xl border border-success/40 bg-gradient-to-br from-success/12 via-card to-card p-6 shadow-elevated">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-success text-success-foreground">
            <CalendarCheck className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-success-foreground/80">
              Viaje confirmado
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
              {data.editorial_title ?? "Tu viaje al Oriente Maya de Yucatán"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{dateRange}</p>
          </div>
        </div>
        <div className="rounded-xl border border-success/40 bg-background/70 px-4 py-3 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Folio
          </p>
          <p className="mt-1 font-mono text-sm font-bold tracking-[0.14em] text-foreground">
            {data.folio}
          </p>
        </div>
      </div>
      <p className="mt-4 flex items-center gap-2 text-sm text-foreground">
        <Sparkles className="h-4 w-4 text-primary" aria-hidden />
        {countdown}
        {data.party_size ? (
          <span className="text-muted-foreground">· {data.party_size} viajero{data.party_size === 1 ? "" : "s"}</span>
        ) : null}
      </p>
      <p className="mt-3 text-xs text-muted-foreground">
        Los ítems reservados con tu concierge quedan bloqueados en tu plan.
        Guarda tu folio para referencia rápida con tu concierge.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Timeline del viaje confirmado (CV4.3-narrativa · Etapa 7)          */
/* ------------------------------------------------------------------ */

function ConfirmedTripTimeline({
  data,
}: {
  data: {
    plan_start_date: string | null;
    plan_end_date: string | null;
    days_to_trip: number | null;
    destination_name: string | null;
  };
}) {
  const start = data.plan_start_date
    ? new Date(`${data.plan_start_date}T00:00:00Z`)
    : null;
  const end = data.plan_end_date
    ? new Date(`${data.plan_end_date}T00:00:00Z`)
    : null;

  const days: Date[] = [];
  if (start && end) {
    const cur = new Date(start);
    for (let i = 0; i < 14 && cur.getTime() <= end.getTime(); i++) {
      days.push(new Date(cur));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  } else if (start) {
    days.push(start);
  }

  const fmtDay = (d: Date) =>
    d.toLocaleDateString("es-MX", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });

  const dtt = data.days_to_trip;
  const preMilestones: { key: string; label: string; hint: string; active: boolean }[] =
    typeof dtt === "number" && dtt >= 0
      ? [
          {
            key: "t-14",
            label: "T‑14 días · Preparando tu llegada",
            hint: "Recomendaciones climáticas y culturales del Oriente Maya.",
            active: dtt <= 14,
          },
          {
            key: "t-3",
            label: "T‑3 días · Todo listo para tu viaje",
            hint: "Punto de encuentro, contacto de tu concierge, botón de emergencia.",
            active: dtt <= 3,
          },
          {
            key: "t-0",
            label: "Día de llegada · Bienvenido al Oriente Maya",
            hint: "Alux te acompaña con contexto espacial y tu concierge en línea.",
            active: dtt === 0,
          },
        ]
      : [];

  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card p-6 shadow-soft">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-primary" aria-hidden />
        <h2 className="font-serif text-xl">Mapa de tu viaje</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Los hitos de tu experiencia en el Oriente Maya de Yucatán
        {data.destination_name ? `, con base en ${data.destination_name}` : ""}.
      </p>

      {preMilestones.length > 0 ? (
        <ol className="mt-5 space-y-3">
          {preMilestones.map((m) => (
            <li
              key={m.key}
              className={`flex gap-3 rounded-xl border p-3 ${
                m.active
                  ? "border-primary/40 bg-primary/5"
                  : "border-border/60 bg-background/60"
              }`}
            >
              <span
                className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold ${
                  m.active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {m.active ? "●" : "○"}
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">{m.label}</p>
                <p className="text-xs text-muted-foreground">{m.hint}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : null}

      {days.length > 0 ? (
        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Tu itinerario día a día
          </p>
          <ol className="mt-3 space-y-2">
            {days.map((d, idx) => {
              const isArrival = idx === 0;
              const isReturn = end && d.getTime() === end.getTime() && days.length > 1;
              const label = isArrival
                ? "Tu llegada"
                : isReturn
                  ? "Tu regreso"
                  : `Día ${idx + 1}`;
              return (
                <li
                  key={d.toISOString()}
                  className="flex items-start gap-3 rounded-lg border border-border/50 bg-background/60 p-3"
                >
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{fmtDay(d)}</p>
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Tu concierge y Alux te propondrán actividades por día conforme se
            acerque tu viaje.
          </p>
        </div>
      ) : (
        <p className="mt-5 text-xs text-muted-foreground">
          Cuando confirmes fechas con tu concierge, aquí verás tu itinerario
          día por día.
        </p>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Editor de metadatos                                                 */
/* ------------------------------------------------------------------ */

function PlanMetaEditor({
  data,
  onSaved,
}: {
  data: TravelPlanWithItems;
  onSaved: () => void;
}) {
  const saveMeta = useServerFn(updatePlanMeta);
  const [title, setTitle] = useState(data.plan.title);
  const [start, setStart] = useState(data.plan.start_date ?? "");
  const [end, setEnd] = useState(data.plan.end_date ?? "");
  const [party, setParty] = useState<string>(
    data.plan.party_size ? String(data.plan.party_size) : "",
  );
  const [notes, setNotes] = useState(data.plan.notes ?? "");

  const mut = useMutation({
    mutationFn: () =>
      saveMeta({
        data: {
          planId: data.plan.id,
          title: title.trim() || "Mi Viaje",
          startDate: start || null,
          endDate: end || null,
          partySize: party ? Number(party) : null,
          notes: notes.trim() || null,
        },
      }),
    onSuccess: () => {
      toast.success("Plan actualizado");
      onSaved();
    },
    onError: (e) =>
      toast.error("No se pudo actualizar", {
        description: e instanceof Error ? e.message : undefined,
      }),
  });

  const dirty =
    title !== data.plan.title ||
    (start || null) !== data.plan.start_date ||
    (end || null) !== data.plan.end_date ||
    (party ? Number(party) : null) !== data.plan.party_size ||
    (notes.trim() || null) !== data.plan.notes;

  return (
    <section className="rounded-lg border bg-card p-5">
      <h2 className="text-lg font-medium">Detalles del viaje</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Estos datos viajan con tu expediente cuando lo envías al Concierge.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Título</span>
          <input
            value={title}
            maxLength={160}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground">
            <Users className="size-3" /> Personas
          </span>
          <input
            type="number"
            min={1}
            max={40}
            value={party}
            onChange={(e) => setParty(e.target.value)}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground">
            <Calendar className="size-3" /> Fecha inicio
          </span>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground">
            <Calendar className="size-3" /> Fecha fin
          </span>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>
      </div>
      <label className="mt-4 block text-sm">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">Notas generales</span>
        <textarea
          value={notes}
          rows={3}
          maxLength={4000}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Preferencias, restricciones, intereses…"
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </label>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          disabled={!dirty || mut.isPending}
          onClick={() => mut.mutate()}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          <Save className="size-3.5" />
          {mut.isPending ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Compartir + exportar (US-E4.3)                                     */
/* ------------------------------------------------------------------ */

function ShareExportSection({
  data,
  onChanged,
}: {
  data: TravelPlanWithItems;
  onChanged: () => void;
}) {
  const enableFn = useServerFn(enableShareLink);
  const disableFn = useServerFn(disableShareLink);
  const { plan } = data;
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== "undefined" && plan.share_token
      ? `${window.location.origin}/viaje-compartido/${plan.share_token}`
      : null;

  const enableMut = useMutation({
    mutationFn: () => enableFn({ data: { planId: plan.id } }),
    onSuccess: () => {
      onChanged();
      toast.success("Link de compartir activado");
    },
    onError: (e) =>
      toast.error("No se pudo activar el link", {
        description: e instanceof Error ? e.message : undefined,
      }),
  });

  const disableMut = useMutation({
    mutationFn: () => disableFn({ data: { planId: plan.id } }),
    onSuccess: () => {
      onChanged();
      toast.success("Link revocado");
    },
    onError: (e) =>
      toast.error("No se pudo revocar el link", {
        description: e instanceof Error ? e.message : undefined,
      }),
  });

  async function copyToClipboard() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copiado");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar. Copia manualmente.");
    }
  }

  return (
    <section className="rounded-lg border bg-card p-5">
      <h2 className="flex items-center gap-2 text-lg font-medium">
        <Share2 className="size-4 text-primary" /> Compartir y exportar
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Genera un link público read-only para compartir tu expediente con
        familia, amigos o tu concierge. Puedes revocarlo en cualquier momento.
      </p>

      {plan.share_token && shareUrl ? (
        <div className="mt-4 space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-primary">
              Link activo
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                readOnly
                value={shareUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-xs"
              />
              <button
                type="button"
                onClick={copyToClipboard}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-95"
              >
                <Copy className="size-3.5" />
                {copied ? "Copiado" : "Copiar"}
              </button>
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium hover:bg-accent"
              >
                <ExternalLink className="size-3.5" />
                Ver
              </a>
            </div>
            {plan.shared_at ? (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Activado el{" "}
                {new Date(plan.shared_at).toLocaleDateString("es-MX", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-accent"
            >
              <Printer className="size-3.5" />
              Imprimir / Guardar PDF
            </a>
            <button
              type="button"
              onClick={() => disableMut.mutate()}
              disabled={disableMut.isPending}
              className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive hover:bg-destructive/5 disabled:opacity-50"
            >
              {disableMut.isPending ? "Revocando…" : "Revocar link"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => enableMut.mutate()}
            disabled={enableMut.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50"
          >
            <Share2 className="size-4" />
            {enableMut.isPending ? "Generando…" : "Generar link de compartir"}
          </button>
          <p className="mt-2 text-xs text-muted-foreground">
            Cualquier persona con el link podrá ver tu expediente (sin tu correo
            ni notas privadas). Podrás revocarlo cuando quieras.
          </p>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Items del plan                                                      */
/* ------------------------------------------------------------------ */

function PlanItemsSection({
  data,
  onChanged,
  reservedIds,
}: {
  data: TravelPlanWithItems;
  onChanged: () => void;
  reservedIds: Set<string>;
}) {
  const addItem = useServerFn(addPlanItem);
  const [newNote, setNewNote] = useState("");

  const grouped = useMemo(() => {
    const g: Record<TravelItemKind, TravelPlanItem[]> = {
      destination: [],
      business: [],
      product: [],
      event: [],
      note: [],
    };
    for (const it of data.items) g[it.item_kind]?.push(it);
    return g;
  }, [data.items]);

  const addNoteMut = useMutation({
    mutationFn: (text: string) =>
      addItem({
        data: { kind: "note", notes: text, snapshot: { title: text.slice(0, 80) } },
      }),
    onSuccess: () => {
      setNewNote("");
      onChanged();
      toast.success("Nota agregada");
    },
    onError: (e) =>
      toast.error("No se pudo agregar la nota", {
        description: e instanceof Error ? e.message : undefined,
      }),
  });

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">
          Tu expediente ({data.items.length})
        </h2>
      </div>

      {data.items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Aún no has agregado nada. Explora el ecosistema y usa el botón
            "➕ Agregar a Mi Viaje" en las tarjetas.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link
              to="/oriente-maya"
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
            >
              Ver destinos
            </Link>
            <Link
              to="/experiencias"
              search={{ destino: undefined, tema: undefined }}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
            >
              Ver experiencias
            </Link>
          </div>
        </div>
      ) : (
        KIND_ORDER.map((kind) => {
          const items = grouped[kind];
          if (!items || items.length === 0) return null;
          const { label, icon: Icon } = KIND_META[kind];
          return (
            <div key={kind} className="rounded-lg border bg-card p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Icon className="size-4 text-primary" /> {label} ({items.length})
              </h3>
              <ul className="divide-y">
                {items.map((it) => (
                  <PlanItemRow
                    key={it.id}
                    item={it}
                    onChanged={onChanged}
                    reservedByConcierge={Boolean(
                      it.target_id && reservedIds.has(it.target_id),
                    )}
                  />
                ))}
              </ul>
            </div>
          );
        })
      )}

      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
          <StickyNote className="size-4 text-primary" /> Agregar una nota
        </h3>
        <div className="flex gap-2">
          <input
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Ej. Prefiero hoteles boutique, viajo con mi hija de 8 años…"
            className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
            maxLength={2000}
          />
          <button
            type="button"
            disabled={newNote.trim().length < 3 || addNoteMut.isPending}
            onClick={() => addNoteMut.mutate(newNote.trim())}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            <Plus className="size-3.5" /> Agregar
          </button>
        </div>
      </div>
    </section>
  );
}

function PlanItemRow({
  item,
  onChanged,
  reservedByConcierge,
}: {
  item: TravelPlanItem;
  onChanged: () => void;
  reservedByConcierge?: boolean;
}) {
  const remove = useServerFn(removePlanItem);
  const update = useServerFn(updatePlanItem);
  const [notes, setNotes] = useState(item.notes ?? "");
  const [editing, setEditing] = useState(false);

  const removeMut = useMutation({
    mutationFn: () => remove({ data: { itemId: item.id } }),
    onSuccess: () => {
      onChanged();
      toast.success("Eliminado de Mi Viaje");
    },
    onError: (e) =>
      toast.error("No se pudo eliminar", {
        description: e instanceof Error ? e.message : undefined,
      }),
  });

  const saveMut = useMutation({
    mutationFn: () =>
      update({ data: { itemId: item.id, notes: notes.trim() || null } }),
    onSuccess: () => {
      setEditing(false);
      onChanged();
      toast.success("Notas actualizadas");
    },
    onError: (e) =>
      toast.error("No se pudo actualizar", {
        description: e instanceof Error ? e.message : undefined,
      }),
  });

  const snap = item.snapshot ?? {};
  const title = snap.title || (item.item_kind === "note" ? "Nota" : "Elemento");

  return (
    <li className="flex gap-3 py-3">
      {snap.image_url ? (
        <img
          src={snap.image_url}
          alt=""
          className="size-14 shrink-0 rounded-md object-cover"
          loading="lazy"
        />
      ) : (
        <div className="grid size-14 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
          <StickyNote className="size-5" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-medium">
          <span className="truncate">{title}</span>
          {reservedByConcierge && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
              <Headset className="size-2.5" aria-hidden />
              Propuesto por tu concierge
            </span>
          )}
        </p>
        {snap.subtitle ? (
          <p className="truncate text-xs text-muted-foreground">{snap.subtitle}</p>
        ) : null}
        {editing ? (
          <div className="mt-2 space-y-2">
            <textarea
              value={notes}
              rows={2}
              maxLength={2000}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border bg-background px-2 py-1 text-xs"
              placeholder="Notas para este elemento…"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => saveMut.mutate()}
                disabled={saveMut.isPending}
                className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
              >
                {saveMut.isPending ? "Guardando…" : "Guardar"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setNotes(item.notes ?? "");
                  setEditing(false);
                }}
                className="rounded-md border px-2 py-1 text-xs hover:bg-accent"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : item.notes ? (
          <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
            {item.notes}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col gap-1">
        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md border px-2 py-1 text-xs hover:bg-accent"
          >
            {item.notes ? "Editar" : "Nota"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => removeMut.mutate()}
          disabled={removeMut.isPending}
          aria-label="Eliminar"
          className="inline-flex items-center justify-center rounded-md border px-2 py-1 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Concierge (sin cambios de lógica; Sub-ola E)                        */
/* ------------------------------------------------------------------ */

interface CaseSummary {
  id: string;
  summary: string | null;
  status: string;
  priority: string;
  updated_at: string;
}

function ConciergeSection({
  data,
  cases,
  onChanged,
}: {
  data: TravelPlanWithItems;
  cases: CaseSummary[];
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const promote = useServerFn(promotePlanToCase);
  const { plan, items } = data;
  const [summary, setSummary] = useState("");

  const hasContent =
    items.length > 0 || Boolean((plan.notes ?? "").trim().length >= 8);
  const alreadyShared =
    plan.status === "shared_with_concierge" && Boolean(plan.case_id);

  const send = useMutation({
    mutationFn: (s: string) =>
      promote({ data: { planId: plan.id, summary: s } }),
    onSuccess: (res) => {
      setSummary("");
      qc.invalidateQueries({ queryKey: ["cc", "my-cases"] });
      onChanged();
      toast.success("Expediente enviado al Concierge", {
        description: "Un concierge humano revisará tu viaje.",
        action: {
          label: "Ver caso",
          onClick: () => {
            window.location.href = `/cuenta/concierge/${res.caseId}`;
          },
        },
      });
    },
    onError: (e) =>
      toast.error("No se pudo enviar", {
        description: e instanceof Error ? e.message : undefined,
      }),
  });

  const derivedSummary =
    summary.trim() ||
    `Viaje "${plan.title}" · ${items.length} elemento${items.length === 1 ? "" : "s"}${
      plan.party_size ? ` · ${plan.party_size} personas` : ""
    }${plan.start_date ? ` · desde ${plan.start_date}` : ""}`;
  const canSend =
    !alreadyShared && hasContent && derivedSummary.length >= 8 && !send.isPending;

  return (
    <section className="rounded-lg border bg-card p-5">
      <h2 className="text-lg font-medium">Enviar al Concierge</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Tu expediente completo (destinos, empresas, productos, eventos, notas,
        fechas y personas) viaja como snapshot al concierge humano.
      </p>

      {alreadyShared ? (
        <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
          <p className="font-medium">Ya enviaste este viaje al Concierge.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            El caso está en proceso. Puedes seguir agregando elementos y volver a enviar cuando quieras revisar contigo tu concierge.
          </p>
          {plan.case_id ? (
            <Link
              to="/cuenta/concierge/$caseId"
              params={{ caseId: plan.case_id }}
              className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
            >
              Ver mi caso →
            </Link>
          ) : null}
        </div>
      ) : !hasContent ? (
        <div className="mt-4 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Agrega al menos un destino, empresa, producto o evento — o escribe
          notas generales del viaje — para poder enviarlo.
        </div>
      ) : (
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSend) send.mutate(derivedSummary);
          }}
        >
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Mensaje opcional para tu concierge (fechas flexibles, presupuesto, restricciones…)"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Adjuntaremos automáticamente: {items.length} elemento
            {items.length === 1 ? "" : "s"}
            {plan.party_size ? ` · ${plan.party_size} personas` : ""}
            {plan.start_date ? ` · ${plan.start_date}` : ""}
            {plan.end_date ? ` → ${plan.end_date}` : ""}.
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{summary.length}/500</span>
            <button
              type="submit"
              disabled={!canSend}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {send.isPending ? "Enviando…" : "Enviar al Concierge"}
            </button>
          </div>
          {send.isError ? (
            <p className="text-xs text-destructive">
              {send.error instanceof Error ? send.error.message : "Error al enviar"}
            </p>
          ) : null}
        </form>
      )}

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Mis solicitudes</h3>
          <Link to="/cuenta/concierge" className="text-xs text-primary hover:underline">
            Ver historial →
          </Link>
        </div>
        {cases.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Aún no has enviado ninguna solicitud.
          </p>
        ) : (
          <ul className="mt-3 divide-y">
            {cases.slice(0, 5).map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-4 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm">{c.summary ?? "(sin resumen)"}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.status} · {c.priority} · {new Date(c.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <Link
                  to="/cuenta/concierge/$caseId"
                  params={{ caseId: c.id }}
                  className="shrink-0 text-xs text-primary hover:underline"
                >
                  Ver caso
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Fase activa del viaje (CV4.3-narrativa · Etapa 5)                   */
/* ------------------------------------------------------------------ */

type TripPhase = "planning" | "t14" | "t3" | "onsite" | "post" | "closed";

interface ChecklistItem {
  key: string;
  label: string;
  hint?: string;
}

const PHASE_META: Record<
  TripPhase,
  {
    label: string;
    tagline: string;
    tone: "muted" | "info" | "primary" | "success" | "warning";
    aluxPrompt: string;
    checklist: ChecklistItem[];
  }
> = {
  planning: {
    label: "Preparación",
    tagline: "Aún tienes tiempo para afinar detalles con tu concierge.",
    tone: "muted",
    aluxPrompt: "Ayúdame a preparar mi viaje al Oriente Maya con calma.",
    checklist: [
      { key: "identity", label: "Documentos y datos de acompañantes", hint: "Nombres completos y contactos de emergencia." },
      { key: "expectations", label: "Cuéntale a tu concierge tus expectativas", hint: "Ritmo, intereses, restricciones alimentarias." },
      { key: "wishlist", label: "Guarda inspiración en Mi Viaje", hint: "Cenotes, restaurantes o experiencias que te llamen." },
    ],
  },
  t14: {
    label: "T‑14 · Preparando tu llegada",
    tagline: "Faltan menos de dos semanas: alista lo esencial.",
    tone: "info",
    aluxPrompt: "Dame recomendaciones de clima, ropa y cultura para mi viaje.",
    checklist: [
      { key: "weather", label: "Revisa el clima y qué empacar", hint: "Alux te da el pronóstico de tu destino." },
      { key: "culture", label: "Contexto cultural del Oriente Maya", hint: "Pequeños hábitos que enriquecen la experiencia." },
      { key: "docs", label: "Copia digital de identificaciones y reservas" },
    ],
  },
  t3: {
    label: "T‑3 · Últimos detalles",
    tagline: "Tu viaje inicia en días. Confirmamos logística fina.",
    tone: "warning",
    aluxPrompt: "Confirma conmigo el punto de encuentro y qué llevar el primer día.",
    checklist: [
      { key: "arrival", label: "Punto de encuentro y hora de llegada" },
      { key: "contact", label: "Guarda el contacto de tu concierge" },
      { key: "emergency", label: "Contacto de emergencia y seguros" },
      { key: "pack", label: "Empaca ligero: sandalias, protector, agua reutilizable" },
    ],
  },
  onsite: {
    label: "Bienvenido al Oriente Maya",
    tagline: "Ya estás aquí. Alux te acompaña con contexto vivo del lugar.",
    tone: "success",
    aluxPrompt: "¿Qué me recomiendas hacer ahora mismo cerca de mí?",
    checklist: [
      { key: "checkin", label: "Confirma tu llegada con tu concierge" },
      { key: "explore", label: "Explora recomendaciones cercanas con Alux" },
      { key: "share", label: "Comparte momentos: los publicaremos si autorizas" },
    ],
  },
  post: {
    label: "Después de tu viaje",
    tagline: "Gracias por descubrir el Oriente Maya con nosotros.",
    tone: "primary",
    aluxPrompt: "Ayúdame a dejar reseñas de las experiencias que viví.",
    checklist: [
      { key: "review", label: "Deja una reseña de las experiencias vividas" },
      { key: "next", label: "Guarda inspiración para tu próximo viaje" },
    ],
  },
  closed: {
    label: "Viaje cerrado",
    tagline: "Tu expediente queda disponible para consultas y futuras visitas.",
    tone: "muted",
    aluxPrompt: "Ayúdame a planear mi próxima visita al Oriente Maya.",
    checklist: [],
  },
};

function derivePhase(data: {
  days_to_trip: number | null;
  plan_end_date: string | null;
}): TripPhase {
  const d = data.days_to_trip;
  if (typeof d !== "number") return "planning";
  if (d > 14) return "planning";
  if (d > 3) return "t14";
  if (d > 0) return "t3";
  // d <= 0 → viaje en curso o pasado
  if (data.plan_end_date) {
    const end = new Date(`${data.plan_end_date}T23:59:59Z`).getTime();
    const now = Date.now();
    if (now <= end) return "onsite";
    const daysAfter = Math.floor((now - end) / 86_400_000);
    if (daysAfter <= 14) return "post";
    return "closed";
  }
  return "onsite";
}

function TripPhaseCard({
  data,
}: {
  data: {
    folio: string;
    days_to_trip: number | null;
    plan_end_date: string | null;
    email_t14_sent_at: string | null;
    email_t3_sent_at: string | null;
    email_welcome_sent_at: string | null;
    email_post_sent_at: string | null;
  };
}) {
  const phase = derivePhase(data);
  const meta = PHASE_META[phase];

  // Persistimos qué correos ya "leyó" el viajero en local storage
  // (señal 100% cliente; el hito recién enviado se marca con un badge).
  const storageKey = `mi-viaje:read-milestones:${data.folio}`;
  const [readMap, setReadMap] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setReadMap(JSON.parse(raw));
    } catch {
      /* noop */
    }
  }, [storageKey]);
  const markRead = (key: string, iso: string | null) => {
    if (!iso) return;
    const next = { ...readMap, [`${key}:${iso}`]: true };
    setReadMap(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* noop */
    }
  };

  const milestones: { key: "t14" | "t3" | "welcome" | "post"; label: string; iso: string | null }[] = [
    { key: "t14", label: "Preparando tu llegada", iso: data.email_t14_sent_at },
    { key: "t3", label: "Últimos detalles del viaje", iso: data.email_t3_sent_at },
    { key: "welcome", label: "Bienvenida al Oriente Maya", iso: data.email_welcome_sent_at },
    { key: "post", label: "Después de tu viaje", iso: data.email_post_sent_at },
  ];
  const unread = milestones.filter((m) => m.iso && !readMap[`${m.key}:${m.iso}`]);

  // Checklist local: el viajero puede marcar sus propios pendientes.
  const checkKey = `mi-viaje:checklist:${data.folio}:${phase}`;
  const [done, setDone] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem(checkKey);
      setDone(raw ? JSON.parse(raw) : {});
    } catch {
      setDone({});
    }
  }, [checkKey]);
  const toggle = (key: string) => {
    const next = { ...done, [key]: !done[key] };
    setDone(next);
    try {
      localStorage.setItem(checkKey, JSON.stringify(next));
    } catch {
      /* noop */
    }
  };
  const completedCount = meta.checklist.filter((c) => done[c.key]).length;

  const toneRing: Record<typeof meta.tone, string> = {
    muted: "border-border/60 bg-card",
    info: "border-info/40 bg-info/5",
    primary: "border-primary/40 bg-primary/5",
    success: "border-success/40 bg-success/5",
    warning: "border-warning/40 bg-warning/5",
  };

  const dateFmt = (iso: string) =>
    new Date(iso).toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <section
      className={`overflow-hidden rounded-2xl border p-6 shadow-soft ${toneRing[meta.tone]}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Fase actual de tu viaje
          </p>
          <h2 className="mt-1 font-serif text-xl text-foreground">{meta.label}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{meta.tagline}</p>
        </div>
        {meta.checklist.length > 0 ? (
          <div className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11px] text-muted-foreground">
            {completedCount}/{meta.checklist.length} listos
          </div>
        ) : null}
      </div>

      {unread.length > 0 ? (
        <div className="mt-4 rounded-xl border border-primary/40 bg-primary/5 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <Bell className="h-3.5 w-3.5" aria-hidden />
            Novedades de tu viaje
          </div>
          <ul className="mt-2 space-y-1.5">
            {unread.map((m) => (
              <li key={m.key} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-foreground">
                  {m.label}
                  <span className="ml-2 text-[11px] text-muted-foreground">
                    · {dateFmt(m.iso!)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => markRead(m.key, m.iso)}
                  className="rounded-md border border-primary/40 px-2 py-0.5 text-[11px] text-primary hover:bg-primary/10"
                >
                  Marcar leído
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {meta.checklist.length > 0 ? (
        <ul className="mt-5 space-y-2">
          {meta.checklist.map((c) => {
            const isDone = !!done[c.key];
            return (
              <li key={c.key}>
                <button
                  type="button"
                  onClick={() => toggle(c.key)}
                  className="flex w-full items-start gap-3 rounded-lg border border-border/50 bg-background/60 p-3 text-left transition hover:bg-accent/40"
                >
                  {isDone ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                  ) : (
                    <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                  <span className="min-w-0">
                    <span
                      className={`block text-sm font-medium ${
                        isDone ? "text-muted-foreground line-through" : "text-foreground"
                      }`}
                    >
                      {c.label}
                    </span>
                    {c.hint ? (
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {c.hint}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-4">
        <p className="text-xs text-muted-foreground">
          Alux te acompaña en cada fase con contexto real y respuestas rápidas.
        </p>
        <Link
          to="/alux"
          search={{ prompt: meta.aluxPrompt }}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <MessageCircle className="h-3.5 w-3.5" aria-hidden />
          Pregúntale a Alux
        </Link>
      </div>
    </section>
  );
}