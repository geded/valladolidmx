/**
 * Experience Builder · Auto-Inspector (Etapa 15.10.4b · Fase 2)
 *
 * Genera el formulario de configuración de un bloque directamente desde su
 * Block Contract. Cero formularios duplicados.
 */

import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Plus, Trash2, Upload } from "lucide-react";
import type {
  BlockContract,
  BlockFieldSchema,
} from "@/lib/experience-builder/block-contract";
import { VariablePicker } from "./VariablePicker";

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
  name, def, value, onChange, simple,
}: { name: string; def: BlockFieldSchema; value: unknown; onChange: (v: unknown) => void; simple?: boolean }) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-2 text-xs font-medium">
        <span>{def.label || name}</span>
        {def.required ? <span className="text-destructive">*</span> : null}
        {def.translatable && !simple ? (
          <Badge variant="outline" className="text-[9px]">i18n</Badge>
        ) : null}
      </label>
      <FieldControl def={def} value={value} onChange={onChange} simple={simple} />
      {def.description ? (
        <p className="text-[10px] text-muted-foreground">{def.description}</p>
      ) : null}
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
  const inputId = `media-${def.label.replace(/\W+/g, "-").toLowerCase()}`;
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
}: { label: string; icon: React.ReactNode; onClick: () => void; disabled?: boolean; tone?: "danger" }) {
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