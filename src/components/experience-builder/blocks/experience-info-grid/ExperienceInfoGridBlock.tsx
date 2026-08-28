/**
 * H-03 · Ola I1.c — `vmx.experience.info-grid` (Capa 3: Comportamiento).
 *
 * I4-A/B/C · Governed Source Reconciliation (18.51): la autoría nueva
 * consume exclusivamente el binding canónico `geography.location`
 * resuelto desde `BusinessSurfaceProvider` con procedencia `published`.
 * Las configuraciones legacy se renderizan congeladas tal cual fueron
 * persistidas. Sin fuente gobernada válida se muestra un estado
 * explícito fail-closed; nunca un fallback ficticio.
 */
import { useContext, useMemo } from "react";
import { ExperienceInfoGrid } from "./ExperienceInfoGrid";
import {
  buildExperienceInfoGridPreviewDTO,
  buildGovernedLocationItems,
  experienceInfoGridConfigSchema,
  isLegacyExperienceInfoGridConfig,
  type ExperienceInfoGridConfig,
  type ExperienceInfoGridDTO,
} from "@/lib/experience-builder/blocks/experience-info-grid/contract";
import { BusinessSurfaceContext } from "@/components/surfaces/BusinessSurface";

function safeParse(raw: unknown): ExperienceInfoGridConfig {
  const r = experienceInfoGridConfigSchema.safeParse(raw ?? {});
  return r.success ? r.data : experienceInfoGridConfigSchema.parse({});
}

function baseDTO(
  cfg: ExperienceInfoGridConfig,
): Omit<ExperienceInfoGridDTO, "items" | "provenance"> {
  return {
    variant: cfg.variant,
    heading: cfg.heading?.trim() || null,
    columns: cfg.columns,
    ariaLabel: cfg.ariaLabel,
    capabilities: {
      copyable: cfg.capabilities.copyable ?? false,
      livePricing: cfg.capabilities.livePricing ?? false,
      liveAvailability: cfg.capabilities.liveAvailability ?? false,
    },
  };
}

function GovernedSourceUnavailable({ reason }: { reason: string }) {
  return (
    <section
      data-eb-block="experience-info-grid"
      data-eb-state="governed-source-unavailable"
      aria-label="Información clave no disponible"
      className="w-full rounded-lg border border-dashed border-border bg-muted/40 p-4"
    >
      <p className="text-sm font-medium text-foreground">Información clave no disponible</p>
      <p className="mt-1 text-xs text-muted-foreground">{reason}</p>
    </section>
  );
}

export interface ExperienceInfoGridBlockProps {
  config?: unknown;
}

export function ExperienceInfoGridBlock({ config }: ExperienceInfoGridBlockProps) {
  const cfg = safeParse(config);
  const legacy = isLegacyExperienceInfoGridConfig(config ?? {});
  const business = useContext(BusinessSurfaceContext);
  const governedItems = useMemo(() => buildGovernedLocationItems(business), [business]);

  if (legacy) {
    if (cfg.items.length === 0) {
      return (
        <GovernedSourceUnavailable reason="Configuración histórica sin datos persistidos. Render congelado, sin nueva autoría." />
      );
    }
    return (
      <ExperienceInfoGrid
        dto={{ ...baseDTO(cfg), items: cfg.items, provenance: "legacy_frozen" }}
      />
    );
  }

  if (!governedItems) {
    return (
      <GovernedSourceUnavailable reason="La fuente gobernada geography.location no resolvió una ubicación publicada con coordenadas reales." />
    );
  }

  return (
    <ExperienceInfoGrid dto={{ ...baseDTO(cfg), items: governedItems, provenance: "published" }} />
  );
}

export function ExperienceInfoGridPreview() {
  return <ExperienceInfoGrid dto={buildExperienceInfoGridPreviewDTO()} />;
}
