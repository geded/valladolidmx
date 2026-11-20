# Reconciliación de fichas Premium de alojamiento y gastronomía

## Objetivo
Conectar las fichas públicas existentes de casa de vacaciones, hotel y restaurante con sus plantillas Premium aprobadas, sin crear versiones nuevas ni alterar datos, rutas o publicación.

## Orden de trabajo
1. **Casa de vacaciones:** primera familia y piloto de preservación.
2. **Hotel:** aplicar la misma vía canónica con su contenido y bloques propios.
3. **Restaurante:** aplicar la misma vía canónica con su contenido y bloques propios.

Cada familia se valida completa antes de continuar con la siguiente.

## Alcance visual y funcional
- Conservar la autoridad `BusinessSurface` y sus adaptadores Premium; no crear superficies V2/New.
- Reproducir el orden aprobado de cada familia con los bloques oficiales existentes.
- Mostrar galería, información, espacios/habitaciones/menú, amenidades o especialidades según los datos reales disponibles.
- Mantener el mapa oficial únicamente cuando existan coordenadas reales.
- Mostrar reseñas administrables únicamente cuando existan reseñas publicadas válidas; sin datos inventados ni huecos vacíos.
- Incorporar la acción compacta **Compartir perfil** usando la URL canónica actual y el patrón compartido existente.
- Preservar breadcrumb territorial, Alux, Mi Viaje, header, footer, SEO, marca CMS y navegación.

## Fuera de alcance
- Nuevas rutas, plantillas, motores, esquemas, tablas o migraciones.
- Cambios en datos reales, medios, permisos, RLS, pagos o reservaciones.
- Publicación, despliegue, merge o apertura de PR.
- Rediseño de Home, destino, listados u otras familias.

## Detalles técnicos
- Auditar y corregir la cadena única: CMS → contrato/adaptador de familia → resolutor canónico → `BusinessSurface` → preview/ruta pública.
- Eliminar únicamente las condiciones que estén degradando una familia aprobada al render genérico.
- Reutilizar `BusinessLocationBlock`, `ExperienceReviewsBlock`, `ExperienceGallery`, productos/colecciones y la acción compartida de compartir.
- Asegurar que las secciones y anclas visibles coincidan con los datos realmente renderizados.
- Mantener comportamiento digno sin medios o reseñas, ocultando secciones vacías sin cambiar de familia.

## Controles
- **Scope Gate:** sólo fichas de casa de vacaciones, hotel y restaurante y sus conexiones directas.
- **Preservation Gate:** comparación completa antes/después en 1440, 834, 430 y 390 px.
- Verificar breadcrumb, hero, galería, contenido, mapa, reseñas, compartir, Alux, Mi Viaje, relacionados, header y footer.
- Comprobar un solo H1, cero overflow horizontal, imágenes válidas, enlaces funcionales y consola sin errores.
- Ejecutar lint dirigido, typecheck, pruebas relevantes, build, Route Inventory y Governance Integrity disponibles.
- Reportar por familia PASS/FAIL/NO VERIFICADO y cualquier dato CMS faltante; no inventarlo.
