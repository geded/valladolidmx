# Armonía de todas las plantillas, sin reconstruirlas

## Objetivo y alcance confirmado
Aplicar la armonía compacta de la plantilla actual de Destinos a **todas las plantillas públicas**: Inicio, Oriente Maya, destinos, listados, hoteles, restaurantes, casas de vacaciones, empresas, productos, experiencias, eventos, lugares, rutas y landings.

Cada familia mantiene sus propias partes y funciones. Airbnb es referencia de claridad y proporción; la marca, los colores y la tipografía siguen siendo los aprobados de Valladolid.mx.

## Qué se ajusta
- Tarjetas de recomendaciones y secciones relacionadas: fotos proporcionadas, títulos y separaciones compactos, acabados coherentes y acciones sin duplicación visual.
- En celular, filas de recomendaciones cómodas para deslizar y controles que caben sin desbordes. Los resultados de búsqueda conservan su formato y sus filtros: no se convierten todos en carruseles.
- Equilibrio entre fotografías y textos, sin estirar imágenes ni recortar descripciones cuando crezcan.
- Tamaños y separación de enlaces y acciones según dispositivo, sin reducir su facilidad de pulsación ni quitar acciones distintas.

**No se copia la composición completa de Destinos:** no se cambia una portada, galería, mapa o sección característica sólo para que todas las páginas sean idénticas.

## Qué permanece intacto
Orden y visibilidad de secciones, contenido guardado, fotografías y créditos, marca, tipografía, portada de cada familia, menú, pie, breadcrumb, mapas, filtros, paginación, precios, disponibilidad, reservas, compra, compartir, Alux, Mi Viaje, enlaces, SEO y conexiones editoriales.

Sin cambios de datos, permisos, migraciones ni publicación automática. Sin componentes V2, plantillas alternativas o sustituciones de la autoridad existente.

## Ejecución por familias
1. **Inventario y comparación previa.** Confirmar la plantilla vigente y su correspondencia con constructor, vista previa y página pública. Registrar páginas completas antes del cambio y una propuesta visual con contenido existente.
2. **Primera muestra: recomendaciones de hoteles/restaurantes.** Armonizar sólo las tarjetas y secciones relacionadas de una ficha representativa, sin tocar portada, servicios, ubicación ni reservaciones. Presentar antes/después para aceptación antes de extender.
3. **Continuar por lotes pequeños:** otras fichas de alojamiento/empresas; productos y experiencias; eventos/lugares/rutas; listados; región e Inicio; landings. Cada lote conserva su composición propia y requiere comparación y aceptación antes del siguiente.
4. **Verificación final transversal.** Revisar todos los consumidores de cualquier elemento compartido modificado.

## Condiciones de seguridad
- Hay antecedentes de diferencias entre Inicio público y constructor, y algunas vistas previas no tienen paridad acreditada. Se verifican primero: si se confirma una divergencia, se detiene esa familia y se informa; no se compensa con otro diseño.
- No aplicar cambios generales a todos los estilos de la plataforma. La mejora queda delimitada a presentación dentro de las autoridades aprobadas.
- Una familia sin evidencia comparable completa no se modifica visualmente.

## Comprobaciones y entrega por lote
- Comparación de la plantilla completa en **1440, 834, 430 y 390 px**; añadir 360 px para acciones compactas.
- Probar textos largos, medios existentes y ausencia de medios con el comportamiento aprobado.
- Revisar navegación real, fotos, desplazamiento, filtros, mapas y acciones aplicables; verificar también constructor con sesión autorizada.
- Ejecutar pruebas correspondientes, lint focalizado, controles automáticos de compilación, Route Inventory y Governance; distinguir deuda previa de regresiones nuevas.
- **Scope Gate:** archivos y secciones exactos autorizados. **Preservation Gate:** evidencia de que sólo cambió el estilo acordado. Ambos se reportan por separado.
- Entregar URLs, antes/después, controles ejecutados, diferencias pendientes y reversión localizada. Publicar sólo mediante autorización aparte.

## Detalles técnicos
- Referencia visual: `DestinationPremiumSurface`; no convertirla en renderer universal.
- Autoridades existentes: `HomePremiumSurface`, `RegionDestinationsPremiumSurface`, `ListingPremiumSurfaceFromDTO`/`TerritorialListingReviewSurface`, `BusinessSurface`, `ProductSurface`/`ExperiencePremiumSurface`, `EventPremiumSurface`, `PlacePremiumSurface`, `RoutesListingSurface`/`RoutePremiumSurface`, `SeoLandingSurface`.
- Archivos funcionales editables por lote: únicamente la autoridad y los componentes de tarjeta/sección ya utilizados por esa familia, tras identificar sus consumidores y declarar la matriz de impacto. No queda autorizado modificar indiscriminadamente todo un archivo compartido.
- Reutilizar OMXDS y `EditorialMediaFrame`/`resolveMediaSource`; preservar los contratos, lecturas CMS y resolutores existentes. No crear infraestructura nueva.