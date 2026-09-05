# LOTE 3I.1 · CIERRE CORRECTIVO LANDING SEO

**Versión:** v1.0 · **Fecha:** 2026-09-05 · **Rama:** `integration/lovable-valladolidmx`
**Carril:** A (Producto) · **Estado:** Cerrado con 1 bloqueo P1 documentado

---

## 1. Preflight

- Base: HEAD remoto `eeddd1526aeafcbaf9c11141d95e665b0ca32a24`.
- Sin rama persistente nueva, sin PR, sin merge, sin despliegue, sin `main`.
- Cero publicación, cero redirects, cero sitemap, cero dominios, cero flags.

## 2. Objetivo 1 · Plantilla visual pública

- Se ajustó la implementación compartida existente `premium-seo-landing`. No se
  creó plantilla ni sistema paralelo.
- Los previews se renderizan dentro de `PublicShell` (header, navegación
  territorial, breadcrumbs contextuales, footer), igual que las familias 3G–3H.
- Slots poblados exclusivamente con datos reales de la entidad (`hero`, `intro`,
  media real de `business_media` / `place_media`, `ctaBar`). Los slots sin dato
  real se omiten: sin huecos, sin contenido inventado.
- `ctaBar`: `add-to-trip` sólo se emite cuando la entidad es representable en el
  contrato de Travel Plan (`business` / `product`); en Lugares se omite
  (fail-closed). Acción principal: "Ver ficha completa" hacia la ficha canónica.
- Sin selectores Editorial/Cinematográfica visibles al visitante. Alux y Mi Viaje
  quedan por debajo de territorio, título, imagen y entidad.

## 3. Objetivo 2 · Previews reales (internos, noindex)

Emitidos con la RPC oficial `eb_issue_composition_preview` y servidos por
`/preview/composition/$token` (`noindex`, enlace privado, caduca por TTL):

| Landing | Preview |
|---|---|
| `landing-business-zazil-tunich` | `/preview/composition/a0a5de25c762aadba24ec28f1fbf86a4ba00de8137ee3af80329faf136f285ba` |
| `landing-place-chichen-itza` | `/preview/composition/b5f63485e95921b5b5f46277af7777b31359a3232e5b6a090705b9d7a4af49fa` |
| `landing-place-cenote-suytun` | `/preview/composition/718370e38ac848e0f87f7b7c03cf3631185978e6dc400d6300f063f125b45880` |

Los tres son emitibles desde `/cms/landing-seo` ("Vista previa interna").
No se crearon rutas públicas indexables.

## 4. Objetivo 3 · QA visual 12/12

| Landing | 1440 | 834 | 430 | 390 |
|---|---|---|---|---|
| Zazil Tunich | PASS | PASS | PASS | PASS |
| Chichén Itzá | PASS | PASS | PASS | PASS |
| Cenote Suytún | PASS | PASS | PASS | PASS |

Criterios verificados en cada caso: overflow horizontal 0, exactamente 1 `main`
y 1 `h1` (título = nombre real de la entidad), header presente, 0 imágenes rotas,
0 errores de consola, jerarquía y simetría comparadas por captura.
Capturas: `/tmp/browser/3i1/`.

## 5. Objetivo 4 · Endurecimiento de la RPC

`public.eb_set_composition_seo_metadata` (aditiva y reversible, `SECURITY DEFINER`,
`search_path=public`, `EXECUTE` revocado a PUBLIC/anon, sin UPDATE directo a
`authenticated`):

- Rol editorial obligatorio (`super_admin | admin | editor`).
- Lectura `FOR SHARE` previa a cualquier escritura.
- Rechaza `page_type <> 'landing'`, composiciones publicadas
  (`status='published'` o `published_at` no nulo), `kind` distinto de `landing`,
  directiva de robots inválida e IDs inexistentes.
- Auditoría de la escritura aceptada (`Composition.SeoMetadataUpdated`).
  Se retiraron los apuntes de rechazo: al abortarse la transacción nunca podían
  persistir (código muerto).

### Matriz de pruebas autenticadas (8/8 PASS)

| Caso | Esperado | Resultado |
|---|---|---|
| `business_owner` sobre landing draft | rechazo | `forbidden` |
| `concierge` sobre landing draft | rechazo | `forbidden` |
| `traveler` sobre landing draft | rechazo | `forbidden` |
| `editor` sobre landing draft | aceptado | aceptado |
| `admin` sobre landing draft | aceptado | aceptado |
| `admin` sobre composición no-landing | rechazo | `seo_metadata_requires_landing` |
| `admin` sobre landing publicada | rechazo | `seo_metadata_requires_draft_landing` |
| `admin` sobre ID inexistente | rechazo | `composition not found` |

Datos temporales usados y revertidos: dos roles temporales sobre una cuenta de
prueba y dos composiciones `tmp-3i1-*`. Verificación posterior: 0 filas
temporales, 0 roles temporales.

## 6. Objetivo 5 · Archivado — BLOQUEO P1

`archiveLegacySeoLandingDrafts` ya no hace `UPDATE` directo: llama a la RPC
oficial `public.eb_archive_composition`, que valida rol editorial vía
`eb_r2_authz` (verificado: `traveler` → `forbidden: editor role required`).

**Bloqueo:** ejecutada como `editor` sobre una composición temporal, la RPC falla
con `page_compositions_status_check`. El CHECK vigente sólo admite
`draft | internal_review | published`, de modo que el `status='archived'` que
escribe la RPC es inválido. El mecanismo de archivado está inoperante en la base
actual y su corrección exige ampliar ese CHECK, cambio de esquema transversal a
todas las composiciones y fuera del alcance autorizado de 3I.1.

**Se detiene y se reporta**, sin crear autoridad paralela ni ampliar permisos.
No se archivó ni eliminó ninguna landing legacy ni ningún piloto.

## 7. Validación

| Comprobación | Resultado |
|---|---|
| `bunx tsgo --noEmit` | Limpio |
| `bunx eslint` (archivos tocados) | Limpio |
| `bun test` | 777/777 (5297 expect) |
| `bun run build` | OK |
| Route Inventory | 247/247 |
| QA responsive | 12/12 |
| RPC SEO autenticada | 8/8 |
| Archivado autenticado | Rechazo no-editor PASS · escritura BLOQUEADA (P1) |

## 8. Estado de los pilotos (sin cambios de estado)

Los tres siguen en `draft`, `kind=landing`, `noindex,nofollow` y con canonical
apuntando a la ficha real. Datos demo retenidos conforme a la Demo Pack Policy.

## 9. Pendientes reales

1. **P1** — `eb_archive_composition` inoperante por `page_compositions_status_check`
   (requiere autorización para ampliar el CHECK a `archived`).
2. Revisión del resto de superficies del Experience Builder que escriban por tabla
   en lugar de RPC (heredado de 3I).
