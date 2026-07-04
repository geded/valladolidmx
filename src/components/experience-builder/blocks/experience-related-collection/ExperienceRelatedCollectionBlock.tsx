/**
 * H-03 · Ola I3.b — `vmx.experience.related-collection` (Capa 3: Comportamiento).
 *
 * Resuelve `source` en tiempo de render:
 *  - `manual`      → usa `config.items` y/o `config.groups[].items`.
 *  - `destination` → hidrata desde `DestinationSurfaceContext` (I3.a).
 *                    Un `groups[]` con `entityKind` mapea cada bucket
 *                    del `DestinationRelatedDTO` (hoteles, restaurantes,
 *                    experiencias, empresas otras, eventos, productos).
 *  - `region|category|business|product|context|alux` → RESERVADO.
 *
 * Regla Evolutiva: agregar una nueva fuente NO requiere crear un
 * bloque nuevo — se resuelve aquí y se documenta en el contrato.
 * Directiva Founder: preparado para que Alux reutilice esta lógica en
 * futuras iteraciones (aluxRecommended / aluxDynamicGroups) sin
 * fabricar recomendaciones paralelas.
 */
import { useContext, useMemo } from "react";
import { ExperienceRelatedCollection } from "./ExperienceRelatedCollection";
import { DestinationSurfaceContext } from "@/components/surfaces/DestinationSurface";
import {
  buildExperienceRelatedCollectionPreviewDTO,
  dedupeItems,
  experienceRelatedCollectionConfigSchema,
  type ExperienceRelatedCollectionConfig,
  type ExperienceRelatedCollectionDTO,
  type ExperienceRelatedEntityKind,
  type ExperienceRelatedGroup,
  type ExperienceRelatedItem,
} from "@/lib/experience-builder/blocks/experience-related-collection/contract";
import {
  destinationRelatedBucketToItems,
  destinationRelatedProductsToItems,
  destinationRelatedEventsToItems,
} from "@/lib/experience-builder/adapters/destination-related-to-block";
import type { DestinationRelatedDTO } from "@/lib/destinations/public-reads.functions";

function safeParse(raw: unknown): ExperienceRelatedCollectionConfig {
  const r = experienceRelatedCollectionConfigSchema.safeParse(raw ?? {});
  return r.success
    ? r.data
    : experienceRelatedCollectionConfigSchema.parse({});
}

function resolveDestinationGroupItems(
  entityKind: ExperienceRelatedEntityKind,
  related: DestinationRelatedDTO,
  categorySlug: string | null,
): ExperienceRelatedItem[] {
  switch (entityKind) {
    case "hotel":
      return destinationRelatedBucketToItems(related.hoteles, "hotel");
    case "restaurant":
      return destinationRelatedBucketToItems(related.restaurantes, "restaurant");
    case "experience":
      return destinationRelatedBucketToItems(related.experiencias, "experience");
    case "business": {
      if (categorySlug === "hoteles") {
        return destinationRelatedBucketToItems(related.hoteles, "hotel");
      }
      if (categorySlug === "restaurantes") {
        return destinationRelatedBucketToItems(related.restaurantes, "restaurant");
      }
      if (categorySlug === "experiencias") {
        return destinationRelatedBucketToItems(related.experiencias, "experience");
      }
      // Todas las empresas del destino, sin duplicar por bucket.
      return [
        ...destinationRelatedBucketToItems(related.hoteles, "hotel"),
        ...destinationRelatedBucketToItems(related.restaurantes, "restaurant"),
        ...destinationRelatedBucketToItems(related.experiencias, "experience"),
        ...destinationRelatedBucketToItems(related.otras, "business"),
      ];
    }
    case "event":
      return destinationRelatedEventsToItems(related.eventos ?? []);
    case "product":
      return destinationRelatedProductsToItems(related.productos ?? []);
    default:
      return [];
  }
}

