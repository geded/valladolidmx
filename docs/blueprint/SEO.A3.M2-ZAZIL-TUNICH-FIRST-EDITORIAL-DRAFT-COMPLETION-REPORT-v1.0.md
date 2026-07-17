# SEO.A3.M2 · Zazil Tunich — First Editorial Draft Completion Report v1.0

**Estado:** Cerrado técnicamente · Requiere aprobación editorial del Founder para elevar `founder_review_required` a `verified`.
**URL:** https://www.quehacerenvalladolid.com/oriente-maya/valladolid/cenotes/zazil-tunich
**Composición:** `page_compositions.slug = biz-zazil-tunich` · `variant_key = zazil-tunich`.
**Ola:** SEO.A3.M2.

---

## 1. Alcance ejecutado

Primera versión editorial cargada dentro de la composición existente `biz-zazil-tunich`. No se creó ninguna ruta, plantilla, componente, bloque o renderer nuevo. Toda la landing se compone de bloques oficiales de la Biblioteca (`vmx.experience.*`) ya registrados y validados en H-03.

## 2. Contenido implementado

El árbol publicado contiene **17 bloques** en el siguiente orden narrativo:

| # | Bloque | Fuente | Rol editorial |
|---|--------|--------|---------------|
| 1 | `vmx.experience.hero` (immersive) | `business` | Hero con datos hidratados desde la ficha + copy editorial. |
| 2 | `vmx.experience.subnav` (pill) | manual | Sub-nav sticky con 7 anclas. |
| 3 | `vmx.experience.institutional-badges` | manual | Badge `pueblo-magico` (Valladolid). |
| 4 | `vmx.experience.section` (editorial) | manual | Por qué visitar. |
| 5 | `vmx.experience.features` (grid) | manual | 6 diferenciadores verificables. |
| 6 | `vmx.experience.section` (editorial) | manual | Historia del proyecto (matizada, `founder_review_required`). |
| 7 | `vmx.experience.section` (split) | manual | El Cenote Museo. |
| 8 | `vmx.experience.section` (editorial) | manual | El recorrido por Xibalbá (con guardrails culturales). |
| 9 | `vmx.experience.gallery` (mosaic) | `business` | Galería hidratada desde `business_media` (placeholder si vacío). |
| 10 | `vmx.experience.products` (grid) | `business` | Experiencias oficiales del operador ya cargadas. |
| 11 | `vmx.experience.info-grid` (cards) | `business` | Información práctica auto-hidratada. |
| 12 | `vmx.experience.section` (editorial) | manual | Planea tu visita + interlinking. |
| 13 | `vmx.experience.map` (single) | `business` | Ubicación geográfica. |
| 14 | `vmx.experience.related-collection` (grid) | `business` | Cenotes hermanos publicados en Valladolid. |
| 15 | `vmx.experience.reviews` (list) | `business` | Reseñas verificadas. |
| 16 | `vmx.experience.section` (editorial) | manual | Preguntas frecuentes. |
| 17 | `vmx.experience.cta-bar` (floating) | manual | CTA persistente: Reservar en sitio oficial + Agregar a mi viaje. |

## 3. Bloques reutilizados vs bloques nuevos

- **Nuevos**: 0.
- **Renderers modificados**: 0.
- **Contratos cambiados**: 0.
- **Rutas creadas**: 0.

La landing es 100 % composición editable en Experience Builder.

## 4. Campos actualizados en base de datos

- `page_compositions` (`biz-zazil-tunich`):
  - `current_draft`: reemplazado por el árbol editorial completo.
  - `active_revision_id`: apunta a la nueva revisión.
  - `status`: `published`.
  - `published_at`: actualizado.
- `page_revisions`: nueva fila con `revision_number` incrementado, notas `SEO.A3.M2 · First editorial draft (research-backed).`

No se modificó `businesses`, `products`, `business_media`, `business_locations`, `business_contacts` ni `business_hours`. La hidratación de esos bloques se apoya en los datos ya sembrados en SEO.A3.M1.

## 5. Evidencias de validación

- Verificación en BD: `SELECT status, jsonb_array_length(current_draft->'root'->'children') FROM page_compositions WHERE slug='biz-zazil-tunich'` → `published`, `17`.
- `active_revision_id` no nulo.
- Sin cambios de código: typecheck/build no requieren nueva compilación por esta acción (contenido puro en JSONB).
- Canonical, breadcrumbs y `LocalBusiness` JSON-LD ya son emitidos por `src/routes/oriente-maya/$destino.$categoria.$empresa.index.tsx` sin cambios.

