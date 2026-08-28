# G8-Q2A-R1 · Matriz RLS empírica (clúster efímero)

**Fecha:** 2026-08-28 · **Arnés:** `scripts/omxds/q2a-r1/rls-harness.mjs`
**Salida cruda:** `rls-harness-output.json` · **Resultado:** PASS

El arnés levanta un clúster PostgreSQL 17.9 **local y efímero**, reproduce los
helpers reales (`auth.uid()`, `is_editor_or_admin`, `has_permission`, `set_updated_at`,
`user_roles`, `role_permissions`), aplica las migraciones Q2A y Q2A-R1 verbatim y
prueba los ocho sujetos con `SET LOCAL ROLE` + `request.jwt.claim.sub`. No crea
usuarios ni modifica roles en la base compartida, y nunca escribe en ella.

| Sujeto | read_place_types | read_published_place | read_draft_place | read_place_products | read_place_events | read_place_authorities | write_place_hours | write_place_products | write_place_authorities | exec_duplicate_warnings |
|---|---|---|---|---|---|---|---|---|---|---|
| `anon` | filas=15 | filas=1 | filas=0 | filas=1 | filas=1 | DENEGADO | DENEGADO | DENEGADO | DENEGADO | DENEGADO |
| `traveler` | filas=15 | filas=1 | filas=0 | filas=1 | filas=1 | filas=0 | DENEGADO | DENEGADO | DENEGADO | DENEGADO |
| `business_owner` | filas=15 | filas=1 | filas=0 | filas=1 | filas=1 | filas=0 | DENEGADO | DENEGADO | DENEGADO | DENEGADO |
| `concierge` | filas=15 | filas=1 | filas=0 | filas=1 | filas=1 | filas=0 | DENEGADO | DENEGADO | DENEGADO | DENEGADO |
| `editor` | filas=15 | filas=1 | filas=1 | filas=1 | filas=1 | filas=1 | PERMITIDO | PERMITIDO | PERMITIDO | filas=1 |
| `admin` | filas=15 | filas=1 | filas=1 | filas=1 | filas=1 | filas=1 | PERMITIDO | PERMITIDO | PERMITIDO | filas=1 |
| `super_admin` | filas=15 | filas=1 | filas=1 | filas=1 | filas=1 | filas=1 | PERMITIDO | PERMITIDO | PERMITIDO | filas=1 |
| `service_role` | filas=15 | filas=1 | filas=1 | filas=1 | filas=1 | filas=1 | PERMITIDO | PERMITIDO | PERMITIDO | DENEGADO |

## Lecturas del resultado

1. **Cero exposición de borradores.** `anon`, `traveler`, `business_owner` y
   `concierge` ven cero lugares en estado `draft`, tanto por consulta directa como
   a través de la función de duplicados.
2. **`place_authorities` es staff-only.** `anon` recibe `DENEGADO` a nivel de ACL
   (no tiene privilegio); los tres roles autenticados no staff reciben cero filas
   por RLS. Doble barrera, ACL + RLS.
3. **Escritura sólo para staff.** Ninguno de los cuatro sujetos no staff puede
   escribir en ninguna tabla `place_*`, directa ni indirectamente.
4. **`place_duplicate_warnings` ya no filtra borradores.** Con `SECURITY INVOKER`
   y guardia interna, los cuatro sujetos no staff reciben `not authorized`; el
   staff obtiene el resultado con la RLS del propio llamante. `service_role` también
   recibe `DENEGADO` porque no porta identidad (`auth.uid()` nulo): comportamiento
   deseado, la función es una ayuda de redacción del CMS, no un servicio de sistema.
5. **El ACL amplio no elude RLS.** Un rol con `GRANT ALL` sobre
   `points_of_interest` que ninguna política nombra obtiene cero filas.
