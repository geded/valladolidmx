# G8-Q2A · Matriz RLS efectiva

**Fecha:** 2026-08-28 · **Alcance:** `points_of_interest` y tablas `place_*`.

## 1. Inventario previo y adjudicación

| Política previa | Predicado | Adjudicación |
|---|---|---|
| `geo editor manage poi` (ALL) | `is_editor_or_admin(auth.uid())` | Retirada y absorbida |
| `poi_perm_write` (ALL) | `has_permission(auth.uid(),'poi.write')` | Retirada y absorbida |
| `poi_public_read` (SELECT) | `status='published' AND deleted_at IS NULL` | Conservada sin cambio |

Las políticas permisivas se combinan con `OR`; por eso ambas escrituras históricas se
consolidan en **una sola** política explícita con el mismo predicado unión, sin ampliar
ni reducir acceso legítimo:

```
poi_staff_write  FOR ALL TO authenticated
  USING/CHECK  is_editor_or_admin(uid) OR has_permission(uid,'poi.write')
```

Verificación de equivalencia: `poi.write` está concedido exclusivamente a los roles
`admin` y `editor` (`role_permissions`); `is_editor_or_admin` cubre `editor`, `admin` y
`super_admin`. La unión resultante es idéntica a la anterior. No queda ninguna política
histórica capaz de eludir la nueva matriz — el estado final de `pg_policy` sobre
`points_of_interest` es exactamente `poi_public_read` + `poi_staff_write`.

## 2. Matriz efectiva por rol

| Tabla | anon | traveler | business_owner | concierge | editor / admin / super_admin | service_role |
|---|---|---|---|---|---|---|
| `points_of_interest` | lectura de publicados | lectura de publicados | lectura de publicados | lectura de publicados | lectura + escritura | total |
| `place_types` | lectura activa | lectura activa | lectura activa | lectura activa | lectura + escritura | total |
| `place_categories` | lectura activa | lectura activa | lectura activa | lectura activa | lectura + escritura | total |
| `place_authority_kinds` | lectura activa | lectura activa | lectura activa | lectura activa | lectura + escritura | total |
| `place_category_links` | lectura si el lugar está publicado | ídem | ídem | ídem | lectura + escritura | total |
| `place_hours` | lectura si el lugar está publicado | ídem | ídem | ídem | lectura + escritura | total |
| `place_media` | lectura si el lugar está publicado | ídem | ídem | ídem | lectura + escritura | total |
| `place_authorities` | **sin acceso** | sin acceso | sin acceso | sin acceso | lectura + escritura | total |

`traveler`, `business_owner`, `concierge` y `anon` no obtienen ninguna vía de escritura,
directa ni indirecta: ninguna política los nombra y las tres funciones administrativas
verifican el mismo predicado de staff antes de escribir.

## 3. Funciones administrativas

| Función | `anon` EXECUTE | `authenticated` EXECUTE | Guardia interna |
|---|---|---|---|
| `admin_create_place` | no | sí | staff + `place_type_id` activo obligatorio |
| `admin_update_place_details` | no | sí | staff + prohibición de vaciar el tipo |
| `admin_set_place_categories` | no | sí | staff |
| `place_duplicate_warnings` | no | sí | sólo advertencia, nunca bloquea |

Verificado con `has_function_privilege`: `anon = false`, `authenticated = true` en las cuatro.
