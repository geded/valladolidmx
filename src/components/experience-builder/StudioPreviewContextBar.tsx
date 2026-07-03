/**
 * Studio · Barra "Vista previa con…" (US-R3 · Sub-ola 2.2b)
 *
 * Selector reutilizable que se pinta encima del canvas cuando la
 * composición abierta corresponde a una plantilla madre registrada en
 * `preview-registry`. No conoce nada específico del kind: sólo lista
 * candidatos, memoriza la selección en localStorage y devuelve el dato
 * cargado al Studio para que lo envuelva en el `Provider` correcto.
 */
import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import {
  readStoredPreviewSlug,
  writeStoredPreviewSlug,
  type PreviewCandidate,
  type TemplatePreviewProvider,
} from "@/lib/experience-builder/preview-registry";

const DEMO_SENTINEL = "__demo__";

export interface StudioPreviewContextBarProps<TData> {
  provider: TemplatePreviewProvider<TData>;
  /** Notifica al padre cada vez que cambia el dato resuelto. */
  onDataChange: (data: TData | null) => void;
}

export function StudioPreviewContextBar<TData>({
  provider,
  onDataChange,
}: StudioPreviewContextBarProps<TData>) {
  const [candidates, setCandidates] = useState<PreviewCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>(
    () => readStoredPreviewSlug(provider.kind) ?? DEMO_SENTINEL,
  );

  // 1) Cargar candidatos reales.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const list = await provider.loadCandidates();
        if (cancelled) return;
        setCandidates(list);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [provider]);

  // 2) Resolver dato según la selección persistida.
  useEffect(() => {
    let cancelled = false;
    if (selected === DEMO_SENTINEL) {
      onDataChange(provider.demoData());
      return;
    }
    void (async () => {
      try {
        const detail = await provider.loadDetail(selected);
        if (!cancelled) onDataChange(detail ?? provider.demoData());
      } catch {
        if (!cancelled) onDataChange(provider.demoData());
      }
    })();
    return () => {
      cancelled = true;
    };
    // Sólo re-corre cuando cambia la selección o el provider.
    // `onDataChange` viene del padre — el padre lo memoriza con useCallback.
  }, [provider, selected, onDataChange]);

  const options = useMemo(() => {
    const base = [{ value: DEMO_SENTINEL, label: "Datos demo (recomendado para plantilla)" }];
    return base.concat(
      candidates.map((c) => ({
        value: c.slug,
        label: c.secondary ? `${c.label} · ${c.secondary}` : c.label,
      })),
    );
  }, [candidates]);

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-3 py-2 text-xs">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
        <Sparkles className="size-3" aria-hidden /> Plantilla dinámica
      </span>
      <label className="flex items-center gap-2">
        <span className="text-muted-foreground">{provider.label}:</span>
        <select
          value={selected}
          onChange={(e) => {
            const next = e.target.value;
            setSelected(next);
            writeStoredPreviewSlug(
              provider.kind,
              next === DEMO_SENTINEL ? null : next,
            );
          }}
          disabled={loading}
          className="min-w-[240px] rounded-md border border-border bg-background px-2 py-1 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={() => {
          setLoading(true);
          void provider
            .loadCandidates()
            .then((list) => setCandidates(list))
            .catch((e) => setError((e as Error).message))
            .finally(() => setLoading(false));
        }}
        className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-foreground hover:bg-accent"
        title="Refrescar la lista de candidatos"
      >
        <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} aria-hidden /> Refrescar
      </button>
      {error ? (
        <span className="text-destructive">Error al listar: {error}</span>
      ) : null}
      <span className="ml-auto text-[10px] text-muted-foreground">
        Este selector no altera la ficha pública; sólo hidrata el canvas.
      </span>
    </div>
  );
}
