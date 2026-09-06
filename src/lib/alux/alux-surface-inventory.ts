/**
 * G8-R1-C+L · Integración visual transversal de Alux — INVENTARIO REAL.
 *
 * Fuente única declarativa de cómo aparece Alux en cada familia premium.
 * No es documentación: los gates de contrato lo verifican contra el código
 * real (dock único en `__root.tsx`, presencia de planificador gobernada por
 * `usePlannerPresence`, marca canónica vía `AluxMark`).
 *
 * Reglas acreditadas:
 *  - Un ÚNICO dock global por página (`AluxFloatingTrigger`, montado en
 *    `__root.tsx`), cuya visibilidad decide `useAluxFloatingPresence`.
 *  - MÁXIMO un planificador contextual por página (`usePlannerPresence`).
 *  - Maestra `full` (cuerpo completo) en el Planner; maestra `avatar` en
 *    dock y chat. Sin excepciones por plantilla.
 *  - El contexto que recibe Alux es SIEMPRE real (entidad, territorio y
 *    relaciones del CMS). Sin datos ⇒ no se envía ni se muestra nada.
 */

export type AluxMaster = "avatar" | "full" | "avatar+full";

export interface AluxSurfaceRecord {
  /** Familia canónica o superficie premium. */
  readonly family: string;
  /** Dock global disponible en la superficie (política de presencia aparte). */
  readonly globalDock: boolean;
  /** Planificador contextual embebido (`vmx.alux.planner`). */
  readonly planner: boolean;
  readonly master: AluxMaster;
  /** Contexto real que la superficie entrega a Alux. */
  readonly context: readonly string[];
  /** Estado de duplicación verificado. */
  readonly duplication: "none";
  readonly notes?: string;
}

export const ALUX_SURFACE_INVENTORY: readonly AluxSurfaceRecord[] = [
  {
    family: "Home",
    globalDock: true,
    planner: true,
    master: "avatar+full",
    context: ["territorio: Oriente Maya"],
    duplication: "none",
  },
  {
    family: "Destino",
    globalDock: true,
    planner: true,
    master: "avatar+full",
    context: ["entidad: destino", "territorio: destino", "relaciones: categorías reales"],
    duplication: "none",
  },
  {
    family: "Listados",
    globalDock: true,
    planner: false,
    master: "avatar",
    context: ["territorio: destino", "relaciones: categoría del listado"],
    duplication: "none",
    notes: "Sin planner embebido: el listado ya tiene facetas y CTA propios.",
  },
  {
    family: "Hotel",
    globalDock: true,
    planner: true,
    master: "avatar+full",
    context: ["entidad: business", "territorio: destino/zona", "relaciones: categoría, cercanos"],
    duplication: "none",
  },
  {
    family: "Restaurante",
    globalDock: true,
    planner: true,
    master: "avatar+full",
    context: ["entidad: business", "territorio: destino/zona", "relaciones: categoría, cercanos"],
    duplication: "none",
  },
  {
    family: "Casa de vacaciones",
    globalDock: true,
    planner: true,
    master: "avatar+full",
    context: [
      "entidad: business",
      "territorio: destino/zona aproximada",
      "relaciones: capacidad, estancia, cercanos",
    ],
    duplication: "none",
  },
  {
    family: "Evento",
    globalDock: true,
    planner: true,
    master: "avatar+full",
    context: ["entidad: event", "territorio: destino/zona", "relaciones: sede, categoría"],
    duplication: "none",
  },
  {
    family: "Experiencia",
    globalDock: true,
    planner: true,
    master: "avatar+full",
    context: ["entidad: product", "territorio: destino/zona", "relaciones: empresa, categoría"],
    duplication: "none",
  },
  {
    family: "Tour",
    globalDock: true,
    planner: true,
    master: "avatar+full",
    context: ["entidad: product", "territorio: destino/zona", "relaciones: empresa, categoría"],
    duplication: "none",
  },
  {
    family: "Producto",
    globalDock: true,
    planner: true,
    master: "avatar+full",
    context: ["entidad: product", "territorio: destino/zona", "relaciones: empresa"],
    duplication: "none",
  },
  {
    family: "Lugar",
    globalDock: true,
    planner: true,
    master: "avatar+full",
    context: ["entidad: place", "territorio: destino/zona", "relaciones: tipo de lugar, cercanos"],
    duplication: "none",
    notes: "Delega íntegramente en premium-entity-place.",
  },
  {
    family: "Landing SEO",
    globalDock: true,
    planner: true,
    master: "avatar+full",
    context: ["entidad: entityRef del chrome", "territorio: destino", "relaciones: slots reales"],
    duplication: "none",
    notes: "Slot 18 del contrato premium-seo-landing.",
  },
];

/** Familias sin presencia contextual de Alux. */
export const ALUX_SURFACE_WITHHELD: readonly string[] = [];

/** Invariantes verificables por gate. */
export const ALUX_PRESENCE_INVARIANTS = {
  maxGlobalDocksPerPage: 1,
  maxContextualPlannersPerPage: 1,
  plannerMaster: "full",
  dockMaster: "avatar",
} as const;
