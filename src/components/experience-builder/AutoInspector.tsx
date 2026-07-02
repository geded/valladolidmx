/**
 * Experience Builder · Auto-Inspector (Etapa 15.10.4b · Fase 2)
 *
 * Genera el formulario de configuración de un bloque directamente desde su
 * Block Contract. Cero formularios duplicados.
 */

import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
      return (
        <input className={base} type="url" placeholder="URL temporal (selector en 15.10.5)"
          value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
      );
    case "reference":
      return (
        <input className={base} placeholder={`ID de ${def.references ?? "referencia"} (combobox en 15.10.5)`}
          value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
      );
    case "list":
    case "object":
      return (
        <textarea className={`${base} min-h-[80px] font-mono text-[10px]`}
          value={value ? JSON.stringify(value, null, 2) : ""}
          onChange={(e) => { try { onChange(e.target.value ? JSON.parse(e.target.value) : undefined); } catch { /* json inválido */ } }} />
      );
    default:
      return <p className="text-[10px] text-muted-foreground">Tipo no soportado.</p>;
  }
}