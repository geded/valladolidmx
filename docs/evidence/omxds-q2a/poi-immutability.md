# G8-Q2A · Prueba de no mutación de los cinco POI existentes

**Fecha:** 2026-08-28 · **Consulta:** `select name, slug, status, place_type_id, updated_at from points_of_interest order by name`

Estado posterior a la migración:

| Nombre                                 | Slug                      | Estado    | `place_type_id` | `updated_at`                  |
| -------------------------------------- | ------------------------- | --------- | --------------- | ----------------------------- |
| Calzada de los Frailes                 | `calzada-de-los-frailes`  | published | `NULL`          | 2026-07-03 17:24:08.785054+00 |
| Cenote Ik Kil                          | `cenote-ik-kil`           | published | `NULL`          | 2026-07-03 17:24:08.785054+00 |
| Cenote Suytun                          | `cenote-suytun`           | published | `NULL`          | 2026-07-03 17:24:08.785054+00 |
| Cenote Zací                            | `cenote-zaci`             | published | `NULL`          | 2026-07-03 17:24:08.785054+00 |
| Ex Convento de San Bernardino de Siena | `convento-san-bernardino` | published | `NULL`          | 2026-07-03 17:24:08.785054+00 |

Acreditaciones:

1. `updated_at` conserva el valor original de 2026-07-03 en las cinco filas: no hubo `UPDATE`.
2. No hubo backfill al tipo `otro`; `place_type_id` permanece `NULL` en las cinco.
3. `place_type_id` es **nullable** por diseño y así queda documentado en el comentario de columna.
4. La clasificación real de estos cinco lugares queda diferida a **G8-Q2C**.
5. La transición futura a `NOT NULL` sólo procede después de clasificar y acreditar todos los registros existentes.
6. Filas nuevas de lugares creadas en G8-Q2A: **0**.
