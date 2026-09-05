/**
 * Lote 3K · Conversación con Alux dentro del dock existente.
 *
 * Sección compacta y secundaria del Sheet de Alux: no crea un dock,
 * memoria, catálogo ni sistema paralelo. Consume la server fn única
 * `aluxConverse` y ejecuta acciones SÓLO mediante los mecanismos canónicos
 * de Mi Viaje:
 *  · agregar   → `AddToTravelPlanButton` (anónimo y autenticado);
 *  · quitar    → `removePlannedItem` (borrador anónimo) / `removePlanItem`;
 *  · reordenar → `reorderPlanItems` (autenticado; el anónimo ve la propuesta).
 *
 * Continuidad: el hilo (máx. 30 mensajes, 24 h) y lo "entendido" se
 * conservan en el navegador; la sesión anónima reutiliza la clave única
 * `alux_public_session_key`.
 *
 * Accesibilidad: hilo `role="log"` + `aria-live="polite"`, estados con
 * `role="status"`, foco devuelto al campo tras responder, targets ≥ 44 px.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  ArrowRight,
  Check,
  ListOrdered,
  Loader2,
  MessageCircle,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { useAuth } from "@/hooks/useAuth";
import { aluxConverse } from "@/lib/alux/converse.functions";
import {
  ALUX_CONVERSE_COPY,
  ALUX_CONVERSE_LIMITS,
  ALUX_FAMILY_LABEL,
  tripItemKey,
  type AluxConverseInput,
  type AluxConverseRecommendation,
  type AluxConverseResponse,
  type AluxConverseTripItem,
  type AluxConverseUnderstood,
} from "@/lib/alux/converse-contract";
import { ensureAluxSessionKey } from "@/lib/alux/public-signals";
import { notifyPlanChanged } from "@/lib/alux/plan-signals";
import type { AluxOpenSelection } from "@/lib/alux/floating-bus";
import type { AluxContextSlot } from "@/lib/alux/use-alux-context";
import {
  getMyActivePlan,
  removePlanItem,
  reorderPlanItems,
  type TravelItemKind,
} from "@/lib/traveler/travel-plans.functions";
import { useAnonymousTrip, type AnonymousItemKind } from "@/lib/traveler/anonymous-draft";
import { AddToTravelPlanButton } from "@/components/traveler/AddToTravelPlanButton";
import { AluxMark } from "@/components/alux/AluxMark";

/* ─────────────────────────── persistencia local del hilo ─────────────────────────── */

const THREAD_KEY = "alux_converse_thread:v1";

interface ThreadMessage {
  readonly id: string;
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly response?: AluxConverseResponse;
  readonly failed?: boolean;
}

interface StoredThread {
  readonly v: 1;
  readonly updatedAt: number;
  readonly messages: ThreadMessage[];
  readonly understood: AluxConverseUnderstood;
}

function loadThread(): StoredThread | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(THREAD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredThread;
    if (parsed?.v !== 1 || !Array.isArray(parsed.messages)) return null;
    if (Date.now() - Number(parsed.updatedAt ?? 0) > ALUX_CONVERSE_LIMITS.storedThreadTtlMs) {
      window.localStorage.removeItem(THREAD_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveThread(messages: ThreadMessage[], understood: AluxConverseUnderstood): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = messages.slice(-ALUX_CONVERSE_LIMITS.maxStoredMessages);
    const payload: StoredThread = { v: 1, updatedAt: Date.now(), messages: trimmed, understood };
    window.localStorage.setItem(THREAD_KEY, JSON.stringify(payload));
  } catch {
    /* sin almacenamiento: el hilo vive en memoria */
  }
}

function clearThread(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(THREAD_KEY);
  } catch {
    /* noop */
  }
}

