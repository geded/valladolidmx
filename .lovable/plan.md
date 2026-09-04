# Auditoría read-only — compactación móvil de BreadcrumbTerritorial

Alcance: HEAD de `integration/lovable-valladolidmx`. Sin cambios de código, datos ni configuración.

## Hallazgo estructural previo (condiciona todo)

Existen **dos** implementaciones de breadcrumb público:

1. `BreadcrumbTerritorial` (`src/components/layout/BreadcrumbTerritorial.tsx`) — la única que soporta `compactOnMobile` / `mobileAnchorIndex`, expuesta por `PublicShell` como `compactCrumbsOnMobile`. Añade la casita automáticamente antes de las migas.
2. `PremiumTerritorialBreadcrumb` (`src/components/premium/PremiumTerritorialBreadcrumb.tsx`) — sin compactación; en móvil es una única línea con **scroll horizontal** (`overflow-x-auto`, `min-w-max`). La usan `DestinationPremiumSurface` (línea 136), `PlacePremiumSurface` (línea 160, hoy desactivada con `showBreadcrumbs={false}`) y los previews `/lovable/g4-hotel|g4-restaurant|g4-experience|g8p2-tour|g8-r1f1c-*`.

Consecuencia: la prop compartida sólo cubre superficies cuyo breadcrumb lo emite `PublicShell`. Las que dibujan `PremiumTerritorialBreadcrumb` no pueden compactarse sin tocar ese segundo componente.

Hoy `compactCrumbsOnMobile` sólo está activo en dos archivos: `src/routes/oriente-maya/$destino.lugares.$slug.tsx:119` y `src/routes/lovable/g4-place-premium-preview.tsx:84`.

## Matriz

Profundidad = niveles visibles en móvil incluida la casita. `useContextCrumbs` implica que las migas provienen del Context Engine (`ancestors + current`).

| # | Ruta / componente | Profundidad móvil | ¿Compacta hoy? | Riesgo 390/430px | Recomendación | mobileAnchorIndex | ¿Sólo con la prop compartida? |
|---|---|---|---|---|---|---|---|
| 1 | `/` — `src/routes/index.tsx` (`PublicShell variant="hero"`, sin `crumbs`) | 0 (no renderiza breadcrumb) | No | Ninguno | No aplica | — | — |
| 2 | `/oriente-maya` — `src/routes/oriente-maya/index.tsx` | 2 (casita > Oriente Maya) | No | Correcto | Conservar completo | — | — |
| 3 | Micrositio destino `/oriente-maya/$destino` — `$destino.index.tsx` (hero + `useContextCrumbs`) | 3 (casita > Oriente Maya > Valladolid) | No | Correcto (cabe en 390) | Conservar completo | — | — |
| 4 | Listado territorial `/oriente-maya/$destino/$categoria` — `$destino.$categoria.index.tsx` (`buildBreadcrumbs`, `includeHome:false`) | 4 (casita > Oriente Maya > Destino > Categoría) | No | Extenso; con categorías largas ("Casas de vacaciones") hay scroll horizontal | **Activar compactación** | `crumbs.length - 2` (deja Destino visible; el default `-3` dejaría Oriente Maya) | Sí |
| 5 | `/oriente-maya/$destino/lugares` — `$destino.lugares.index.tsx` (`useContextCrumbs`) | 4 (casita > Oriente Maya > Destino > Lugares y sitios de interés) | No | Extenso / scroll (hoja larga) | **Activar compactación** | `crumbs.length - 2` | Sí |
| 6 | `/lugares` — `lugares.index.tsx` | 2 sin `?destino`; 3 con destino | No | Correcto | Conservar completo | — | — |
| 7 | `/hoteles` — `hoteles.tsx` | 2 sin destino; 4 con `?destino` (casita > Oriente Maya > Destino > Hoteles) | No | Correcto sin destino; extenso con destino | Activar compactación (rinde sólo con `?destino`; inocuo sin él) | `crumbs.length - 2` | Sí |
| 8 | `/restaurantes` — `restaurantes.tsx` | igual a #7 | No | igual a #7 | igual a #7 | `crumbs.length - 2` | Sí |
| 9 | `/casas-de-vacaciones` — `casas-de-vacaciones.tsx` | igual a #7, hoja más larga | No | Extenso con destino; alto riesgo de scroll | Activar compactación | `crumbs.length - 2` | Sí |
| 10 | `/eventos` — `eventos.index.tsx` | igual a #7 | No | igual a #7 | Activar compactación | `crumbs.length - 2` | Sí |
| 11 | `/experiencias` — `experiencias.tsx` | igual a #7 (con `?tema` puede usar migas legacy) | No | Extenso con destino o tema | Activar compactación | `crumbs.length - 2` | Sí |
| 12 | Perfil de empresa (hotel / restaurante / casa) `/oriente-maya/$destino/$categoria/$empresa` — `BusinessSurface.tsx:425` (`PublicShell` + `useContextCrumbs`) | 5 (casita > Oriente Maya > Destino > Categoría > Nombre) | No | **Crítico**: segunda línea o scroll en 390 y 430 | **Activar compactación** | default (`length - 3` = Destino) correcto | Sí — una prop en `BusinessSurface` |
| 13 | Perfil de lugar `/oriente-maya/$destino/lugares/$slug` | 5 → compactado a casita > menú > Destino > Nombre | **Sí** | Correcto (validado) | Sin cambio | default | — |
| 14 | Perfil de evento `/eventos/$slug` — `EventPremiumSurface.tsx:96` | 5 (casita > Oriente Maya > Destino > Eventos > Título) | No | **Crítico**: título largo + 4 niveles → scroll/2ª línea | **Activar compactación** | default (`length - 3` = Destino) | Sí |
| 15 | Perfil de producto/experiencia `/producto/$slug` — `ProductSurface.tsx:159` | 4 (casita > Catálogo > Empresa > Producto) | No | Extenso; nombres largos truncan | Activar compactación | default | Sí |
| 16 | Superficie premium de destino (`DestinationPremiumSurface`, vía composition-renderer) | Breadcrumb propio adicional dentro del shell | No | Doble breadcrumb potencial + scroll horizontal en móvil | Revisar duplicidad; **no** cubierto por la prop | — | **No** (requiere tocar `PremiumTerritorialBreadcrumb`) |
| 17 | `/lovable/g4-place-premium-preview` | 4 compactado | **Sí** | Correcto | Sin cambio | default | — |
| 18 | `/lovable/g4-hotel-premium-preview`, `g4-restaurant-premium-preview`, `g4-experience-premium-preview`, `g8p2-tour-premium-preview`, `g8-r1f1c-*` | 4–5 con `PremiumTerritorialBreadcrumb` | No | Scroll horizontal en móvil | Alinear al patrón compacto | — | **No** (segundo componente) |
| 19 | Previews de listados `/lovable/g4-*-listing-premium-preview`, `territorial-listing-premium-preview` | 2–4 vía `PublicShell` | No | Bajo/medio | Espejar la decisión del listado real | `crumbs.length - 2` | Sí |
| 20 | Páginas institucionales (`/blog`, `/contacto`, `/promociones`, `/que-hacer`, `/empresas`, `/mapa`…) | 1–2 | No | Correcto | No aplica | — | — |

