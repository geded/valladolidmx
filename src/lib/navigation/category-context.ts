/**
 * Contexto territorial de las categorías globales (Navigation Blueprint).
 *
 * Autoridad única del ancestro territorial en listados globales:
 *   · Entrada global  → Inicio › Oriente Maya › [Categoría]
 *   · Entrada con `?destino=` → Inicio › Oriente Maya › [Destino] › [Categoría]
 *
 * Prohibido componer estos ancestros manualmente en cada ruta.
 */
import { ORIENTE_MAYA } from "@/config/regions";

/** Ancestro regional canónico, compartido por toda categoría global. */
export const REGION_ANCESTOR = {
  kind: "region" as const,
  slug: ORIENTE_MAYA.slug,
  label: ORIENTE_MAYA.name,
  href: "/oriente-maya",
};

/** Etiqueta de alcance regional para títulos globales. */
export const REGION_SCOPE_LABEL = "Oriente Maya de Yucatán";

/**
 * Ancestros territoriales de una categoría global. El destino sólo se
 * añade cuando la entrada real del usuario lo declara (`?destino=`).
 */
export function categoryAncestors(
  destino: string | undefined | null,
  destinationLabel: (slug: string) => string,
) {
  return [
    REGION_ANCESTOR,
    ...(destino
      ? [
          {
            kind: "destination" as const,
            slug: destino,
            label: destinationLabel(destino),
            href: `/oriente-maya/${destino}`,
          },
        ]
      : []),
  ];
}
