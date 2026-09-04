# Lote 3A · Remediación P0 de RLS (business_owner)

**Fecha:** 2026-09-04 · **Rama:** `integration/lovable-valladolidmx` · **Estado:** Ejecutado y verificado

## 1. Hallazgo remediado (Lote 2.2, sección 8)

`business_owner` tenía en `role_permissions` los permisos globales `businesses.write` y
`products.write`. Las políticas `businesses_perm_write`, `products_perm_write` y
`promotions_perm_write` (`FOR ALL … USING has_permission(...)`) concedían por tanto lectura y
escritura sobre **todas** las filas, incluidas empresas y productos ajenos, además de permitir
autopublicarse, autoverificarse y subir `visibility_level` a `premium`.

## 2. Cambios aplicados (aditivos y reversibles)

Políticas recreadas (se añade la condición de personal interno; el resto del predicado no cambia):

| Tabla | Política | Predicado nuevo |
| --- | --- | --- |
| `businesses` | `businesses_perm_write` | `is_editor_or_admin(auth.uid()) AND has_permission(auth.uid(),'businesses.write')` |
| `products` | `products_perm_write` | `is_editor_or_admin(auth.uid()) AND has_permission(auth.uid(),'products.write')` |
| `promotions` | `promotions_perm_write` | `is_editor_or_admin(auth.uid()) AND has_permission(auth.uid(),'businesses.write')` |

Funciones y disparadores nuevos:

- `public.enforce_reserved_business_fields()` + `trg_enforce_reserved_business_fields`
  (BEFORE UPDATE ON `businesses`).
- `public.enforce_reserved_product_fields()` + `trg_enforce_reserved_product_fields`
  (BEFORE UPDATE ON `products`).

Regla de ambos disparadores para actores que **no** son `editor`/`admin`/`super_admin`:

- `businesses`: `verified`, `published_at`, `can_self_publish` inmutables; `status` sólo
  `draft|archived → in_review` y `in_review → draft`.
- `products`: `visibility_level`, `published_at` inmutables; `status` con la misma restricción.

`EXECUTE` revocado a `PUBLIC`, `anon` y `authenticated` en ambas funciones.

No se modificó `role_permissions`, ni datos, ni contenido demo, ni flags, ni pagos/reservas.
No se tocó código de aplicación: la UI del Portal ya no exponía controles reservados
(verificado en Lote 2.2) y las rutas legítimas (`submit_business_for_review`,
`transition_content_status`) siguen operando.

## 3. Matriz de verificación autenticada (22/22 PASS)

Cuenta ficticia temporal `test-owner-lote3a@demo.example.com` (rol `business_owner`, membresía
`owner` en la empresa DEMO `585111bb…`), creada y eliminada en el mismo turno.

| Caso | Resultado |
| --- | --- |
| Editar y revertir `tagline` de empresa propia | PASS (permitido) |
| `status='published'` en empresa propia | PASS (bloqueado · `reserved_field:status`) |
| `verified=true` en empresa propia | PASS (bloqueado · `reserved_field:verified`) |
| `published_at` en empresa propia | PASS (bloqueado · `reserved_field:published_at`) |
| `can_self_publish=true` en empresa propia | PASS (bloqueado · `reserved_field:can_self_publish`) |
| Enviar a revisión y retirar (`draft↔in_review`) | PASS (permitido) |
| Leer borrador de empresa ajena | PASS (0 filas) |
| Editar / publicar / verificar empresa ajena | PASS (0 filas) |
| Editar y revertir `tagline` de producto propio | PASS (permitido) |
| `visibility_level='premium'` en producto propio | PASS (bloqueado) |
| `status='published'` / `published_at` en producto propio | PASS (bloqueado) |
| `visibility_level` y `tagline` en producto ajeno | PASS (0 filas) |
| Datos demo idénticos antes/después (2 empresas + 1 producto) | PASS |
| Sin residuos de cuenta, rol, perfil ni membresía temporal | PASS |

Bloqueo por UI: el Portal Empresa no renderiza controles de publicación, verificación,
Premium/Destacado ni posicionamiento (evidencia del Lote 2.2, sección 8).

## 4. Controles de cierre

- Typecheck limpio · `bun run build` OK · `bun test scripts/` 756/756.
- Linter de seguridad: 279 → 275 hallazgos (todos preexistentes y fuera de alcance).

## 5. Rollback

Recrear las tres políticas sin la condición `is_editor_or_admin(...)` y ejecutar
`DROP TRIGGER … ; DROP FUNCTION public.enforce_reserved_business_fields(); DROP FUNCTION
public.enforce_reserved_product_fields();`. No hay pérdida de datos: la remediación es
puramente de control de acceso.
