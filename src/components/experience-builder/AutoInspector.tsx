/**
 * Experience Builder · Auto-Inspector (Etapa 15.10.4b · Fase 2)
 *
 * Genera el formulario de configuración de un bloque directamente desde su
 * Block Contract. Cero formularios duplicados.
 */

import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Languages, Plus, Trash2, Type, Upload } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
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
}

export function AutoInspector({ contract, config, onChange, simple = false }: AutoInspectorProps) {
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
          />
        ))}
        {Object.keys(contract.schema).length === 0 ? (
          <p className="text-xs text-muted-foreground">Este bloque no tiene campos editables.</p>
        ) : null}
      </div>
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
  name, def, value, onChange, simple, translations, onTranslationChange, typography, typographyDefault, onTypographyChange,
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
}) {
  const canTranslate = Boolean(def.translatable) && !simple && (def.type === "text" || def.type === "rich_text");
  const canStyleText = !simple && (def.type === "text" || def.type === "rich_text");
  const [showI18n, setShowI18n] = useState(false);
  const [showTypo, setShowTypo] = useState(false);
  const typo = typography ?? {};
  const typoActive = hasTypography(typo);
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
      <FieldControl def={def} value={value} onChange={onChange} simple={simple} />
      {def.description ? (
        <p className="text-[10px] text-muted-foreground">{def.description}</p>
      ) : null}
      {canStyleText && showTypo ? (
        <TypographyEditor value={typo} defaults={typographyDefault} onChange={(next) => onTypographyChange?.(next)} />
      ) : null}
      {canTranslate && showI18n ? (
        <TranslationsEditor
          baseValue={typeof value === "string" ? value : ""}
          translations={translations ?? {}}
          rich={def.type === "rich_text"}
          onChange={(lang, next) => onTranslationChange?.(lang, next)}
        />
      ) : null}
    </div>
  );
}

function TypographyEditor({
  value, defaults, onChange,
}: { value: FieldTypography; defaults?: FieldTypography; onChange: (next: FieldTypography) => void }) {
  const set = <K extends keyof FieldTypography>(k: K, v: FieldTypography[K]) => {
    const next = { ...value, [k]: v };
    onChange(next);
  };
  const d = defaults ?? {};
  const eff = <K extends keyof FieldTypography>(k: K): FieldTypography[K] =>
    (value[k] !== undefined && value[k] !== "" ? value[k] : d[k]) as FieldTypography[K];
  const inp = "w-full rounded-md border border-border bg-background px-2 py-1 text-xs";
  return (
    <div className="mt-1 space-y-2 rounded-md border border-primary/30 bg-primary/5 p-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
          Tipografía de este texto
        </p>
        <button
          type="button"
          onClick={() => onChange({})}
          className="text-[10px] font-medium text-muted-foreground hover:text-destructive"
        >
          Restablecer
        </button>
      </div>
      {defaults ? (
        <div className="space-y-1 rounded-md border border-border bg-background/70 p-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Valores actuales
            </p>
            <button
              type="button"
              onClick={() => onChange({ ...d })}
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
            <li><span className="text-foreground">Alineación:</span> {d.align ?? "—"}</li>
          </ul>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <label className="col-span-2 space-y-1">
          <span className="text-[10px] text-muted-foreground">Fuente</span>
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
          <span className="text-[10px] text-muted-foreground">Tamaño (px)</span>
          <input
            type="number"
            min={8}
            max={200}
            className={inp}
            value={eff("font_size") ?? ""}
            placeholder={d.font_size ? String(d.font_size) : ""}
            onChange={(e) => set("font_size", e.target.value === "" ? undefined : Number(e.target.value))}
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] text-muted-foreground">Peso</span>
          <select
            className={inp}
            value={eff("font_weight") ?? ""}
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
          <span className="text-[10px] text-muted-foreground">Interlínea</span>
          <input
            type="number"
            step="0.05"
            min={0.8}
            max={3}
            className={inp}
            value={eff("line_height") ?? ""}
            placeholder={d.line_height ? String(d.line_height) : ""}
            onChange={(e) => set("line_height", e.target.value === "" ? undefined : Number(e.target.value))}
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] text-muted-foreground">Espaciado (px)</span>
          <input
            type="number"
            step="0.1"
            className={inp}
            value={eff("letter_spacing") ?? ""}
            onChange={(e) => set("letter_spacing", e.target.value === "" ? undefined : Number(e.target.value))}
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] text-muted-foreground">Color</span>
          <input
            type="color"
            className="h-7 w-full cursor-pointer rounded border border-border bg-background"
            value={(eff("color") as string) ?? "#000000"}
            onChange={(e) => set("color", e.target.value)}
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] text-muted-foreground">Alineación</span>
          <select
            className={inp}
            value={eff("align") ?? ""}
            onChange={(e) => set("align", e.target.value)}
          >
            <option value="">Por defecto</option>
            <option value="left">Izquierda</option>
            <option value="center">Centro</option>
            <option value="right">Derecha</option>
            <option value="justify">Justificado</option>
          </select>
        </label>
      </div>
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
        <input className={base} placeholder={`ID de ${def.references ?? "referencia"} (combobox en 15.10.5)`}
          value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
      );
    case "list":
      if (def.item?.type === "object" && def.item.fields) {
        return <StructuredListControl def={def} value={value} onChange={onChange} simple={simple} />;
      }
      return (
        <textarea className={`${base} min-h-[80px] font-mono text-[10px]`}
          value={value ? JSON.stringify(value, null, 2) : ""}
          onChange={(e) => { try { onChange(e.target.value ? JSON.parse(e.target.value) : undefined); } catch { /* json inválido */ } }} />
      );
    case "object":
      if (def.fields) {
        return <ObjectControl def={def} value={value} onChange={onChange} simple={simple} />;
      }
      return (
        <textarea className={`${base} min-h-[80px] font-mono text-[10px]`}
          value={value ? JSON.stringify(value, null, 2) : ""}
          onChange={(e) => { try { onChange(e.target.value ? JSON.parse(e.target.value) : undefined); } catch { /* json inválido */ } }} />
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
  return (
    <div className="space-y-2">
      {v ? (
        <div className="overflow-hidden rounded-md border border-border bg-muted/30">
          <img src={v} alt="Vista previa" className="max-h-36 w-full object-cover" />
        </div>
      ) : null}
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