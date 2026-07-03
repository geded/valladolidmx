## Estado del roadmap

Cerradas: 15.10.4b (Fases 1–4), 15.10.4c, 15.10.4d (US-01…US-16), 15.10.5a/b/c/d, 15.10.6 (PWA).

**Siguiente etapa oficial:** `15.10.7 — Empresas y productos: permisos por zona · onboarding multiempresa` (Plan 15.10 v1.0 §8, sólo la dimensión funcional; la administrativa la absorbió 15.10.4R).

## Alcance funcional pendiente

Dos capacidades, ambas empresariales, ambas reutilizan infraestructura existente (Workspace Engine, `user_roles`, `businesses`, `business_users`, `zones/regions`).

### A. Permisos por zona
Hoy un `admin` regional puede ver todo. Faltan permisos acotados a una o varias zonas geográficas para roles editoriales/operativos que sólo deben gestionar contenido/empresas de su zona.

- Nueva tabla `user_zone_scopes(user_id, zone_id, role, created_by, created_at)` + GRANTs + RLS.
- `has_zone_scope(_user_id, _zone_id, _role)` `SECURITY DEFINER`.
- Extender helpers `eb_can_edit_scope`, `business_can_manage`, `cms_can_edit` para respetar zona cuando el rol lo requiera.
- Filtros por zona en listados CMS/Portal/Admin (composición sobre queries existentes, sin duplicar UI).
- UI mínima en `/admin/sistema/usuarios`: asignar/revocar zonas por usuario (drawer del Workspace Inspector, cero nuevos layouts).

### B. Onboarding multiempresa
Un empresario con varias empresas hoy sólo opera una por sesión. Faltan:

- Selector "Empresa activa" en la Topbar del Workspace Portal (reutiliza `WorkspaceContextSwitcher` existente).
- Persistir `active_business_id` en `user_preferences` o `localStorage` con fallback.
- Onboarding contextual (reutiliza `OnboardingTour` de US-16) para el flujo "Agregar otra empresa" desde `/portal`.
- RPC `portal_register_additional_business` reutilizando el registro existente + auto-vínculo `business_users(role='owner')`.
- Invariante: todas las server fn del Portal ya reciben `business_id`; sólo el selector cambia el contexto activo.

## No incluye (fuera de 15.10.7)

- Smart Blocks (15.10.8), Responsive Builder avanzado (15.10.9), Recomendaciones Alux (15.10.10).
- Nuevos engines, layouts, sidebars o registries (Infrastructure Freeze).
- Cambios en BEA, Auth, Design System o Workspace Engine.

## Entregables

1. `15.10.7-BLUEPRINT-v1.0.md` — alcance, invariantes, matriz de permisos, delta vs Baseline v1.0.
2. Sprint plan en 2 sub-adendas:
   - **15.10.7.1** · Permisos por zona (tabla + helpers + filtros + UI de asignación).
   - **15.10.7.2** · Onboarding multiempresa (selector + persistencia + registro adicional).
3. Migración SQL con GRANTs y RLS obligatorios.
4. Sub-adendas se implementan **una historia a la vez** (regla Product Construction Mode) con Completion Report por cada una.

## Detalles técnicos

- Rutas nuevas: cero. Todo se compone sobre `/admin/sistema/usuarios`, `/portal/*`, Topbar del Workspace.
- Server fns nuevas: `assignUserZoneScope`, `revokeUserZoneScope`, `listUserZoneScopes`, `setActiveBusiness`, `registerAdditionalBusiness` — todas `createServerFn` + `requireSupabaseAuth` en `src/lib/admin/*.functions.ts` y `src/lib/portal/*.functions.ts`.
- RPC nuevas: `has_zone_scope`, `assign_zone_scope`, `revoke_zone_scope`, `portal_register_additional_business` — `SECURITY DEFINER`, `search_path=public`.
- Tabla nueva: `user_zone_scopes` con `UNIQUE(user_id, zone_id, role)`.
- RLS: sólo `super_admin`/`admin` pueden asignar/revocar; el usuario ve sus propios scopes.
- Reutiliza: `has_role`, `user_roles`, `business_users`, `WorkspaceInspector`, `WorkspaceContextSwitcher`, `OnboardingTour`.

## Validación

- `tsgo --noEmit` verde.
- Migraciones con GRANTs por tabla nueva.
- Prueba funcional con cuenta Fundador: crear scope zonal a un editor → editor sólo ve empresas de su zona → registrar segunda empresa desde `/portal` → cambiar contexto → operar sin recargar.
- Completion Report por sub-adenda + `15.10.7-CLOSURE-REPORT`.

## Aprobación solicitada

¿Autorizas arrancar por **15.10.7.1 · Permisos por zona** (empezando por la migración SQL + RPCs) y dejar 15.10.7.2 para después de su cierre?