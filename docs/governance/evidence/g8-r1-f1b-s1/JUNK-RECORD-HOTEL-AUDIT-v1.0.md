# G8-R1-F1B-S1 · Auditoría del registro basura `hotel` — v1.0 (read-only)

No se borró, modificó ni publicó nada. Este documento sólo audita el registro y propone una
cuarentena reversible para autorización del Founder.

## 1. Identificación

| Campo | Valor |
| --- | --- |
| `id` | `1f08a9c7-225c-4cc2-8a71-7e65a9af0bc7` |
| `slug` | `hotel` |
| `display_name` | `Hotel` |
| `status` | `draft` |
| `verified` | `false` |
| `is_demo_seed` | `false` (**no** es demo: es un alta real incompleta) |
| `destination_id` | `11111111-aaaa-4aaa-8aaa-000000000001` (Valladolid) |
| `created_at` | 2026-07-11 |

Diagnóstico: alta de prueba del propio equipo, abandonada a medio registro. Nombre genérico,
sin descripción, sin categoría, sin coordenadas.

## 2. Relaciones existentes

| Relación | Filas | Nota |
| --- | --- | --- |
| `business_users` | 1 | rol `owner`, estado **`pending`** (nunca aceptó) |
| `business_locations` | 1 | “calle 41, enfrente de xoul”, CP 97784, **latitude/longitude = NULL** |
| `business_contacts` | 2 | teléfono y correo **personales de una persona física real** |
| `business_category_links` | 0 | |
| `business_media` | 0 | |
| `business_hours` | 0 | |
| `products` | 0 | |
| `seo_metadata` | 0 | |
| `traveler_favorites` | 0 | |
| `travel_plan_items` | 0 | |
| `page_redirects` | 0 | |

Cero dependencias de viajeros, cero contenido publicado, cero URL indexada.

## 3. Riesgos

1. **Dato personal expuesto por diseño futuro**: los dos contactos están marcados `is_public=true`
   y contienen un correo y un teléfono personales. Hoy no se exponen porque la ficha está en
   `draft`, pero cualquier publicación accidental o listado que ignore `status` los mostraría.
2. **Ruido en inventario y métricas**: aparece como empresa de Valladolid en conteos internos,
   selectores del CMS y futuras validaciones del piloto editorial.
3. **Colisión de slug de alto valor**: `hotel` es un slug genérico y deseable; ocupado por un
   registro vacío bloquea usos legítimos (landing SEO, categoría, ficha real).
4. **Incumple mínimos del piloto**: sin coordenadas (Geolocation Mandatory Rule), sin categoría,
   sin medios, sin SEO. Nunca podrá pasar `canBePublic()`.

## 4. Recomendación: cuarentena reversible (NO ejecutada)

Prohibido `DELETE` en esta fase: destruye trazabilidad y rompe la política append-only del proyecto.
Propuesta de cuarentena, reversible y auditable, sujeta a autorización expresa:

1. Renombrar el slug a `zz-registro-incompleto-1f08a9c7` (libera el slug `hotel`; el trigger de
   redirección 301 no actúa sobre fichas `draft` nunca publicadas).
2. Marcar `record_origin='editorial'` y `source_review_state='rejected'` con nota interna.
3. Marcar los dos `business_contacts` como `is_public=false` (mitiga el riesgo de dato personal
   sin borrar el dato ni la trazabilidad).
4. Registrar la operación en `content_audit_log` con `reason='junk_record_quarantine'`.
5. Rollback trivial: restaurar `slug`, `is_public` y estados desde el propio registro de auditoría.

Alternativa mínima si el Founder prefiere no tocar nada: dejar el registro como está y añadirlo a
la lista de exclusiones del manifiesto editorial del piloto. En ese caso persiste el riesgo 1.

## 5. Estado

**Pendiente de decisión del Founder.** Ninguna de las acciones anteriores fue aplicada.
