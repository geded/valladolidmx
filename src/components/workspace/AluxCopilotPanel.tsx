/**
 * AluxCopilotPanel — capa transversal del Workspace Engine.
 * Lee el contexto Alux del workspace activo desde el Alux Registry.
 */
import { useEffect, useState } from "react";
import {
  Sparkles,
  ArrowUpRight,
  Info,
  Undo2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useWorkspace } from "./WorkspaceProvider";
import {
  getAluxContext,
  resolveAluxActions,
  resolveAluxHeadline,
  resolveAluxSummary,
} from "@/lib/workspace/alux-registry";
import type { AluxAction } from "@/lib/workspace/types";
import { workspaceToast } from "@/lib/workspace/toast-bus";
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
  const [openExpl, setOpenExpl] = useState<Record<string, boolean>>({});

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

  const runAction = async (a: AluxAction) => {
    if (a.confirm === "strict") {
      if (!window.confirm(`${a.label}\n\n${a.effect ?? "¿Confirmar?"}`)) return;
    }
    try {
      await a.run();
      workspaceToast.success(a.label, {
        description: a.effect,
        undo:
          a.reversible && a.undo ? { run: a.undo } : undefined,
      });
    } catch (err) {
      workspaceToast.error("No se pudo ejecutar la acción", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

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
            actions.map((a) => {
              const isOpen = openExpl[a.id];
              const explainable = Boolean(
                a.rationale || a.sources?.length || a.effect,
              );
              return (
                <li
                  key={a.id}
                  className="rounded-xl border border-border bg-surface p-3"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "mt-0.5 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        IMPACT_TONE[a.impact ?? "low"],
                      )}
                    >
                      {a.impact ?? "low"}
                    </span>
                    <button
                      type="button"
                      onClick={() => void runAction(a)}
                      className="flex min-w-0 flex-1 items-start gap-2 text-left"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">
                          {a.label}
                        </span>
                        {a.description ? (
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {a.description}
                          </span>
                        ) : null}
                      </span>
                      <ArrowUpRight
                        className="h-4 w-4 text-muted-foreground"
                        aria-hidden
                      />
                    </button>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    {a.reversible ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-success">
                        <Undo2 className="h-3 w-3" aria-hidden /> Reversible
                      </span>
                    ) : null}
                    {explainable ? (
                      <button
                        type="button"
                        onClick={() =>
                          setOpenExpl((s) => ({ ...s, [a.id]: !s[a.id] }))
                        }
                        className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 hover:bg-muted/80"
                      >
                        <Info className="h-3 w-3" aria-hidden />
                        ¿Por qué?
                        {isOpen ? (
                          <ChevronUp className="h-3 w-3" aria-hidden />
                        ) : (
                          <ChevronDown className="h-3 w-3" aria-hidden />
                        )}
                      </button>
                    ) : null}
                  </div>

                  {isOpen && explainable ? (
                    <div className="mt-3 space-y-2 rounded-lg bg-surface-raised p-3 text-xs">
                      {a.rationale ? (
                        <div>
                          <div className="font-semibold uppercase tracking-wide text-[10px] text-muted-foreground">
                            Razón
                          </div>
                          <p className="mt-0.5">{a.rationale}</p>
                        </div>
                      ) : null}
                      {a.effect ? (
                        <div>
                          <div className="font-semibold uppercase tracking-wide text-[10px] text-muted-foreground">
                            Efecto
                          </div>
                          <p className="mt-0.5">{a.effect}</p>
                        </div>
                      ) : null}
                      {a.sources && a.sources.length > 0 ? (
                        <div>
                          <div className="font-semibold uppercase tracking-wide text-[10px] text-muted-foreground">
                            Fuentes
                          </div>
                          <ul className="mt-1 flex flex-wrap gap-1">
                            {a.sources.map((s) => (
                              <li
                                key={s.id}
                                className="rounded-md border border-border bg-surface px-1.5 py-0.5"
                                title={s.kind}
                              >
                                {s.label}
                                {s.value != null ? (
                                  <span className="ml-1 text-muted-foreground">
                                    · {s.value}
                                  </span>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })
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