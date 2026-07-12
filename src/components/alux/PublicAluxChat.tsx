/**
 * Ola A3 · Chat público de Alux
 *
 * Widget para visitantes anónimos. Habla contra
 * POST /api/public/alux/chat con rate-limit por IP. Persiste el
 * `sessionKey` en localStorage y mantiene el historial en memoria
 * (no hay memoria persistente para prospectos).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Send, Sparkles, Loader2, MapPin, MapPinOff, BrainCircuit, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@tanstack/react-router";
import { useVisitorGeolocation } from "@/components/maps/useVisitorGeolocation";

type Msg = { role: "user" | "assistant"; content: string };

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

const SUGGESTIONS = [
  "¿Cuál es la mejor época para visitar Valladolid?",
  "¿Qué hacer en 3 días en el Oriente Maya?",
  "¿Cómo llego a Chichén Itzá desde Valladolid?",
  "¿Qué son los Pueblos Mágicos de la región?",
];

export function PublicAluxChat() {
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
      if (!trimmed || sending || !sessionKey) return;
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
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
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
        setMessages([...nextHistory, { role: "assistant", content: data.text }]);
        if (data?.rate) {
          setRateInfo({ used: data.rate.day_count, limit: data.rate.day_limit });
        }
        if (typeof data?.nearby_used === "number") setNearbyUsed(data.nearby_used);
        if (data?.memory?.has_summary) setHasMemory(true);
      } catch {
        setError("Sin conexión. Revisa tu red e inténtalo de nuevo.");
      } finally {
        setSending(false);
      }
    },
    [messages, sending, sessionKey, location],
  );

  return (
    <section
      aria-label="Habla con Alux"
      className="rounded-3xl border border-border/60 bg-card shadow-elevated overflow-hidden"
    >
      <header className="flex items-center gap-3 border-b border-border/60 bg-muted/40 px-5 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-serif text-lg leading-none">Habla con Alux</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Concierge IA del Oriente Maya · disponible sin registro
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
            title="Iniciar una conversación nueva"
          >
            <RotateCcw className="h-3 w-3" />
            Nueva
          </button>
        )}
      </header>

      {hasMemory && (
        <div className="flex items-center gap-2 border-b border-border/60 bg-primary/5 px-5 py-2 text-[11px] text-primary">
          <BrainCircuit className="h-3 w-3" />
          Alux recuerda tu conversación previa · no necesitas repetir contexto
        </div>
      )}

      {/* Consentimiento espacial (opt-in, no intrusivo) */}
      <div className="flex items-center gap-2 border-b border-border/60 bg-background px-5 py-2 text-[11px]">
        {status === "granted" && location ? (
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-success/10 px-2.5 py-1 text-success">
            <MapPin className="h-3 w-3" />
            Ordenando por cercanía a tu ubicación
            {nearbyUsed != null && nearbyUsed > 0 ? ` · ${nearbyUsed} cerca` : ""}
          </span>
        ) : status === "denied" || status === "unavailable" ? (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <MapPinOff className="h-3 w-3" />
            Sin ubicación · recomiendo por relevancia territorial
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
              ? "Solicitando ubicación…"
              : "Compartir mi ubicación para sugerencias cercanas"}
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
              Pregúntame lo que quieras sobre Valladolid, Izamal, Espita, los cenotes, Chichén
              Itzá o cómo armar tu viaje al Oriente Maya.
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
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
            className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className={[
                "max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed",
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted text-foreground rounded-bl-md",
              ].join(" ")}
            >
              {m.content}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Alux está pensando…
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {error}{" "}
            <Link to="/auth" className="underline font-medium">
              Crear cuenta gratuita
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
          placeholder="Escribe tu pregunta…"
          rows={1}
          maxLength={800}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          className="min-h-[44px] max-h-40 resize-none bg-background"
        />
        <Button type="submit" size="icon" disabled={sending || !input.trim()}>
          <Send className="h-4 w-4" />
          <span className="sr-only">Enviar</span>
        </Button>
      </form>

      <p className="px-5 pb-4 pt-2 text-[11px] text-muted-foreground bg-muted/30">
        Alux es una guía inspiracional. Nunca reserva ni cotiza sin tu confirmación. Para armar
        tu viaje completo, <Link to="/auth" className="underline">crea tu cuenta gratuita</Link>.
      </p>
    </section>
  );
}