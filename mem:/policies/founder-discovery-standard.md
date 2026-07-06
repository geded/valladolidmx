---
name: Founder Discovery Standard
description: Estándar oficial de listados turísticos post-V3 U-VISUAL; toda categoría nueva se construye por configuración de TourismListingSurface, no por diseño propio.
type: constraint
---
Al cerrar V3 · U-VISUAL, el patrón de listados turísticos queda como estándar oficial del producto.

Toda categoría — presente o futura (museos, spas, tours, guías, transporte, bodas, naturaleza, gastronomía, compras y las que se agreguen) — DEBE reutilizar el mismo sistema:

- Superficie oficial `TourismListingSurface` (`src/components/surfaces/TourismListingSurface.tsx`).
- Tourism Card oficial (Regla Single Card Family).
- Tourist Hero (`vmx.experience.hero`, variantes/capabilities oficiales).
- Filtros oficiales (facets del surface, client-side).
- Contexto territorial (Context Engine + chip "Explorando en {Destino}").
- Institutional Badges oficiales.
- Adapters `→ TourismCardVM` en `src/lib/experience-builder/adapters/tourism-listing-adapters.ts`.

**Prohibido** crear diseños de listado por categoría. Se rechaza cualquier PR con un listado propio salvo justificación funcional documentada y aprobada explícitamente por el Founder.

**Why:** experiencia de descubrimiento consistente, deuda visual mínima, y nuevas categorías construidas por configuración/composición en lugar de nuevos desarrollos.
**How to apply:** ante una categoría nueva, componer `TourismListingSurface` con un adapter existente (o agregar uno nuevo en el archivo canónico). Todo lo demás debe salir de la Biblioteca Oficial.