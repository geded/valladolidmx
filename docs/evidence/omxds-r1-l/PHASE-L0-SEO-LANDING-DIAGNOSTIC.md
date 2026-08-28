# G8-R1-L · FASE L0 · Diagnóstico Read-Only · Landings SEO Premium

**Estado:** READ-ONLY completado · cero escrituras de producto · cero SQL · cero migraciones · cero publicación · cero redirects · cero cambios de flag
**Continuidad:** addendum a G8-R1 (Fase 0 acreditó 20 plantillas/presets). El inventario previo **no se reinicia**.
**Invariantes vigentes:** `omxds_visual_v1_contracts_enabled = false`, cero publicación.

---

## 1 · Confirmación de hallazgos acreditados

| # | Hallazgo declarado | Verificación en HEAD | Resultado |
|---|---|---|---|
| 1 | `pageKind=landing` existe | `page-kind-registry.ts` → `{ kind: "landing", slugPattern: "/l/{slug}", singleton: false, roles admin/super_admin/editor }` | **CONFIRMADO** |
| 2 | `/l/{slug}` renderiza composiciones publicadas | `src/routes/l.$slug.tsx` → `getPublishedCompositionBySlug` + `CompositionRenderer` + `buildPublicHead` (title, description, canonical, og_image, noindex, `webPageJsonLd`) | **CONFIRMADO** |
| 3 | Studio permite “Nueva página → Landing” | `PagesPanel.tsx` (diálogo 2 pasos, `allowedKinds` desde el registry, semilla `getKitSeed(kind)`) | **CONFIRMADO** |
| 4 | No existe preset premium reusable de Landing SEO | `PREMIUM_TEMPLATE_REGISTRY` sólo declara familias `home`, `destination`, `listing`, `place`. `landing` aparece únicamente como **superficie de inserción** de los presets de listado y de lugar, nunca como familia propia | **CONFIRMADO** |
| 5 | No existe botón contextual desde Productos, Empresas o Lugares | `ProductEditor.tsx`, `BusinessEditor.tsx`, `places/PlaceEditor.tsx` no referencian composiciones, Studio ni `/l/` | **CONFIRMADO** |
| 6 | `biz-zazil-tunich` es composición específica de empresa, no plantilla | Fila real: `kind=business`, `variant_key=zazil-tunich`, `is_template=false`, `status=published` | **CONFIRMADO** |
| 7 | La documentación distingue landings de intención vs fichas canónicas | `SEO.A2` §0–§1 (Entity First, Zero Duplicated Architecture, taxonomía T1–T5 territorial vs familias editoriales) y `SEO.A3.M1` §2.1 (composition-first sobre la ruta canónica de empresa) | **CONFIRMADO** |

---

## 2 · Inventario probatorio de composiciones (`page_compositions`, lectura directa)

### 2.a · Universo completo por kind

| kind | slug | título | status | is_template | variant_key | revisión activa | robots |
|---|---|---|---|---|---|---|---|
| alux | `alux` | Alux | published | no | default | sí | index,follow |
| business | `__tpl_business__` | Plantilla · Empresa | published | no | default | sí | index,follow |
| business | `biz-zazil-tunich` | Zazil Tunich — Cenote Museo del Xibalbá | **published** | no | `zazil-tunich` | sí | index,follow |
| custom | `premium-g4-approved` | Home Premium G4 · Aprobada | draft | no | default | no | index,follow |
| destination | `__tpl_destination__` | Plantilla · Destino | published | **sí** | default | sí | index,follow |
| event | `__tpl_event__` | Plantilla · Evento | published | no | default | sí | index,follow |
| home | `home` | Página de Inicio | published | no | default | sí | index,follow |
| **landing** | `experiencias` | Experiencias | **draft** | no | default | **no** | index,follow |
| **landing** | `hoteles` | Hoteles | **draft** | no | default | **no** | index,follow |
| **landing** | `oriente-maya` | Oriente Maya | **draft** | no | default | **no** | index,follow |
| **landing** | `restaurantes` | Restaurantes | **draft** | no | default | **no** | index,follow |
| marketplace | `marketplace` | Marketplace | published | no | default | sí | index,follow |
| product | `__tpl_product__` | Plantilla · Producto | published | no | default | sí | index,follow |
| region | `__tpl_region__` | Plantilla · Región | published | no | default | sí | index,follow |
| trip_builder | `arma-tu-viaje` | Arma tu Viaje | published | no | default | sí | index,follow |

