# Valladolid.mx · Reglas vinculantes para agentes

Estas reglas aplican a Codex, Lovable y a cualquier agente que modifique este repositorio.
La autoridad completa es `docs/blueprint/19.47-PREMIUM-TEMPLATE-PRESERVATION-AND-EVOLUTION-POLICY-v1.0.md`.

## Jerarquía obligatoria

Antes de proponer o modificar una superficie, respetar en este orden:

1. CANON y configuración de marca vigente en el CMS.
2. Plantilla Premium aprobada de la familia.
3. Componentes compartidos y sistema visual OMXDS.
4. Contenido, enlaces, medios y visibilidad guardados en CMS/Experience Builder.
5. Patrones de usabilidad de referentes turísticos; nunca su identidad visual.

## Preservación

- Destination identity links reuse the institutional badge renderer through optional internal navigation overrides; planner and region links retain the origin destination through validated search context. Why: preserve one badge authority and existing territorial return navigation without parallel routes.
- Destination presentation adjustments stay inside DestinationPremiumSurface; narrative media uses EditorialMediaFrame with a fixed aspect ratio independent of description length. Why: keep builder/public authority shared and prevent text growth from distorting photos.
- Destination route and nearby cards keep their entity-specific links inside the existing surface; compact destination rails do not alter the regional catalog branch. Why: harmonize presentation without changing territorial discovery or introducing another renderer.

- Una plantilla aprobada es una autoridad, no un punto de partida descartable.
- “Corregir”, “mejorar”, “conectar”, “agregar” o “continuar” no autorizan rediseño.
- Modificar el componente aprobado; no crear superficies `V2`, `New`, paralelas o fallbacks visuales.
- Constructor, preview y ruta pública deben resolver la misma autoridad de render por familia.
- No reemplazar configuración CMS válida con fixtures, presets, demos o contenido codificado.
- No importar ramas históricas completas. Recuperar sólo el cambio mínimo acreditado.
- Preservar diseño, orden, responsive, marca, breadcrumb, mapas, Alux, Mi Viaje, header y footer salvo autorización explícita que nombre el elemento.

## Protocolo previo a cambios

1. Identificar familia, ruta pública, preview, preset, contrato, renderer y fuente CMS.
2. Comparar la plantilla completa con su autoridad aprobada en desktop, tablet y móvil.
3. Clasificar la solicitud: corrección, mejora, extensión o rediseño.
4. Declarar archivos autorizados y superficies que deben permanecer invariantes.
5. Implementar el delta mínimo sobre la autoridad existente.
6. Ejecutar gates completos y regresión visual de la plantilla entera y superficies compartidas.

Un rediseño exige autorización Founder explícita, maqueta previa y aceptación visual humana. Si el alcance es ambiguo o un cambio colateral altera otra sección, detenerse y reportar.

## Dos gates independientes

Una autorización de archivo no acredita preservación del producto. Todo cambio debe superar ambos controles:

1. **Scope Gate:** acredita que la operación y los archivos fueron autorizados.
2. **Preservation Gate:** acredita que la autoridad aprobada y sus invariantes visuales, funcionales y editoriales no sufrieron regresiones fuera del delta autorizado.

Un PASS del Scope Gate nunca sustituye al Preservation Gate. Si no existe evidencia comparable de la plantilla completa, el cambio visual queda bloqueado.

## Referentes de experiencia

Airbnb, Tripadvisor y Google Travel son referencias de claridad, confianza, descubrimiento, navegación y conversión. No autorizan copiar su marca ni uniformar Valladolid.mx. La identidad final debe seguir siendo Oriente Maya de Yucatán y la marca configurada en el CMS.

## Historia Lovable

No reescribir historial publicado, no hacer force-push y no eliminar la rama de integración. Los commits enviados a la rama conectada deben quedar funcionales y trazables.

- Media variants: every official upload path calls `deriveVariantsInBackground` (`src/lib/media/derive-on-upload-browser.ts`) after registering the original; it writes WebP 400/800/1200 (`browser-canvas` engine) via `derived-variants.functions.ts`, never touches the original and never blocks the upload. Why: sharp cannot run in the Worker; the `scripts/media-pipeline/derive.mjs` batch remains the fallback for missed or failed photos.
- Public consumers forward optional asset bundles through existing DTOs to `resolveMediaSource`, preserving original URLs, media eligibility, credits and all template geometry. Why: optimization is an additive transport change, not a redesign or editorial replacement.
- Public variant reads go through `src/lib/media/variant-bundles.server.ts` and are gated by `media_pipeline_enabled` (pilot slugs only outside production). Why: the visitor-facing switch stays a single, reversible flag.
- Upload-time rights declarations reuse the shared media panels and media-rights validator; destination registration validates editorial identity, destination scope and stored-byte checksum before recording documentary accreditation and its audit event. Why: editors can publish declared real photos without weakening unrelated administrative transitions or public AI protections.
