/**
 * G8-E1 · Galería de Plantillas Premium Aprobadas dentro de Studio.
 *
 * Cierra GAP-G8E-S01: los presets productivos del Fast Track
 * (`PREMIUM_TEMPLATE_PRESETS`) son ahora seleccionables desde el Panel de
 * Páginas del Experience Builder.
 *
 * Reglas aplicadas:
 *  - Compatibilidad fail-closed por `pageKind` (registro declarativo).
 *  - Render con la MISMA autoridad visual que producción:
 *    `CompositionRenderer` sobre el bloque compuesto del preset.
 *  - Borrador LOCAL: la edición de contenido vive en memoria; este
 *    componente no escribe en la base de datos ni publica nada.
 *  - Sin motores nuevos: reutiliza Block Registry, contratos y renderer.
 */
import { useMemo, useState } from "react";
import { ExternalLink, Image as ImageIcon, X } from "lucide-react";
import { CompositionRenderer } from "@/lib/experience-builder/composition-renderer";
import type { CompositionTree } from "@/lib/experience-builder/composition-tree";
import { getBlock } from "@/lib/experience-builder/block-registry";
import type { BlockFieldSchema } from "@/lib/experience-builder/block-contract";
import "@/lib/experience-builder/block-library";
import {
  PREMIUM_TEMPLATE_PRESETS,
  listPremiumTemplatePresetsForKind,
  resolvePremiumPresetThumbnail,
  type PremiumTemplatePreset,
} from "@/lib/experience-builder/premium-template-registry";

type Cfg = Record<string, unknown>;

export interface PremiumPresetGalleryProps {
  /** Tipo de página destino. Si se omite, se muestran todos los presets. */
  pageKind?: string;
  /** Cierra la galería. */
  onClose?: () => void;
}

function buildTree(preset: PremiumTemplatePreset, config: Cfg): CompositionTree {
  return {
    root: {
      id: "root",
      type: "root",
      version: "1.0.0",
      config: {},
      children: [
        {
          id: `${preset.id}-node`,
          type: preset.blockType,
          version: preset.contractVersion,
          config,
        },
      ],
    },
  } as unknown as CompositionTree;
}

/** Campos escalares editables del contrato (el layout permanece bloqueado). */
function editableFields(blockType: string): Array<[string, BlockFieldSchema]> {
  const contract = getBlock(blockType);
  if (!contract) return [];
  return Object.entries(contract.schema).filter(
    ([key, def]) =>
      key !== "variant" &&
      (def.type === "text" ||
        def.type === "rich_text" ||
        def.type === "url" ||
        def.type === "media" ||
        def.type === "number" ||
        def.type === "boolean" ||
        def.type === "select"),
  );
}

export function PremiumPresetGallery({ pageKind, onClose }: PremiumPresetGalleryProps) {
  const presets = useMemo(
    () => (pageKind ? listPremiumTemplatePresetsForKind(pageKind) : PREMIUM_TEMPLATE_PRESETS),
    [pageKind],
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = presets.find((p) => p.id === activeId) ?? null;

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
            Fast Track
          </p>
          <h3 className="mt-1 text-base font-semibold">Plantillas premium aprobadas</h3>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
            {presets.length} plantillas listas para usar. Al seleccionar una, se abre un borrador
            local para revisar y ajustar el contenido; el diseño permanece bloqueado y nada se
            publica hasta que tú lo decidas.
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-[11px] font-medium hover:bg-accent"
          >
            Ocultar
          </button>
        ) : null}
      </header>

      {presets.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground">
          No hay plantillas premium aprobadas para este tipo de página.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {presets.map((preset) => (
            <PresetCard key={preset.id} preset={preset} onSelect={() => setActiveId(preset.id)} />
          ))}
        </div>
      )}

      {active ? <PresetDraftModal preset={active} onClose={() => setActiveId(null)} /> : null}
    </section>
  );
}