### 2.b · Respuestas exactas al inventario solicitado

- **`kind=landing`:** 4 composiciones, **todas en borrador y sin revisión activa** (`experiencias`, `hoteles`, `oriente-maya`, `restaurantes`). Son residuos de exploración temprana con slugs que **colisionan conceptualmente** con las seis rutas productivas de listado ya conectadas en R1-B. Ninguna se resuelve hoy en `/l/{slug}` porque `getPublishedCompositionBySlug` es fail-closed sobre `status=published` + revisión activa.
- **`kind=campaign`:** **0 filas**.
- **`kind=promo`:** **0 filas**.
- **`kind=wedding`:** **0 filas** (el kind existe en el registry, línea 306, sin uso).
- **Landings SEO de intención reales: 0.** La familia no existe en producción.

### 2.c · Estado exacto de `biz-zazil-tunich`

| Atributo | Valor |
|---|---|
| kind | `business` (no `landing`) |
| slug | `biz-zazil-tunich` |
| variant_key | `zazil-tunich` |
| status | `published` · revisión activa presente (`published_at` 2026-07-17) |
| ruta servida | `/oriente-maya/valladolid/cenotes/zazil-tunich` (composition-first sobre la ruta canónica de empresa) |
| render | `vmx.surface.business` → `BusinessSurface` (renderizador único) |
| canonical_override | nulo (autorreferencial) |
| robots | `index,follow` |

**Autoridad visual localizada:** `docs/evidence/omxds-visual/v0-baseline/premium-case-zazil-tunich/` (extractos `http-meta.json`, `E47_jsonld_detail.json`) + `SEO.A3.M1` (arquitectura) + `SEO.A3.M2` (inteligencia de contenido y primer borrador editorial). **No existe** un preview premium dedicado tipo `/lovable/*` para Zazil Tunich: la muestra premium es la **propia composición publicada**, no un fixture.

**Qué es extraíble como patrón reusable (sin copiar datos de Zazil Tunich):**

| Extraíble | No extraíble (dato propio) |
|---|---|
| Orden de bloques: hero → narrativa → galería → info práctica → productos → relacionados → CTA | Historia, Xibalbá, Cenote Museo (texto de `businesses.description`) |
| Estrategia de interlinking (categoría → destino → región) | Los 4 productos comerciales y su `conversion_mode` |
| Plantilla de JSON-LD y breadcrumb territorial | Coordenadas, horarios, contactos, precios |
| Regla “CTA externo cualificado” | Dominio `zaziltunich.com` y sus derechos de imagen |

---

## 3 · Cobertura de bloques oficiales para la familia propuesta

Todos los requisitos del addendum están cubiertos por la Block Library vigente — **cero bloques nuevos necesarios**:

| Capacidad requerida | Bloque oficial | Estado |
|---|---|---|
| Hero | `vmx.experience.hero` (familia única, Tourist Hero Policy) | ✅ |
| Narrativa editorial | `vmx.experience.section` | ✅ |
| Galería | `vmx.experience.gallery` | ✅ |
| Información práctica | `vmx.experience.info-grid` + `vmx.experience.features` | ✅ |
| FAQ | `vmx.product.faq` | ◐ existe, pero su contrato está acoplado a producto — la variante SEO debe consumirlo vía `config`, no duplicarlo |
| Mapa | `vmx.experience.map` | ✅ |
| Productos relacionados | `vmx.experience.products` / `vmx.smart.products-grid` | ✅ |
| Lugares relacionados | `vmx.experience.related-collection` | ✅ (adaptador de lugares aún no cableado a esta familia) |
| CTA | `vmx.experience.cta-bar` + `vmx.actions.buttons` | ✅ |
| Alux | `vmx.alux.planner` / `vmx.section.consejo-alux` | ✅ |
| Mi Viaje | `vmx.surface.trip-planner` / `vmx.section.arma-tu-viaje` | ◐ existen como superficie/sección; el CTA “Agregar a Mi Viaje” en ficha premium hoy vive dentro de `PlacePremiumSurface`, no como bloque insertable |
| Distintivos | `vmx.experience.institutional-badges` | ✅ |

