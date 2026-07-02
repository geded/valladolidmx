/**
 * Experience Builder · Auto-Inspector (Etapa 15.10.4b · Fase 2)
 *
 * Genera el formulario de configuración de un bloque directamente desde su
 * Block Contract. Cero formularios duplicados.
 */

import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, CloudUpload, ImageIcon, Languages, Loader2, Monitor, Plus, Smartphone, Tablet, Trash2, Type, Upload } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";
import { MediaPickerDialog } from "./MediaPickerDialog";
import { ReferencePicker } from "./ReferencePicker";
import { useServerFn } from "@tanstack/react-start";
import { importUrlToStudioMedia } from "@/lib/experience-builder/studio-media.functions";
import { toast } from "sonner";
import type {
  BlockContract,
  BlockFieldSchema,
} from "@/lib/experience-builder/block-contract";
import { VariablePicker } from "./VariablePicker";
import {
  TYPO_FAMILIES,
  familyLabel,
  getTypographyDefaults,
  hasTypography,
  getBreakpointTypography,
  setBreakpointTypography,
  TYPOGRAPHY_BREAKPOINTS,
  type TypographyBreakpoint,
  type FieldTypography,
} from "@/lib/experience-builder/typography";

const I18N_LANGS: Array<{ code: string; label: string }> = [
  { code: "es", label: "Español" },
  { code: "en", label: "English" },
  { code: "pt", label: "Português" },
  { code: "fr", label: "Français" },
  { code: "it", label: "Italiano" },
  { code: "de", label: "Deutsch" },
];

export interface AutoInspectorProps {
  contract: BlockContract;
  config: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  /**
   * Modo simple: oculta metadatos técnicos (tipo, versión, chips de
   * capacidades, badges i18n y selector de variables `{ }`). Se usa en
   * el Modo Visual del Studio para no confundir al editor final.
   */
  simple?: boolean;
  /**
   * Breakpoint activo del canvas (mobile/tablet/desktop). Cuando se pasa,
   * el editor tipográfico escribe sobre ese breakpoint automáticamente
   * para que "lo que ves en el canvas" sea lo que editas.
   */
  activeBreakpoint?: TypographyBreakpoint;
}

export function AutoInspector({ contract, config, onChange, simple = false, activeBreakpoint }: AutoInspectorProps) {
  const set = (key: string, value: unknown) => onChange({ ...config, [key]: value });
  const i18nMap = (config.__i18n as Record<string, Record<string, string>> | undefined) ?? {};
  const setTranslation = (fieldKey: string, lang: string, value: string) => {
    const nextField = { ...(i18nMap[fieldKey] ?? {}), [lang]: value };
    const nextI18n = { ...i18nMap, [fieldKey]: nextField };
    onChange({ ...config, __i18n: nextI18n });
  };
  const typoMap = (config.__typography as Record<string, FieldTypography> | undefined) ?? {};
  const setTypography = (fieldKey: string, next: FieldTypography) => {
    const nextMap = { ...typoMap, [fieldKey]: next };
    onChange({ ...config, __typography: nextMap });
  };
  const typoDefaults = getTypographyDefaults(contract.type) ?? {};
  return (
    <div className="space-y-3">
      <header className="space-y-1">
        <h3 className="text-sm font-semibold">{contract.display_name}</h3>
        {simple ? null : (
          <p className="text-[11px] text-muted-foreground">{contract.type} · v{contract.version}</p>
        )}
        {contract.description ? (
          <p className="text-xs text-muted-foreground">{contract.description}</p>
        ) : null}
        {simple ? null : <CapabilityChips contract={contract} />}
      </header>
      <DeviceVisibilityRow
        value={
          Array.isArray(config.__hidden_on)
            ? ((config.__hidden_on as unknown[]).filter(
                (v): v is "mobile" | "tablet" | "desktop" =>
                  v === "mobile" || v === "tablet" || v === "desktop",
              ))
            : []
        }
        onChange={(next) => onChange({ ...config, __hidden_on: next })}
      />
      <div className="space-y-3">
        {Object.entries(contract.schema).map(([key, def]) => (
          <FieldRow
            key={key}
            name={key}
            def={def}
            value={config[key]}
            onChange={(v) => set(key, v)}
            simple={simple}
            translations={i18nMap[key]}
            onTranslationChange={(lang, value) => setTranslation(key, lang, value)}
            typography={typoMap[key]}
            typographyDefault={typoDefaults[key]}
            onTypographyChange={(next) => setTypography(key, next)}
          activeBreakpoint={activeBreakpoint}
          />
        ))}
        {Object.keys(contract.schema).length === 0 ? (
          <p className="text-xs text-muted-foreground">Este bloque no tiene campos editables.</p>
        ) : null}
      </div>
    </div>
  );
}

