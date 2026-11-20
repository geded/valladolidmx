/**
 * CmsFilters — Controles de filtrado reutilizables para los listados del CMS.
 * Sólo presentación: mismos tokens y lenguaje editorial ya aprobados.
 */
import type { ReactNode } from "react";
import { cmsSelectClass } from "@/components/cms/CmsTerritoryBar";

export interface CmsSelectOption {
  value: string;
  label: string;
}

export function CmsFilterGrid({ children }: { children: ReactNode }) {
  return <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
}

export function CmsSelectFilter(props: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  allLabel: string;
  options: CmsSelectOption[];
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {props.label}
      </span>
      <select
        className={cmsSelectClass}
        value={props.value}
        disabled={props.disabled}
        onChange={(e) => props.onChange(e.target.value)}
      >
        <option value="">{props.allLabel}</option>
        {props.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export const CMS_STATUS_OPTIONS: CmsSelectOption[] = [
  { value: "draft", label: "Borrador" },
  { value: "in_review", label: "En revisión" },
  { value: "approved", label: "Aprobado" },
  { value: "published", label: "Publicado" },
  { value: "archived", label: "Archivado" },
];

export const CMS_PRODUCT_TYPE_OPTIONS: CmsSelectOption[] = [
  { value: "experiencia", label: "Experiencia" },
  { value: "hotel", label: "Hotel" },
  { value: "restaurante", label: "Restaurante" },
  { value: "evento", label: "Evento" },
  { value: "tour", label: "Tour" },
  { value: "transporte", label: "Transporte" },
  { value: "servicio", label: "Servicio" },
  { value: "artesanal", label: "Artesanal" },
];
