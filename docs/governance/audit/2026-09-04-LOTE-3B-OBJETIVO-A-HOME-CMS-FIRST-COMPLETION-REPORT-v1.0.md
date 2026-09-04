# Lote 3B · Objetivo A — Home CMS-first (Completion Report v1.0)

Fecha: 2026-09-04 · Rama: `integration/lovable-valladolidmx` · Alcance: **sólo preview**

## 1. Gate inicial
- HEAD efectivo verificado sobre `integration/lovable-valladolidmx`.
- Avances B, C y D previos intactos (no se tocaron sus rutas ni sus datos).

## 2. Evidencia base
Capturas y firmas de contenido de la Home Premium **antes** del cambio de autoridad:
`/tmp/browser/l3ba/before-{1440,834,430,390}.png` + `before.json`
(texto visible, lista de imágenes resueltas, alto de página).

## 3. Materialización administrable
- Revisión anterior activa: **33** (config parcial; el render dependía del fixture de código).
- Revisión **34**: materializa en el snapshot todos los textos, enlaces, orden, visibilidad,
  límites y referencias de medios necesarios para reproducir la Home aprobada.
- Revisión **35** (activa, `911fa117-cc65-401a-ba1d-1b0f87fcb577`): corrige la única
  incompatibilidad editorial detectada — el ancla no canónica `#mapa` del ítem de categoría
  "Mapa", que la política de enlaces del Constructor rechaza y que el resolutor ya descartaba.
  Sin efecto visual.
- `draft_hash` final: `acbbdc32…9f9ee6d` · `draft_version`: 0 · `workflow_state`: published.
- No se crearon imágenes ni logos nuevos: las referencias existentes quedan administrables y
  se resuelven por el sistema de Medios aprobado. No se usaron arreglos de medios vacíos como
  sustituto de contenido (las decisiones editoriales vigentes de medios se preservan tal cual).

## 4. Autoridad de contenido
- La ruta pública consume normalmente el snapshot publicado del CMS.
- El fixture de código permanece **sólo** como recuperación fail-safe documentada: se activa
  ante composición inválida o lectura fallida, nunca cuando existe composición válida
  (cubierto por el contrato `home-cms-materialization.contract.test.ts`, caso
  "mantiene el fallback de código operativo (sin pantalla blanca)").

## 5. Prueba de edición desde el Constructor
1. Campo textual `hero_eyebrow` editado en el Studio a `DEMO LOTE 3B·A · revista territorial`.
2. Guardado aceptado por el servidor (`Composition.DraftSaved`, `result: accepted`,
   `draft_version: 1`), visible en el lienzo de vista previa.
3. Restaurado desde el mismo Constructor al valor original
   (`Revista territorial · Oriente Maya de Yucatán`, `draft_version: 2`).
4. Borrador devuelto a coincidencia **exacta** con la revisión publicada 35
   (`current_draft = snapshot` → verdadero, `draft_version` a 0).

## 6. Hallazgos y correcciones de producto
- **P1 corregido — el botón "Publicar cambios" nunca podía activarse.** La comprobación
  "hay cambios locales sin guardar" comparaba una firma calculada en el navegador contra
  `draft_hash`, que Postgres calcula sobre el texto `jsonb`; ambos formatos no coinciden
  jamás. Ahora se compara la misma canonicalización a ambos lados (árbol en pantalla contra
  el último árbol persistido en la sesión).
- **Regla de negocio confirmada, no un defecto:** `eb_set_workflow_state` impide
  `author_cannot_self_approve`. Con un único administrador en el entorno, el ciclo
  aprobar→publicar no puede completarse end-to-end; requiere un segundo revisor con rol
  admin. Queda como punto abierto de gobernanza, no de código.
- La materialización descarta enlaces internos no canónicos (`stripNonCanonicalHrefs`),
  de modo que el snapshot administrable siempre supera la política editorial del Studio.

## 7. Verificación final
- Capturas posteriores en 1440/834/430/390 (`final-*.png`, `final.json`).
- Comparación contra la evidencia base: **texto visible idéntico, imágenes resueltas
  idénticas y alto de página idéntico en los cuatro anchos** (6521 / 5627 / 7069 / 7247 px).
  Estructura, orden, proporciones, Alux, encabezado, pie y comportamiento responsive
  conservados. Sin diferencias materiales.
- `tsgo --noEmit`: limpio · `bun run build`: OK · suite completa: **761/761** ·
  inventario de rutas: **241 rutas cubiertas** · contratos Home/CompositionRenderer: 5/5.

## 8. Rollback
- Revertir a la revisión **34** o **33** activando `active_revision_id` correspondiente
  (todas las revisiones se conservan en `page_revisions`).
- Revertir el código: `src/lib/experience-builder/home-materialization.ts` y la comprobación
  de cambios locales en `src/components/experience-builder/VisualStudio.tsx`.
- Producción no se modificó; la publicación aplicada corresponde exclusivamente al contenido
  demo aprobado en preview.

## 9. Rutas/archivos modificados
- `src/lib/experience-builder/home-materialization.ts`
- `src/components/experience-builder/VisualStudio.tsx`
- `scripts/omxds/l3b-a/home-cms-materialization.contract.test.ts` (contrato)
- Datos: `page_compositions` (`home`) + `page_revisions` 34 y 35 (sólo preview).
