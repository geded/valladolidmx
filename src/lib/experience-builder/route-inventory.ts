/**
 * Route Inventory — Destination Operating System (DOS) · SSC-01 · P2
 *
 * Fuente única y aditiva del inventario oficial de rutas del producto
 * Valladolid.mx. NO altera routing, SSR, SEO ni contenido — sólo
 * describe cada archivo de `src/routes/` con metadatos de evolución
 * del producto:
 *
 *   - categoría funcional
 *   - nivel de madurez (L0..L6)
 *   - prioridad de negocio
 *   - estado de migración
 *   - propietario funcional
 *   - dependencias
 *   - fecha de última revisión
 *   - versión del producto en la que fue incorporada
 *
 * Reglas vinculantes (memoria de proyecto · Single Studio Coverage /
 * Route Inventory Rule / DOS Reuse Rule):
 *  - Toda ruta nueva DEBE aparecer aquí antes de mergear.
 *  - Ninguna capacidad se implementa fuera del DOS ni motores paralelos.
 *  - Este archivo es aditivo: retirarlo no cambia el runtime.
 */

export type RouteCategory =
  | "studio"
  | "dynamic-template"
  | "technical"
  | "system"
  | "pending-migration";

export type RouteMaturity = "L0" | "L1" | "L2" | "L3" | "L4" | "L5" | "L6";

export type RouteBusinessPriority = "critical" | "high" | "medium" | "low";

export type RouteMigrationStatus =
  | "native-studio"
  | "template-cms"
  | "planned"
  | "in-progress"
  | "blocked"
  | "technical-exception"
  | "deprecated";

export interface RouteInventoryEntry {
  /** Path relativo dentro de `src/routes/` (canonical filesystem id). */
  readonly routeId: string;
  /** URL pública canónica (con `$param` para segmentos dinámicos). */
  readonly publicPath: string;
  readonly category: RouteCategory;
  readonly maturity: RouteMaturity;
  readonly businessPriority: RouteBusinessPriority;
  readonly migrationStatus: RouteMigrationStatus;
  readonly functionalOwner: string;
  readonly dependencies: readonly string[];
  /** ISO date (YYYY-MM-DD) de la última revisión. */
  readonly lastReviewed: string;
  /** Versión del producto en la que fue incorporada. */
  readonly productVersion: string;
  readonly notes?: string;
}

/* ------------------------------------------------------------------ *
 * Heurísticas — derivan categoría/prioridad/estado por defecto desde
 * el path del archivo. Los overrides explícitos ganan siempre.
 * ------------------------------------------------------------------ */