function PresetCard({ preset, onSelect }: { preset: PremiumTemplatePreset; onSelect: () => void }) {
  const thumb = useMemo(() => resolvePremiumPresetThumbnail(preset), [preset]);
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-background">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-primary/20 via-muted to-accent">
        {thumb ? (
          <img
            src={thumb}
            alt={`Vista previa de ${preset.name}`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageIcon className="size-6" aria-hidden />
          </span>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
          Aprobada
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-semibold">{preset.name}</h4>
          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
            v{preset.contractVersion}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{preset.description}</p>
        <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {preset.pageKinds.join(" · ")} → {preset.targetRoute}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <button
            type="button"
            onClick={onSelect}
            className="inline-flex min-h-11 items-center gap-1 rounded-pill bg-primary px-3 text-xs font-semibold text-primary-foreground hover:opacity-95"
          >
            Usar esta plantilla
          </button>
          <a
            href={preset.visualAuthorityRoute}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1 rounded-pill border border-border px-3 text-[11px] font-medium hover:bg-accent"
          >
            Ver <ExternalLink className="size-3" aria-hidden />
          </a>
        </div>
      </div>
    </article>
  );
}

function PresetDraftModal({
  preset,
  onClose,
}: {
  preset: PremiumTemplatePreset;
  onClose: () => void;
}) {
  const [config, setConfig] = useState<Cfg>(() => preset.defaultConfig());
  const [previewMode, setPreviewMode] = useState<"full" | "content">("full");
  const fields = useMemo(() => editableFields(preset.blockType), [preset.blockType]);
  const tree = useMemo(() => buildTree(preset, config), [preset, config]);
  const setField = (key: string, value: unknown) =>
    setConfig((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border px-4 py-2">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
            Borrador local · no publicado
          </p>
          <h3 className="truncate text-sm font-semibold">{preset.name}</h3>
        </div>
        {/* G8-E2 · OBS-G8E1-02 — control de preview del chrome público. */}
        <div
          role="group"
          aria-label="Modo de vista previa"
          className="ml-auto flex shrink-0 items-center gap-1 rounded-pill border border-border p-1"
        >
          {(
            [
              ["full", "Página completa"],
              ["content", "Sólo contenido"],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setPreviewMode(mode)}
              aria-pressed={previewMode === mode}
              className={[
                "inline-flex min-h-11 items-center rounded-pill px-3 text-[11px] font-medium",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                previewMode === mode
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar borrador"
          /* G8-E2 · OBS-G8E1-01 — área táctil real de 44×44 px. */
          className="inline-grid min-h-11 min-w-11 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" aria-hidden />
        </button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="min-h-0 flex-1 overflow-auto bg-muted/40">
          {previewMode === "full" ? (
            /*
             * G8-E2 · OBS-G8E1-02 — chrome público real (Header/Footer) en modo
             * inerte: se ve la página completa, pero sus enlaces y acciones no
             * navegan ni tocan el borrador local. No son bloques ni se duplican;
             * el chrome de Studio vive fuera de este contenedor.
             */
            <div data-studio-draft-chrome="public-inert">
              <div inert>
                <PublicHeader variant="solid" />
              </div>
              <CompositionRenderer tree={tree} />
              <div inert>
                <PublicFooter />
              </div>
            </div>
          ) : (
            <CompositionRenderer tree={tree} />
          )}
        </div>

        <aside className="max-h-[45vh] w-full shrink-0 overflow-auto border-t border-border bg-card p-4 lg:max-h-none lg:w-80 lg:border-l lg:border-t-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Contenido editable
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            La estructura de esta plantilla está bloqueada. Aquí ajustas textos, imágenes y
            opciones.
          </p>
          <div className="mt-3 space-y-3">
            {fields.map(([key, def]) => (
              <PresetField
                key={key}
                name={key}
                def={def}
                value={config[key]}
                onChange={(v) => setField(key, v)}
              />
            ))}
            {fields.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Esta plantilla toma su contenido directamente del catálogo oficial.
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}

function PresetField({
  name,
  def,
  value,
  onChange,
}: {
  name: string;
  def: BlockFieldSchema;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const inputCls =
    "mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  if (def.type === "boolean") {
    return (
      <label className="flex items-center gap-2 text-xs font-medium">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="size-4"
        />
        {def.label}
      </label>
    );
  }

  if (def.type === "select") {
    return (
      <label className="block text-xs font-medium">
        {def.label}
        <select
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        >
          {(def.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (def.type === "number") {
    return (
      <label className="block text-xs font-medium">
        {def.label}
        <input
          type="number"
          value={typeof value === "number" ? value : ""}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          className={inputCls}
        />
      </label>
    );
  }

  if (def.type === "media") {
    const url = typeof value === "string" ? value : "";
    return (
      <div className="text-xs font-medium">
        <label className="block">
          {def.label}
          <input
            type="url"
            value={url}
            placeholder="Dirección de la imagen"
            onChange={(e) => onChange(e.target.value)}
            className={inputCls}
          />
        </label>
        {url ? (
          <img
            src={url}
            alt=""
            loading="lazy"
            className="mt-2 aspect-[16/9] w-full rounded-md object-cover"
          />
        ) : null}
      </div>
    );
  }

  const multiline = def.type === "rich_text";
  return (
    <label className="block text-xs font-medium">
      {def.label}
      {multiline ? (
        <textarea
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputCls} min-h-[70px]`}
          name={name}
        />
      ) : (
        <input
          type="text"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
          name={name}
        />
      )}
    </label>
  );
}
