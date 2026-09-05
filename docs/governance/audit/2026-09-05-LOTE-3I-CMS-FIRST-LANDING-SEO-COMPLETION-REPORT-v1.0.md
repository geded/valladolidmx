# LOTE 3I · CMS-FIRST LANDING SEO + PLANTILLA PREMIUM + TRES PILOTOS

**Versión:** v1.0
**Fecha:** 2026-09-05
**Rama:** `integration/lovable-valladolidmx`
**Carril:** A (Producto)
**Estado:** Cerrado

---

## 1. Objetivo

Convertir la familia `premium-seo-landing` en una capacidad CMS-first administrable
desde una sección central del CMS Studio, y crear los tres pilotos autorizados
(Zazil Tunich, Chichén Itzá, Cenote Suytún) usando exclusivamente datos reales.

Sin editor paralelo: la edición sigue ocurriendo en el Experience Builder único
(`/cms/experience-builder`), conforme al Single Studio Principle 15.10.4d.

---

## 2. Entregables

### 2.1 Sección central "Landing SEO"

- Ruta nueva `src/routes/_authenticated/cms/landing-seo.tsx` (`/cms/landing-seo`,
  `noindex, nofollow`, dentro del `WorkspaceShell` del CMS).
- Listado con búsqueda libre y filtros por **estado**, **tipo de entidad**,
  **destino** y **directiva de indexación**.
- Ficha por landing: entidad de origen, destino, plantilla + variante, canonical,
  robots y fecha de actualización.
- Creación contextual idempotente con selector de entidad canónica
  (Empresa / Producto / Lugar) y búsqueda por nombre.
- Acción única de edición: **Abrir en el Experience Builder**.

### 2.2 Server functions de administración

`src/lib/experience-builder/seo-landing/seo-landing-admin.functions.ts`

- `listSeoLandingsCms` — lectura de `page_compositions` (`page_type=landing`),
  resolución del metadato `chrome.seo.landing`, del nombre real de la entidad de
  origen y del slug de destino. Marca como *legacy* las landings previas sin
  entidad vinculada.
- `searchSeoLandingEntities` — selector de entidad canónica (empresas, productos,
  lugares) limitado a identificador, slug y nombre.

Ambas con `requireSupabaseAuth`; autorización efectiva por RLS.

### 2.3 Navegación

`src/lib/workspace/definitions/index.ts` — entrada `cms.landing-seo`
(grupo `estudio`, order 14, superficies `sidebar` y `palette`).

### 2.4 Inventario de rutas

`src/lib/experience-builder/route-inventory.ts` — entrada declarada
(`studio` / `L3` / `high` / `native-studio` / owner Editorial). Cobertura: **247 rutas**.

---

## 3. Hallazgo P0 corregido

Al ejecutar la creación real se detectó que la acción "Crear Landing SEO"
**nunca había podido completar sus metadatos**: el rol `authenticated` no tiene
privilegio de escritura directa sobre `public.page_compositions`
(`relacl` = `authenticated=rDxtm`), por lo que el paso 4 de
`createSeoLandingDraft` fallaba con `permission denied for table page_compositions`,
dejando composiciones con `kind=custom`, sin `chrome.seo.landing`,
sin canonical y con `robots_directive=index,follow`.

Consecuencia adicional: al perderse `chrome.seo.landing`, la idempotencia por
`entityRef` no encontraba la landing previa y el segundo intento chocaba contra
`page_compositions_slug_key`.

**Corrección aplicada (mínima y gobernada):**

1. Nueva RPC `public.eb_set_composition_seo_metadata(_id, _kind, _canonical_override, _robots_directive)`
   — `SECURITY DEFINER`, `search_path = public`, verificación de rol
   (`super_admin | admin | editor`), validación de la directiva de robots,
   registro en `content_audit_log` (`Composition.SeoMetadataUpdated`),
   `EXECUTE` revocado a `PUBLIC` y `anon`.
2. `createSeoLandingDraft` deja de hacer `UPDATE` directo: ahora persiste el árbol
   con la RPC oficial `eb_save_composition_draft` y los metadatos SEO con la RPC
   nueva. Toda escritura pasa por funciones gobernadas y auditadas.

No se otorgó ningún privilegio amplio de escritura sobre la tabla.

---

## 4. Pilotos creados (datos reales, flujo real de UI)

| Landing | Entidad de origen | `kind` | Estado | Robots | Canonical |
|---|---|---|---|---|---|
| `landing-business-zazil-tunich` | Empresa Zazil Tunich | `landing` | draft | `noindex,nofollow` | `/oriente-maya/valladolid/cenotes/zazil-tunich` |
| `landing-place-chichen-itza` | Lugar Chichén Itzá | `landing` | draft | `noindex,nofollow` | `/oriente-maya/tinum/lugares/chichen-itza` |
| `landing-place-cenote-suytun` | Lugar Cenote Suytún | `landing` | draft | `noindex,nofollow` | `/oriente-maya/valladolid/lugares/cenote-suytun` |

Los tres se crearon desde la sección CMS con sesión de administrador, con
plantilla `premium-seo-landing` / variante `authority-editorial-zazil`,
presentación Editorial y **3 slots poblados** con datos reales
(`hero`, `intro`, `ctaBar`). Los slots sin dato real se omiten: cero contenido
inventado. Ninguno está publicado ni indexable.

---

## 5. Validación

| Comprobación | Resultado |
|---|---|
| `bunx tsgo --noEmit` | Limpio |
| `bunx eslint` (archivos tocados) | Limpio |
| `bun test` | 777/777 (5297 expect) |
| `bun run build` | OK |
| `scripts/route-inventory-coverage.ts` | 247/247 rutas |
| QA responsive 1440 / 834 / 430 / 390 | Sin desbordamiento horizontal |

Capturas: `/tmp/browser/3i/landing-seo-{1440,834,430,390}.png`.

---

## 6. Invariantes respetadas

- Cero publicación, cero redirects, cero sitemap, cero cambios de dominio o flags.
- Cero rutas públicas nuevas (la sección es interna y `noindex`).
- Cero editor paralelo: la edición sigue siendo el Experience Builder único.
- Cero modificación de las entidades de origen.
- Landings legacy (`hoteles`, `restaurantes`, `experiencias`, `oriente-maya`)
  intactas; sólo se listan y se etiquetan como legacy.

---

## 7. Pendientes documentados (no bloquean el cierre)

1. `archiveLegacySeoLandingDrafts` sigue usando `UPDATE` directo sobre
   `page_compositions` y fallará por el mismo motivo del hallazgo P0. Requiere
   una RPC gobernada de archivado o el uso de `eb_archive_composition`.
2. Revisión de otras superficies del Experience Builder que escriban por tabla en
   lugar de RPC, para descartar el mismo patrón.
3. Datos demo: los tres pilotos permanecen como borradores temporales hasta que el
   Founder autorice expresamente su eliminación (Demo Pack Policy).
