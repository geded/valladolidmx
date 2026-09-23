/**
 * Ola A3 · Chat público de Alux
 *
 * Widget para visitantes anónimos. Habla contra
 * POST /api/public/alux/chat con rate-limit por IP. Persiste el
 * `sessionKey` en localStorage y mantiene el historial en memoria
 * (no hay memoria persistente para prospectos).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Send,
  Loader2,
  MapPin,
  MapPinOff,
  BrainCircuit,
  RotateCcw,
  Plus,
  Check,
  Volume2,
  CircleStop,
} from "lucide-react";
import { useTTS } from "@/lib/hooks/useTTS";
import { AluxMark } from "@/components/alux/AluxMark";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@tanstack/react-router";
import { useVisitorGeolocation } from "@/components/maps/useVisitorGeolocation";
import { useAuth } from "@/hooks/useAuth";
import { useServerFn } from "@tanstack/react-start";
import { proposeAluxPlanAddition } from "@/lib/alux/plan-proposals.functions";
import { toast } from "@/lib/toast";
import { useTranslation } from "@/i18n/context";
import { useAnonymousTrip } from "@/lib/traveler/anonymous-draft";
import { selectAnonymousTravelItems } from "@/lib/traveler/anonymous-draft/items";
import { rememberAuthReturnPath } from "@/lib/navigation/session-context";
import { useAluxBrand } from "@/lib/brand/brand-context";

type Proposal = {
  entity_type: "business" | "product" | "event" | "destination";
  entity_id: string;
  entity_slug: string | null;
  title: string;
  subtitle?: string | null;
  rationale?: string | null;
};
type Msg = { role: "user" | "assistant"; content: string; proposals?: Proposal[] };

const STORAGE_KEY = "alux_public_session_key";
const HISTORY_KEY_PREFIX = "alux_public_history:";
const MAX_PERSISTED_MSGS = 40;

function ensureSessionKey(): string {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing && existing.length >= 8) return existing;
  const key =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(STORAGE_KEY, key);
  return key;
}

export function PublicAluxChat() {
  const alux = useAluxBrand();
  const suggestions = [
    alux.copy("publicStarterSeason"),
    alux.copy("publicStarterDays"),
    alux.copy("publicStarterDestinations"),
    alux.copy("publicStarterExperiences"),
  ];
  const { locale } = useTranslation();
  const [sessionKey, setSessionKey] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateInfo, setRateInfo] = useState<{ used: number; limit: number } | null>(null);
  const [nearbyUsed, setNearbyUsed] = useState<number | null>(null);
  const [hasMemory, setHasMemory] = useState(false);
  const { location, status, request: requestLocation } = useVisitorGeolocation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const anonymous = useAnonymousTrip();
  const anonymousTripReady = anonymous.status !== "idle" && anonymous.status !== "loading";

  useEffect(() => {
    const key = ensureSessionKey();
    setSessionKey(key);
    // Ola A8 · Restaurar conversación previa (M3 multiturno del lado cliente).
    if (key && typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(HISTORY_KEY_PREFIX + key);
        if (raw) {
          const parsed = JSON.parse(raw) as Msg[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed.slice(-MAX_PERSISTED_MSGS));
            setHasMemory(true);
          }
        }
      } catch {
        /* noop */
      }
    }
  }, []);

  // Persistir historial para retomar la conversación entre visitas.
  useEffect(() => {
    if (!sessionKey || typeof window === "undefined") return;
    try {
      if (messages.length === 0) {
        window.localStorage.removeItem(HISTORY_KEY_PREFIX + sessionKey);
      } else {
        window.localStorage.setItem(
          HISTORY_KEY_PREFIX + sessionKey,
          JSON.stringify(messages.slice(-MAX_PERSISTED_MSGS)),
        );
      }
    } catch {
      /* quota / privacy — ignorar */
    }
  }, [messages, sessionKey]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const resetConversation = useCallback(() => {
    setMessages([]);
    setHasMemory(false);
    setError(null);
    if (sessionKey && typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(HISTORY_KEY_PREFIX + sessionKey);
      } catch {
        /* noop */
      }
    }
  }, [sessionKey]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending || !sessionKey || !anonymousTripReady) return;
      setError(null);
      const nextHistory = [...messages, { role: "user" as const, content: trimmed }];
      setMessages(nextHistory);
      setInput("");
      setSending(true);
      try {
        const res = await fetch("/api/public/alux/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            sessionKey,
            message: trimmed,
            history: messages.slice(-16),
            visitor: location ?? undefined,
            locale,
            pathContext: (() => {
              if (typeof window === "undefined") return undefined;
              const parts = window.location.pathname.split("/").filter(Boolean);
              if (parts[0] !== "oriente-maya") return undefined;
              return { destination: parts[1] ?? null, category: parts[2] ?? null };
            })(),
            tripContext: anonymous.trip
              ? {
                  destinations: anonymous.trip.destinationIds.slice(0, 8),
                  items: selectAnonymousTravelItems(anonymous.trip)
                    .slice(0, 20)
                    .map((item) => ({
                      kind: item.kind,
                      targetId: item.targetId,
                      title: item.title,
                      slug: item.slug,
                    })),
                  interests: anonymous.trip.interests?.slice(0, 16),
                  durationDays: anonymous.trip.tripDurationDays,
                  travelerCount: anonymous.trip.travelerCount,
                }
              : undefined,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setMessages(nextHistory);
          setError(
            data?.message ||
              (data?.error === "rate_limited"
                ? "Has llegado al límite como visitante. Crea tu cuenta para continuar."
                : "No pude responder ahora. Inténtalo en un momento."),
          );
          if (data?.rate || data?.hour_limit) {
            const day = data?.day_count ?? data?.rate?.day_count ?? 0;
            const limit = data?.day_limit ?? data?.rate?.day_limit ?? 40;
            setRateInfo({ used: day, limit });
          }
          return;
        }

        // SSE streaming — el texto llega en tiempo real
        const reader = res.body?.getReader();
        if (!reader) {
          setMessages(nextHistory);
          setError("No se pudo leer la respuesta de Alux.");
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let assistantText = "";
        setMessages([...nextHistory, { role: "assistant", content: "" }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";
          for (const event of events) {
            if (!event.startsWith("data: ")) continue;
            let parsed: Record<string, unknown>;
            try {
              parsed = JSON.parse(event.slice(6));
            } catch {
              continue;
            }
            if (parsed.type === "text" && typeof parsed.chunk === "string") {
              assistantText += parsed.chunk;
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = { role: "assistant" as const, content: assistantText };
                return next;
              });
            } else if (parsed.type === "done") {
              const proposals = Array.isArray(parsed.proposals)
                ? (parsed.proposals as Proposal[])
                : [];
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = {
                  role: "assistant" as const,
                  content: typeof parsed.text === "string" ? parsed.text : assistantText,
                  proposals,
                };
                return next;
              });
              if (parsed.rate && typeof parsed.rate === "object") {
                const rate = parsed.rate as { day_count: number; day_limit: number };
                setRateInfo({ used: rate.day_count, limit: rate.day_limit });
              }
              if (typeof parsed.nearby_used === "number") setNearbyUsed(parsed.nearby_used);
              if (
                parsed.memory &&
                typeof parsed.memory === "object" &&
                (parsed.memory as { has_summary?: boolean }).has_summary
              )
                setHasMemory(true);
            } else if (parsed.type === "error") {
              setMessages(nextHistory);
              setError(
                typeof parsed.message === "string"
                  ? parsed.message
                  : "No pude responder ahora.",
              );
            }
          }
        }
      } catch {
        setError("Sin conexión. Revisa tu red e inténtalo de nuevo.");
      } finally {
        setSending(false);
      }
    },
    [messages, sending, sessionKey, location, locale, anonymous.trip, anonymousTripReady],
  );

  return (
    <section
      aria-label={alux.copy("conversationTitle")}
      className="rounded-3xl border border-alux-border bg-alux-surface text-alux-surface-foreground shadow-elevated overflow-hidden"
    >
      <header className="flex items-center gap-3 border-b border-border/60 bg-muted/40 px-5 py-4">
        {/* G8-R1-D3 · Identidad canónica: activo gobernado de /brand/alux/. */}
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-alux/10">
          <AluxMark family="avatar" size={40} decorative loading="eager" />
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="font-serif text-lg leading-none">{alux.copy("conversationTitle")}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {alux.copy("publicAvailability")}
          </p>
        </div>
        {rateInfo && (
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {rateInfo.used}/{rateInfo.limit} hoy
          </span>
        )}
        {messages.length > 0 && (
          <button
            type="button"
            onClick={resetConversation}
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition"
             title={alux.copy("newConversation")}
          >
            <RotateCcw className="h-3 w-3" />
             {alux.copy("newConversation")}
          </button>
        )}
      </header>

      {hasMemory && (
        <div className="flex items-center gap-2 border-b border-border/60 bg-alux/5 px-5 py-2 text-[11px] text-alux">
          <BrainCircuit className="h-3 w-3" />
          {alux.copy("conversationMemory")}
        </div>
      )}

      {/* Consentimiento espacial (opt-in, no intrusivo) */}
      <div className="flex items-center gap-2 border-b border-border/60 bg-background px-5 py-2 text-[11px]">
        {status === "granted" && location ? (
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-success/10 px-2.5 py-1 text-success">
            <MapPin className="h-3 w-3" />
            {alux.copy("locationGranted")}
            {nearbyUsed != null && nearbyUsed > 0 ? ` · ${nearbyUsed} cerca` : ""}
          </span>
        ) : status === "denied" || status === "unavailable" ? (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <MapPinOff className="h-3 w-3" />
            {alux.copy("locationGeneral")}
          </span>
        ) : (
          <button
            type="button"
            onClick={requestLocation}
            disabled={status === "prompting"}
            className="inline-flex items-center gap-1.5 rounded-pill border border-border/60 bg-muted/40 px-2.5 py-1 text-muted-foreground hover:bg-muted transition disabled:opacity-60"
          >
            <MapPin className="h-3 w-3" />
            {status === "prompting"
              ? alux.copy("requestingLocation")
              : alux.copy("locationNearbyCta")}
          </button>
        )}
      </div>

      <div
        ref={scrollRef}
        className="max-h-[440px] min-h-[280px] overflow-y-auto px-5 py-6 space-y-4 bg-background"
      >
        {messages.length === 0 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {alux.copy("publicIntro")}
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  disabled={!anonymousTripReady}
                  className="text-xs rounded-pill border border-border/60 bg-muted/40 px-3 py-2 hover:bg-muted transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={m.role === "user" ? "flex justify-end" : "flex flex-col items-start gap-2"}
          >
            <div
              className={[
                "max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed",
                m.role === "user"
                  ? "bg-alux text-alux-foreground rounded-br-md"
                  : "bg-muted text-foreground rounded-bl-md",
              ].join(" ")}
            >
              {m.content}
            </div>
            {m.role === "assistant" && m.proposals && m.proposals.length > 0 && (
              <AluxProposals items={m.proposals} />
            )}
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> {alux.copy("thinking")}
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {error}{" "}
            <Link
              to="/auth"
              onClick={() => rememberAuthReturnPath("/alux")}
              className="underline font-medium"
            >
               {alux.copy("createAccount")}
            </Link>
          </div>
        )}
      </div>

      <form
        className="border-t border-border/60 bg-muted/30 px-3 py-3 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={alux.copy("inputPlaceholder")}
          rows={1}
          maxLength={800}
          disabled={!anonymousTripReady}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          className="min-h-[44px] max-h-40 resize-none bg-background"
        />
        <Button
          type="submit"
          size="icon"
          disabled={sending || !input.trim() || !anonymousTripReady}
        >
          <Send className="h-4 w-4" />
          <span className="sr-only">{alux.copy("sendLabel")}</span>
        </Button>
      </form>

      <p className="px-5 pb-4 pt-2 text-[11px] text-muted-foreground bg-muted/30">
        {alux.copy("disclaimer")} Para armar tu viaje completo,{" "}
        <Link
          to="/auth"
          onClick={() => rememberAuthReturnPath("/alux")}
          className="underline"
        >
          crea tu cuenta gratuita
        </Link>
        .
      </p>
    </section>
  );
}

