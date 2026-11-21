/**
 * CRM Prospectos · Fase 2 · control de una plática de WhatsApp desde el panel.
 *
 * El concierge toma la plática (Alux se calla), escribe en español y el
 * mensaje sale traducido al idioma del cliente; con «Devolver a Alux» Alux
 * vuelve a contestar. Se usa en Pláticas y en la ficha del prospecto.
 */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { sendWhatsAppFromPanel, setWhatsAppConversationMode } from "@/lib/crm/whatsapp.functions";

const LANGUAGE_LABEL: Record<string, string> = {
  es: "español",
  en: "inglés",
  fr: "francés",
  de: "alemán",
  it: "italiano",
  pt: "portugués",
};

export function WhatsAppConversationPanel({
  sessionId,
  mode,
  language,
  handoffRequestedAt,
}: {
  sessionId: string;
  mode: "alux" | "human";
  language: string | null;
  handoffRequestedAt: string | null;
}) {
  const qc = useQueryClient();
  const sendFn = useServerFn(sendWhatsAppFromPanel);
  const modeFn = useServerFn(setWhatsAppConversationMode);
  const [text, setText] = useState("");
  const [translate, setTranslate] = useState(true);
  const [busy, setBusy] = useState(false);
  const lang = language ?? "es";
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["crm-alux-conversation", sessionId] });
    void qc.invalidateQueries({ queryKey: ["crm-alux-conversations"] });
    void qc.invalidateQueries({ queryKey: ["crm-prospect"] });
  };

  const send = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      const r = await sendFn({ data: { sessionId, text: text.trim(), translate } });
      if (r.ok) {
        setText("");
        toast.success(r.translated ? `Enviado en ${LANGUAGE_LABEL[lang] ?? lang}` : "Enviado");
        refresh();
      } else toast.error(r.error);
    } catch {
      toast.error("No se pudo enviar el mensaje.");
    } finally {
      setBusy(false);
    }
  };

  const changeMode = async (next: "alux" | "human") => {
    setBusy(true);
    try {
      await modeFn({ data: { sessionId, mode: next } });
      toast.success(next === "alux" ? "Alux vuelve a contestar" : "Tomaste la plática");
      refresh();
    } catch {
      toast.error("No se pudo cambiar quién atiende.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-border bg-background p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium">
          {mode === "alux" ? "Atiende Alux" : "Atiende un concierge · Alux en pausa"}
          {handoffRequestedAt && mode === "human" ? (
            <span className="ml-2 text-destructive">Pidió concierge</span>
          ) : null}
        </p>
        {mode === "alux" ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void changeMode("human")}
            className="inline-flex min-h-9 items-center rounded-full border border-border bg-card px-3 text-xs font-semibold hover:bg-muted disabled:opacity-60"
          >
            Tomar plática
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void changeMode("alux")}
            className="inline-flex min-h-9 items-center rounded-full border border-border bg-card px-3 text-xs font-semibold hover:bg-muted disabled:opacity-60"
          >
            Devolver a Alux
          </button>
        )}
      </div>
      <label className="sr-only" htmlFor={`wa-composer-${sessionId}`}>
        Mensaje para el cliente
      </label>
      <textarea
        id={`wa-composer-${sessionId}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Escribe en español; al enviar, Alux se pausa en esta plática."
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        {lang !== "es" ? (
          <label className="flex min-h-9 items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={translate}
              onChange={(e) => setTranslate(e.target.checked)}
            />
            Traducir al {LANGUAGE_LABEL[lang] ?? lang} del cliente
          </label>
        ) : (
          <span className="text-xs text-muted-foreground">El cliente escribe en español.</span>
        )}
        <button
          type="button"
          disabled={busy || !text.trim()}
          onClick={() => void send()}
          className="inline-flex min-h-10 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Enviando…" : "Enviar por WhatsApp"}
        </button>
      </div>
    </div>
  );
}
