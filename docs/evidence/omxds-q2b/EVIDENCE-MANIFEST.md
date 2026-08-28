# G8-Q2B · Manifiesto de evidencia de cierre

**Blueprint:** `docs/blueprint/19.40-G8-Q2B-PLACES-CMS-v1.0.md`
**Autorización:** `PCA-2026-044`
**Base certificada:** `3ba3db23` → base de remediación `6d729a77`
**Flag:** `omxds_visual_v1_contracts_enabled = false`
**Fecha de captura:** 2026-08-28

## 1. Método

Smoke autenticado read-only con Chromium headless contra el servidor de
desarrollo local (`http://localhost:8080`), sesión restaurada desde el entorno
del editor. **No se creó, modificó, guardó ni publicó ningún registro**: la
pantalla de edición se abrió sobre un lugar preexistente sin ejecutar ninguna
mutación, y no se insertó fixture alguno en la base compartida.

Métricas por ancho: overflow horizontal del documento, número de controles
interactivos visibles, controles con área táctil efectiva menor a 44 px
(midiendo la etiqueta contenedora cuando existe, que es el objetivo real de
toque), campos de formulario y campos sin etiqueta accesible.

## 2. Resultados por ancho

Pantalla `/cms/lugares` (listado, 4 campos de filtro, 0 sin etiqueta):

| Ancho | Overflow | Controles | <44 px (propios) | <44 px (chrome compartido) |
| --- | --- | --- | --- | --- |
| 390 | 0 | 10 | 0 | 4 |
| 430 | 0 | 10 | 0 | 4 |
| 768 | 0 | 10 | 0 | 5 |
| 1024 | 0 | 11 | 0 | 6 |
| 1280 | 0 | 11 | 0 | 6 |
| 1440 | 0 | 11 | 0 | 6 |

Pantalla `/cms/lugares/nuevo` (alta, 6 campos, 0 sin etiqueta):

| Ancho | Overflow | Controles | <44 px (propios) | <44 px (chrome compartido) |
| --- | --- | --- | --- | --- |
| 390 | 0 | 14 | 0 | 4 |
| 430 | 0 | 14 | 0 | 4 |
| 768 | 0 | 14 | 0 | 5 |
| 1024 | 0 | 15 | 0 | 6 |
| 1280 | 0 | 15 | 0 | 6 |
| 1440 | 0 | 15 | 0 | 6 |

Pantalla `/cms/lugares/{placeId}/editar` (52 campos, 0 sin etiqueta):

| Ancho | Overflow | Controles | <44 px (propios) | <44 px (chrome compartido) |
| --- | --- | --- | --- | --- |
| 390 | **47 px** | 72 | 0 | 4 |
| 430 | **7 px** | 72 | 0 | 4 |
| 768 | 0 | 72 | 0 | 5 |
| 1024 | 0 | 73 | 0 | 6 |
| 1280 | 0 | 73 | 0 | 6 |
| 1440 | 0 | 73 | 0 | 6 |

Estados verificados: carga (skeleton), vacío (listado sin coincidencias con
filtros) y error (identificador inexistente → mensaje accesible, sin pantalla
en blanco). Selectores de destino y zona operan de forma dependiente: al
cambiar el destino la zona incompatible se limpia y el servidor rechaza
`zone_destination_mismatch`.

Teclado y foco: la primera pulsación de `Tab` enfoca un control con anillo
visible (`outline: solid 2px`). Consola del navegador: **0 errores** en las
tres pantallas y los seis anchos.

## 3. Defectos abiertos

### DEF-Q2B-001 · Overflow horizontal del breadcrumb a ≤430 px (BLOQUEANTE)

- **Síntoma:** 47 px de desbordamiento a 390 px y 7 px a 430 px en la pantalla
  de edición.
- **Causa raíz:** `src/components/workspace/WorkspaceTopbar.tsx` marca los
  crumbs no finales como `shrink-0`, de modo que una etiqueta de sección larga
  ("Lugares y atractivos") no puede truncarse y empuja la fila. Las pantallas
  equivalentes de Destinos, Empresas y Productos miden 0 px de overflow a 390 px
  con la misma cadena de cuatro crumbs porque sus etiquetas son cortas.
- **Ámbito:** componente compartido del Workspace Engine, **fuera de las rutas
  autorizadas por `PCA-2026-044`**. No se corrigió: hacerlo excedería la
  autorización vigente.
- **Requiere:** addendum o autorización nueva que habilite
  `modify src/components/workspace/WorkspaceTopbar.tsx` (cambio previsto:
  permitir `min-w-0` + truncado en los crumbs intermedios, sin alterar la
  jerarquía ni el texto).

### OBS-Q2B-002 · Áreas táctiles del chrome compartido (no bloqueante, preexistente)

Cuatro controles del Workspace Topbar y del sidebar miden menos de 44 px
(`Regresar` 36×36, `Command Palette` 40×40, `Copiloto` 40×40, avatar 26×58).
Están presentes en todas las superficies del CMS desde antes de Q2B y no
pertenecen a las rutas autorizadas. Los controles propios de Q2B (incluidas las
16 casillas de categorías) alcanzan ≥44 px de área táctil efectiva mediante su
etiqueta contenedora.

## 4. Auditoría verificada

`src/lib/places/places-cms.functions.ts` registra en `content_audit_log`
(`entity_kind = point_of_interest`, `actor_user_id` explícito, `metadata` con
`before`/`after`) las trece operaciones mutables: `place.create`,
`place.update`, `place.location.set`, `place.type.set`, `place.categories.set`,
`place.hours.set`, `place.products.set`, `place.events.set`,
`place.authorities.set`, `place.media.attach`, `place.media.detach`,
`place.media.reorder` y `place.status.transition` (con `from_status`/`to_status`).
La escritura es best-effort por la limitación declarada en el Blueprint 19.40 §5.

## 5. Matriz de permisos

| Sujeto | Escritura en el CMS de Lugares | Fuente de la decisión |
| --- | --- | --- |
| traveler | Denegada | `assertPlacesStaff` fail-closed |
| business_owner | Denegada; sin administración automática | `assertPlacesStaff` |
| concierge | Denegada | `assertPlacesStaff` |
| editor | Permitida | `is_editor_or_admin` |
| admin | Permitida | `is_editor_or_admin` |
| super_admin | Permitida | `is_editor_or_admin` |
| usuario con `poi.write` | Permitida | `has_permission('poi.write')` |
| usuario sin autoridad | Denegada | fail-closed |
| producto/evento/autoridad relacionados | Nunca conceden administración | `grantsPlaceAdministration: false` |

Probada con harness efímero en memoria (`scripts/omxds/q2b/places-permissions.contract.test.ts`),
sin crear usuarios reales ni tocar datos compartidos.

## 6. Invariantes acreditados

- Cero contenido turístico real creado o modificado; cero publicación.
- Cero rutas públicas nuevas; las tres pantallas son autenticadas y `noindex`.
- Cero migraciones y cero cambios de esquema.
- `omxds_visual_v1_contracts_enabled = false`.
- G8-Q2C no iniciado.