function newId(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `m_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/* ─────────────────────────── props ─────────────────────────── */

export interface AluxConverseChatProps {
  readonly region?: AluxContextSlot;
  readonly destination?: AluxContextSlot;
  readonly category?: AluxContextSlot;
  readonly business?: AluxContextSlot;
  readonly product?: AluxContextSlot;
  readonly selection: AluxOpenSelection | null;
  readonly stage?: string | null;
  /** Sólo con consentimiento explícito de ubicación. */
  readonly coords: { lat: number; lng: number } | null;
  readonly locale: AluxConverseInput["locale"];
  /** Preguntas sugeridas cuando el hilo está vacío. */
  readonly starters?: readonly string[];
}

/* ─────────────────────────── componente ─────────────────────────── */

export function AluxConverseChat(props: AluxConverseChatProps) {
  const { user } = useAuth();
  const isAuthed = Boolean(user?.id);
  const queryClient = useQueryClient();
  const converseFn = useServerFn(aluxConverse);
  const fetchActive = useServerFn(getMyActivePlan);
  const removeFn = useServerFn(removePlanItem);
  const reorderFn = useServerFn(reorderPlanItems);
  const anon = useAnonymousTrip();

  const [sessionKey, setSessionKey] = useState("");
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [understood, setUnderstood] = useState<AluxConverseUnderstood>({});
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "thinking" | "error">("idle");
  const [hydrated, setHydrated] = useState(false);
  const [liveNote, setLiveNote] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);

  // Carga del hilo y de la clave de sesión sólo en el navegador.
  useEffect(() => {
    setSessionKey(ensureAluxSessionKey());
    const stored = loadThread();
    if (stored) {
      setMessages(stored.messages);
      setUnderstood(stored.understood ?? {});
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveThread(messages, understood);
  }, [messages, understood, hydrated]);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, status]);

  // Mi Viaje (fuente canónica): plan activo autenticado o borrador anónimo.
  const { data: active } = useQuery({
    queryKey: ["traveler", "active-plan", user?.id],
    queryFn: () => fetchActive(),
    enabled: isAuthed,
    staleTime: 30_000,
  });

  const tripItems: AluxConverseTripItem[] = useMemo(() => {
    if (isAuthed) {
      return (active?.items ?? [])
        .filter((it) => it.item_kind !== "note")
        .map((it) => ({
          kind: it.item_kind,
          targetId: it.target_id,
          title: it.snapshot?.title ?? null,
          savedItemId: it.id,
        }));
    }
    return (anon.trip?.plannedItems ?? []).map((it) => ({
      kind: it.kind,
      targetId: it.targetId,
      title: it.title ?? null,
      savedItemId: null,
    }));
  }, [isAuthed, active?.items, anon.trip?.plannedItems]);

  const tripKeys = useMemo(
    () => new Set(tripItems.filter((i) => i.targetId).map((i) => tripItemKey(i.kind, i.targetId))),
    [tripItems],
  );

  const tripMeta: AluxConverseInput["trip"] = useMemo(() => {
    if (isAuthed) {
      const plan = active?.plan;
      return {
        items: tripItems,
        partySize: plan?.party_size ?? null,
        startDate: plan?.start_date ?? null,
        endDate: plan?.end_date ?? null,
        durationDays: null,
      };
    }
    const t = anon.trip;
    const adults = t?.travelerCount?.adults ?? 0;
    const children = t?.travelerCount?.children ?? 0;
    return {
      items: tripItems,
      partySize: adults + children > 0 ? adults + children : null,
      startDate: t?.tentativeDates?.from ?? null,
      endDate: t?.tentativeDates?.to ?? null,
      durationDays: t?.tripDurationDays ?? null,
      interests: t?.interests ?? [],
      accessibility: t?.accessibilityNeeds ?? null,
    };
  }, [isAuthed, active?.plan, anon.trip, tripItems]);

  /* ── envío ── */
  const send = useCallback(
    async (text: string) => {
      const message = text.trim().slice(0, ALUX_CONVERSE_LIMITS.maxMessageChars);
      if (!message || status === "thinking" || !sessionKey) return;
      const userMsg: ThreadMessage = { id: newId(), role: "user", content: message };
      const history = messages
        .filter((m) => !m.failed)
        .slice(-ALUX_CONVERSE_LIMITS.maxHistoryTurns * 2)
        .map((m) => ({
          role: m.role,
          content: m.content.slice(0, ALUX_CONVERSE_LIMITS.maxHistoryChars),
        }));
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setStatus("thinking");
      setLiveNote(ALUX_CONVERSE_COPY.thinking);
      try {
        const res = await converseFn({
          data: {
            sessionKey,
            message,
            history,
            locale: props.locale,
            context: {
              region: props.region,
              destination: props.destination,
              category: props.category,
              business: props.business,
              product: props.product,
              selection: props.selection
                ? {
                    entityRef: props.selection.entityRef,
                    title: props.selection.title,
                    destinationSlug: props.selection.destinationSlug,
                    destinationLabel: props.selection.destinationLabel,
                    familySlug: props.selection.familySlug,
                    href: props.selection.href,
                  }
                : undefined,
              stage: props.stage ?? undefined,
            },
            understood,
            trip: tripMeta,
            ...(props.coords ? { coords: props.coords } : {}),
          },
        });
        setMessages((prev) => [
          ...prev,
          { id: newId(), role: "assistant", content: res.text, response: res },
        ]);
        setUnderstood(res.understood ?? {});
        setStatus("idle");
        setLiveNote(
          res.recommendations.length
            ? `Alux respondió con ${res.recommendations.length} opción${res.recommendations.length === 1 ? "" : "es"}.`
            : "Alux respondió.",
        );
      } catch (err) {
        console.error("[alux.converse] fallo", err);
        setMessages((prev) => prev.map((m) => (m.id === userMsg.id ? { ...m, failed: true } : m)));
        setStatus("error");
        setLiveNote(ALUX_CONVERSE_COPY.errorNotice);
      } finally {
        window.setTimeout(() => inputRef.current?.focus(), 0);
      }
    },
    [status, sessionKey, messages, converseFn, props, understood, tripMeta],
  );

  const lastFailed = [...messages].reverse().find((m) => m.role === "user" && m.failed);

  /* ── quitar (canónico) ── */
  const removeMutation = useMutation({
    mutationFn: async (rec: AluxConverseRecommendation) => {
      if (!rec.planKind) return false;
      if (isAuthed) {
        const saved = tripItems.find((i) => i.kind === rec.planKind && i.targetId === rec.entityId);
        if (!saved?.savedItemId) return false;
        const r = await removeFn({ data: { itemId: saved.savedItemId } });
        return r.removed;
      }
      return anon.removePlannedItem(rec.planKind as AnonymousItemKind, rec.entityId);
    },
    onSuccess: (removed, rec) => {
      if (isAuthed)
        void queryClient.invalidateQueries({ queryKey: ["traveler", "active-plan", user?.id] });
      notifyPlanChanged("remove_item");
      toast(removed ? "Quitado de Mi Viaje" : "Ya no estaba en Mi Viaje", {
        description: rec.title,
      });
      setLiveNote(`${rec.title} quitado de Mi Viaje.`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Intenta de nuevo."),
  });

  /* ── reordenar (canónico, sólo autenticado) ── */
  const reorderMutation = useMutation({
    mutationFn: async (orderedKeys: readonly string[]) => {
      if (!isAuthed || !active?.plan?.id) throw new Error("Inicia sesión para guardar el orden.");
      const byKey = new Map(
        (active.items ?? [])
          .filter((i) => i.target_id)
          .map((i) => [tripItemKey(i.item_kind, i.target_id), i.id] as const),
      );
      const ordered: string[] = [];
      for (const k of orderedKeys) {
        const id = byKey.get(k);
        if (id && !ordered.includes(id)) ordered.push(id);
      }
      for (const it of active.items ?? []) if (!ordered.includes(it.id)) ordered.push(it.id);
      return reorderFn({ data: { planId: active.plan.id, orderedItemIds: ordered } });
    },
    onSuccess: (r) => {
      void queryClient.invalidateQueries({ queryKey: ["traveler", "active-plan", user?.id] });
      notifyPlanChanged("reorder");
      toast("Orden aplicado en Mi Viaje", {
        description: `${r.updated} elemento${r.updated === 1 ? "" : "s"} reordenado${r.updated === 1 ? "" : "s"}.`,
      });
      setLiveNote("Orden aplicado en Mi Viaje.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo reordenar."),
  });

  const starters = props.starters ?? defaultStarters(props.destination?.label ?? null);
  const thinking = status === "thinking";
  const titleById = useMemo(
    () => new Map(tripItems.map((i) => [tripItemKey(i.kind, i.targetId), i.title ?? ""])),
    [tripItems],
  );

  return (
    <section
      aria-labelledby="alux-converse"
      className="rounded-2xl border border-border bg-card p-4 shadow-soft"
    >
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
        <MessageCircle className="size-3.5" aria-hidden />
        <span id="alux-converse">Conversa con Alux</span>
        {messages.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              setMessages([]);
              setUnderstood({});
              clearThread();
              setStatus("idle");
              setLiveNote("Conversación reiniciada.");
            }}
            className="ml-auto inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-[10px] font-medium normal-case tracking-normal text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3" aria-hidden />
            Nueva conversación
          </button>
        ) : null}
      </div>
      <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
        Pregunta libre. Alux responde sólo con el catálogo publicado y te dice cuándo un dato no
        está disponible.
      </p>

      {/* Anuncios para lector de pantalla */}
      <p className="sr-only" role="status" aria-live="polite">
        {liveNote}
      </p>

      {/* Hilo */}
      <div
        ref={logRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Conversación con Alux"
        className={[
          "mt-3 flex flex-col gap-3 overflow-y-auto pr-1",
          messages.length > 0 || thinking ? "max-h-[46vh] min-h-[6rem]" : "",
        ].join(" ")}
      >
        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <p
                className={[
                  "max-w-[88%] rounded-2xl rounded-br-md px-3 py-2 text-[13px] leading-snug",
                  m.failed
                    ? "border border-destructive/40 bg-destructive/5 text-foreground"
                    : "bg-primary/10 text-foreground",
                ].join(" ")}
              >
                {m.content}
              </p>
            </div>
          ) : (
            <AssistantTurn
              key={m.id}
              message={m}
              tripKeys={tripKeys}
              titleById={titleById}
              isAuthed={isAuthed}
              onAsk={(q) => void send(q)}
              onRemove={(rec) => removeMutation.mutate(rec)}
              removing={removeMutation.isPending}
              onApplyOrder={(keys) => reorderMutation.mutate(keys)}
              applyingOrder={reorderMutation.isPending}
            />
          ),
        )}

        {thinking ? (
          <div role="status" className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <span className="grid size-6 place-items-center rounded-full bg-primary/15">
              <AluxMark family="avatar" size={20} decorative />
            </span>
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            {ALUX_CONVERSE_COPY.thinking}
          </div>
        ) : null}

        {status === "error" && lastFailed ? (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] text-foreground"
          >
            <AlertCircle className="size-3.5 text-destructive" aria-hidden />
            <span>{ALUX_CONVERSE_COPY.errorNotice}</span>
            <button
              type="button"
              onClick={() => {
                setMessages((prev) => prev.filter((m) => m.id !== lastFailed.id));
                setStatus("idle");
                void send(lastFailed.content);
              }}
              className="ml-auto inline-flex min-h-11 items-center gap-1 rounded-full border border-border bg-background px-3 text-[12px] font-medium hover:bg-muted"
            >
              <RotateCcw className="size-3" aria-hidden />
              Reintentar
            </button>
          </div>
        ) : null}
      </div>

      {/* Sugerencias iniciales */}
      {hydrated && messages.length === 0 && !thinking ? (
        <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Preguntas sugeridas">
          {starters.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => void send(s)}
              className="inline-flex min-h-11 items-center rounded-full border border-primary/25 bg-primary/5 px-3 text-[12px] font-medium text-primary transition-colors hover:bg-primary/10"
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}

      {/* Entrada */}
      <form
        className="mt-3 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <label htmlFor="alux-converse-input" className="sr-only">
          Escribe tu pregunta a Alux
        </label>
        <textarea
          id="alux-converse-input"
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          rows={1}
          maxLength={ALUX_CONVERSE_LIMITS.maxMessageChars}
          placeholder={
            props.destination?.label
              ? `Pregúntale a Alux sobre ${props.destination.label}…`
              : "¿Qué viaje tienes en mente?"
          }
          disabled={thinking}
          className="min-h-11 flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-[13px] leading-snug text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-focus disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={thinking || input.trim().length === 0}
          aria-label="Enviar a Alux"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {thinking ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Send className="size-4" aria-hidden />
          )}
        </button>
      </form>
      <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
        Alux propone; tú decides con un toque. No reserva ni inventa precios, horarios o
        disponibilidad.
      </p>
    </section>
  );
}

/* ─────────────────────────── turno de Alux ─────────────────────────── */

function defaultStarters(destinationLabel: string | null): string[] {
  if (destinationLabel) {
    return [
      `¿Qué hacer una tarde en ${destinationLabel}?`,
      "Viajo en familia dos días y me interesa la cultura maya",
      "¿Dónde comer cerca y qué horario tiene?",
    ];
  }
  return [
    "Viajo en familia dos días y me interesa la cultura maya",
    "¿Qué destino me recomiendas para un fin de semana?",
    "Arma una ruta con lugares, una casa y una experiencia",
  ];
}

function AssistantTurn({
  message,
  tripKeys,
  titleById,
  isAuthed,
  onAsk,
  onRemove,
  removing,
  onApplyOrder,
  applyingOrder,
}: {
  message: ThreadMessage;
  tripKeys: ReadonlySet<string>;
  titleById: ReadonlyMap<string, string>;
  isAuthed: boolean;
  onAsk: (q: string) => void;
  onRemove: (rec: AluxConverseRecommendation) => void;
  removing: boolean;
  onApplyOrder: (keys: readonly string[]) => void;
  applyingOrder: boolean;
}) {
  const res = message.response;
  return (
    <article className="flex gap-2" aria-label="Respuesta de Alux">
      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary/15">
        <AluxMark family="avatar" size={20} decorative />
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="rounded-2xl rounded-tl-md bg-muted px-3 py-2 text-[13px] leading-snug text-foreground">
          {message.content}
        </p>

        {res?.notice ? (
          <p
            role="status"
            className="flex items-start gap-1.5 rounded-xl border border-border bg-background/70 px-3 py-2 text-[11px] leading-snug text-muted-foreground"
          >
            <AlertCircle className="mt-0.5 size-3 shrink-0" aria-hidden />
            {res.notice}
          </p>
        ) : null}

        {res?.clarifyingQuestions?.length ? (
          <div className="flex flex-wrap gap-1.5" aria-label="Alux necesita saber">
            {res.clarifyingQuestions.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onAsk(q)}
                className="inline-flex min-h-11 items-center rounded-full border border-primary/25 bg-primary/5 px-3 text-left text-[12px] font-medium text-primary hover:bg-primary/10"
              >
                {q}
              </button>
            ))}
          </div>
        ) : null}

        {res?.recommendations?.length ? (
          <ul className="space-y-2" aria-label="Opciones recomendadas">
            {res.recommendations.map((rec) => (
              <RecommendationCard
                key={`${rec.entityType}:${rec.entityId}`}
                rec={rec}
                inTrip={
                  rec.planKind ? tripKeys.has(tripItemKey(rec.planKind, rec.entityId)) : false
                }
                onRemove={onRemove}
                removing={removing}
              />
            ))}
          </ul>
        ) : null}

        {res?.sequence?.length ? (
          <div className="rounded-xl border border-border bg-background/70 p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
              <ListOrdered className="size-3.5" aria-hidden />
              Propuesta por día
            </p>
            <ol className="mt-1.5 space-y-1 text-[12px] text-foreground">
              {res.sequence.map((step) => (
                <li key={step.day} className="flex gap-2">
                  <span className="shrink-0 font-semibold">Día {step.day}</span>
                  <span className="text-muted-foreground">
                    {step.refs.map((r) => r.title).join(" → ")}
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              Es una propuesta, no una reserva.
            </p>
          </div>
        ) : null}

        {res?.reorderProposal ? (
          <div className="rounded-xl border border-primary/25 bg-primary/5 p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
              <ListOrdered className="size-3.5" aria-hidden />
              Nuevo orden sugerido
            </p>
            <ol className="mt-1.5 list-decimal space-y-0.5 pl-5 text-[12px] text-foreground">
              {res.reorderProposal.orderedKeys.map((k) => (
                <li key={k}>{titleById.get(k) || k.split(":")[0]}</li>
              ))}
            </ol>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {res.reorderProposal.rationale}
            </p>
            {isAuthed ? (
              <button
                type="button"
                disabled={applyingOrder}
                onClick={() => onApplyOrder(res.reorderProposal!.orderedKeys)}
                className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-full border border-primary bg-primary/10 px-3 text-[12px] font-medium text-primary hover:bg-primary/15 disabled:opacity-60"
              >
                {applyingOrder ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <Check className="size-3.5" aria-hidden />
                )}
                Aplicar este orden en Mi Viaje
              </button>
            ) : (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Crea tu cuenta para guardar el orden en Mi Viaje.
              </p>
            )}
          </div>
        ) : null}

        {res && (res.unavailableFacts.length > 0 || res.inferences.length > 0) ? (
          <details className="text-[11px] text-muted-foreground">
            <summary className="cursor-pointer select-none font-medium hover:text-foreground">
              Qué es dato y qué es inferencia
            </summary>
            <div className="mt-1.5 space-y-1.5">
              {res.inferences.length > 0 ? (
                <p>
                  <span className="font-semibold text-foreground">Inferencias:</span>{" "}
                  {res.inferences.join(" ")}
                </p>
              ) : null}
              {res.unavailableFacts.length > 0 ? (
                <p>
                  <span className="font-semibold text-foreground">No disponible:</span>{" "}
                  {res.unavailableFacts.join(" · ")}
                </p>
              ) : null}
            </div>
          </details>
        ) : null}
      </div>
    </article>
  );
}

/* ─────────────────────────── tarjeta de recomendación ─────────────────────────── */

function RecommendationCard({
  rec,
  inTrip,
  onRemove,
  removing,
}: {
  rec: AluxConverseRecommendation;
  inTrip: boolean;
  onRemove: (rec: AluxConverseRecommendation) => void;
  removing: boolean;
}) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  useEffect(() => {
    if (!inTrip) setConfirmRemove(false);
  }, [inTrip]);
  const canAdd = Boolean(rec.planKind) && !inTrip;
  const canRemove = Boolean(rec.planKind) && inTrip;

  return (
    <li className="rounded-xl border border-border bg-background/70 p-3">
      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        <span>{ALUX_FAMILY_LABEL[rec.family]}</span>
        {rec.destinationLabel ? <span aria-hidden>·</span> : null}
        {rec.destinationLabel ? <span>{rec.destinationLabel}</span> : null}
        {rec.scope === "nearby" ? (
          <span className="rounded-full bg-warning/15 px-2 py-0.5 text-warning-foreground normal-case tracking-normal">
            Cercanía
          </span>
        ) : null}
        {inTrip ? (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary normal-case tracking-normal">
            En Mi Viaje
          </span>
        ) : null}
      </div>
      <a
        href={rec.href}
        className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-foreground hover:underline"
      >
        {rec.title}
        <ArrowRight className="size-3.5" aria-hidden />
      </a>
      {rec.subtitle ? <p className="text-[11px] text-muted-foreground">{rec.subtitle}</p> : null}
      <p className="mt-1 flex items-start gap-1.5 text-[12px] leading-snug text-foreground/85">
        <Sparkles className="mt-0.5 size-3 shrink-0 text-primary" aria-hidden />
        <span>{rec.reason}</span>
      </p>
      {rec.confirmedFacts.length > 0 ? (
        <ul className="mt-1.5 flex flex-wrap gap-1" aria-label="Datos confirmados">
          {rec.confirmedFacts.slice(0, 3).map((f) => (
            <li
              key={f}
              className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-foreground/80"
            >
              {f}
            </li>
          ))}
        </ul>
      ) : null}
      {rec.unavailableFacts.length > 0 ? (
        <p className="mt-1 text-[10px] text-muted-foreground">
          Sin dato publicado: {rec.unavailableFacts.slice(0, 3).join(", ").toLowerCase()}
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {canAdd && rec.planKind ? (
          <AddToTravelPlanButton
            kind={rec.planKind as TravelItemKind}
            targetId={rec.entityId}
            title={rec.title}
            subtitle={rec.subtitle ?? rec.destinationLabel ?? null}
            imageUrl={rec.imageUrl}
            eligibilityMode="legacy"
            className="min-h-11"
          />
        ) : null}
        {canRemove ? (
          confirmRemove ? (
            <>
              <button
                type="button"
                disabled={removing}
                onClick={() => {
                  onRemove(rec);
                  setConfirmRemove(false);
                }}
                className="inline-flex min-h-11 items-center gap-1 rounded-full border border-destructive/40 bg-destructive/5 px-3 text-[12px] font-medium text-destructive hover:bg-destructive/10 disabled:opacity-60"
              >
                {removing ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <Trash2 className="size-3.5" aria-hidden />
                )}
                Sí, quitar
              </button>
              <button
                type="button"
                onClick={() => setConfirmRemove(false)}
                className="inline-flex min-h-11 items-center rounded-full border border-border px-3 text-[12px] font-medium text-foreground hover:bg-muted"
              >
                Cancelar
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmRemove(true)}
              className="inline-flex min-h-11 items-center gap-1 rounded-full border border-border px-3 text-[12px] font-medium text-foreground hover:bg-muted"
            >
              <Trash2 className="size-3.5" aria-hidden />
              Quitar de Mi Viaje
            </button>
          )
        ) : null}
        {!rec.planKind ? (
          <span className="text-[10px] text-muted-foreground">Sólo consulta</span>
        ) : null}
      </div>
    </li>
  );
}
