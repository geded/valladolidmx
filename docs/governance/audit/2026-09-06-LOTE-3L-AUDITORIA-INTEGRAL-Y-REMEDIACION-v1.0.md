# Lote 3L · Auditoría integral pre-producción y remediación inmediata (v1.0)

Rama: `integration/lovable-valladolidmx` · sin publicar · sin ramas nuevas · sin tocar `main`.
Alcance: sitio público anónimo (36 páginas × 4 resoluciones), cuenta del viajero autenticado (17 páginas × 2 resoluciones), superficie de datos (PostgREST/RPC), servidor SSR, rendimiento estático y accesibilidad automatizada (axe-core). No se modificaron datos reales ni el diseño Premium aprobado.

## 1. Resumen ejecutivo

| Severidad | Hallazgo | Estado |
| --- | --- | --- |
| P0 | RPC `get_orders_needing_trip_email` ejecutable por anónimos exponía folio, `user_id`, email y nombre de viajeros con órdenes pagadas | **CORREGIDO** (migración: `REVOKE EXECUTE` a `PUBLIC/anon/authenticated`, solo `service_role`). Verificado: anónimo → HTTP 401 |
| P1 | Bug silencioso: `traveler-lens.functions.ts` desanclaba `context.supabase.rpc` → `TypeError (reading 'rest')` en cada apertura del dock autenticado; el contexto concierge llegaba siempre vacío | **CORREGIDO**. Verificado con sesión real: la lente responde 200 con `concierge` y no se registran nuevos fallos en el log |
| P1 | Portada: banda Mi Viaje imprimía "undefined · undefined · undefined paradas" y el panel "Ruta activa" mostraba campos vacíos cuando el CMS no tiene rutas | **CORREGIDO** (`describeRoute` solo compone datos presentes; panel oculto sin ruta). Verificado: 0 apariciones de `undefined` en el HTML |
| P1 | Sin cabeceras de seguridad en respuestas SSR | **CORREGIDO parcialmente**: `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` en `src/server.ts`. CSP y `X-Frame-Options` quedan pendientes (ver §5) |
| P1 | Tres ganchos de cron (`trip-journey-emails`, `visibility-notifications`, `coupon-review-reminders`) aceptan la **clave publicable** (pública en el bundle) como credencial | **NO CORREGIDO — requiere decisión** (ver §5.1) |
| P1 | Contraste `text-primary` (#eaa840) sobre crema: 1.85–2.02:1 (mínimo 4.5:1). 235–273 violaciones por resolución en anónimo; 33–41 en portada autenticada | **NO CORREGIDO** — implica cambiar token de color del diseño Premium (prohibido en este lote). Ver §5.2 |
| P2 | `/arma-tu-viaje` con 2 `h1`; `/cuenta` con 2 `h1` ("Mi Cuenta" del shell + saludo) | Pendiente (presentación) |
| P2 | `/cuenta/perfil`: `select` de país sin nombre accesible; una etiqueta de formulario huérfana | Pendiente |
| P2 | `/portal` y `/cms` en modo "acceso denegado" no renderizan `<main>` | Pendiente |
| P2 | `target-size` (< 24 px) en 390 px en favoritos, mis-cupones, notificaciones, historial, actividad, concierge, anfitrión, perfil público | Pendiente |
| P2 | `definition-list`/`dlitem` (estructura `dl` con hijos no permitidos) en varias fichas; `scrollable-region-focusable` en carruseles móviles | Pendiente |
| P2 | `CLS` 0.102 en Región a 834 px (umbral 0.1); resto ≤ 0.087 | Pendiente (reservar altura del hero/medios) |
| P2 | Landings SEO en `/preview/composition/<token>` devuelven 200 sin `h1`/`main` cuando el token expiró (pantalla de token inválido) | Comportamiento esperado; conviene devolver 410/404 |
| P2 | `record_business_view_event`, `expire_stale_coupons`, `expire_visibility_grants` ejecutables por anónimo | Riesgo bajo (idempotentes / métricas); revisar en lote de endurecimiento |
| INFO | Linter Supabase: 4 tablas con RLS sin políticas, 1 función sin `search_path`, 2 extensiones en `public`, 39 SECURITY DEFINER ejecutables por anónimo (todas con verificación interna de rol salvo las listadas arriba), 228 por autenticados | Inventariado; sin cambios |

## 2. Superficie de datos (PostgREST / RPC)

- Se probaron como anónimo las funciones SECURITY DEFINER con nombre administrativo: `admin_travel_plan_overview`, `admin_list_active_travel_plans` → 401 `forbidden` (verificación interna correcta). `admin_ops_attention_queue` → 400 `invalid input syntax for type boolean: "(f,f)"` (error interno antes del guard; no filtra datos pero conviene corregir el cast).
- `efp_can_read_row` → `false`; `publish_business`, `create_owned_business`, `set_business_response`, `concierge_create_*` exigen `auth.uid()`/`is_admin` (revisadas por definición, no ejecutadas).
- **P0 corregido**: `get_orders_needing_trip_email(_kind)` no tenía ningún guard y devolvía PII de `concierge_orders` + `travel_plans` según ventanas de correo (t14, t3, welcome, post). Devolvía `[]` en este momento solo porque no había órdenes en ventana. El único consumidor legítimo es `src/routes/api/public/hooks/trip-journey-emails.ts` con `service_role`, que conserva el permiso.
- `cron.job`: 8 trabajos; los que llaman ganchos HTTP envían únicamente `apikey` (ver §5.1).

## 3. Auditoría automatizada del sitio (Playwright + axe-core)

### 3.1 Anónimo — 36 páginas × 1440 / 834 / 430 / 390
- Desbordamiento horizontal: 0 en todas las resoluciones.
- Imágenes rotas: 0. Errores de página (JS): 0.
- `h1 ≠ 1`: `/arma-tu-viaje` (2) y landings SEO con token expirado (0).
- axe (crítico/serio): `color-contrast` 273 / 241 / 235 / 235; `definition-list`, `dlitem`; `scrollable-region-focusable` en 430/390.
- CLS máximo: 0.087 / 0.102 / 0.025 / 0.023.
- `draft-place` (`/oriente-maya/tinum/lugares/chichen-itza`) responde 200 a anónimo con `noindex,nofollow`; `draft-dest` (`/oriente-maya/temozon`) idem. Aceptable para preview; confirmar política antes de producción.

### 3.2 Viajero autenticado (`demo.traveler.3j3`) — 17 páginas × 1440 / 390
- Todas las rutas de `/cuenta/*` responden 200 sin errores de página ni desbordamiento.
- Guardas de rol: `/portal` y `/cms` → pantalla de acceso denegado; `/admin` → redirección a `/cuenta/mi-viaje`. PASA.
- Portada autenticada: `RefererNotAllowedMapError` de Google Maps en consola (solo `localhost`; fuera del alcance — mapas prohibidos en este lote).
- Hallazgos P2 detallados en §1.

## 4. Rendimiento (build de producción, estático)
- JS cliente: 4 358 KB sin comprimir en 565 chunks; entrada `index-*.js` ≈ 200 KB gz. Chunk más pesado `html5-qrcode` (360 KB raw / 104 KB gz), ya cargado bajo demanda en `/portal/canjear`.
- Imágenes de destino servidas a 2 000 px con `cache-control: public, max-age=300` — candidato a variantes responsivas y caché más larga (fuera de alcance).
- `dist/client/_headers` solo cubre `/assets/*` con caché inmutable; las cabeceras de seguridad se añaden ahora en el servidor.
- LCP medido en servidor de desarrollo (5–10 s) no es representativo; no se reporta como métrica.

## 5. Decisiones pendientes del Founder

### 5.1 Ganchos de cron con clave publicable
`trip-journey-emails`, `visibility-notifications` y `coupon-review-reminders` aceptan `apikey == SUPABASE_PUBLISHABLE_KEY` como alternativa a `EB_CRON_SECRET`. Esa clave es pública, por lo que cualquiera puede disparar el envío de correos transaccionales/notificaciones (idempotentes por marcas `email_*_sent_at`, pero con coste y ruido). Remediación propuesta (no ejecutada por tocar secretos y `cron.job`): guardar `EB_CRON_SECRET` en Vault, actualizar los tres trabajos para enviar `x-cron-secret`, y eliminar la alternativa `apikeyMatch` en los tres archivos.

### 5.2 Contraste del color primario
`--primary` (#eaa840) como color de texto sobre crema no alcanza 4.5:1. Opciones: (a) token de texto derivado más oscuro solo para texto (`--primary-foreground-on-light`), manteniendo el ámbar en fondos y acentos; (b) aceptar el riesgo en textos decorativos y corregir solo eyebrows/enlaces. Requiere aprobación de diseño.

### 5.3 CSP y X-Frame-Options
No se añadieron para no romper la vista previa embebida ni los scripts ya integrados (Google Maps, pasarela IA, Supabase). Requieren inventario de orígenes y prueba en el dominio publicado.

## 6. Cambios realizados

| Archivo | Cambio |
| --- | --- |
| Migración `l3l_revoke_public_exec_get_orders_needing_trip_email` | `REVOKE EXECUTE` a `PUBLIC`, `anon`, `authenticated`; `GRANT` a `service_role` |
| `src/lib/alux/traveler-lens.functions.ts` | Llamada `rpcClient.rpc(...)` conservando `this` |
| `src/components/home-premium/HomePremiumSurface.tsx` | `describeRoute()`; banda Mi Viaje y panel "Ruta activa" sin `undefined` |
| `src/server.ts` | `withBaselineSecurityHeaders` (nosniff, referrer-policy, permissions-policy) también en la página de error 500 |

## 7. Validaciones
- `bunx tsgo --noEmit`: limpio.
- ESLint sobre archivos modificados: limpio.
- `bun test`: 825 / 825 (75 archivos).
- Cabeceras verificadas en `GET /` del servidor local.
- Suite anónima 36 × 4 y autenticada 17 × 2 ejecutadas con Playwright (`/tmp/browser/l3l/audit.py`, `audit_auth.py`, `lens_check.py`).
- Linter Supabase tras la migración: 274 avisos (−2 respecto al inicio); ninguno nuevo.

## 8. Límites respetados
Sin publicar ni desplegar; sin ramas nuevas, PR ni merge; sin tocar `main`; sin cambios de tokens, colores, tipografía ni jerarquía; sin pagos, reservas, mapas, monitoreo, analítica nueva, flags, dominios, claves ni APIs; datos y medios demo intactos; solo se restringió el permiso de una función de base de datos.
