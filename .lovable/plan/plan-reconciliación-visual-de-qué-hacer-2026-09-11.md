# Plan · Reconciliación visual de “Qué hacer”

## Alcance autorizado
- Mejorar únicamente la presentación responsive de la superficie existente `/que-hacer` y su estado territorial por destino.
- Mantener como autoridad `ListingPremiumSurfaceFromDTO → TerritorialListingReviewSurface` (`vmx.listing.premium-g5`).
- No crear plantillas, páginas, cards, mapas, filtros, Alux ni sistemas paralelos.

## Implementación
1. Capturar la línea base completa de `/que-hacer` en 1440, 834, 430 y 390 px, incluyendo estados con y sin media.
2. Ajustar dentro de `TerritorialListingReviewSurface` el perfil existente de `que-hacer`:
   - cabecera más compacta y jerarquía territorial intacta;
   - filtros existentes en barra compacta y desplazable en móvil;
   - resultados mediante la card Premium compartida ya reconciliada, con imagen canónica o fallback editorial compacto;
   - mapa existente como acompañante secundario en escritorio y vista alternable en tablet/móvil.
3. Compactar la sección existente “Temas” en `src/routes/que-hacer.tsx` sin cambiar contenido, enlaces ni comportamiento.
4. Preservar breadcrumbs/H1 globales y por destino, filtros, favoritos, Mi Viaje, navegación, CMS, datos y el único Alux global.

## Invariantes
- Global: `Inicio > Oriente Maya > Qué hacer` y H1 regional aprobado.
- Entrada territorial: conservar destino activo y breadcrumb completo.
- Sin datos o medios inventados; ausencia de `cover_media` se reporta como Data Readiness.
- Sin cambios en otras familias Premium salvo la reutilización intacta de su card compartida.

## Validación
- Comparativa visual antes/después en 1440, 834, 430 y 390 px.
- Un solo H1, cero overflow horizontal, controles táctiles accesibles y ningún solapamiento.
- Verificar filtros, mapa/puntos, enlaces, favoritos, Mi Viaje y apertura del único Alux global.
- Confirmar cards con media real y fallback compacto sin media.
- Ejecutar typecheck, lint focalizado, pruebas relevantes, build, Route Inventory y controles de gobernanza disponibles.
- No publicar ni desplegar.
