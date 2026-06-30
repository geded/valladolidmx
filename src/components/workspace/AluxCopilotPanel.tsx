/**
 * AluxCopilotPanel — capa transversal del Workspace Engine.
 * Lee el contexto Alux del workspace activo desde el Alux Registry.
 */
import { useEffect, useState } from "react";
import { Sparkles, ArrowUpRight } from "lucide-react";
import { useWorkspace } from "./WorkspaceProvider";
import {
  getAluxContext,
  resolveAluxActions,
  resolveAluxHeadline,
  resolveAluxSummary,
} from "@/lib/workspace/alux-registry";
import type { AluxAction } from "@/lib/workspace/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const IMPACT_TONE: Record<NonNullable<AluxAction["impact"]>, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-info/15 text-info",
  high: "bg-primary/15 text-primary",
};

export function AluxCopilotPanel({ className }: { className?: string }) {
  const { workspace } = useWorkspace();
  const [headline, setHeadline] = useState<string>("");
  const [summary, setSummary] = useState<string | undefined>();
  const [actions, setActions] = useState<AluxAction[]>([]);

  useEffect(() => {
    if (!workspace) return;
    const ctx = getAluxContext(workspace.id);
    if (!ctx) {
      setHeadline("");
      setSummary(undefined);
      setActions([]);
      return;
    }
    let active = true;
    void Promise.all([
      resolveAluxHeadline(ctx),
      resolveAluxSummary(ctx),
      resolveAluxActions(ctx),
    ]).then(([h, s, a]) => {
      if (!active) return;
      setHeadline(h);
      setSummary(s);
      setActions(a);
    });
    return () => {
      active = false;
    };
  }, [workspace]);

  return (
    <section
      className={cn(
        "flex h-full flex-col gap-4 border-l border-border bg-surface p-4",
        className,
      )}
      aria-label="Copiloto Alux"
    >
      <header className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-full bg-primary/15 text-primary">
          <Sparkles className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Copiloto · Alux
          </div>
          <div className="truncate font-display text-sm">
            {workspace?.label ?? "Workspace"}
          </div>
        </div>
      </header>

      <div className="rounded-2xl border border-border bg-surface-raised p-4">
        <p className="font-display text-base leading-snug">
          {headline || "Alux está observando el pulso de este workspace."}
        </p>
        {summary ? (
          <p className="mt-2 text-sm text-muted-foreground">{summary}</p>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Próxima acción de alto impacto
        </div>
        <ul className="mt-2 space-y-2">
          {actions.length === 0 ? (
            <li className="rounded-xl border border-dashed border-border bg-surface p-4 text-sm text-muted-foreground">
              Sin acciones sugeridas por ahora.
            </li>
          ) : (
            actions.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => void a.run()}
                  className="flex w-full items-start gap-3 rounded-xl border border-border bg-surface p-3 text-left transition hover:bg-surface-raised"
                >
                  <span
                    className={cn(
                      "mt-0.5 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      IMPACT_TONE[a.impact ?? "low"],
                    )}
                  >
                    {a.impact ?? "low"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{a.label}</span>
                    {a.description ? (
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {a.description}
                      </span>
                    ) : null}
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                </button>
              </li>
            ))
          )}
        </ul>
      </div>

      <footer>
        <Button variant="outline" className="w-full" size="sm">
          Abrir conversación con Alux
        </Button>
      </footer>
    </section>
  );
}