/**
 * AluxAutofillDialog — Revisión de la propuesta de Alux para una ficha del CMS.
 *
 * No escribe nada: devuelve al formulario los campos que el editor acepta.
 * Cada dato muestra su origen; lo que Alux no puede acreditar no aparece.
 * Sólo editores y administradores (la autorización real vive en el servidor).
 */
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles, X } from "lucide-react";
import {
  aluxDraftEntity,
  type AutofillField,
  type PlaceFacts,
} from "@/lib/cms/alux-autofill.functions";

export interface AluxAutofillDialogProps {
  open: boolean;
  onClose: () => void;
  entityKind: string;
  name: string;
  destination?: string;
  zone?: string;
  fields: Array<{ name: string; label: string; help?: string }>;
  onApply: (patch: Record<string, string>, facts: PlaceFacts | null) => void;
}

interface Row extends AutofillField {
  accepted: boolean;
}

export function AluxAutofillDialog({
  open,
  onClose,
  entityKind,
  name,
  destination,
  zone,
  fields,
  onApply,
}: AluxAutofillDialogProps) {
  const draft = useServerFn(aluxDraftEntity);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [facts, setFacts] = useState<PlaceFacts | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!open) {
      setRows([]);
      setFacts(null);
      setError(null);
      setWarning(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    draft({
      data: {
        entityKind,
        name,
        ...(destination ? { destination } : {}),
        ...(zone ? { zone } : {}),
        fields,
      },
    })
      .then((res) => {
        if (cancelled) return;
        setFacts(res.facts);
        setWarning(res.warning);
        setRows(res.fields.map((f) => ({ ...f, accepted: true })));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "";
        setError(
          message === "forbidden"
            ? "Esta ayuda está reservada a editores y administradores."
            : "Alux no pudo preparar la propuesta en este momento. Inténtalo de nuevo.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, draft, entityKind, name, destination, zone, fields]);

  if (!open) return null;

  const accepted = rows.filter((r) => r.accepted && r.value.trim().length > 0);

  const apply = () => {
    const patch: Record<string, string> = {};
    for (const row of accepted) patch[row.key] = row.value.trim();
    onApply(patch, facts);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Completar la ficha con Alux"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold">
              <Sparkles className="size-4 text-alux" aria-hidden />
              Completar con Alux
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Propuesta para revisar. Nada se guarda hasta que tú aceptes y pulses Guardar en la
              ficha.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="inline-flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {loading && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Alux está buscando información de «{name}»…
            </p>
          )}

          {error && (
            <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          {warning && !loading && (
            <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs">
              {warning}
            </p>
          )}

          {facts && (
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
              <p className="font-semibold">Ficha encontrada en Google</p>
              <p className="mt-1 text-muted-foreground">{facts.address ?? "Sin dirección"}</p>
              {facts.latitude != null && facts.longitude != null && (
                <p className="text-muted-foreground">
                  Coordenadas: {facts.latitude.toFixed(6)}, {facts.longitude.toFixed(6)}
                </p>
              )}
              {facts.hours.length > 0 && (
                <p className="mt-1 text-muted-foreground">{facts.hours.join(" · ")}</p>
              )}
              <a
                href={facts.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-primary underline"
              >
                Ver la fuente
              </a>
            </div>
          )}

          {!loading && !error && rows.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Alux no pudo acreditar ningún dato de esta ficha. Captúrala a mano.
            </p>
          )}

          {rows.map((row, index) => (
            <div key={row.key} className="rounded-lg border border-border px-3 py-2">
              <label className="flex items-center gap-2 text-xs font-medium">
                <input
                  type="checkbox"
                  checked={row.accepted}
                  onChange={(e) =>
                    setRows((rs) =>
                      rs.map((r, i) => (i === index ? { ...r, accepted: e.target.checked } : r)),
                    )
                  }
                />
                {row.label}
              </label>
              <textarea
                value={row.value}
                rows={row.value.length > 160 ? 5 : 2}
                onChange={(e) =>
                  setRows((rs) =>
                    rs.map((r, i) => (i === index ? { ...r, value: e.target.value } : r)),
                  )
                }
                className="mt-2 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                {row.note ?? "Propuesta de Alux"}
                {row.sourceUrl && (
                  <>
                    {" · "}
                    <a href={row.sourceUrl} target="_blank" rel="noreferrer" className="underline">
                      origen
                    </a>
                  </>
                )}
              </p>
            </div>
          ))}
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
          <p className="text-[11px] text-muted-foreground">
            {accepted.length} campo{accepted.length === 1 ? "" : "s"} por aplicar
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-pill border border-border px-4 text-xs font-medium hover:bg-accent"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={apply}
              disabled={accepted.length === 0}
              className="h-10 rounded-pill bg-primary px-4 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              Aplicar al formulario
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
