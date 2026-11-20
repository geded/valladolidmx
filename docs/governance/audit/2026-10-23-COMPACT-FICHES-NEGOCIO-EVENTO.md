# Compactación de fichas de Negocio y Evento · 2026-10-23

## Autorización
Founder 2026-10-23 ~04:47 UTC: reconciliación y compactación de hoteles, restaurantes, casas de vacaciones, lugares y eventos; sólo espacios y presentación, sin cambiar plantillas, contenido, orden ni funciones; sin publicar.

## Delta aplicado (sólo envolturas de sección, sin tocar bloques compartidos)
- `src/components/surfaces/BusinessSurface.tsx`: márgenes entre secciones `mt-10` → `mt-8 sm:mt-10` (9 secciones + riel final); resumen `mt-8` → `mt-6 sm:mt-8`.
- `src/components/surfaces/EventPremiumSurface.tsx`: márgenes `mt-10` → `mt-8 sm:mt-10` (2 secciones, riel de relacionados y CTA final).
- No se tocó `ExperienceSection` ni ningún bloque compartido (también los usan destinos y rutas): los títulos de sección conservan su tamaño. Armonizar la tipografía de esos títulos en móvil requiere una capacidad nueva del bloque compartido y queda documentada como deuda, no implementada.

## Verificación
- Comparativa antes/después de las cinco fichas reales (Hotel Sutuk, Kuran Japonesa & Oriental, Casa Colonial Sisal, Calzada de los Frailes, Cena Romántica Zazil Tunich) en 1440/834/430/390: textos, enlaces, fuentes de medios y estructura de secciones idénticos; única diferencia = alturas menores por los márgenes compactados (p. ej. resumen 562.5 → 554.5 px en 430).
- Capturas y JSON en `/tmp/browser/compact-approved/` (`before-*` / `after-*`).
- Pruebas: `bun test` de business-premium-surface, business-vertical-surfaces, safe-event-cover-preview y place-runtime-registration = 20 pass, 0 fail, 65 expect().
- Build automático del preview: OK.
- Fallo conocido fuera de alcance: contrato G5 de marca corta en DestinationPremiumSurface (deuda previa documentada, archivo no tocado).

## Pendientes
- Aceptación visual humana del Founder y comprobación en el constructor autenticado.
- Reconciliación granular constructor/público de negocio/evento (ownership sección↔nodo) sigue bloqueada por falta de contrato lossless; no se sustituyó ningún árbol guardado.
- Sin publicación ni cambios CMS.
