# Armonización Premium de listados territoriales de empresas

## Diagnóstico confirmado

La ruta `/oriente-maya/:destino/:categoria` tiene dos caminos visuales:

- Las categorías asociadas en el CMS a una familia reconocida —como Hoteles y Restaurantes— usan `ListingPremiumSurfaceFromDTO` y la plantilla territorial Premium aprobada.
- Las demás categorías —como Cenotes— caen a un render anterior de `TourismListingSurface`, con hero, filtros, tarjetas, mapa y acciones distintos.

Esta bifurcación explica por qué parecen sitios diferentes. Además, el camino anterior abre una vista rápida y añade una banda de Mi Viaje diferente, mientras el listado Premium navega directamente al perfil completo.

## Scope Gate

**Cambio autorizado:** corregir los listados territoriales de categorías empresariales para que todos adopten el mismo formato aprobado que Hoteles del Oriente Maya.

**Superficies editables:**

- Ruta territorial de categoría `/oriente-maya/:destino/:categoria`.
- Autoridad existente del listado territorial Premium, únicamente para admitir categorías empresariales genéricas por configuración.
- Pruebas de contrato y evidencia visual de esta ruta.

**Fuera de alcance:** perfiles de empresa, fichas de producto, Home, listados globales, CMS editorial, pagos, reservaciones, navegación principal y publicación.

## Implementación

1. Evolucionar la plantilla territorial Premium existente para aceptar una categoría empresarial genérica sin crear otra superficie ni otra tarjeta.
2. Proyectar las empresas reales del CMS al mismo formato visual de Hoteles: introducción editorial, banda de Alux, búsqueda y filtros compactos, tarjetas Premium y mapa sincronizado.
3. Conservar el título, categoría, destino, fotografías, ubicación y enlaces canónicos propios de cada categoría; no reutilizar textos ni imágenes de Hoteles.
4. Retirar el camino visual anterior y la vista rápida exclusiva de categorías no reconocidas; las tarjetas abrirán el perfil empresarial territorial completo, igual que en Hoteles.
5. Mantener la sección existente “Sigue descubriendo” después del listado cuando tenga contenido real.
6. Añadir una prueba que impida que una categoría empresarial vuelva a caer en un render distinto.

## Preservation Gate

Debe permanecer sin cambios:

- `PublicShell`, header, footer, selector territorial y breadcrumb.
- Marca, tipografía, colores, iconos oficiales y diseño Premium aprobado.
- Datos, medios, taxonomía y visibilidad administrados desde CMS.
- Alux, Mi Viaje, favoritos, mapa, ubicación y navegación canónica.
- Formato vigente de Hoteles, Restaurantes, Experiencias, Casas de vacaciones, Eventos, Lugares y Qué hacer.
- SEO y JSON-LD territorial actuales.

## Validación

- Comparar `/hoteles?destino=valladolid` contra `/oriente-maya/valladolid/cenotes` y otra categoría empresarial real.
- Revisar plantilla completa en 1440, 834, 430 y 390 px: header, breadcrumb, introducción, Alux, filtros, tarjetas, mapa, relacionados y footer.
- Confirmar un solo H1, ausencia de desbordamiento y navegación correcta al perfil empresarial.
- Ejecutar pruebas contractuales dirigidas, comprobación de tipos, Route Inventory y controles de gobernanza aplicables.
- No publicar sin autorización expresa del Founder.