function buildDTO(
  cfg: ExperienceRelatedCollectionConfig,
  groups: ExperienceRelatedGroup[],
): ExperienceRelatedCollectionDTO {
  const capabilities = {
    showImage: cfg.capabilities.showImage ?? true,
    showMeta: cfg.capabilities.showMeta ?? true,
    showBadges: cfg.capabilities.showBadges ?? true,
    showTags: cfg.capabilities.showTags ?? false,
    showPrice: cfg.capabilities.showPrice ?? true,
    showDate: cfg.capabilities.showDate ?? true,
    showRationale: cfg.capabilities.showRationale ?? false,
    showKindBadge: cfg.capabilities.showKindBadge ?? true,
    dedupe: cfg.capabilities.dedupe ?? true,
    compact: cfg.capabilities.compact ?? false,
    contextAware: cfg.capabilities.contextAware ?? false,
    aluxRecommended: cfg.capabilities.aluxRecommended ?? false,
    aluxDynamicGroups: cfg.capabilities.aluxDynamicGroups ?? false,
  };
  return {
    variant: cfg.variant,
    entityKind: cfg.entityKind,
    columns: cfg.columns,
    heading: cfg.heading?.trim() || null,
    subheading: cfg.subheading?.trim() || null,
    emptyMessage: cfg.emptyMessage,
    ariaLabel: cfg.ariaLabel,
    groups: groups.map((g) => {
      let items = g.items;
      if (g.maxItems != null) items = items.slice(0, g.maxItems);
      return {
        id: g.id,
        entityKind: g.entityKind,
        heading: g.heading,
        subheading: g.subheading,
        emptyMessage: g.emptyMessage,
        variant: g.variant,
        items,
        seeAllHref: g.seeAllHref,
        seeAllLabel: g.seeAllLabel,
      };
    }),
    capabilities,
    contextRefs: cfg.contextRefs,
  };
}

/* ------------------------------------------------------------------ *
 * Component
 * ------------------------------------------------------------------ */
export interface ExperienceRelatedCollectionBlockProps {
  config?: unknown;
}

export function ExperienceRelatedCollectionBlock({
  config,
}: ExperienceRelatedCollectionBlockProps) {
  const cfg = safeParse(config);
  const destination = useContext(DestinationSurfaceContext);

  const resolvedGroups = useMemo<ExperienceRelatedGroup[]>(() => {
    // Sin grupos explícitos: usar `items` de nivel superior como un solo grupo.
    const baseGroups: ExperienceRelatedGroup[] =
      cfg.groups.length > 0
        ? cfg.groups
        : [
            {
              id: "default",
              entityKind: cfg.entityKind,
              heading: null,
              subheading: null,
              emptyMessage: null,
              variant: null,
              items: cfg.items,
              categorySlug: null,
              seeAllHref: null,
              seeAllLabel: null,
              maxItems: cfg.maxItems,
            } satisfies ExperienceRelatedGroup,
          ];

    return baseGroups.map((g) => {
      let items = g.items;

      if (cfg.source === "destination" && destination?.related) {
        // Reemplaza items del grupo por los del bucket correspondiente.
        items = resolveDestinationGroupItems(
          g.entityKind,
          destination.related,
          g.categorySlug,
        );
      }
      // (Fuentes reservadas: region/category/business/product/context/alux
      //  se conectarán en olas siguientes sin cambiar el contrato.)

      if (cfg.capabilities.dedupe ?? true) items = dedupeItems(items);
      return { ...g, items };
    });
  }, [cfg, destination]);

  const dto = useMemo(() => buildDTO(cfg, resolvedGroups), [cfg, resolvedGroups]);

  return <ExperienceRelatedCollection dto={dto} />;
}

export function ExperienceRelatedCollectionPreview() {
  return (
    <ExperienceRelatedCollection
      dto={buildExperienceRelatedCollectionPreviewDTO()}
    />
  );
}