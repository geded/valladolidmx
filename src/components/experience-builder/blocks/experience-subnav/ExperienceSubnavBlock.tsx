/**
 * H-03 · Ola I1.b — `vmx.experience.subnav` (Capa 3: Comportamiento).
 *
 * Parseo defensivo del config, resolución de anclas según `source`
 * (manual / auto / presets por tipo de superficie).
 */
import { useEffect, useMemo, useState } from "react";
import { ExperienceSubnav } from "./ExperienceSubnav";
import {
  buildExperienceSubnavPreviewDTO,
  EXPERIENCE_SUBNAV_PRESETS,
  experienceSubnavConfigSchema,
  type ExperienceSubnavAnchor,
  type ExperienceSubnavConfig,
  type ExperienceSubnavDTO,
} from "@/lib/experience-builder/blocks/experience-subnav/contract";

function safeParseConfig(raw: unknown): ExperienceSubnavConfig {
  const r = experienceSubnavConfigSchema.safeParse(raw ?? {});
  return r.success ? r.data : experienceSubnavConfigSchema.parse({});
}

/**
 * Detecta anclas en la página buscando elementos marcados con
 * `data-eb-anchor` (id + label). Fallback: <section id="…" data-eb-label>.
 * Se ejecuta client-side, tolerante a que aún no existan.
 */
function useAutoAnchors(enabled: boolean): ExperienceSubnavAnchor[] {
  const [anchors, setAnchors] = useState<ExperienceSubnavAnchor[]>([]);
  useEffect(() => {
    if (!enabled || typeof document === "undefined") return;
    const scan = () => {
      const nodes = Array.from(
        document.querySelectorAll<HTMLElement>("[data-eb-anchor][id]"),
      );
      const list = nodes
        .map((n) => ({
          id: n.id,
          label: n.getAttribute("data-eb-anchor") || n.getAttribute("aria-label") || n.id,
        }))
        .filter((a) => Boolean(a.id));
      setAnchors(list);
    };
    scan();
    // Reintento diferido para árboles tardíos (loaders, suspenses).
    const t = window.setTimeout(scan, 500);
    return () => window.clearTimeout(t);
  }, [enabled]);
  return anchors;
}

function buildDTO(
  config: ExperienceSubnavConfig,
  autoAnchors: ExperienceSubnavAnchor[],
): ExperienceSubnavDTO {
  let anchors = config.anchors;
  if (anchors.length === 0) {
    if (config.source === "auto") {
      anchors = autoAnchors;
    } else if (config.source !== "manual") {
      anchors = EXPERIENCE_SUBNAV_PRESETS[config.source] ?? [];
    }
  }
  return {
    variant: config.variant,
    sticky: config.sticky,
    scrollOffset: config.scrollOffset,
    ariaLabel: config.ariaLabel,
    anchors,
    capabilities: {
      scrollSpy: config.capabilities.scrollSpy ?? true,
      collapseOnMobile: config.capabilities.collapseOnMobile ?? true,
      showIcons: config.capabilities.showIcons ?? false,
    },
  };
}

export interface ExperienceSubnavBlockProps {
  config?: unknown;
}

export function ExperienceSubnavBlock({ config }: ExperienceSubnavBlockProps) {
  const parsed = safeParseConfig(config);
  const autoAnchors = useAutoAnchors(parsed.source === "auto");
  const dto = useMemo(() => buildDTO(parsed, autoAnchors), [parsed, autoAnchors]);
  if (dto.anchors.length === 0) {
    // Sin anclas resolubles: no renderizamos nada para no ensuciar la página.
    return null;
  }
  return <ExperienceSubnav dto={dto} />;
}

export function ExperienceSubnavPreview() {
  return <ExperienceSubnav dto={buildExperienceSubnavPreviewDTO()} />;
}