## Conclusión

Requieren cambio (activar `compactCrumbsOnMobile`, sin tocar layout, datos ni navegación):

- Prioridad alta (rompen en 390/430): perfil de empresa (`BusinessSurface`), perfil de evento (`EventPremiumSurface`), listado territorial `/oriente-maya/$destino/$categoria`, listado `/oriente-maya/$destino/lugares`.
- Prioridad media: listados globales con `?destino` (`hoteles`, `restaurantes`, `casas-de-vacaciones`, `eventos`, `experiencias`) y perfil de producto; la compactación sólo se percibe cuando hay destino, y es inocua cuando no lo hay.
- Sin cambio: Home (sin breadcrumb), `/oriente-maya`, micrositio de destino (3 niveles caben), `/lugares` sin destino, páginas institucionales, y las dos superficies ya compactadas.
- Fuera del alcance de la prop compartida: todo lo que dibuja `PremiumTerritorialBreadcrumb` (superficie premium de destino y previews de hotel/restaurante/experiencia/tour/artículo). Alinear esas superficies exige una decisión aparte: o migran a `BreadcrumbTerritorial`, o `PremiumTerritorialBreadcrumb` recibe la misma capacidad compacta.

Puntos a confirmar antes de implementar:

1. `mobileAnchorIndex` por defecto (`length - 3`) sólo deja el destino visible en cadenas de 5 niveles. En listados de 4 niveles hay que pasar `crumbs.length - 2` explícitamente.
2. En `/oriente-maya/$destino` conviene verificar visualmente si `PublicShell` y `DestinationPremiumSurface` están emitiendo dos breadcrumbs simultáneos.
3. En listados globales sin `?destino` la cadena tiene 2 niveles; con la compactación activa el menú intermedio queda vacío — comprobar que el componente lo oculta en ese caso.

Nada se ha modificado; esto es únicamente el informe solicitado.
