# Lote 3C · Corrección final — Autoridad CMS de familias de listado

Rama: `integration/lovable-valladolidmx`. Sin ramas, PR, fusiones ni pagos.

## 1. Autoridad única

- `business_categories.listing_family_key` es la única fuente que declara a qué
  familia de listado pertenece una categoría.
- `getListingFamilyTaxonomy` devuelve ahora `{ available, taxonomy }`. Si la
  lectura del CMS respondió, su declaración es autoritativa **aunque esté
  vacía**; el contrato de código sólo actúa como recovery cuando la lectura
  falla (`available: false`).
- `buildPublicListing` dejó de tratar una lista vacía como "sin declaración":
  `input.categorySlugs ?? contract.categorySlugs`. Un fallback ya no puede
  inventar membresía de familia.

## 2. Consumo público hardcodeado retirado

Eliminadas las constantes `CATEGORY_SLUGS` de:

- `src/routes/casas-de-vacaciones.tsx`
- `src/routes/hoteles.tsx`
- `src/routes/restaurantes.tsx`
- `src/routes/experiencias.tsx`

## 3. Ficha de empresa

- La lectura de detalle expone `category_family_key` (join a
  `business_categories.listing_family_key`).
- `BusinessSurfaceContractBoundary` elige la superficie vertical
  (hotel / restaurante / casa de vacaciones) por la familia declarada en CMS;
  la heurística por slug sólo se conserva cuando el CMS no declara familia.

## 4. Verificación

- Typecheck `bunx tsgo --noEmit`: limpio.
- Build `bun run build`: correcto.
- Suite `bun test`: 761/761.
- Listados públicos 200 y con contenido: `/casas-de-vacaciones` (Casa Colonial
  Sisal y Villa Amarilla Izamal visibles), `/hoteles`, `/restaurantes`,
  `/experiencias`, `/rutas`.

## 5. Reversibilidad

Cambios sólo de lectura y presentación; ninguna migración nueva. Revertir los
archivos citados restaura el comportamiento anterior sin tocar datos.