type DeviceKey = "mobile" | "tablet" | "desktop";

function DeviceVisibilityRow({
  value,
  onChange,
}: {
  value: DeviceKey[];
  onChange: (next: DeviceKey[]) => void;
}) {
  const items: Array<{ id: DeviceKey; label: string; Icon: typeof Smartphone }> = [
    { id: "mobile", label: "Móvil", Icon: Smartphone },
    { id: "tablet", label: "Tablet", Icon: Tablet },
    { id: "desktop", label: "Desktop", Icon: Monitor },
  ];
  const toggle = (id: DeviceKey) => {
    const hidden = value.includes(id);
    const next = hidden ? value.filter((v) => v !== id) : [...value, id];
    onChange(next);
  };
  return (
    <div className="rounded-md border border-border bg-muted/30 p-2">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Visibilidad por dispositivo
      </p>
      <div className="flex items-center gap-1">
        {items.map(({ id, label, Icon }) => {
          const visible = !value.includes(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggle(id)}
              aria-pressed={visible}
              title={visible ? `Visible en ${label}` : `Oculto en ${label}`}
              className={`inline-flex flex-1 items-center justify-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium transition ${
                visible
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground line-through"
              }`}
            >
              <Icon className="size-3" aria-hidden />
              {label}
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">
        Toca para ocultar este bloque en un dispositivo.
      </p>
    </div>
  );
}

function CapabilityChips({ contract }: { contract: BlockContract }) {
  const caps = contract.capabilities ?? {};
  const bp = contract.responsive?.breakpoints ?? [];
  const items: string[] = [];
  if (caps.soporta_i18n) items.push("i18n");
  if (caps.soporta_seo) items.push("SEO");
  if (caps.soporta_datos_dinamicos) items.push("datos");
  if (caps.soporta_personalizacion) items.push("personalización");
  if (caps.soporta_cache) items.push("cache");
  return (
    <div className="flex flex-wrap gap-1 pt-1">
      {items.map((i) => (
        <Badge key={i} variant="secondary" className="text-[9px]">{i}</Badge>
      ))}
      {bp.length > 0 ? (
        <Badge variant="outline" className="text-[9px]">
          {bp.map((b) => b[0].toUpperCase()).join("/")}
        </Badge>
      ) : null}
    </div>
  );
}

function FieldRow({
  name, def, value, onChange, simple, translations, onTranslationChange, typography, typographyDefault, onTypographyChange, activeBreakpoint,
}: {
  name: string;
  def: BlockFieldSchema;
  value: unknown;
  onChange: (v: unknown) => void;
  simple?: boolean;
  translations?: Record<string, string>;
  onTranslationChange?: (lang: string, value: string) => void;
  typography?: FieldTypography;
  typographyDefault?: FieldTypography;
  onTypographyChange?: (next: FieldTypography) => void;
  activeBreakpoint?: TypographyBreakpoint;
}) {
  const canTranslate = Boolean(def.translatable) && !simple && (def.type === "text" || def.type === "rich_text");
  const canStyleText = !simple && (def.type === "text" || def.type === "rich_text");
  const [showI18n, setShowI18n] = useState(false);
  const [showTypo, setShowTypo] = useState(false);
  const typo = typography ?? {};
  const typoActive = hasTypography(typo);
  const displayedValue = fieldValueWithDefault(def, value);
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-2 text-xs font-medium">
        <span>{def.label || name}</span>
        {def.required ? <span className="text-destructive">*</span> : null}
        {canStyleText ? (
          <button
            type="button"
            onClick={() => setShowTypo((v) => !v)}
            className={`ml-auto inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-medium hover:bg-accent hover:text-foreground ${
              typoActive
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground"
            }`}
            title="Tipografía de este texto"
          >
            <Type className="size-2.5" aria-hidden /> Aa {typoActive ? "•" : ""}
          </button>
        ) : null}
        {canTranslate ? (
          <button
            type="button"
            onClick={() => setShowI18n((v) => !v)}
            className={`${canStyleText ? "" : "ml-auto "}inline-flex items-center gap-1 rounded-full border border-border bg-background px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground`}
            title="Editar traducciones"
          >
            <Languages className="size-2.5" aria-hidden /> i18n
          </button>
        ) : null}
      </label>
      <FieldControl def={def} value={displayedValue} onChange={onChange} simple={simple} />
      {def.description ? (
        <p className="text-[10px] text-muted-foreground">{def.description}</p>
      ) : null}
      {canStyleText && showTypo ? (
        <TypographyEditor
          value={typo}
          defaults={typographyDefault}
          onChange={(next) => onTypographyChange?.(next)}
          activeBreakpoint={activeBreakpoint}
        />
      ) : null}
      {canTranslate && showI18n ? (
        <TranslationsEditor
          baseValue={typeof displayedValue === "string" ? displayedValue : ""}
          translations={translations ?? {}}
          rich={def.type === "rich_text"}
          onChange={(lang, next) => onTranslationChange?.(lang, next)}
        />
      ) : null}
    </div>
  );
}

function fieldValueWithDefault(def: BlockFieldSchema, value: unknown): unknown {
  return value === undefined || value === null ? def.default : value;
}

function TypographyEditor({
  value, defaults, onChange, activeBreakpoint,
}: { value: FieldTypography; defaults?: FieldTypography; onChange: (next: FieldTypography) => void; activeBreakpoint?: TypographyBreakpoint }) {
  const [bp, setBp] = useState<TypographyBreakpoint>(activeBreakpoint ?? "base");
  // Sincroniza el tab tipográfico con el dispositivo activo del canvas:
  // si el usuario está viendo Desktop, edita Desktop; Tablet edita Tablet;
  // Móvil edita Base. Así "lo que ves en el canvas" es lo que se edita.
  useEffect(() => {
    if (activeBreakpoint) setBp(activeBreakpoint);
  }, [activeBreakpoint]);
  const active = getBreakpointTypography(value, bp);
  const base = getBreakpointTypography(value, "base");
  const set = <K extends keyof FieldTypography>(k: K, v: FieldTypography[K]) => {
    const nextForBp = { ...active, [k]: v } as FieldTypography;
    onChange(setBreakpointTypography(value, bp, nextForBp));
  };
  const clearBp = () => {
    if (bp === "base") {
      // Preserva md/lg al restablecer base.
      onChange(setBreakpointTypography(value, "base", {}));
    } else {
      const clone = { ...value };
      delete clone[bp];
      onChange(clone);
    }
  };
  const d = defaults ?? {};
  // "Efectivo": lo definido para este breakpoint, o herencia (base para md/lg),
  // o default del bloque.
  const eff = <K extends keyof FieldTypography>(k: K): FieldTypography[K] => {
    const hereRaw = active[k];
    if (hereRaw !== undefined && hereRaw !== "") return hereRaw as FieldTypography[K];
    if (bp !== "base") {
      const inherited = base[k];
      if (inherited !== undefined && inherited !== "") return inherited as FieldTypography[K];
    }
    return d[k] as FieldTypography[K];
  };
  const isOverridden = <K extends keyof FieldTypography>(k: K): boolean =>
    active[k] !== undefined && active[k] !== "";
  const inp = "w-full rounded-md border border-border bg-background px-2 py-1 text-xs";
  return (
    <div className="mt-1 space-y-2 rounded-md border border-primary/30 bg-primary/5 p-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
          Tipografía de este texto
        </p>
        <button
          type="button"
          onClick={clearBp}
          className="text-[10px] font-medium text-muted-foreground hover:text-destructive"
        >
          Restablecer {bp === "base" ? "móvil" : bp === "md" ? "tablet" : "desktop"}
        </button>
      </div>
      <div className="flex items-center gap-1 rounded-md border border-border bg-background p-0.5">
        {TYPOGRAPHY_BREAKPOINTS.map((b) => {
          const bpVals = getBreakpointTypography(value, b.key);
          const filled = Object.values(bpVals).some(
            (v) => v !== undefined && v !== "" && v !== false,
          );
          return (
            <button
              key={b.key}
              type="button"
              onClick={() => setBp(b.key)}
              className={`flex-1 rounded px-2 py-1 text-[10px] font-medium transition ${
                bp === b.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
              title={
                b.minWidthPx
                  ? `${b.label} (≥${b.minWidthPx}px)`
                  : `${b.label} (base, aplica a todos)`
              }
            >
              {b.label} {filled ? "•" : ""}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground">
        {bp === "base"
          ? "Base móvil — se aplica a todos los tamaños salvo que definas tablet o desktop."
          : bp === "md"
            ? "Tablet ≥768px — hereda de móvil los campos que dejes en blanco."
            : "Desktop ≥1024px — hereda de móvil los campos que dejes en blanco."}
      </p>
      {defaults ? (
        <div className="space-y-1 rounded-md border border-border bg-background/70 p-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Valores actuales
            </p>
            <button
              type="button"
              onClick={() => onChange(setBreakpointTypography(value, bp, { ...d }))}
              className="text-[10px] font-medium text-primary hover:underline"
            >
              Usar valores actuales
            </button>
          </div>
          <ul className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
            <li><span className="text-foreground">Fuente:</span> {familyLabel(d.font_family)}</li>
            <li><span className="text-foreground">Tamaño:</span> {d.font_size ? `${d.font_size} px` : "—"}</li>
            <li><span className="text-foreground">Peso:</span> {d.font_weight ?? "—"}</li>
            <li><span className="text-foreground">Interlínea:</span> {d.line_height ?? "—"}</li>
            <li className="flex items-center gap-1">
              <span className="text-foreground">Color:</span>
              {d.color ? (
                <>
                  <span className="inline-block size-3 rounded border border-border" style={{ background: d.color }} />
                  <span>{d.color}</span>
                </>
              ) : "—"}
            </li>
          </ul>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <label className="col-span-2 space-y-1">
          <span className="text-[10px] text-muted-foreground">
            Fuente {isOverridden("font_family") ? "•" : ""}
          </span>
          <select
            className={inp}
            value={eff("font_family") ?? ""}
            onChange={(e) => set("font_family", e.target.value)}
          >
            {TYPO_FAMILIES.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-[10px] text-muted-foreground">
            Tamaño (px) {isOverridden("font_size") ? "•" : ""}
          </span>
          <input
            type="number"
            min={8}
            max={200}
            className={inp}
            value={active.font_size ?? ""}
            placeholder={eff("font_size") ? String(eff("font_size")) : ""}
            onChange={(e) => set("font_size", e.target.value === "" ? undefined : Number(e.target.value))}
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] text-muted-foreground">
            Peso {isOverridden("font_weight") ? "•" : ""}
          </span>
          <select
            className={inp}
            value={active.font_weight ?? ""}
            onChange={(e) => set("font_weight", e.target.value === "" ? undefined : Number(e.target.value))}
          >
            <option value="">Por defecto</option>
            <option value="300">300 · Light</option>
            <option value="400">400 · Regular</option>
            <option value="500">500 · Medium</option>
            <option value="600">600 · Semibold</option>
            <option value="700">700 · Bold</option>
            <option value="800">800 · Extra</option>
            <option value="900">900 · Black</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-[10px] text-muted-foreground">
            Interlínea {isOverridden("line_height") ? "•" : ""}
          </span>
          <input
            type="number"
            step="0.05"
            min={0.8}
            max={3}
            className={inp}
            value={active.line_height ?? ""}
            placeholder={eff("line_height") ? String(eff("line_height")) : ""}
            onChange={(e) => set("line_height", e.target.value === "" ? undefined : Number(e.target.value))}
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] text-muted-foreground">
            Espaciado (px) {isOverridden("letter_spacing") ? "•" : ""}
          </span>
          <input
            type="number"
            step="0.1"
            className={inp}
            value={active.letter_spacing ?? ""}
            onChange={(e) => set("letter_spacing", e.target.value === "" ? undefined : Number(e.target.value))}
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] text-muted-foreground">
            Color {isOverridden("color") ? "•" : ""}
          </span>
          <input
            type="color"
            className="h-7 w-full cursor-pointer rounded border border-border bg-background"
            value={(eff("color") as string) ?? "#000000"}
            onChange={(e) => set("color", e.target.value)}
          />
        </label>
      </div>
      <p className="text-[10px] text-muted-foreground">
        La alineación se controla desde <strong>«Posición del texto»</strong> del bloque, no por campo.
      </p>
      <div className="flex items-center gap-4 pt-1">
        <label className="flex items-center gap-1 text-[11px]">
          <input
            type="checkbox"
            checked={Boolean(eff("italic"))}
            onChange={(e) => set("italic", e.target.checked)}
          />
          Cursiva
        </label>
        <label className="flex items-center gap-1 text-[11px]">
          <input
            type="checkbox"
            checked={Boolean(eff("uppercase"))}
            onChange={(e) => set("uppercase", e.target.checked)}
          />
          MAYÚSCULAS
        </label>
      </div>
    </div>
  );
}

function TranslationsEditor({
  baseValue, translations, rich, onChange,
}: {
  baseValue: string;
  translations: Record<string, string>;
  rich: boolean;
  onChange: (lang: string, value: string) => void;
}) {
  const [lang, setLang] = useState<string>("en");
  const value = lang === "es" ? baseValue : (translations[lang] ?? "");
  const base = "w-full rounded-md border border-border bg-background px-2 py-1 text-xs";
  return (
    <div className="mt-1 space-y-1 rounded-md border border-primary/30 bg-primary/5 p-2">
      <div className="flex flex-wrap items-center gap-1">
        {I18N_LANGS.map((l) => {
          const filled = l.code === "es" ? baseValue.length > 0 : (translations[l.code] ?? "").length > 0;
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => setLang(l.code)}
              className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                lang === l.code
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-accent"
              }`}
            >
              {l.code.toUpperCase()} {filled ? "•" : ""}
            </button>
          );
        })}
      </div>
      {lang === "es" ? (
        <p className="text-[10px] text-muted-foreground">
          Español es el idioma base. Edítalo en el campo principal de arriba.
        </p>
      ) : rich ? (
        <textarea
          className={`${base} min-h-[70px]`}
          value={value}
          onChange={(e) => onChange(lang, e.target.value)}
          placeholder={`Traducción en ${lang.toUpperCase()}…`}
        />
      ) : (
        <input
          className={base}
          type="text"
          value={value}
          onChange={(e) => onChange(lang, e.target.value)}
          placeholder={`Traducción en ${lang.toUpperCase()}…`}
        />
      )}
    </div>
  );
}

function FieldControl({
  def, value, onChange, simple,
}: { def: BlockFieldSchema; value: unknown; onChange: (v: unknown) => void; simple?: boolean }) {
  const base = "w-full rounded-md border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30";
  switch (def.type) {
    case "text":
    case "url": {
      const v = (value as string) ?? "";
      return (
        <div className="flex items-center gap-1">
          <input className={base} type={def.type === "url" ? "url" : "text"} value={v} onChange={(e) => onChange(e.target.value)} />
          {simple ? null : <VariablePicker onPick={(token) => onChange(`${v}${token}`)} />}
        </div>
      );
    }
    case "rich_text": {
      const v = (value as string) ?? "";
      return (
        <div className="space-y-1">
          <textarea className={`${base} min-h-[80px]`} value={v} onChange={(e) => onChange(e.target.value)} />
          {simple ? null : <VariablePicker onPick={(token) => onChange(`${v}${token}`)} />}
        </div>
      );
    }
    case "number":
      return (
        <input className={base} type="number" value={(value as number | undefined) ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))} />
      );
    case "boolean":
      return <Switch checked={Boolean(value)} onCheckedChange={(c) => onChange(c)} />;
    case "color":
      return (
        <input type="color" className="h-7 w-12 cursor-pointer rounded border border-border bg-background"
          value={(value as string) ?? "#000000"} onChange={(e) => onChange(e.target.value)} />
      );
    case "select":
      return (
        <select className={base} value={(value as string) ?? ((def.default as string) ?? "")}
          onChange={(e) => onChange(e.target.value)}>
          {(def.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      );
    case "media":
      return <MediaControl baseClass={base} def={def} value={value} onChange={onChange} />;
    case "reference":
      return (
        <ReferencePicker
          className={base}
          kind={def.references}
          value={(value as string) ?? undefined}
          onChange={(id) => onChange(id ?? "")}
        />
      );
    case "list":
      if (def.item?.type === "object" && def.item.fields) {
        return <StructuredListControl def={def} value={value} onChange={onChange} simple={simple} />;
      }
      return <PrimitiveListControl def={def} value={value} onChange={onChange} baseClass={base} />;
    case "object":
      if (def.fields) {
        return <ObjectControl def={def} value={value} onChange={onChange} simple={simple} />;
      }
      return (
        <p className="rounded-md border border-dashed border-border bg-muted/30 p-2 text-[11px] text-muted-foreground">
          Este objeto no tiene campos configurables desde el editor visual.
        </p>
      );
    default:
      return <p className="text-[10px] text-muted-foreground">Tipo no soportado.</p>;
  }
}

function MediaControl({
  baseClass, def, value, onChange,
}: { baseClass: string; def: BlockFieldSchema; value: unknown; onChange: (v: unknown) => void }) {
  const v = (value as string) ?? "";
  const reactId = useId();
  const inputId = `media-${reactId.replace(/:/g, "")}`;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const importFn = useServerFn(importUrlToStudioMedia);
  // Detecta imágenes que aún no viven en la Biblioteca del Studio:
  // URLs http(s) externas, assets del bundle (/assets/…, /__l5e/…),
  // rutas relativas del proyecto (/img.jpg) y data: URIs.
  // Excluye las que ya son del bucket studio-media.
  const isImportable =
    !!v &&
    !v.includes("/api/public/studio-media/") &&
    (/^https?:\/\//i.test(v) ||
      /^data:image\//i.test(v) ||
      /^\/(?!api\/public\/studio-media\/)/i.test(v));
  const handleImport = async () => {
    if (!v || importing) return;
    setImporting(true);
    try {
      // Si es una ruta relativa del sitio, la convertimos a absoluta para
      // que el server pueda descargarla desde el propio origen.
      let url = v;
      if (url.startsWith("/") && typeof window !== "undefined") {
        url = `${window.location.origin}${url}`;
      }
      const res = await importFn({ data: { url } });
      onChange(res.url);
      toast.success("Imagen guardada en la Biblioteca");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      toast.error(`No se pudo importar: ${msg}`);
    } finally {
      setImporting(false);
    }
  };
  return (
    <div className="space-y-2">
      {v ? (
        <div className="overflow-hidden rounded-md border border-border bg-muted/30">
          <img src={v} alt="Vista previa" className="max-h-36 w-full object-cover" />
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-primary/40 bg-primary/5 px-2 text-xs font-medium text-primary hover:bg-primary/10"
          title="Elegir de la biblioteca de imágenes"
        >
          <ImageIcon className="size-3.5" aria-hidden />
          Biblioteca
        </button>
        <span className="text-[10px] text-muted-foreground">o</span>
      </div>
      <div className="flex items-center gap-1">
        <input
          className={baseClass}
          type="url"
          placeholder="Pega la URL de una imagen"
          value={v}
          onChange={(e) => onChange(e.target.value)}
        />
        <label
          htmlFor={inputId}
          className="inline-flex h-7 cursor-pointer items-center justify-center rounded-md border border-border bg-background px-2 text-xs font-medium hover:bg-accent"
          title="Subir imagen"
        >
          <Upload className="size-3.5" aria-hidden />
        </label>
      </div>
      <input
        id={inputId}
        type="file"
        accept={def.accepts?.join(",") ?? "image/*"}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          if (!file.type.startsWith("image/")) return;
          if (file.size > 1_800_000) {
            window.alert("La imagen es demasiado pesada. Usa una imagen menor a 1.8 MB.");
            return;
          }
          const reader = new FileReader();
          reader.onload = () => onChange(String(reader.result ?? ""));
          reader.readAsDataURL(file);
          event.target.value = "";
        }}
      />
      {v ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-3" aria-hidden /> Quitar imagen
        </button>
      ) : null}
      {isImportable ? (
        <button
          type="button"
          onClick={handleImport}
          disabled={importing}
          className="inline-flex w-full items-center justify-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-1.5 text-[11px] font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-60 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-200"
          title="Descarga esta URL y la guarda en la Biblioteca del Studio"
        >
          {importing ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <CloudUpload className="size-3.5" aria-hidden />
          )}
          {importing ? "Importando…" : "Guardar en Biblioteca"}
        </button>
      ) : null}
      <MediaPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(url) => onChange(url)}
        role="gallery"
      />
    </div>
  );
}

