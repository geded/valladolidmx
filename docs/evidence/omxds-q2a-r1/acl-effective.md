# G8-Q2A-R1 · ACL efectivo posterior

**Fecha:** 2026-08-28 · **Flag:** `omxds_visual_v1_contracts_enabled = false`

## 1. Tablas `place_*` (base compartida, lectura de catálogo del sistema)

| Tabla | anon | authenticated | service_role |
|---|---|---|---|
| `place_types` | `r` | `arwd` | `arwdDxtm` |
| `place_categories` | `r` | `arwd` | `arwdDxtm` |
| `place_authority_kinds` | `r` | `arwd` | `arwdDxtm` |
| `place_category_links` | `r` | `arwd` | `arwdDxtm` |
| `place_hours` | `r` | `arwd` | `arwdDxtm` |
| `place_media` | `r` | `arwd` | `arwdDxtm` |
| `place_products` | `r` | `arwd` | `arwdDxtm` |
| `place_events` | `r` | `arwd` | `arwdDxtm` |
| `place_authorities` | **sin privilegio alguno** | `arwd` | `arwdDxtm` |

Cada tabla recibió `REVOKE ALL ... FROM PUBLIC, anon, authenticated` antes de los
grants mínimos. No hay `TRUNCATE`, `REFERENCES` ni `TRIGGER` para roles de aplicación.
El privilegio de escritura de `authenticated` es el mínimo exigido por RLS: sin él,
las políticas `*_staff_write` no podrían ejecutarse para editor/admin/super_admin.

## 2. Tablas fuera de alcance

`points_of_interest` conserva su ACL histórico
`{postgres, anon=arwdDxtm, authenticated=arwdDxtm, service_role=arwdDxtm}`
por decisión expresa del Founder. Tampoco se tocó `destinations`, `businesses`,
`products`, `events`, `media_assets` ni ningún default privilege global.

## 3. Prueba de que el ACL amplio no elude RLS

En el clúster efímero se creó un rol con `GRANT ALL ON public.points_of_interest`
que no es nombrado por ninguna política. Resultado empírico: `SELECT` devuelve
**cero filas** con éxito sintáctico. El privilegio de tabla habilita el intento;
la RLS decide la visibilidad. Complementariamente, `anon` con ACL histórico amplio
sólo puede leer lugares publicados (`poi_public_read`) y no puede escribir, porque
`poi_staff_write` exige `is_editor_or_admin(...) OR has_permission(..., 'poi.write')`.

## 4. Deuda registrada

El endurecimiento del ACL de `points_of_interest` queda como **deuda separada**,
sujeta a inventario de consumidores históricos y autorización posterior del Founder.
