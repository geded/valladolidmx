/**
 * OMXDS G6-S1 · TourismCategoryIcon
 *
 * Único componente autorizado para renderizar iconografía de categorías
 * turísticas. SSR-safe, sin carga remota, sin `dangerouslySetInnerHTML`.
 * Fail-closed: slug no registrado ⇒ no renderiza ícono.
 *
 * G6-S1-A · D-G6-02 — El componente es puramente decorativo
 * (`aria-hidden`, sin foco propio, sin rol interactivo y sin controles
 * anidados). El área táctil real de 44×44 px la garantiza el
 * control que lo contiene (`CategoryNavGrid`, `CategoriaCard`,
 * `InlineCategoryExplorer`). Expone únicamente atributos de
 * instrumentación para la medición de evidencia.
 */

import {
  resolveCategoryIcon,
  type CategoryGlyphProps,
  type CategoryIconVariant,
} from "@/lib/omxds/category-icon-registry";

import { HotelesGlyph } from "./icons/hoteles";
import { RestaurantesGlyph } from "./icons/restaurantes";
import { DestinosGlyph } from "./icons/destinos";
import { CasasDeVacacionesGlyph } from "./icons/casas-de-vacaciones";
import { EventosGlyph } from "./icons/eventos";
import { ExperienciasGlyph } from "./icons/experiencias";
import { QueHacerGlyph } from "./icons/que-hacer";
import { ToursGlyph } from "./icons/tours";
import { PromocionesGlyph } from "./icons/promociones";
import { ZonasArqueologicasGlyph } from "./icons/zonas-arqueologicas";
import { ComunidadesGlyph } from "./icons/comunidades";
import { CenotesGlyph } from "./icons/cenotes";
import { RutasGlyph } from "./icons/rutas";
import { ArtesaniasGlyph } from "./icons/artesanias";
import { NaturalezaGlyph } from "./icons/naturaleza";
import { GastronomiaGlyph } from "./icons/gastronomia";
import { CulturaGlyph } from "./icons/cultura";
import { ComprasGlyph } from "./icons/compras";
import { PueblosGlyph } from "./icons/pueblos";
import { BienestarGlyph } from "./icons/bienestar";
import { VidaNocturnaGlyph } from "./icons/vida-nocturna";
import { MapasGlyph } from "./icons/mapas";

type Glyph = (props: CategoryGlyphProps) => React.ReactElement;

const GLYPHS: Readonly<Record<string, Glyph>> = Object.freeze({
  hoteles: HotelesGlyph,
  restaurantes: RestaurantesGlyph,
  destinos: DestinosGlyph,
  "casas-de-vacaciones": CasasDeVacacionesGlyph,
  eventos: EventosGlyph,
  experiencias: ExperienciasGlyph,
  "que-hacer": QueHacerGlyph,
  tours: ToursGlyph,
  promociones: PromocionesGlyph,
  "zonas-arqueologicas": ZonasArqueologicasGlyph,
  comunidades: ComunidadesGlyph,
  cenotes: CenotesGlyph,
  rutas: RutasGlyph,
  artesanias: ArtesaniasGlyph,
  naturaleza: NaturalezaGlyph,
  gastronomia: GastronomiaGlyph,
  cultura: CulturaGlyph,
  compras: ComprasGlyph,
  pueblos: PueblosGlyph,
  bienestar: BienestarGlyph,
  "vida-nocturna": VidaNocturnaGlyph,
  mapas: MapasGlyph,
});

export interface TourismCategoryIconProps {
  slug: string;
  /** `compact` (32–40 px, sin textura) · `standard` (40–48 px, con acento). */
  variant?: CategoryIconVariant;
  /** Tamaño en px. 56 sólo con `spaceCredited`. */
  size?: number;
  /** Acredita explícitamente espacio para 56 px. */
  spaceCredited?: boolean;
  /** Fondo del contenedor: selecciona el par cromático acreditado. */
  scheme?: "light" | "dark";
  /** Renderiza el símbolo en monocromo (`currentColor`). */
  monochrome?: boolean;
  className?: string;
}

function clampSize(variant: CategoryIconVariant, size: number | undefined, credited: boolean) {
  const fallback = variant === "compact" ? 36 : 44;
  const value = size ?? fallback;
  const max = credited ? 56 : variant === "compact" ? 40 : 48;
  const min = variant === "compact" ? 32 : 40;
  return Math.min(Math.max(value, min), max);
}

export function TourismCategoryIcon({
  slug,
  variant = "standard",
  size,
  spaceCredited = false,
  scheme = "light",
  monochrome = false,
  className,
}: TourismCategoryIconProps) {
  const entry = resolveCategoryIcon(slug);
  const Glyph = entry ? GLYPHS[entry.slug] : undefined;
  if (!entry || !Glyph) return null; // fail-closed: la etiqueta HTML permanece

  const px = clampSize(variant, size, spaceCredited);
  const primary = monochrome ? "currentColor" : entry.primary[scheme];
  const secondary = monochrome ? "currentColor" : entry.secondary[scheme];

  return (
    <svg
      viewBox="0 0 24 24"
      width={px}
      height={px}
      fill="none"
      aria-hidden="true"
      focusable="false"
      data-omxds-category-icon={entry.slug}
      data-variant={variant}
      data-omxds-icon-size={px}
      data-omxds-icon-scheme={monochrome ? "monochrome" : scheme}
      data-omxds-icon-textile={variant === "standard" ? "true" : "false"}
      className={className}
    >
      <Glyph primary={primary} secondary={secondary} textile={variant === "standard"} />
    </svg>
  );
}