## 6. SEO on-page

- Title, description, canonical y BreadcrumbList: sin cambios de código; heredados de la ruta paramétrica (`buildPublicHead`).
- H1 único: proviene del `vmx.experience.hero` (título "Zazil Tunich"). El resto de secciones usa H2.
- OG image: `cover_url` del negocio (ya integrado por la ruta).
- FAQ: publicadas dentro de una sección editorial. **Pendiente futuro**: cuando exista un bloque `vmx.experience.faq` oficial, migrar sin duplicar renderer; entonces se podrá emitir `FAQPage` JSON-LD estructurado.

## 7. Interlinking activado

- Sección "Planea tu visita" enlaza a `/oriente-maya/valladolid/cenotes` y `/oriente-maya/valladolid`.
- `related-collection` en modo `business` sirve cenotes hermanos publicados (via `getBusinessRelated`).
- CTA externo apunta a `https://zaziltunich.com/reservaciones/` claramente etiquetado como "Reservar en el sitio oficial".

## 8. Estado editorial

| Bloque | Contenido | Estado |
|--------|-----------|--------|
| Hero | verified (datos generales y distancias declaradas por el operador). |
| Por qué visitar / Features | verified con framings prudentes. |
| Historia | founder_review_required (redacción matizada; no afirma premios ni fechas). |
| Cenote Museo · Xibalbá | verified (interpretación, no hechos arqueológicos). |
| Experiencias | verified (proviene de `products` ya cargados en SEO.A3.M1). |
| Información práctica | verified/placeholder según lo que exista en `business_hours`, `business_contacts`, `business_locations`. |
| Planea tu visita | verified. |
| Ubicación | verified (coordenadas ya sembradas). |
| Reviews | verified sólo si hay reseñas cargadas; placeholder de lo contrario. |
| FAQ | verified (respuestas no comprometen datos operativos específicos). |
| CTA bar | verified. |

## 9. Riesgos pendientes

1. **Premios y reconocimientos**: la redacción actual los omite deliberadamente. Deben validarse con evidencia oficial antes de publicarse como afirmación.
2. **Precios / horarios**: no se hardcodean; se remite al operador. Cuando se validen se cargarán como datos del negocio, sin tocar la composición.
3. **Galería**: si `business_media` no tiene imágenes autorizadas, la galería se renderiza con placeholders. **Prohibido subir fotos de zaziltunich.com, Tripadvisor, blogs o redes sin autorización.**
4. **FAQ JSON-LD**: pendiente hasta que exista un bloque oficial FAQ.
5. **Localización**: la copia inicial está en español. El sistema i18n ya está preparado por bloque; la traducción a EN/FR/DE/IT/PT queda para Ola I2 de contenido editorial.

## 10. Rollback

Reversión inmediata sin tocar código:

```sql
-- Restaurar la revisión previa a SEO.A3.M2
UPDATE public.page_compositions
   SET active_revision_id = (
         SELECT id FROM public.page_revisions
          WHERE composition_id = 'REPLACE_WITH_COMPOSITION_ID'
          ORDER BY revision_number DESC OFFSET 1 LIMIT 1
       ),
       current_draft = (
         SELECT snapshot FROM public.page_revisions
          WHERE composition_id = 'REPLACE_WITH_COMPOSITION_ID'
          ORDER BY revision_number DESC OFFSET 1 LIMIT 1
       )
 WHERE slug = 'biz-zazil-tunich';
```

El Founder también puede revertir directamente desde Experience Builder (historial de revisiones).

## 11. Reglas respetadas

- Arquitectura reutilizable intacta (ruta paramétrica + composition-first + plantilla `__tpl_business__`).
- Cero código específico por empresa.
- Cero bloques nuevos, cero renderers nuevos.
- Sin canibalización de `zaziltunich.com` (title/H1/meta/canonical diferentes; sin copia extensa).
- Cero afirmaciones inventadas; todo dato operativo está marcado como pendiente cuando no hay fuente.
- Sin imágenes de terceros publicadas.

## 12. Aprobación requerida del Founder

1. Confirmar o corregir el tono editorial (T1 + T3 combinados con guardrails).
2. Validar el bloque "Historia del proyecto" con datos oficiales.
3. Autorizar reconocimientos y premios que se puedan citar con fuente.
4. Aportar galería con derechos claros (o autorizar uso de imágenes existentes del negocio).
5. Confirmar horarios, política de reserva y accesibilidad para elevarlas a `verified`.

---

**Fin del Completion Report SEO.A3.M2 v1.0**