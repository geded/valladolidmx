# Auditoría · G8-Q2A · Reconciliación de RLS de `points_of_interest`

**Fecha:** 2026-08-28 · **Estado:** Approved · **Owner:** Núcleo de Gobernanza

## 1. Problema

Las políticas permisivas de PostgreSQL se combinan mediante `OR`. Añadir una matriz nueva
sobre `points_of_interest` sin retirar las políticas históricas habría dejado dos caminos
de escritura simultáneos y no auditados.

## 2. Inventario previo

1. `geo editor manage poi` — `FOR ALL TO authenticated`, `is_editor_or_admin(auth.uid())`.
2. `poi_perm_write` — `FOR ALL TO authenticated`, `has_permission(auth.uid(),'poi.write')`.
3. `poi_public_read` — `FOR SELECT TO anon, authenticated`, publicados no borrados.

## 3. Análisis de equivalencia

`poi.write` está asignado en `role_permissions` únicamente a `admin` y `editor`.
`is_editor_or_admin` resuelve `editor`, `admin` y `super_admin`. Ambos caminos son
staff-only y su unión es exactamente el acceso legítimo previo.

## 4. Decisión

- Se retiran (1) y (2).
- Se crea una única política `poi_staff_write` con el predicado unión.
- Se conserva (3) sin cambio.
- El snapshot para rollback queda en `docs/evidence/omxds-q2a/policy-snapshot.sql`.

## 5. Verificación posterior

`pg_policy` sobre `points_of_interest` contiene exactamente `poi_public_read` y
`poi_staff_write`. Ninguna política histórica sobrevive. `anon`, `traveler`,
`business_owner` y `concierge` no obtienen escritura directa ni indirecta; las funciones
`SECURITY DEFINER` añadidas repiten la misma verificación de staff y no son ejecutables
por `anon`.

## 6. Rollback

Aditivo e idempotente: eliminar `poi_staff_write`, recrear las dos políticas del snapshot
y, si se requiere, retirar las tablas `place_*` y las columnas añadidas. Ningún dato
turístico fue creado ni modificado, por lo que el rollback no implica pérdida de contenido.