function AluxProposals({ items }: { items: Proposal[] }) {
  const alux = useAluxBrand();
  const { user } = useAuth();
  const proposeFn = useServerFn(proposeAluxPlanAddition);
  const [pending, setPending] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());

  async function handleAdd(p: Proposal) {
    if (!user) {
      toast.info("Crea tu cuenta para guardar sugerencias en tu viaje.");
      return;
    }
    setPending(p.entity_id);
    try {
      await proposeFn({
        data: {
          entityType: p.entity_type,
          entityId: p.entity_id,
          entitySlug: p.entity_slug ?? null,
          title: p.title,
          subtitle: p.subtitle ?? null,
          rationale: p.rationale ?? null,
        },
      });
      setDone((s) => new Set(s).add(p.entity_id));
      toast.success("Sugerencia enviada a Mi Viaje · confírmala cuando quieras.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="ml-1 flex max-w-full flex-wrap gap-2">
      {items.map((p) => {
        const added = done.has(p.entity_id);
        return (
          <button
            key={p.entity_id}
            type="button"
            disabled={added || pending === p.entity_id}
            onClick={() => handleAdd(p)}
            className="inline-flex items-center gap-1.5 rounded-pill border border-alux/30 bg-alux/5 px-3 py-1.5 text-xs text-alux hover:bg-alux/10 transition disabled:opacity-60"
            title={p.rationale ?? undefined}
          >
            {added ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            <span className="truncate max-w-[180px]">{p.title}</span>
            {p.subtitle && <span className="text-[10px] text-alux/70">· {p.subtitle}</span>}
          </button>
        );
      })}
      <p className="basis-full text-[10px] text-muted-foreground">
        {alux.copy("proposalFooter").replace("Mi Viaje.", "")} {" "}
        <Link to="/cuenta/mi-viaje" className="underline">
          Mi Viaje
        </Link>
        .
      </p>
    </div>
  );
}