function StructuredListControl({
  def, value, onChange, simple,
}: { def: BlockFieldSchema; value: unknown; onChange: (v: unknown) => void; simple?: boolean }) {
  const rows = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
  const fields = def.item?.fields ?? {};
  const makeDefault = () =>
    Object.fromEntries(
      Object.entries(fields).map(([key, field]) => [key, field.default ?? (field.type === "boolean" ? false : "")]),
    );
  const setRow = (index: number, nextRow: Record<string, unknown>) => {
    const next = [...rows];
    next[index] = nextRow;
    onChange(next);
  };
  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div key={index} className="rounded-lg border border-border bg-background p-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold">{def.item?.label ?? "Elemento"} {index + 1}</p>
            <div className="flex items-center gap-1">
              <MiniIconButton label="Subir" disabled={index === 0} onClick={() => move(index, -1)} icon={<ChevronUp className="size-3" />} />
              <MiniIconButton label="Bajar" disabled={index === rows.length - 1} onClick={() => move(index, 1)} icon={<ChevronDown className="size-3" />} />
              <MiniIconButton
                label="Eliminar"
                onClick={() => onChange(rows.filter((_, i) => i !== index))}
                icon={<Trash2 className="size-3" />}
                tone="danger"
              />
            </div>
          </div>
          <div className="space-y-2">
            {Object.entries(fields).map(([key, field]) => (
              <FieldRow
                key={key}
                name={key}
                def={field}
                value={row?.[key]}
                onChange={(nextValue) => setRow(index, { ...row, [key]: nextValue })}
                simple={simple}
              />
            ))}
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...rows, makeDefault()])}
        className="inline-flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-border bg-background px-2 py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Plus className="size-3.5" aria-hidden /> Agregar {def.item?.label?.toLowerCase() ?? "elemento"}
      </button>
    </div>
  );
}

