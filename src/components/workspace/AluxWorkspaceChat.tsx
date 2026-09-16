/**
 * AluxWorkspaceChat — conversación interna del Copiloto del área de trabajo.
 *
 * Abre desde el botón "Abrir conversación con Alux" del panel Copiloto.
 * Sólo explica cómo funciona el panel activo (bandejas, etapas, fases,
 * folios, pagos). No ejecuta acciones ni consulta datos de viajeros.
 */
import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Send, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWorkspace } from "./WorkspaceProvider";
import { getNavItemsForWorkspace } from "@/lib/workspace/navigation-registry";
import { aluxWorkspaceAssist } from "@/lib/workspace/workspace-assist.functions";
import { useAluxBrand } from "@/lib/brand/brand-context";

interface Turn {
  role: "user" | "assistant";
  content: string;
}

const STARTERS = [
  "¿Qué significa cada bandeja de este panel?",
  "¿Cómo sé cuáles ya pagaron y cuáles no?",
  "¿Qué debo hacer primero hoy?",
];

export interface AluxAssistSubject {
  kind: "order" | "case" | "entity";
  id?: string;
  label?: string;
  status?: string;
  fields?: string[];
}

export function AluxWorkspaceChat({
  open,
  onOpenChange,
  subject,
  starters,
  description,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Reservación, expediente o ficha abierta en la pantalla activa. */
  subject?: AluxAssistSubject;
  starters?: string[];
  description?: string;
}) {
  const { workspace } = useWorkspace();
  const alux = useAluxBrand();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const ask = useServerFn(aluxWorkspaceAssist);
  const initialStarters = starters?.length ? starters : STARTERS;
  const [turns, setTurns] = useState<Turn[]>([]);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followUps, setFollowUps] = useState<string[]>(initialStarters);
  const threadRef = useRef<HTMLDivElement | null>(null);


  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [turns, busy]);

  const send = async (question: string) => {
    const q = question.trim();
    if (!q || busy || !workspace) return;
    setValue("");
    setError(null);
    setBusy(true);
    const history = turns.slice(-6);
    setTurns((t) => [...t, { role: "user", content: q }]);
    try {
      const res = await ask({
        data: {
          workspaceId: workspace.id,
          workspaceLabel: workspace.label,
          route: pathname,
          areas: getNavItemsForWorkspace(workspace.id, "sidebar").map((i) => i.label),
          question: q,
          ...(subject ? { subject } : {}),
          history,
        },
      });
      setTurns((t) => [...t, { role: "assistant", content: res.answer }]);
      setFollowUps(res.followUps.length ? res.followUps : initialStarters);

    } catch {
      setError("No se pudo abrir la conversación. Inténtalo de nuevo en un momento.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85svh] w-[min(560px,94vw)] flex-col gap-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-full bg-alux/15 text-alux">
              <Sparkles className="h-4 w-4" aria-hidden />
            </span>
            {alux.copy("workspaceTitle")}
          </DialogTitle>
          <DialogDescription>
            {description ??
              `Pregunta cómo funciona ${workspace?.label ?? "este panel"}: bandejas, etapas, fases del viaje, folios y pagos. También puedes escribir un folio (por ejemplo AVL-260915-001) para consultar esa reservación.`}
          </DialogDescription>

        </DialogHeader>

        <div
          ref={threadRef}
          role="log"
          aria-live="polite"
          className="min-h-[160px] flex-1 space-y-3 overflow-y-auto rounded-xl border border-border bg-surface p-3 text-sm"
        >
          {turns.length === 0 ? (
            <p className="text-muted-foreground">
              Escribe tu pregunta o elige una de abajo. Alux sólo explica el panel; no cambia nada.
            </p>
          ) : (
            turns.map((t, i) => (
              <p
                key={i}
                className={
                  t.role === "user"
                    ? "ml-auto w-fit max-w-[85%] rounded-2xl bg-primary px-3 py-2 text-primary-foreground"
                    : "w-fit max-w-[90%] whitespace-pre-line rounded-2xl bg-surface-raised px-3 py-2"
                }
              >
                {t.content}
              </p>
            ))
          )}
          {busy ? (
            <p role="status" className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Pensando…
            </p>
          ) : null}
          {error ? <p className="text-destructive">{error}</p> : null}
        </div>

        {!busy && followUps.length ? (
          <ul className="flex flex-wrap gap-2">
            {followUps.map((f) => (
              <li key={f}>
                <button
                  type="button"
                  onClick={() => void send(f)}
                  className="rounded-pill border border-border bg-surface px-3 py-1.5 text-xs hover:bg-muted"
                >
                  {f}
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(value);
          }}
          className="flex items-center gap-2"
        >
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Escribe tu pregunta…"
            aria-label="Pregunta para Alux"
            maxLength={600}
            data-allow-palette="false"
          />
          <Button type="submit" size="icon" disabled={busy || !value.trim()} aria-label="Enviar">
            <Send className="h-4 w-4" aria-hidden />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
