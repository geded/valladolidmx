/**
 * H-03 · Ola I1.a — `vmx.experience.hero` (Capa 3: Comportamiento).
 *
 * Wrapper del Experience Builder que orquesta las 3 capas del bloque:
 *  - Contenido (config Zod validado + resolución del DTO según `source`).
 *  - Presentación (<ExperienceHero />).
 *  - Comportamiento (integración con SurfaceContext, extensiones, i18n).
 *
 * Fallback seguro: si `config` está vacío o inválido, renderiza el DTO
 * de preview neutral para que Studio nunca muestre error crítico.
 */
import { useContext, useMemo } from "react";
import { ExperienceHero } from "./ExperienceHero";
import {
  buildExperienceHeroPreviewDTO,
  experienceHeroConfigSchema,
  type ExperienceHeroConfig,
  type ExperienceHeroDTO,
} from "@/lib/experience-builder/blocks/experience-hero/contract";
import { BusinessSurfaceContext } from "@/components/surfaces/BusinessSurface";

function safeParseConfig(raw: unknown): ExperienceHeroConfig {
  const result = experienceHeroConfigSchema.safeParse(raw ?? {});
  if (result.success) return result.data;
  // Fallback: parseo con defaults al recibir un objeto no conforme.
  return experienceHeroConfigSchema.parse({});
}

/** Hidrata el DTO a partir del `config` + fuentes disponibles. */
function useExperienceHeroDTO(config: ExperienceHeroConfig): ExperienceHeroDTO {
  const business = useContext(BusinessSurfaceContext);

  return useMemo<ExperienceHeroDTO>(() => {
    // Base manual.
    const base: ExperienceHeroDTO = {
      variant: config.variant,
      eyebrow: config.eyebrow?.trim() || null,
      title: config.title?.trim() || "",
      description: config.description?.trim() || null,
      media:
        config.mediaUrl && config.mediaUrl.length > 0
          ? {
              url: config.mediaUrl,
              alt: config.mediaAlt ?? "",
              overlay: config.overlay,
            }
          : null,
      badges: config.badges,
      meta: config.meta,
      ctaPrimary: config.ctaPrimary ?? null,
      ctaSecondary: config.ctaSecondary ?? null,
    };

    // Hidratación por Surface (opt-in vía `source`).
    if (config.source === "business" && business) {
      return {
        ...base,
        eyebrow: base.eyebrow ?? categoryToEyebrow(business.category_slug),
        title: base.title || business.display_name,
        description: base.description ?? (business.tagline || business.description || null),
        badges:
          base.badges.length > 0
            ? base.badges
            : business.verified
              ? [{ label: "Verificado", tone: "primary" as const, iconKey: "badge-check" }]
              : [],
        meta:
          base.meta.length > 0
            ? base.meta
            : business.destination_slug
              ? [{ iconKey: "map-pin", label: humanize(business.destination_slug) }]
              : [],
      };
    }

    return base;
  }, [config, business]);
}

function categoryToEyebrow(slug: string): string {
  if (!slug) return "Marketplace";
  return humanize(slug);
}

function humanize(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export interface ExperienceHeroBlockProps {
  config?: unknown;
}

export function ExperienceHeroBlock({ config }: ExperienceHeroBlockProps) {
  const parsed = safeParseConfig(config);
  const dto = useExperienceHeroDTO(parsed);

  // Si tras hidratar seguimos sin título, mostramos preview neutral para
  // no romper la composición y darle al editor una señal visible.
  if (!dto.title) {
    return <ExperienceHero dto={buildExperienceHeroPreviewDTO()} />;
  }

  return <ExperienceHero dto={dto} />;
}

/** Preview neutral para Studio (sin fuentes conectadas). */
export function ExperienceHeroPreview() {
  return <ExperienceHero dto={buildExperienceHeroPreviewDTO()} />;
}