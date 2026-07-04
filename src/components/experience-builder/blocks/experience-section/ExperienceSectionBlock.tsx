/**
 * H-03 · Ola I1.c — `vmx.experience.section` (Capa 3: Comportamiento).
 */
import { useContext, useMemo } from "react";
import { ExperienceSection } from "./ExperienceSection";
import {
  buildExperienceSectionPreviewDTO,
  experienceSectionConfigSchema,
  type ExperienceSectionConfig,
  type ExperienceSectionDTO,
} from "@/lib/experience-builder/blocks/experience-section/contract";
import { BusinessSurfaceContext } from "@/components/surfaces/BusinessSurface";

function safeParse(raw: unknown): ExperienceSectionConfig {
  const r = experienceSectionConfigSchema.safeParse(raw ?? {});
  return r.success ? r.data : experienceSectionConfigSchema.parse({});
}

function buildDTO(cfg: ExperienceSectionConfig, business: React.ContextType<typeof BusinessSurfaceContext>): ExperienceSectionDTO {
  let title = cfg.title ?? null;
  let lead = cfg.lead ?? null;
  let body = cfg.body ?? null;
  if (cfg.source === "business" && business) {
    title = title || business.display_name;
    lead = lead || (business.tagline || null);
    body = body || business.description || null;
  }
  return {
    variant: cfg.variant,
    eyebrow: cfg.eyebrow?.trim() || null,
    title,
    lead,
    body,
    media:
      cfg.mediaUrl && cfg.mediaUrl.length > 0
        ? { url: cfg.mediaUrl, alt: cfg.mediaAlt ?? "" }
        : null,
    attribution: cfg.attribution?.trim() || null,
    ctas: cfg.ctas,
    align: cfg.align,
    tone: cfg.tone,
    ariaLabel: cfg.ariaLabel?.trim() || null,
    capabilities: {
      anchor: cfg.capabilities.anchor ?? true,
      seoHeading: cfg.capabilities.seoHeading ?? true,
      richText: cfg.capabilities.richText ?? false,
    },
  };
}

export interface ExperienceSectionBlockProps { config?: unknown }

export function ExperienceSectionBlock({ config }: ExperienceSectionBlockProps) {
  const cfg = safeParse(config);
  const business = useContext(BusinessSurfaceContext);
  const dto = useMemo(() => buildDTO(cfg, business), [cfg, business]);
  if (!dto.title && !dto.body && !dto.lead) return <ExperienceSection dto={buildExperienceSectionPreviewDTO()} />;
  return <ExperienceSection dto={dto} />;
}

export function ExperienceSectionPreview() {
  return <ExperienceSection dto={buildExperienceSectionPreviewDTO()} />;
}