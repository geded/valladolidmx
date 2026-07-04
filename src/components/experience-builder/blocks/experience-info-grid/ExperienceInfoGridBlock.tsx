/**
 * H-03 · Ola I1.c — `vmx.experience.info-grid` (Capa 3: Comportamiento).
 */
import { useContext, useMemo } from "react";
import { ExperienceInfoGrid } from "./ExperienceInfoGrid";
import {
  buildExperienceInfoGridPreviewDTO,
  experienceInfoGridConfigSchema,
  type ExperienceInfoGridConfig,
  type ExperienceInfoGridDTO,
  type ExperienceInfoItem,
} from "@/lib/experience-builder/blocks/experience-info-grid/contract";
import { BusinessSurfaceContext } from "@/components/surfaces/BusinessSurface";

function safeParse(raw: unknown): ExperienceInfoGridConfig {
  const r = experienceInfoGridConfigSchema.safeParse(raw ?? {});
  return r.success ? r.data : experienceInfoGridConfigSchema.parse({});
}

function humanize(s?: string | null) {
  return (s ?? "")
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function buildDTO(cfg: ExperienceInfoGridConfig, business: React.ContextType<typeof BusinessSurfaceContext>): ExperienceInfoGridDTO {
  let items: ExperienceInfoItem[] = cfg.items;
  if (cfg.source === "business" && business && items.length === 0) {
    const derived: ExperienceInfoItem[] = [];
    if (business.destination_slug)
      derived.push({ iconKey: "map-pin", label: "Destino", value: humanize(business.destination_slug), tone: "default" });
    if (business.category_slug)
      derived.push({ iconKey: "tag", label: "Categoría", value: humanize(business.category_slug), tone: "default" });
    if (business.verified)
      derived.push({ iconKey: "star", label: "Estatus", value: "Verificado", tone: "primary" });
    items = derived;
  }
  return {
    variant: cfg.variant,
    heading: cfg.heading?.trim() || null,
    columns: cfg.columns,
    items,
    ariaLabel: cfg.ariaLabel,
    capabilities: {
      copyable: cfg.capabilities.copyable ?? false,
      livePricing: cfg.capabilities.livePricing ?? false,
      liveAvailability: cfg.capabilities.liveAvailability ?? false,
    },
  };
}

export interface ExperienceInfoGridBlockProps { config?: unknown }

export function ExperienceInfoGridBlock({ config }: ExperienceInfoGridBlockProps) {
  const cfg = safeParse(config);
  const business = useContext(BusinessSurfaceContext);
  const dto = useMemo(() => buildDTO(cfg, business), [cfg, business]);
  if (dto.items.length === 0) return <ExperienceInfoGrid dto={buildExperienceInfoGridPreviewDTO()} />;
  return <ExperienceInfoGrid dto={dto} />;
}

export function ExperienceInfoGridPreview() {
  return <ExperienceInfoGrid dto={buildExperienceInfoGridPreviewDTO()} />;
}