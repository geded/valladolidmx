# Iniciativa · Single Studio Consolidation + Destination OS Foundations (SSC-01)

Consolidar el Experience Builder como único punto de administración visual de ValladolidMX **y** sentar las bases del **Destination Operating System (DOS)** vía el Route Inventory como inventario oficial del producto. Cero infra nueva. Cero cambios a rutas públicas, SEO o navegación. Aditivo por construcción.

---

## Paso 1 · Previews de plantillas dinámicas (SSC-01·P1)

**Objetivo:** al abrir en el Studio las plantillas `Destino`, `Categoría`, `Empresa`, `Producto` y `Evento`, ver un render real con una instancia demo en lugar de "no disponible".

### Alcance

- Ampliar `src/lib/experience-builder/preview-registry` con 5 proveedores oficiales que resuelven una instancia demo vía `public-reads` (RLS `TO anon`):
  - Destino → Valladolid
  - Categoría → Restaurantes en Valladolid
  - Empresa → primera empresa verificada publicada
  - Producto → primer producto publicado
  - Evento → próximo evento publicado
- Selector "Vista previa con datos de…" en el topbar del Studio cuando `page_type ∈ {destination, category, business, product, event}`, con la instancia demo como default.
- Fallback conservador: si el proveedor falla, se preserva la pantalla actual (sin regresión).

### Fuera de alcance

- Editar contenido de las instancias (vive en CMS).
- Cambiar el modelo de superficies dinámicas.
- Rutas públicas, SEO o navegación.

### Verificación (DoD)

- Typecheck + build verdes.
- Smoke visual: cada plantilla renderiza el preview real en `/cms/experience-builder`.
- Auditoría no-regresión: `/oriente-maya/valladolid`, `/empresas`, `/eventos`, `/producto/*` intactos.
- Demo Pack (5 URLs Studio + capturas antes/después).
- Completion Report en `docs/blueprint/`.

### Rollback

Revertir el archivo del preview-registry ampliado.

---

## Paso 2 · Route Inventory as Product Inventory (SSC-01·P2)

**Objetivo:** que el Panel de Páginas del Studio muestre TODAS las rutas del sitio clasificadas y con **metadatos de evolución del producto**, sirviendo como fuente oficial del DOS. Sin migrar contenido todavía.

### Modelo de metadatos por ruta

```ts
RouteInventoryEntry {
  routeId: string              // filesystem-canonical
  publicPath: string           // ej. "/oriente-maya/$destino"
  category: 'studio' | 'dynamic-template' | 'technical'
          | 'system' | 'pending-migration'
  maturity: 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6'
  businessPriority: 'critical' | 'high' | 'medium' | 'low'
  migrationStatus: 'native-studio' | 'template-cms'
                 | 'planned' | 'in-progress'
                 | 'blocked' | 'technical-exception' | 'deprecated'
  functionalOwner: string       // "Founder" | "Product" | "CMS" | ...
  dependencies: string[]        // otros routeId + capabilities
  lastReviewed: string          // ISO date
  productVersion: string        // ej. "v2.5" — versión en que se incorporó
  notes?: string
}
```

### Alcance

- Crear **Route Inventory** declarativo (`src/lib/experience-builder/route-inventory.ts`) con un entry por cada archivo bajo `src/routes/`, incluyendo los metadatos completos.
- Categorías oficiales:
  - `studio` — administrable desde EB (composiciones `page_compositions`).
  - `dynamic-template` — plantilla + instancias CMS.
  - `technical` — excepción (auth, callbacks OAuth, reset, offline, error, `/preview/*`).
  - `system` — infraestructura no editorial (`/api/*`, sitemap, health, webhooks).
  - `pending-migration` — pública editorial aún fuera del EB.
- Ampliar `PagesPanel` con tabs: **Studio · Plantillas · Pendientes · Técnicas · Sistema** + columnas Madurez, Prioridad, Estado, Propietario, Última revisión, Versión.
- Vista "Roadmap del producto" derivada del inventario (filtros por prioridad × madurez × estado) — sólo lectura en P2, editable en olas futuras.
- Regla de gobernanza en CI: `scripts/route-inventory-coverage.ts` — falla si aparece una ruta en `src/routes/` sin entry en el inventario o con campos obligatorios vacíos.
- **Matriz oficial**: `docs/blueprint/15.10.4d-ROUTE-INVENTORY-MATRIX-v1.0.md` con las 5 categorías, cobertura, madurez agregada y roadmap derivado.

