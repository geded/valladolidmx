/**
 * H-03 · Ola I1.c — `vmx.experience.features` (Capa 3: Comportamiento).
 */
import { useMemo } from "react";
import { ExperienceFeatures } from "./ExperienceFeatures";
import {
  buildExperienceFeaturesPreviewDTO,
  experienceFeaturesConfigSchema,
  type ExperienceFeaturesConfig,
  type ExperienceFeaturesDTO,
} from "@/lib/experience-builder/blocks/experience-features/contract";

function safeParse(raw: unknown): ExperienceFeaturesConfig {
  const r = experienceFeaturesConfigSchema.safeParse(raw ?? {});
  return r.success ? r.data : experienceFeaturesConfigSchema.parse({});
}

function buildDTO(cfg: ExperienceFeaturesConfig): ExperienceFeaturesDTO {
  return {
    variant: cfg.variant,
    heading: cfg.heading?.trim() || null,
    subheading: cfg.subheading?.trim() || null,
    columns: cfg.columns,
    items: cfg.items,
    ariaLabel: cfg.ariaLabel,
    capabilities: {
      groupByCategory: cfg.capabilities.groupByCategory ?? false,
      showUnavailable: cfg.capabilities.showUnavailable ?? true,
      compact: cfg.capabilities.compact ?? false,
    },
  };
}

export interface ExperienceFeaturesBlockProps { config?: unknown }

export function ExperienceFeaturesBlock({ config }: ExperienceFeaturesBlockProps) {
  const cfg = safeParse(config);
  const dto = useMemo(() => buildDTO(cfg), [cfg]);
  if (dto.items.length === 0) return <ExperienceFeatures dto={buildExperienceFeaturesPreviewDTO()} />;
  return <ExperienceFeatures dto={dto} />;
}

export function ExperienceFeaturesPreview() {
  return <ExperienceFeatures dto={buildExperienceFeaturesPreviewDTO()} />;
}