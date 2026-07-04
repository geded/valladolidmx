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
import { Trash2, Save, Users, Calendar, MapPin, Building2, ShoppingBag, Ticket, StickyNote, Plus, Share2, Copy, ExternalLink, Printer } from "lucide-react";
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
import {
  clearGuestQueue,
  readGuestQueue,
  type GuestQueueItem,
} from "@/lib/traveler/guest-queue";
import { ccListMyCases } from "@/lib/concierge/cc.functions";
import { AluxTravelerPanel } from "@/components/traveler/AluxTravelerPanel";

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

  const invalidatePlan = () =>
    qc.invalidateQueries({ queryKey: ["traveler", "active-plan", user?.id] });

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

      {activeQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando tu plan…</p>
      ) : activeQ.data ? (
        <>
          <PlanMetaEditor data={activeQ.data} onSaved={invalidatePlan} />
          <PlanItemsSection data={activeQ.data} onChanged={invalidatePlan} />
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
/* Items del plan                                                      */
/* ------------------------------------------------------------------ */

function PlanItemsSection({
  data,
  onChanged,
}: {
  data: TravelPlanWithItems;
  onChanged: () => void;
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
                  <PlanItemRow key={it.id} item={it} onChanged={onChanged} />
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
}: {
  item: TravelPlanItem;
  onChanged: () => void;
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
        <p className="truncate text-sm font-medium">{title}</p>
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