function toPublicPath(routeId: string): string {
  let p = routeId
    .replace(/^src\/routes\//, "")
    .replace(/\.(tsx|ts)$/, "")
    .replace(/\.index$/, "")
    .replace(/\[\.]/g, "."); // TanStack escape
  // "_authenticated/foo" → "/foo", ".dot" → "/", flatten dots→slashes
  p = p.replace(/^_authenticated\//, "").replace(/^_authenticated$/, "");
  p = p.replace(/\./g, "/");
  if (p === "" || p === "index") return "/";
  return "/" + p;
}

function inferCategory(routeId: string): RouteCategory {
  if (routeId.startsWith("src/routes/api/")) return "system";
  if (routeId.startsWith("src/routes/lovable/")) return "system";
  if (routeId.startsWith("src/routes/email/")) return "system";
  if (routeId.startsWith("src/routes/[.")) return "system";
  if (
    routeId === "src/routes/llms[.]txt.ts" ||
    routeId === "src/routes/manifest[.]webmanifest.ts" ||
    routeId === "src/routes/mcp.ts" ||
    routeId === "src/routes/robots[.]txt.ts" ||
    routeId === "src/routes/sitemap[.]xml.ts"
  ) {
    return "system";
  }
  if (
    routeId.startsWith("src/routes/preview") ||
    routeId.startsWith("src/routes/_authenticated") ||
    /\/auth\.tsx$|\/reset-password\.tsx$|\/offline\.tsx$/.test(routeId)
  ) {
    return "technical";
  }
  if (routeId.startsWith("src/routes/oriente-maya/") && /\$/.test(routeId)) {
    return "dynamic-template";
  }
  if (
    /\.(\$[a-zA-Z]+)\.tsx$/.test(routeId) ||
    /\/(l|p|producto|eventos|viaje-compartido|viajero)\.\$/.test(routeId)
  ) {
    return "dynamic-template";
  }
  if (routeId === "src/routes/index.tsx") return "studio";
  if (routeId === "src/routes/oriente-maya/index.tsx") return "studio";
  return "pending-migration";
}

function inferDefaults(
  routeId: string,
  category: RouteCategory,
): {
  maturity: RouteMaturity;
  priority: RouteBusinessPriority;
  migration: RouteMigrationStatus;
  owner: string;
} {
  switch (category) {
    case "studio":
      return { maturity: "L4", priority: "critical", migration: "native-studio", owner: "Product" };
    case "dynamic-template":
      return { maturity: "L4", priority: "high", migration: "template-cms", owner: "CMS" };
    case "technical":
      return {
        maturity: "L3",
        priority: "medium",
        migration: "technical-exception",
        owner: "Platform",
      };
    case "system":
      return {
        maturity: "L3",
        priority: "medium",
        migration: "technical-exception",
        owner: "Platform",
      };
    case "pending-migration":
      return { maturity: "L2", priority: "medium", migration: "planned", owner: "Product" };
  }
}

/* ------------------------------------------------------------------ *
 * Overrides explícitos — sólo cuando la heurística no acierta o cuando
 * hay decisión de producto que documentar. Añadir aquí cualquier ruta
 * cuya categoría, prioridad o estado difiera del default.
 * ------------------------------------------------------------------ */

type Override = Partial<
  Omit<RouteInventoryEntry, "routeId" | "publicPath" | "lastReviewed" | "productVersion">
> & { notes?: string };

const OVERRIDES: Readonly<Record<string, Override>> = {
  "src/routes/index.tsx": {
    category: "studio",
    businessPriority: "critical",
    maturity: "L5",
    migrationStatus: "native-studio",
    functionalOwner: "Founder",
    dependencies: ["page_compositions:home", "experience-builder"],
    notes: "Home pública — composición administrada 100% desde el Experience Builder.",
  },
  "src/routes/oriente-maya/index.tsx": {
    category: "studio",
    businessPriority: "critical",
    maturity: "L4",
    migrationStatus: "native-studio",
    functionalOwner: "Product",
    dependencies: ["page_compositions:marketplace"],
  },
  "src/routes/_authenticated/cms/experience-builder.tsx": {
    category: "studio",
    businessPriority: "critical",
    maturity: "L5",
    migrationStatus: "native-studio",
    functionalOwner: "Product",
    dependencies: ["page_compositions", "block-library", "preview-registry"],
    notes: "El Experience Builder es el único constructor editorial oficial.",
  },
  "src/routes/_authenticated/cms/experience-builder.pages.tsx": {
    category: "studio",
    businessPriority: "critical",
    maturity: "L4",
    migrationStatus: "native-studio",
    functionalOwner: "Product",
    dependencies: ["route-inventory"],
  },
  "src/routes/_authenticated/cms/experience-builder.inventory.tsx": {
    category: "studio",
    businessPriority: "high",
    maturity: "L3",
    migrationStatus: "native-studio",
    functionalOwner: "Product",
    dependencies: ["route-inventory"],
    notes: "Panel de sólo lectura — inventario oficial del DOS.",
  },
  "src/routes/auth.tsx": {
    businessPriority: "critical",
    maturity: "L4",
    notes: "Puerta de entrada — gate de sesión.",
  },
  "src/routes/reset-password.tsx": { businessPriority: "high", maturity: "L4" },
  "src/routes/offline.tsx": {
    businessPriority: "low",
    maturity: "L2",
    notes: "PWA offline fallback.",
  },
  "src/routes/sitemap[.]xml.ts": {
    businessPriority: "high",
    maturity: "L4",
    notes: "SEO — sitemap dinámico.",
  },
  // Rutas públicas editoriales pendientes de migrar al Experience Builder.
  "src/routes/blog.tsx": {
    businessPriority: "medium",
    maturity: "L2",
    migrationStatus: "planned",
    notes: "Migrar a composición EB.",
  },
  "src/routes/contacto.tsx": {
    businessPriority: "medium",
    maturity: "L2",
    migrationStatus: "planned",
  },
  "src/routes/mapa.tsx": { businessPriority: "medium", maturity: "L2", migrationStatus: "planned" },
  "src/routes/convertir-en-anfitrion.tsx": {
    businessPriority: "high",
    maturity: "L2",
    migrationStatus: "planned",
  },
  "src/routes/casas-de-vacaciones.tsx": {
    businessPriority: "medium",
    maturity: "L2",
    migrationStatus: "planned",
  },
  "src/routes/promociones.tsx": {
    businessPriority: "medium",
    maturity: "L2",
    migrationStatus: "planned",
  },
  "src/routes/que-hacer.tsx": {
    businessPriority: "medium",
    maturity: "L2",
    migrationStatus: "planned",
  },
  "src/routes/eventos.tsx": {
    businessPriority: "high",
    maturity: "L3",
    migrationStatus: "planned",
  },
  "src/routes/hoteles.tsx": {
    businessPriority: "high",
    maturity: "L3",
    migrationStatus: "planned",
  },
  "src/routes/restaurantes.tsx": {
    businessPriority: "high",
    maturity: "L3",
    migrationStatus: "planned",
  },
  "src/routes/experiencias.tsx": {
    businessPriority: "high",
    maturity: "L3",
    migrationStatus: "planned",
  },
  "src/routes/empresas.tsx": {
    businessPriority: "high",
    maturity: "L3",
    migrationStatus: "planned",
  },
  "src/routes/marketplace.tsx": {
    businessPriority: "high",
    maturity: "L3",
    migrationStatus: "planned",
    notes: "Retirar terminología marketplace (backlog).",
  },
  "src/routes/marketplace.$.tsx": {
    category: "dynamic-template",
    businessPriority: "high",
    maturity: "L3",
    migrationStatus: "planned",
  },
  "src/routes/alux.tsx": {
    category: "studio",
    businessPriority: "critical",
    maturity: "L4",
    migrationStatus: "native-studio",
    functionalOwner: "Founder",
    notes: "Superficie Alux — página consultiva.",
  },
  "src/routes/arma-tu-viaje.tsx": {
    category: "studio",
    businessPriority: "critical",
    maturity: "L3",
    migrationStatus: "native-studio",
    functionalOwner: "Product",
  },
};

/* ------------------------------------------------------------------ *
 * Fuente escaneada — lista de archivos actualmente presentes en
 * `src/routes/`. Mantener sincronizada vía `scripts/route-inventory-coverage.ts`.
 * ------------------------------------------------------------------ */

export const SCANNED_ROUTE_FILES: readonly string[] = [
  "src/routes/[.]lovable.oauth.consent.tsx",
  "src/routes/[.mcp]/invoke-tool/$tool.ts",
  "src/routes/[.mcp]/list-tools.ts",
  "src/routes/[.well-known]/oauth-protected-resource.ts",
  "src/routes/__root.tsx",
  "src/routes/_authenticated.tsx",
  "src/routes/_authenticated/admin/anfitriones.tsx",
  "src/routes/_authenticated/admin/concierge.tsx",
  "src/routes/_authenticated/admin/empresas.tsx",
  "src/routes/_authenticated/admin/ia.tsx",
  "src/routes/_authenticated/admin/index.tsx",
  "src/routes/_authenticated/admin/operaciones.tsx",
  "src/routes/_authenticated/admin/route.tsx",
  "src/routes/_authenticated/admin/sistema.index.tsx",
  "src/routes/_authenticated/admin/sistema.tsx",
  "src/routes/_authenticated/admin/sistema.usuarios.tsx",
  "src/routes/_authenticated/admin/turistas.tsx",
  "src/routes/_authenticated/cms.tsx",
  "src/routes/_authenticated/cms/actividad.tsx",
  "src/routes/_authenticated/cms/alux.calidad.tsx",
  "src/routes/_authenticated/cms/alux.conocimiento.tsx",
  "src/routes/_authenticated/cms/alux.feedback.tsx",
  "src/routes/_authenticated/cms/alux.tsx",
  "src/routes/_authenticated/cms/alertas.tsx",
  "src/routes/_authenticated/cms/categorias.$id.editar.tsx",
  "src/routes/_authenticated/cms/categorias.index.tsx",
  "src/routes/_authenticated/cms/categorias.nueva.tsx",
  "src/routes/_authenticated/cms/destinos.$destinationId.editar.tsx",
  "src/routes/_authenticated/cms/destinos.index.tsx",
  "src/routes/_authenticated/cms/destinos.nueva.tsx",
  "src/routes/_authenticated/cms/demo-pack.tsx",
  "src/routes/_authenticated/cms/empresas.$businessId.editar.tsx",
  "src/routes/_authenticated/cms/empresas.index.tsx",
  "src/routes/_authenticated/cms/empresas.nueva.tsx",
  "src/routes/_authenticated/cms/experience-builder.pages.tsx",
  "src/routes/_authenticated/cms/experience-builder.tsx",
  "src/routes/_authenticated/cms/experience-builder.inventory.tsx",
  "src/routes/_authenticated/cms/index.tsx",
  "src/routes/_authenticated/cms/media.tsx",
  "src/routes/_authenticated/cms/observabilidad.tsx",
  "src/routes/_authenticated/cms/pagos.tsx",
  "src/routes/_authenticated/cms/productos.$productId.editar.tsx",
  "src/routes/_authenticated/cms/productos.index.tsx",
  "src/routes/_authenticated/cms/productos.nueva.tsx",
  "src/routes/_authenticated/cms/regiones.$id.editar.tsx",
  "src/routes/_authenticated/cms/regiones.index.tsx",
  "src/routes/_authenticated/cms/regiones.nueva.tsx",
  "src/routes/_authenticated/cms/relacionados.index.tsx",
  "src/routes/_authenticated/cms/reviews.$id.moderar.tsx",
  "src/routes/_authenticated/cms/reviews.index.tsx",
  "src/routes/_authenticated/cms/simulation.tsx",
  "src/routes/_authenticated/cms/travel-plans.tsx",
  "src/routes/_authenticated/cms/ventas-en-linea.tsx",
  "src/routes/_authenticated/cms/visibilidad.solicitudes.tsx",
  "src/routes/_authenticated/cms/visibilidad.spotlight.tsx",
  "src/routes/_authenticated/cms/visibilidad.tsx",
  "src/routes/_authenticated/cms/visitor-intel.tsx",
  "src/routes/_authenticated/cms/zonas.$id.editar.tsx",
  "src/routes/_authenticated/cms/zonas.index.tsx",
  "src/routes/_authenticated/cms/zonas.nueva.tsx",
  "src/routes/_authenticated/concierge/expedientes.$caseId.tsx",
  "src/routes/_authenticated/concierge/index.tsx",
  "src/routes/_authenticated/concierge/route.tsx",
  "src/routes/_authenticated/cuenta/actividad.tsx",
  "src/routes/_authenticated/cuenta/anfitrion.tsx",
  "src/routes/_authenticated/cuenta/carrito.tsx",
  "src/routes/_authenticated/cuenta/checkout.$orderId.tsx",
  "src/routes/_authenticated/cuenta/concierge.$caseId.evaluar.tsx",
  "src/routes/_authenticated/cuenta/concierge.$caseId.tsx",
  "src/routes/_authenticated/cuenta/concierge.tsx",
  "src/routes/_authenticated/cuenta/documentos.$orderId.tsx",
  "src/routes/_authenticated/cuenta/empresa.$businessId.publicacion.tsx",
  "src/routes/_authenticated/cuenta/favoritos.tsx",
  "src/routes/_authenticated/cuenta/historial.tsx",
  "src/routes/_authenticated/cuenta/index.tsx",
  "src/routes/_authenticated/cuenta/mi-viaje.tsx",
  "src/routes/_authenticated/cuenta/mis-cupones.tsx",
  "src/routes/_authenticated/cuenta/notificaciones.tsx",
  "src/routes/_authenticated/cuenta/pagos.error.tsx",
  "src/routes/_authenticated/cuenta/pagos.exito.tsx",
  "src/routes/_authenticated/cuenta/perfil-publico.tsx",
  "src/routes/_authenticated/cuenta/perfil.tsx",
  "src/routes/_authenticated/cuenta/route.tsx",
  "src/routes/_authenticated/cuenta/stage-simulator.tsx",
  "src/routes/_authenticated/empresa.tsx",
  "src/routes/_authenticated/mi-viaje.tsx",
  "src/routes/_authenticated/paginas.$.tsx",
  "src/routes/_authenticated/paginas.tsx",
  "src/routes/_authenticated/portal/actividad.tsx",
  "src/routes/_authenticated/portal/canjear.tsx",
  "src/routes/_authenticated/portal/canjes.tsx",
  "src/routes/_authenticated/portal/catalogo.tsx",
  "src/routes/_authenticated/portal/concierge.tsx",
  "src/routes/_authenticated/portal/empresas.$businessId.tsx",
  "src/routes/_authenticated/portal/empresas.index.tsx",
  "src/routes/_authenticated/portal/ficha.tsx",
  "src/routes/_authenticated/portal/galeria.tsx",
  "src/routes/_authenticated/portal/index.tsx",
  "src/routes/_authenticated/portal/invitaciones.$token.tsx",
  "src/routes/_authenticated/portal/invitaciones.index.tsx",
  "src/routes/_authenticated/portal/metricas.tsx",
  "src/routes/_authenticated/portal/pagos.tsx",
  "src/routes/_authenticated/portal/presencia.tsx",
  "src/routes/_authenticated/portal/productos.$productId.preview.tsx",
  "src/routes/_authenticated/portal/propiedad.tsx",
  "src/routes/_authenticated/portal/reportes.tsx",
  "src/routes/_authenticated/portal/resenas.index.tsx",
  "src/routes/_authenticated/portal/route.tsx",
  "src/routes/_authenticated/portal/ventas-en-linea.tsx",
  "src/routes/_authenticated/portal/ventas-en-linea.ordenes.tsx",
  "src/routes/_authenticated/portal/visibilidad.tsx",
  "src/routes/alux.tsx",
  "src/routes/api/dev/media-pipeline-derive.ts",
  "src/routes/api/dev/media-shadow-eval.ts",
  "src/routes/api/public/alux/signal.ts",
  "src/routes/api/public/health/maps.ts",
  "src/routes/api/public/hooks/coupon-review-reminders.ts",
  "src/routes/api/public/hooks/eb-process-scheduled-publish.ts",
  "src/routes/api/public/hooks/media-signature-renew.ts",
  "src/routes/api/public/hooks/trip-journey-emails.ts",
  "src/routes/api/public/hooks/visibility-notifications.ts",
  "src/routes/api/public/maps/static.ts",
  "src/routes/api/public/alux/chat.ts",
  "src/routes/api/public/payments/$provider/webhook.ts",
  "src/routes/api/public/studio-media.$.ts",
  "src/routes/arma-tu-viaje.tsx",
  "src/routes/auth.tsx",
  "src/routes/blog.tsx",
  "src/routes/casas-de-vacaciones.tsx",
  "src/routes/contacto.tsx",
  "src/routes/convertir-en-anfitrion.tsx",
  "src/routes/email/unsubscribe.ts",
  "src/routes/empresas.tsx",
  "src/routes/eventos.$slug.tsx",
  "src/routes/eventos.tsx",
  "src/routes/experiencias.tsx",
  "src/routes/hoteles.tsx",
  "src/routes/index.tsx",
  "src/routes/l.$slug.tsx",
  "src/routes/llms[.]txt.ts",
  "src/routes/lovable/business-mother-template-preview.tsx",
  "src/routes/lovable/context-engine-preview.tsx",
  "src/routes/lovable/email/auth/preview.ts",
  "src/routes/lovable/email/auth/webhook.ts",
  "src/routes/lovable/email/queue/process.ts",
  "src/routes/lovable/email/suppression.ts",
  "src/routes/lovable/email/transactional/preview.ts",
  "src/routes/lovable/email/transactional/send.ts",
  "src/routes/lovable/experience-map-preview.tsx",
  "src/routes/lovable/experience-hero-preview.tsx",
  "src/routes/lovable/experience-i1c-preview.tsx",
  "src/routes/lovable/experience-products-preview.tsx",
  "src/routes/lovable/experience-promotions-preview.tsx",
  "src/routes/lovable/experience-related-collection-preview.tsx",
  "src/routes/lovable/experience-reviews-preview.tsx",
  "src/routes/lovable/experience-subnav-ctabar-preview.tsx",
  "src/routes/lovable/protected-actions-preview.tsx",
  "src/routes/lovable/tourism-card-preview.tsx",
  "src/routes/lovable/workspace-foundations.tsx",
  "src/routes/lovable/workspace-preview.tsx",
  "src/routes/mapa.tsx",
  "src/routes/manifest[.]webmanifest.ts",
  "src/routes/marketplace.$.tsx",
  "src/routes/marketplace.tsx",
  "src/routes/mcp.ts",
  "src/routes/offline.tsx",
  "src/routes/oriente-maya/$destino.$categoria.$empresa.$producto.tsx",
  "src/routes/oriente-maya/$destino.$categoria.$empresa.index.tsx",
  "src/routes/oriente-maya/$destino.$categoria.$empresa.tsx",
  "src/routes/oriente-maya/$destino.$categoria.index.tsx",
  "src/routes/oriente-maya/$destino.$categoria.tsx",
  "src/routes/oriente-maya/$destino.index.tsx",
  "src/routes/oriente-maya/$destino.tsx",
  "src/routes/oriente-maya/index.tsx",
  "src/routes/p.$slug.tsx",
  "src/routes/preview.$token.tsx",
  "src/routes/preview/composition.$token.tsx",
  "src/routes/producto.$slug.tsx",
  "src/routes/promociones.tsx",
  "src/routes/privacidad.tsx",
  "src/routes/que-hacer.tsx",
  "src/routes/resenar.negocio.$slug.tsx",
  "src/routes/reset-password.tsx",
  "src/routes/restaurantes.tsx",
  "src/routes/robots[.]txt.ts",
  "src/routes/sitemap[.]xml.ts",
  "src/routes/terminos.tsx",
  "src/routes/unsubscribe.tsx",
  "src/routes/viaje-compartido.$token.tsx",
  "src/routes/viajero.$handle.tsx",
];

/* ------------------------------------------------------------------ *
 * Fecha común de revisión — se actualiza cuando el Founder aprueba
 * una nueva versión oficial del inventario.
 * ------------------------------------------------------------------ */

const DEFAULT_LAST_REVIEWED = "2026-07-05";
const DEFAULT_PRODUCT_VERSION = "v2.5-SSC-01";

/* ------------------------------------------------------------------ *
 * API pública del inventario.
 * ------------------------------------------------------------------ */

function buildEntry(routeId: string): RouteInventoryEntry {
  const category = inferCategory(routeId);
  const d = inferDefaults(routeId, category);
  const ov = OVERRIDES[routeId] ?? {};
  return {
    routeId,
    publicPath: toPublicPath(routeId),
    category: ov.category ?? category,
    maturity: ov.maturity ?? d.maturity,
    businessPriority: ov.businessPriority ?? d.priority,
    migrationStatus: ov.migrationStatus ?? d.migration,
    functionalOwner: ov.functionalOwner ?? d.owner,
    dependencies: ov.dependencies ?? [],
    lastReviewed: DEFAULT_LAST_REVIEWED,
    productVersion: DEFAULT_PRODUCT_VERSION,
    notes: ov.notes,
  };
}

let CACHE: readonly RouteInventoryEntry[] | null = null;

export function getRouteInventory(): readonly RouteInventoryEntry[] {
  if (CACHE) return CACHE;
  CACHE = SCANNED_ROUTE_FILES.filter(
    (r) => r !== "src/routes/__root.tsx" && !r.endsWith("/route.tsx"),
  ).map(buildEntry);
  return CACHE;
}

export function getRouteInventoryByCategory(): Record<RouteCategory, RouteInventoryEntry[]> {
  const out: Record<RouteCategory, RouteInventoryEntry[]> = {
    studio: [],
    "dynamic-template": [],
    technical: [],
    system: [],
    "pending-migration": [],
  };
  for (const e of getRouteInventory()) out[e.category].push(e);
  return out;
}

/**
 * Asserción de cobertura — se ejecuta en CI. Falla si aparece una
 * ruta en `src/routes/` que no está en `SCANNED_ROUTE_FILES`, o si
 * un entry carece de metadatos obligatorios.
 */
export function assertRouteInventoryCoverage(actualRouteFiles: readonly string[]): void {
  const inventory = new Set(SCANNED_ROUTE_FILES);
  const missing: string[] = [];
  for (const f of actualRouteFiles) {
    if (!inventory.has(f)) missing.push(f);
  }
  const stale: string[] = [];
  const actualSet = new Set(actualRouteFiles);
  for (const f of SCANNED_ROUTE_FILES) {
    if (!actualSet.has(f)) stale.push(f);
  }
  const problems: string[] = [];
  if (missing.length) {
    problems.push(
      `Rutas nuevas SIN entry en el Route Inventory (agrégalas a SCANNED_ROUTE_FILES):\n  - ${missing.join("\n  - ")}`,
    );
  }
  if (stale.length) {
    problems.push(
      `Rutas en el inventario que ya no existen en src/routes/ (retíralas):\n  - ${stale.join("\n  - ")}`,
    );
  }
  for (const e of getRouteInventory()) {
    if (!e.functionalOwner || !e.lastReviewed || !e.productVersion) {
      problems.push(`Entry incompleto: ${e.routeId}`);
    }
  }
  if (problems.length) {
    throw new Error(
      "Route Inventory coverage failed:\n\n" +
        problems.join("\n\n") +
        "\n\nRegla: Route Inventory Rule (DOS) — toda ruta debe existir con metadatos completos.",
    );
  }
}