function ObjectControl({
  def, value, onChange, simple,
}: { def: BlockFieldSchema; value: unknown; onChange: (v: unknown) => void; simple?: boolean }) {
  const obj = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  return (
    <div className="space-y-2 rounded-lg border border-border bg-background p-2">
      {Object.entries(def.fields ?? {}).map(([key, field]) => (
        <FieldRow
          key={key}
          name={key}
          def={field}
          value={obj[key]}
          onChange={(nextValue) => onChange({ ...obj, [key]: nextValue })}
          simple={simple}
        />
      ))}
    </div>
  );
}

function PrimitiveListControl({
  def, value, onChange, baseClass,
}: { def: BlockFieldSchema; value: unknown; onChange: (v: unknown) => void; baseClass: string }) {
  const items = Array.isArray(value) ? (value as unknown[]) : [];
  const itemType = def.item?.type ?? "text";
  const isNumber = itemType === "number";
  const isMedia = itemType === "media";
  const setItem = (idx: number, next: unknown) => {
    const arr = [...items];
    arr[idx] = next;
    onChange(arr);
  };
  const move = (idx: number, dir: -1 | 1) => {
    const t = idx + dir;
    if (t < 0 || t >= items.length) return;
    const arr = [...items];
    const [it] = arr.splice(idx, 1);
    arr.splice(t, 0, it);
    onChange(arr);
  };
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const addDefault = () => onChange([...items, isNumber ? 0 : ""]);
  return (
    <div className="space-y-2">
      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-muted/30 p-2 text-[11px] text-muted-foreground">
          Aún no hay elementos.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item, index) => (
            <li key={index} className="flex items-center gap-1">
              <span className="w-5 text-center text-[10px] font-semibold text-muted-foreground">{index + 1}</span>
              {isMedia ? (
                <MediaControl
                  baseClass={baseClass}
                  def={(def.item ?? { type: "media", label: def.label }) as BlockFieldSchema}
                  value={item}
                  onChange={(v) => setItem(index, v)}
                />
              ) : isNumber ? (
                <input
                  className={baseClass}
                  type="number"
                  value={item === undefined || item === null ? "" : Number(item as number)}
                  onChange={(e) => setItem(index, e.target.value === "" ? undefined : Number(e.target.value))}
                />
              ) : (
                <input
                  className={baseClass}
                  type="text"
                  value={(item as string) ?? ""}
                  onChange={(e) => setItem(index, e.target.value)}
                />
              )}
              <div className="flex items-center gap-0.5">
                <MiniIconButton label="Subir" disabled={index === 0} onClick={() => move(index, -1)} icon={<ChevronUp className="size-3" />} />
                <MiniIconButton label="Bajar" disabled={index === items.length - 1} onClick={() => move(index, 1)} icon={<ChevronDown className="size-3" />} />
                <MiniIconButton label="Eliminar" tone="danger" onClick={() => remove(index)} icon={<Trash2 className="size-3" />} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={addDefault}
        className="inline-flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-border bg-background px-2 py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Plus className="size-3.5" aria-hidden /> Agregar {def.item?.label?.toLowerCase() ?? "elemento"}
      </button>
    </div>
  );
}

function MiniIconButton({
  label, icon, onClick, disabled, tone,
}: { label: string; icon: ReactNode; onClick: () => void; disabled?: boolean; tone?: "danger" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`inline-flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-35 ${tone === "danger" ? "hover:text-destructive" : ""}`}
    >
      {icon}
    </button>
  );
}