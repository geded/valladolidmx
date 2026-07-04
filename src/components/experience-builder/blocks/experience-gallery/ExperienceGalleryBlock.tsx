/**
 * H-03 · Ola I1.c — `vmx.experience.gallery` (Capa 3: Comportamiento).
 */
import { useMemo } from "react";
import { ExperienceGallery } from "./ExperienceGallery";
import {
  buildExperienceGalleryPreviewDTO,
  experienceGalleryConfigSchema,
  type ExperienceGalleryConfig,
  type ExperienceGalleryDTO,
} from "@/lib/experience-builder/blocks/experience-gallery/contract";

function safeParse(raw: unknown): ExperienceGalleryConfig {
  const r = experienceGalleryConfigSchema.safeParse(raw ?? {});
  return r.success ? r.data : experienceGalleryConfigSchema.parse({});
}

function buildDTO(cfg: ExperienceGalleryConfig): ExperienceGalleryDTO {
  return {
    variant: cfg.variant,
    heading: cfg.heading?.trim() || null,
    subheading: cfg.subheading?.trim() || null,
    items: cfg.items,
    maxVisible: cfg.maxVisible,
    aspect: cfg.aspect,
    ariaLabel: cfg.ariaLabel,
    capabilities: {
      lightbox: cfg.capabilities.lightbox ?? true,
      captions: cfg.capabilities.captions ?? true,
      video: cfg.capabilities.video ?? false,
      panorama360: cfg.capabilities.panorama360 ?? false,
      model3d: cfg.capabilities.model3d ?? false,
      ar: cfg.capabilities.ar ?? false,
      ugc: cfg.capabilities.ugc ?? false,
    },
  };
}

export interface ExperienceGalleryBlockProps { config?: unknown }

export function ExperienceGalleryBlock({ config }: ExperienceGalleryBlockProps) {
  const cfg = safeParse(config);
  const dto = useMemo(() => buildDTO(cfg), [cfg]);
  if (dto.items.length === 0) return <ExperienceGallery dto={buildExperienceGalleryPreviewDTO()} />;
  return <ExperienceGallery dto={dto} />;
}

export function ExperienceGalleryPreview() {
  return <ExperienceGallery dto={buildExperienceGalleryPreviewDTO()} />;
}