**Hallazgo H-R1-L-01:** las dos brechas (◐) son de **configuración y adaptador**, no de arquitectura. Se resuelven por `config`/`capabilities` conforme a la Evolutionary Compatibility Rule. Prohibido crear `vmx.seo.*`.

---

## 4 · Persistencia del vínculo entidad ↔ landing

Columnas reales de `page_compositions` relevantes: `slug`, `title`, `description`, `kind`, `variant_key`, `is_template`, `template_of_kind`, `canonical_override`, `robots_directive`, `sitemap_changefreq`, `sitemap_priority`, `previous_slug`, `current_draft (jsonb)`, `workflow_state`, `approved_*`, `scheduled_*`.

| Metadato pedido | ¿Existe hoy? | Dónde puede residir sin schema nuevo |
|---|---|---|
| `primary_entity_kind` | ✘ | `current_draft.chrome.seo` (jsonb) — el contrato `CompositionTree.chrome.seo` es `CompositionJsonObject` abierto |
| `primary_entity_id` | ✘ | ídem |
| entidades relacionadas | ✘ | ídem (array) |
| intención SEO | ✘ | ídem |
| keyword principal | ✘ | ídem |
| cluster | ✘ | ídem |
| canonical | ✅ | columna `canonical_override` (autoridad) |
| estado de indexación | ✅ | columna `robots_directive` + `seo.noindex` en snapshot |
| estado editorial/aprobación | ✅ | `workflow_state`, `approved_revision_id`, `approved_at` |

**Adjudicación L0:** **NO se requiere migración ni schema nuevo.** El vínculo entidad-intención-cluster cabe íntegramente en `chrome.seo` del snapshot, ya versionado por revisión y ya leído por `/l/$slug`. Se propone un sub-objeto tipado `chrome.seo.landing` validado por Zod en el contrato de la familia (mismo patrón que `place-public-contract.ts`).

Riesgo aceptado y declarado: la búsqueda por entidad (“¿qué landings apuntan a Chichén Itzá?”) sobre jsonb es menos eficiente que una columna. Mitigación sin migración: filtro en el Panel de Páginas. Si el Founder exige índice, se propondrá como migración separada — **no en L0 ni en L1**.

---

## 5 · Por qué no hay acceso claro en el administrador

Tres causas concurrentes, todas de superficie:

1. **Ausencia de familia en el registro premium.** `PremiumPresetGallery` sólo muestra presets de `PREMIUM_TEMPLATE_REGISTRY`; sin familia `seo-landing`, la galería no ofrece nada para `kind=landing`, y el usuario ve “Landing” como página en blanco.
2. **Semilla genérica.** `getKitSeed("landing")` produce una composición neutra sin estructura editorial SEO, por lo que crear una Landing “no se siente” como una capacidad de producto.
3. **Cero puntos de entrada contextuales.** Los editores de Producto, Empresa y Lugar no conocen el Experience Builder; el único camino es Studio → Páginas → Nueva página → Landing, que es un flujo de constructor, no de operación editorial.

---

## 6 · Integración al inventario G8-R1 (incremental, no reinicio)

| Bloque de inventario | Antes | Ahora |
|---|---|---|
| Presets de composición (`premium-template-registry`) | 14 | 14 |
| Presets de entidad (`entity-premium-templates`) | 6 | 6 |
| **Familia nueva `premium-seo-landing`** | — | **1 familia · 3 variantes aprobables** |
| **Total declarado** | 20 | **20 + 1 familia (3 variantes)** |