### Fuera de alcance (olas futuras)

- Migrar rutas `pending-migration` al EB (una historia por ruta).
- Edición de metadatos desde UI (por ahora se editan en el manifiesto declarativo).
- Persistir el inventario en BD (aditivo, si el DOS lo requiere después).

### Verificación (DoD)

- Typecheck + build verdes.
- `bun run scripts/route-inventory-coverage.ts` → 100% cobertura + metadatos obligatorios completos.
- Smoke: Studio muestra los 5 tabs, columnas de evolución y vista Roadmap.
- Matriz revisada por Founder.
- Completion Report + Demo Pack.

### Rollback

Feature flag `VITE_STUDIO_INVENTORY=off` oculta tabs nuevos; el resto del EB funciona igual.

---

## Directiva permanente (post-SSC-01)

Incorporada a memoria de proyecto:

> **Single Studio Coverage Rule** — Toda ruta pública nueva (a) nace como composición en el EB, o (b) declara excepción técnica/sistema en el Route Inventory con justificación. Prohibido crear páginas públicas editoriales fuera del EB.
>
> **Route Inventory Rule (DOS)** — Toda ruta debe existir en el Route Inventory con metadatos completos (categoría, madurez, prioridad, estado, propietario, dependencias, última revisión, versión). Es la fuente oficial para planificar olas, priorizar QA, medir avance y auditar cobertura.
>
> **DOS Reuse Rule** — Toda nueva capacidad se integra al DOS reutilizando Context Engine, Navigation Contract, Experience Builder, Block Library y Design System. Prohibidos motores paralelos.

Enforcement automático vía `assertRouteInventoryCoverage()` en CI.

---

## Alineación con la visión Destination Operating System

El Route Inventory se convierte en la primera capa operativa del DOS: fuente única para roadmap, cobertura, madurez y gobernanza. En olas futuras (no incluidas aquí) podrá:

- Cruzarse con `context-registry`, `navigation-registry` y `page-kind-registry` para reporting integrado.
- Alimentar Alux con conocimiento de qué superficies existen, su madurez y prioridad.
- Exportarse a un dashboard interno de evolución del producto.

Nada de eso se implementa en SSC-01 — pero el modelo de metadatos ya lo habilita sin refactor.

---

## Detalles técnicos

- **Sin infraestructura nueva.** Reutiliza `preview-registry`, `PagesPanel`, `page_compositions`, `public-reads`, tabs shadcn, sistema de rutas de TanStack.
- **Sin migraciones de BD.**
- **Sin cambios en rutas, `head()`, `sitemap.xml` ni canonicals.**
- **Orden estricto:** P1 cierra con Completion Report antes de tocar P2.

## Entregables finales

1. Preview real de 5 plantillas dinámicas en el Studio.
2. Panel de Páginas con inventario completo + metadatos de evolución (5 tabs + vista Roadmap).
3. Matriz oficial de rutas + roadmap derivado del inventario.
4. Regla CI que impide regresión de cobertura o metadatos incompletos.
5. Dos Completion Reports + Demo Pack por paso.
6. Bases del DOS sentadas sin motores paralelos ni deuda técnica.  
==========================================================
  VISIÓN DE EVOLUCIÓN · DESTINATION OPERATING SYSTEM
  ==========================================================
  La presente iniciativa establece únicamente las bases del Destination Operating System (DOS).
  En futuras versiones, el Route Inventory evolucionará gradualmente desde un inventario de rutas hacia un Catálogo Oficial del Producto.
  Esta evolución podrá incorporar metadatos adicionales como capacidades consumidas, objetivos de negocio, relaciones entre módulos y otras capacidades de gobernanza.
  Estos elementos NO forman parte del alcance de SSC-01.
  Quedan registrados únicamente como dirección estratégica para la evolución del producto, manteniendo el principio de crecimiento incremental y sin modificar el alcance aprobado de esta iniciativa.