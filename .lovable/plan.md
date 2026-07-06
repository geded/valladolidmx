## V3 · Dynamic Listings Hardening — Founder Discovery Standard

**Estado:** ✅ IMPLEMENTADO (typecheck limpio, 8 rutas migradas; pendiente validación visual del Founder). Ver `docs/blueprint/16.09-U-VISUAL-V3-DYNAMIC-LISTINGS-COMPLETION-REPORT-v1.0.md`. Preview interno omitido: las 8 rutas oficiales son la validación directa.

Unificar los 8 listados de descubrimiento en un mismo sistema visual y de UX, sin tocar rutas, contratos, tipos internos ni backend. Cero regresiones; cero motores paralelos.

### Founder Discovery Principle (contrato de UX)
Cada listado debe responder above-the-fold: ¿qué puedo descubrir aquí? · ¿cuál es la mejor opción para mí? · ¿qué hay cerca? · ¿por qué es diferente? · ¿cuál abro ahora? Hero + TourismCard + filtros + contexto territorial + (V4) mapa forman **un solo sistema**, no piezas sueltas.

---

### 1. Nueva superficie oficial `TourismListingSurface`

Archivo: `src/components/surfaces/TourismListingSurface.tsx`. Reutiliza infraestructura existente (Tourist Hero cinematic, TourismCard, Institutional Badges, kit tokens DSL). Responsabilidades:

- **Hero cinematic** (`vmx.experience.hero`, variant `cinematic`, eyebrow `script`, `overlapHeader`) alimentado por props `hero: { eyebrow, title, subtitle, mediaUrl, badges }`.
- **Sticky filter bar** con facets declarativos (`facets: FacetDef[]`) — destino, subtipo, precio, fecha, badges institucionales. Filtro cliente-side sobre el array recibido; sin nueva query server. Persistencia en `searchParams` de la ruta (opt-in por ruta).
- **Contexto territorial**: consume `useContextCrumbs`; muestra el chip "Explorando en {Destino}" cuando hay `destinationSlug` heredado.
- **Grid TourismCard** con `columns` responsive (1/2/3), skeleton coherente y `emptyMessage` accionable ("Explorar otros destinos").
- **Slot `mapSlot`** reservado para V4 (`vmx.experience.map`) — hoy renderiza null; queda como capability activable por config.
- **Institutional Badges strip** encima del grid cuando el destino/categoría tiene badges (Pueblo Mágico, Oriente Maya, Despierta en Valladolid).

Cero lógica de negocio nueva: todo se compone con bloques ya oficiales.

### 2. Adapters `→ TourismCardVM`

En `src/lib/experience-builder/adapters/tourism-listing-adapters.ts`:

- `businessToTourismCard(MarketplaceBusinessCard, destinoLabel?) → TourismCardVM`
- `promotionToTourismCard(PromotionCard, ...)`
- `eventToTourismCard(PublicEventCard, ...)`
- `destinationToTourismCard(Destination, ...)` (reuso en `/que-hacer`)

Cada adapter deriva `entityKind`, `eyebrow`, `location`, `institutionalBadges`, `href` canónico (via `resolveCanonicalPath`), rating/precio cuando existan. Sin inventar datos: campos no disponibles → `null` y capabilities los ocultan.

### 3. Migración de las 8 rutas

Todas las rutas mantienen su loader y contratos; sólo cambia el render:

| Ruta | Fuente | Notas |
|---|---|---|
| `/hoteles` | `listMarketplaceBusinesses` filtrado | Ya tiene filtro `?destino`; facet destino. Hero: "Descansa en el Oriente Maya". |
| `/restaurantes` | idem | Facet destino + cocina si existe. |
| `/experiencias` | idem | Facet destino + tipo. |
| `/casas-de-vacaciones` | idem | Facet destino + capacidad. |
| `/eventos` | `listPublishedEvents` | Facet mes/destino; muestra `dateLabel`. |
| `/que-hacer` | destinos + eventos | Sección multi-entidad, usa `mixed`. |
| `/promociones` | `listPromotions` (composiciones) | Facet destino/vigencia. |
| `/oriente-maya/:destino/:categoria` | resolver + businesses | Hero deriva de destino+categoría (media del destino si existe); ancla `#descubre` intacta. |

Regla: si un filtro no tiene datos para poblarse, no se renderiza — se activa progresivamente conforme los feeds maduran.

### 4. Preview y validación visual

- Ruta interna `src/routes/lovable/tourism-listing-preview.tsx` con las 8 configuraciones lado a lado (mock data), para revisión Founder en un solo lugar.
- `docs/blueprint/16.09-U-VISUAL-V3-DYNAMIC-LISTINGS-COMPLETION-REPORT-v1.0.md` con: matriz de reutilización, capabilities usadas, comparativas antes/después por ruta, typecheck limpio, notas de retro-compatibilidad y ficha de madurez L4→L5.

### 5. Founder Discovery Standard (política)

Al cerrar V3, guardar `mem://policies/founder-discovery-standard.md`: toda categoría nueva (museos, spas, tours, guías, transporte, bodas, naturaleza, gastronomía, compras…) se construye sólo por **configuración** de `TourismListingSurface` + adapters existentes. Cualquier listado con diseño propio requiere autorización explícita del Founder.

Actualizar `mem://index.md` (Core) con la regla resumida y `.lovable/plan.md` marcando V3 como entregado tras validación.

### Fuera de alcance (queda para V4)
- Bloque `vmx.experience.map`, clusters Airbnb-style, capability `distance` en Alux, badge de distancia real (hoy sólo el placeholder de UI si `location.distanceKm` viene del feed).
- Cambios en tipos `MarketplaceBusinessCard*` o rutas legacy `/marketplace/*` (E3.3).
- Nuevos servidores/queries; nuevos motores editoriales.

### DoD
Typecheck `bunx tsgo --noEmit` limpio · 8 rutas rendereando `TourismListingSurface` · preview `/lovable/tourism-listing-preview` navegable · Completion Report con comparativas · Founder Discovery Standard registrado en memoria · aprobación Founder antes de iniciar V4.
