import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, Loader2, MessageCircle, RefreshCw, Trash2 } from "lucide-react";
import {
  listBlockComments,
  createBlockComment,
  resolveBlockComment,
  reopenBlockComment,
  deleteBlockComment,
  type BlockComment,
} from "@/lib/experience-builder/studio.functions";

function relTime(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

interface Props {
  compositionId: string;
  blockId: string;
  blockLabel?: string;
  currentUserId: string | null;
  isAdmin: boolean;
  /** Notifica al padre el número de comentarios abiertos por bloque para pintar badges. */
  onCountsChange?: (byBlock: Record<string, number>) => void;
}

/**
 * US-03 · Panel de comentarios inline por bloque.
 * Se renderiza dentro del Inspector, filtrando por `blockId`.
 */
export function BlockCommentsPanel({
  compositionId,
  blockId,
  blockLabel,
  currentUserId,
  isAdmin,
  onCountsChange,
}: Props) {
  const [comments, setComments] = useState<BlockComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [body, setBody] = useState("");
  const [showResolved, setShowResolved] = useState(false);

  const listFn = useServerFn(listBlockComments);
  const createFn = useServerFn(createBlockComment);
  const resolveFn = useServerFn(resolveBlockComment);
  const reopenFn = useServerFn(reopenBlockComment);
  const deleteFn = useServerFn(deleteBlockComment);

  const refresh = useCallback(async () => {
    try {
      const rows = await listFn({ data: { composition_id: compositionId } });
      setComments(rows);
      if (onCountsChange) {
        const acc: Record<string, number> = {};
        for (const r of rows) {
          if (!r.resolved_at) acc[r.block_id] = (acc[r.block_id] ?? 0) + 1;
        }
        onCountsChange(acc);
      }
    } catch (e) {
      // silencioso: pueden no tener permisos si no son editores
    } finally {
      setLoading(false);
    }
  }, [compositionId, listFn, onCountsChange]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  const forBlock = comments.filter((c) => c.block_id === blockId);
  const visible = showResolved ? forBlock : forBlock.filter((c) => !c.resolved_at);
  const openCount = forBlock.filter((c) => !c.resolved_at).length;
  const resolvedCount = forBlock.length - openCount;

  const submit = async () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await createFn({ data: { composition_id: compositionId, block_id: blockId, body: trimmed } });
      setBody("");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo publicar el comentario");
    } finally {
      setBusy(false);
    }
  };

  const doResolve = async (id: string) => {
    try {
      await resolveFn({ data: { id } });
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo resolver");
    }
  };
  const doReopen = async (id: string) => {
    try {
      await reopenFn({ data: { id } });
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo reabrir");
    }
  };
  const doDelete = async (id: string) => {
    if (!confirm("¿Eliminar este comentario?")) return;
    try {
      await deleteFn({ data: { id } });
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo eliminar");
    }
  };

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <MessageCircle className="size-3.5" />
          Comentarios
          {openCount > 0 ? (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {openCount}
            </span>
          ) : null}
        </div>
        {resolvedCount > 0 ? (
          <button
            type="button"
            onClick={() => setShowResolved((v) => !v)}
            className="text-[10px] font-medium text-muted-foreground hover:text-foreground"
          >
            {showResolved ? "Ocultar resueltos" : `Ver resueltos (${resolvedCount})`}
          </button>
        ) : null}
      </div>
      {blockLabel ? (
        <p className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">{blockLabel}</p>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" /> Cargando…
        </div>
      ) : visible.length === 0 ? (
        <p className="py-2 text-xs text-muted-foreground">
          {forBlock.length === 0 ? "Aún no hay comentarios en este bloque." : "Sin comentarios abiertos."}
        </p>
      ) : (
        <ul className="space-y-2">
          {visible.map((c) => {
            const canManage = isAdmin || c.author_id === currentUserId;
            return (
              <li
                key={c.id}
                className={`rounded-md border p-2 text-xs ${
                  c.resolved_at ? "border-border/60 bg-muted/40 text-muted-foreground" : "border-border bg-background"
                }`}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">
                    {c.author_name ?? "Editor"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{relTime(c.created_at)}</span>
                </div>
                <p className="whitespace-pre-wrap leading-relaxed">{c.body}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  {c.resolved_at ? (
                    <button
                      type="button"
                      onClick={() => doReopen(c.id)}
                      className="inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
                    >
                      <RefreshCw className="size-2.5" /> Reabrir
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => doResolve(c.id)}
                      className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                    >
                      <Check className="size-2.5" /> Resolver
                    </button>
                  )}
                  {canManage && !c.resolved_at ? (
                    <button
                      type="button"
                      onClick={() => doDelete(c.id)}
                      className="inline-flex items-center gap-1 text-[10px] font-medium text-destructive hover:underline"
                    >
                      <Trash2 className="size-2.5" /> Eliminar
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-2 space-y-1.5">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void submit();
            }
          }}
          rows={2}
          maxLength={4000}
          placeholder="Comentar este bloque… (Ctrl/⌘+Enter)"
          className="w-full resize-none rounded-md border border-input bg-background px-2 py-1.5 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={busy || !body.trim()}
            onClick={() => void submit()}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground shadow-sm transition disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-3 animate-spin" /> : null}
            Publicar
          </button>
        </div>
      </div>
    </div>
  );
}