# Lote 3B · CMS-first (Marca · Destinos · Distintivos) — v1.0

Rama: `integration/lovable-valladolidmx`
HEAD inicial: `10f346d0eb73744569cab0d90451a2da1ab70930`
HEAD final: `10e923f3a48ca78a3bd13e57e9397f2bd69054ef`
Sin ramas nuevas, sin PR, sin deploy.

## 1. Distintivos institucionales — fuente única

- `institutional-badges.registry.ts` es ahora la **única** autoridad:
  `restrictedSlugs: ["valladolid"]` para `despierta-en-valladolid`;
  `pueblo-magico` ya lo tenía (Valladolid, Izamal, Espita).
- Nuevos helpers: `buildDestinationBadgeItems(slug)` e `isPuebloMagicoDestination(slug)`.
- `destination-premium-content.ts`: `PUEBLOS_MAGICOS` / `isPuebloMagico` pasan a ser
  alias delegados al registry (sin lista propia).
- `destinationToBadgeItems()` ya no contiene condicionales por slug.

Validación en navegador (`/oriente-maya/...`):
Valladolid ✅ Pueblo Mágico · Izamal ✅ · Espita ✅ · **Ek Balam sin distintivo propio**
(las apariciones en su página corresponden a tarjetas de destinos cercanos).

## 2. Fin de `DESTINOS_MOCK` en el camino público

Nuevo módulo `src/lib/destinations/destination-labels.ts`
(`publishedDestinationsQueryOptions`, `usePublishedDestinations`,
`useDestinationLabel`, `humanizeDestinationSlug`).

Superficies migradas a lectura CMS real:
`/hoteles`, `/restaurantes`, `/experiencias`, `/eventos`, `/lugares`,
`/casas-de-vacaciones`, `/oriente-maya/$destino/lugares`, `/oriente-maya/$destino`,
`DestinationSurface`, `RegionSurface`, `DestinosSection` (Home) y `HeroSearchPill`.

- Precarga en el `loader` (SSR) para que el nombre correcto aparezca sin parpadeo.
- Fallback = slug humanizado; **nunca** un nombre inventado.
- Estados vacíos explícitos ("Aún no hay destinos publicados para esta región").
- El fixture **no se borra**: queda disponible para rollback y sólo se consume desde
  `preview-registry.tsx` (previsualización interna del Experience Builder).

Verificación breadcrumb con datos reales: Valladolid, Izamal, Espita, Ek Balam ✅.

## 3. Configuración de Marca administrable

- `src/lib/brand/brand-settings.functions.ts` — clave `platform_settings.brand.identity`
  (`is_public = true`), lectura pública fail-safe, escritura sólo `admin`/`super_admin`.
- Predeterminados = valores actuales de `ACTIVE_BRAND` → guardar sin cambios no altera
  ninguna superficie. `logoSrc` sólo admite rutas internas; **no se creó ningún logo ni
  activo Alux nuevo**.
- Pantalla `/cms/marca` (registrada en el Route Inventory).

Prueba de persistencia y reversión (sesión admin real):
`tagline` → "DEMO LOTE 3B" (persistido en BD) → restaurado a
"Oriente Maya de Yucatán". Estado final idéntico al inicial.

## 4. Home

La composición Home publicada (`vmx.home.premium-g4`) ya es administrable por `config`
con fallback fail-closed al fixture aprobado. **No se sembró contenido ni se publicó
nada**: materializar el copy en BD habría implicado riesgo de cambio visual, expresamente
prohibido por el control (2). Se documenta como decisión, no como omisión.

## 5. Verificación

- Typecheck: limpio.
- Build: OK.
- Pruebas: 756/756.
- Sin publicaciones automáticas; sin datos reales alterados.

## 6. Deuda preexistente detectada (no tocada)

`scripts/route-inventory-coverage.ts` reporta 3 rutas sin metadatos, anteriores a este lote:
`lovable/g4-destination-listing-premium-preview.tsx`,
`lovable/g4-experience-listing-premium-preview.tsx`,
`oriente-maya/destinos.tsx`.