Regla declarada: **una landing concreta no es una plantilla.** La familia es reusable para cientos de páginas; el inventario cuenta familias y variantes, nunca instancias.

---

## 7 · Modelo exacto de la plantilla propuesta (sin implementar)

```
familia:        premium-seo-landing
contrato:       seo-landing-public-contract.ts   (Zod, contractVersion 1.0.0)
renderer:       CompositionRenderer  (único, sin motor nuevo)
pageKinds:      landing, campaign, promo
superficie:     /l/{slug}
variantes:      authority-editorial (default) · authority-cinematic · comparison-guide
```

Las tres variantes comparten **un solo contrato y un solo renderer**; se diferencian sólo por `variant`, orden de bloques semilla y `config`.

| Variante | Orden de bloques semilla | Condición de habilitación |
|---|---|---|
| `authority-editorial` | hero (editorial) → narrativa → info-grid → galería → FAQ → mapa → relacionados → CTA → Alux | ninguna (default fail-safe) |
| `authority-cinematic` | hero (cinemático) → narrativa → galería → productos → relacionados → CTA → Alux | **bloqueada sin portada gobernada aprobada** → degrada a `authority-editorial` |
| `comparison-guide` | hero → criterios de selección → tabla/colección comparativa → filtros editoriales → FAQ → mapa multi-punto → CTA | requiere ≥ 3 entidades acreditadas con geolocalización verificada |

`chrome.seo.landing` propuesto:

```jsonc
{
  "primary_entity_kind": "place | business | product | destination | none",
  "primary_entity_id": "uuid | null",
  "related_entities": [{ "kind": "...", "id": "..." }],
  "search_intent": "informational | comparative | transactional",
  "primary_keyword": "string",
  "cluster": "string",
  "editorial_approval": "pending | approved",
  "indexation": "noindex | index"
}
```

---

## 8 · Flujo del botón contextual (propuesto, no implementado)

Puntos de entrada: `/cms/productos/{id}/editar`, `/cms/lugares/{id}/editar`, `/cms/empresas/{id}/editar` → **“Crear Landing SEO”**; y Studio → Nueva página → **“Landing SEO premium”**.

```
Clic “Crear Landing SEO”
  1. Detección de colisión  → ¿existe landing con misma intención o slug?  → sí: abrir la existente, nunca duplicar
  2. Diálogo               → intención de búsqueda · keyword · título · slug · variante
  3. Crear BORRADOR        → page_compositions(kind=landing, status=draft, robots_directive=noindex)
  4. Vincular entidad      → chrome.seo.landing.primary_entity_*
  5. Precargar acreditado  → territorio, coordenadas, portada gobernada, entidades relacionadas
  6. Aplicar plantilla     → variante premium-seo-landing
  7. Abrir Studio          → edición editorial
  8. noindex hasta aprobación explícita + publicación explícita
```

Invariantes del flujo: nunca modifica la ficha canónica · nunca publica · nunca copia texto de la ficha · empresas con permiso **proponen**, administración **aprueba** SEO, canonical, indexación y publicación.

---

## 9 · Estrategia anticanibalización (fail-closed)

1. **Regla de intención única:** cada landing declara `primary_keyword` + `search_intent`. Si coincide con la intención principal de una ficha canónica de la misma entidad → **bloqueo de publicación**.
2. **Canonical dirigido:** una landing que describa *qué es* una entidad debe canonicalizar a la ficha canónica, o reformular su intención.
3. **Interlinking obligatorio:** ≥ 3 enlaces internos válidos, al menos uno a la ficha canónica de la entidad principal.
4. **Cluster obligatorio:** landing huérfana = no publicable.
5. **Gate de contenido delgado** y **gate de datos operativos sin fuente** (horarios, precios, premios, capacidades).
6. **Gate de medios:** sólo activos G8-M1 acreditados, con ALT y crédito; sin portada aprobada la variante cinemática queda bloqueada.

---

