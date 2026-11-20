/**
 * Conversación del expediente: mensajes entre el viajero y su concierge.
 *
 * Misma superficie para las dos vistas:
 *  - viajero (`internal={false}`): sólo el hilo con su concierge.
 *  - equipo (`internal`): pestañas "Con el viajero" y "Notas internas".
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle, Send } from "lucide-react";
import {
  listConciergeCaseMessages,
  sendConciergeCaseMessage,
  type CaseMessage,
} from "@/lib/concierge/messages.functions";
import { Button } from "@/components/ui/button";
import { meridaDateTime } from "@/lib/time/merida";
import { toast } from "@/lib/toast";

export function CaseMessages({ caseId, internal = false }: { caseId: string; internal?: boolean }) {
  const listFn = useServerFn(listConciergeCaseMessages);
  const sendFn = useServerFn(sendConciergeCaseMessage);
  const qc = useQueryClient();

  const [tab, setTab] = useState<"traveler" | "internal">("traveler");
  const [body, setBody] = useState("");

  const q = useQuery({
    queryKey: ["concierge", "case-messages", caseId],
    queryFn: () => listFn({ data: { caseId } }) as Promise<CaseMessage[]>,
  });

  const send = useMutation({
    mutationFn: () =>
      sendFn({ data: { caseId, body: body.trim(), visibility: internal ? tab : "traveler" } }),
    onSuccess: async () => {
      setBody("");
      await qc.invalidateQueries({ queryKey: ["concierge", "case-messages", caseId] });
      await qc.invalidateQueries({ queryKey: ["concierge", "case-file", caseId] });
      toast.success(
        internal && tab === "internal" ? "Nota interna guardada" : "Mensaje enviado",
      );
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "No se pudo enviar el mensaje"),
  });

  const visibility = internal ? tab : "traveler";
  const messages = (q.data ?? []).filter((m) => m.visibility === visibility);

  return (
    <section className="rounded-lg border border-border bg-card p-4" id="case-messages">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <MessageCircle className="size-4 text-primary" />
          {internal ? "Conversación del expediente" : "Escríbele a tu concierge"}
        </h3>
        {internal ? (
          <div className="flex gap-1" role="tablist" aria-label="Tipo de mensaje">
            <TabButton active={tab === "traveler"} onClick={() => setTab("traveler")}>
              Con el viajero
            </TabButton>
            <TabButton active={tab === "internal"} onClick={() => setTab("internal")}>
              Notas internas
            </TabButton>
          </div>
        ) : null}
      </header>

      {!internal ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Tu concierge humano te responde aquí mismo. Cuéntale dudas, cambios de fecha o ajustes de
          tu itinerario.
        </p>
      ) : null}

      <ol className="mt-4 grid gap-2">
        {q.isLoading ? (
          <li className="text-xs text-muted-foreground">Cargando mensajes…</li>
        ) : messages.length === 0 ? (
          <li className="rounded-md border border-dashed border-border p-4 text-xs text-muted-foreground">
            {internal && tab === "internal"
              ? "Sin notas internas."
              : "Todavía no hay mensajes. Escribe el primero."}
          </li>
        ) : (
          messages.map((m) => (
            <li
              key={m.id}
              className={`rounded-lg border p-3 text-sm ${
                m.mine
                  ? "ml-6 border-primary/30 bg-primary/5"
                  : "mr-6 border-border bg-background"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">
                  {m.mine ? "Tú" : (m.author_name ?? (internal ? "Viajero" : "Tu concierge"))}
                </span>
                <span>{meridaDateTime(m.created_at)}</span>
              </div>
              <p className="mt-1 whitespace-pre-line">{m.body}</p>
            </li>
          ))
        )}
      </ol>

      <form
        className="mt-4 grid gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (body.trim().length > 0 && !send.isPending) send.mutate();
        }}
      >
        <label htmlFor="case-message-body" className="sr-only">
          Mensaje
        </label>
        <textarea
          id="case-message-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={4000}
          placeholder={
            internal && tab === "internal"
              ? "Nota visible sólo para el equipo…"
              : internal
                ? "Responde al viajero…"
                : "Escribe tu pregunta a tu concierge…"
          }
          className="w-full rounded-md border border-border bg-background p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">
            {internal && tab === "internal"
              ? "El viajero no verá esta nota."
              : "El mensaje queda en el expediente."}
          </span>
          <Button type="submit" size="sm" disabled={send.isPending || body.trim().length === 0}>
            <Send className="mr-1.5 size-3.5" />
            {send.isPending ? "Enviando…" : "Enviar"}
          </Button>
        </div>
      </form>
    </section>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-pill px-3 py-1 text-xs font-medium transition ${
        active
          ? "bg-primary text-primary-foreground"
          : "border border-border bg-background hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}
