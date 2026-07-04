/**
 * H-03 · Ola I3.c — `vmx.experience.institutional-badges` (Capa 3: Comportamiento).
 */
import { useMemo } from "react";
import { InstitutionalBadges } from "./InstitutionalBadges";
import {
  buildExperienceBadgesPreviewDTO,
  experienceBadgesConfigSchema,
  type ExperienceBadgesConfig,
  type ExperienceBadgesDTO,
} from "@/lib/experience-builder/blocks/experience-institutional-badges/contract";

function safeParse(raw: unknown): ExperienceBadgesConfig {
  const r = experienceBadgesConfigSchema.safeParse(raw ?? {});
  return r.success ? r.data : experienceBadgesConfigSchema.parse({});
}

function buildDTO(cfg: ExperienceBadgesConfig): ExperienceBadgesDTO {
  return {
    variant: cfg.variant,
    size: cfg.size,
    layout: cfg.layout,
    items: cfg.items,
    ariaLabel: cfg.ariaLabel,
    capabilities: {
      showLabel: cfg.capabilities.showLabel ?? true,
      showTooltip: cfg.capabilities.showTooltip ?? true,
      compact: cfg.capabilities.compact ?? false,
      monochrome: cfg.capabilities.monochrome ?? false,
      linkToProgram: cfg.capabilities.linkToProgram ?? false,
      mobileVisibleMax: cfg.capabilities.mobileVisibleMax ?? 3,
    },
  };
}

export interface InstitutionalBadgesBlockProps {
  config?: unknown;
}

export function InstitutionalBadgesBlock({ config }: InstitutionalBadgesBlockProps) {
  const cfg = safeParse(config);
  const dto = useMemo(() => buildDTO(cfg), [cfg]);
  if (dto.items.length === 0) {
    return <InstitutionalBadges dto={buildExperienceBadgesPreviewDTO()} subjectSlug="valladolid" />;
  }
  return <InstitutionalBadges dto={dto} subjectSlug={cfg.subjectSlug} />;
}

export function InstitutionalBadgesPreview() {
  return (
    <InstitutionalBadges
      dto={buildExperienceBadgesPreviewDTO()}
      subjectSlug="valladolid"
    />
  );
}