## 10 · Casos piloto (borradores, sin publicación)

| # | Slug propuesto | Variante | Entidad principal | Riesgo detectado en L0 |
|---|---|---|---|---|
| 1 | `como-visitar-chichen-itza-desde-valladolid` | authority-editorial | Lugar Chichén Itzá (destino Tinum, **draft**) | La entidad principal no está publicada → la landing sólo puede existir como borrador/preview |
| 2 | `cenotes-cerca-de-chichen-itza` | comparison-guide | ninguna (colección) | Requiere ≥ 3 cenotes con coordenadas verificadas; **hoy sólo Zazil Tunich y Suytun están acreditados** → gate de 3 entidades no se cumple aún |
| 3 | `zazil-tunich-cenote-museo-inframundo-maya` | authority-editorial | Empresa Zazil Tunich (**published**) | **Riesgo alto de canibalización** con `/oriente-maya/valladolid/cenotes/zazil-tunich`. Sólo viable con intención distinta (guía de visita/inframundo) y canonical a la ficha canónica |

Ninguno se implementa en L0.

---

## 11 · Manifiesto incremental G8-R1-L (propuesto)

| Ola | Alcance | Precondición | Migración |
|---|---|---|---|
| **L1** | Contrato `seo-landing-public-contract.ts` + familia en `PREMIUM_TEMPLATE_REGISTRY` (3 variantes, `autoAssign=false`) | aprobación L0 | no |
| **L2** | Semillas de las 3 variantes + render sobre `CompositionRenderer` en `/l/$slug` (borradores, noindex) | L1 | no |
| **L3** | Botones contextuales en Productos, Empresas, Lugares + Studio “Landing SEO premium” + detector de colisión | L2 | no |
| **L4** | Gates SEO fail-closed (§9) como validación de publicación en el Studio | L3 | no |
| **L5** | Tres pilotos como borradores + preview autenticada + capturas 390/768/1440 | L4 | no |
| **L6** | Gate `validate:r1:l`, evidencia y cierre; reconciliación con R1-D (presentación persistible) | L5 | no |

Ninguna ola requiere migración, schema, publicación ni redirects. **Deuda declarada aparte:** las 4 landings borrador legacy (`hoteles`, `restaurantes`, `experiencias`, `oriente-maya`) deben archivarse o renombrarse antes de L3 para evitar colisión de slug — se propone como decisión Founder, no como acción automática.

---

## 12 · Blueprint y PCA propuestos

- Blueprint: `docs/blueprint/19.46-G8-R1-L-PREMIUM-SEO-LANDINGS-v1.0.md`
- Instrumento: `docs/governance/product-authorizations/PCA-2026-050.json`
- Master Index: entrada nueva + reconciliación del universo G8-R1 (20 + familia `premium-seo-landing`)

---

## 13 · Confirmación de continuidad de R1

R1 puede continuar **sin perder esta familia**: `premium-seo-landing` es **aditiva y desacoplada** de R1-A..R1-F. No comparte contrato, ruta ni lectura con los listados (R1-A/B) ni con las fichas de entidad (R1-C). El único punto de contacto es **R1-D · Presentación persistible**, donde el panel generalizado deberá contemplar también la variante cinemática de landing. Recomendación: ejecutar L1–L2 en paralelo o inmediatamente después de R1-C, y consolidar L6 dentro del QA integral de R1-F.

---

## 14 · STOP CONDITION L0

Fase L0 concluida sin modificar producto: cero migraciones, cero schema, cero cambios de datos, cero publicación, cero redirects, cero contenido real alterado. **No se inicia L1** hasta que el Founder:

1. apruebe el modelo de plantilla de §7 y las tres variantes;
2. ratifique que el vínculo entidad/intención reside en `chrome.seo.landing` **sin migración**;
3. resuelva el destino de las 4 landings borrador legacy (§11);
4. autorice Blueprint `19.46` y `PCA-2026-050`;
5. confirme el tratamiento del piloto 3 (Zazil Tunich) bajo la regla anticanibalización de §9.
