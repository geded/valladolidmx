/**
 * H-03 · Ola I1.b — `vmx.experience.cta-bar` (Capa 3: Comportamiento).
 *
 * Parseo Zod defensivo + hidratación por SurfaceContext (business).
 * Reservado para product/event/destination en olas futuras — mismo
 * blockType, no se crea nunca un bloque duplicado.
 */
import { useContext, useMemo } from "react";
import { ExperienceCtaBar } from "./ExperienceCtaBar";
import {
  buildExperienceCtaBarPreviewDTO,
  experienceCtaBarConfigSchema,
  type ExperienceCtaBarAction,
  type ExperienceCtaBarConfig,
  type ExperienceCtaBarDTO,
} from "@/lib/experience-builder/blocks/experience-cta-bar/contract";
import { BusinessSurfaceContext } from "@/components/surfaces/BusinessSurface";

function safeParseConfig(raw: unknown): ExperienceCtaBarConfig {
  const r = experienceCtaBarConfigSchema.safeParse(raw ?? {});
  return r.success ? r.data : experienceCtaBarConfigSchema.parse({});
}

function buildDTO(
  config: ExperienceCtaBarConfig,
  business: React.ContextType<typeof BusinessSurfaceContext>,
): ExperienceCtaBarDTO {
  let label = config.label ?? null;
  let meta = config.meta ?? null;
  let actions: ExperienceCtaBarAction[] = config.actions;

  if (config.source === "business" && business) {
    label = label ?? business.display_name;
    meta = meta ?? (business.tagline || business.category_slug || null);
    if (actions.length === 0) {
      actions = [
        {
          label: "Reservar",
          action: "book",
          href: "#reservar",
          emphasis: "primary",
          iconKey: "calendar",
        },
        {
          label: "Contactar",
          action: "contact",
          href: "#contacto",
          emphasis: "secondary",
          iconKey: "message-circle",
        },
        {
          label: "",
          action: "favorite",
          href: "#",
          emphasis: "ghost",
          iconKey: "heart",
        },
      ];
    }
  }

  return {
    variant: config.variant,
    label,
    meta,
    actions,
    revealAfterScroll: config.revealAfterScroll,
    desktopPosition: config.desktopPosition,
    ariaLabel: config.ariaLabel,
    capabilities: {
      hideOnScrollDown: config.capabilities.hideOnScrollDown ?? false,
      showPriceBadge: config.capabilities.showPriceBadge ?? false,
      showFavorite: config.capabilities.showFavorite ?? false,
      showShare: config.capabilities.showShare ?? false,
    },
  };
}

export interface ExperienceCtaBarBlockProps {
  config?: unknown;
}

export function ExperienceCtaBarBlock({ config }: ExperienceCtaBarBlockProps) {
  const parsed = safeParseConfig(config);
  const business = useContext(BusinessSurfaceContext);
  const dto = useMemo(() => buildDTO(parsed, business), [parsed, business]);
  if (dto.actions.length === 0) return null;
  return <ExperienceCtaBar dto={dto} />;
}

export function ExperienceCtaBarPreview() {
  return <ExperienceCtaBar dto={buildExperienceCtaBarPreviewDTO()} />;
}