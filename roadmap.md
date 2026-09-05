# Roadmap

## En curso

- [x] Estandarización transversal del breadcrumb móvil (primitiva compartida `CompactCrumbs`, unificación `BreadcrumbTerritorial` + `PremiumTerritorialBreadcrumb`, activación en listados/perfiles/previews, eliminación de breadcrumb duplicado en destino).
- [ ] QA responsive 390/430/834/1440 de la estandarización del breadcrumb.
- [x] Lote 1 · Integridad técnica y contratos: auditoría y reparación de los 4 hallazgos rojos de `bun test scripts/` (1 fail + 3 errors) — todos clasificados como contrato obsoleto; suite 756/756, typecheck y build en verde.
- [x] Lote 2 · Auditoría autenticada y Matriz de Capacidades OMXDS (sólo lectura, sin reparación): informe en `docs/governance/audit/2026-09-04-LOTE-2-AUDITORIA-AUTENTICADA-Y-MATRIZ-OMXDS-v1.0.md`. UI autenticada NO VERIFICADA por falta de sesión de prueba (no hay usuarios `business_owner`/`concierge`); evidencia estática + consultas de sólo lectura a Lovable Cloud.
- [x] Lote 2.1 · Addendum de reconciliación read-only: `docs/governance/audit/2026-09-04-LOTE-2.1-ADDENDUM-RECONCILIACION-v1.1.md`. Corrige 4 hechos del Lote 2 (Home SÍ publica desde CMS con 33 revisiones; el copy/medios siguen en código; no existe cobro real — `payments.demo_mode=true`, 0 órdenes/eventos de pago; 0 productos demo publicados, los 8 publicados son eventos). Route Inventory falla con 3 rutas y no está cableado en la suite. Autenticación runtime sigue NO VERIFICADA (runbook incluido).
- [ ] Lote 3 en adelante: pendiente de autorización del Founder. Secuencia recomendada P0: retirar `DESTINOS_MOCK` de superficies públicas → cerrar Route Inventory y cablearlo en la suite → exponer copy/medios de Home en el Constructor → decidir el destino de los 8 eventos DEMO indexables.
- [ ] Revisión de copy en Lote 3: "Oriente Maya" sin marca larga en las vistas previas de experiencia y evento (excepción documentada en el contrato G5).
- [x] Lote 2.2 · Verificación autenticada controlada: `docs/governance/audit/2026-09-04-LOTE-2.2-VERIFICACION-AUTENTICADA-CONTROLADA-v1.2.md`. BLOQUEADO por el entorno — la emisión de sesión para un usuario concreto exige aprobación interactiva no disponible, y las cuentas ficticias creadas por alta pública no pueden iniciar sesión (`email_not_confirmed`) sin activar la autoconfirmación de correo del proyecto (prohibido). Matriz por rol y capacidad íntegramente NO VERIFICADA, sin PASS simulado. Artefactos temporales (2 cuentas de sondeo + perfiles y roles automáticos) eliminados sin residuos: 7 usuarios antes y después. Runbook con 3 opciones para desbloquear.
- [x] Lote 2.2 · Reanudación admin (2026-09-04 16:55 UTC, sección 6 del mismo informe): la sesión iniciada manualmente por el Founder en el preview NO se propagó al entorno del agente (`LOVABLE_BROWSER_AUTH_STATUS = signed_out`, variables de sesión vacías). Detención conforme a la instrucción: sin emitir sesión, sin crear cuentas, sin tocar autenticación. Matriz admin/super_admin íntegramente NO VERIFICADA. HEAD antes y después `afe02c56aade20356eec3da8e1675789053448bd`, árbol limpio, cero artefactos temporales.

- 2026-09-04 · Lote 2.2 · Verificación autenticada admin/super_admin EJECUTADA con sesión del preview: 13 superficies PASS, Marca sin superficie (FAIL), edición+persistencia+reversión PASS sobre producto DEMO. Sección 7 del informe. business_owner/concierge siguen NO VERIFICADOS. Sin avanzar al Lote 3.

- 2026-09-04 · Lote 2.2 · Sección 8: verificación autenticada `business_owner` y `concierge` EJECUTADA con cuentas ficticias temporales (creadas y eliminadas en el mismo turno; 7 usuarios antes y después, 0 residuos). business_owner: Portal, lectura, edición+persistencia+reversión, atributos, medios y ausencia de controles de publicación en UI = PASS; **FAIL P0**: por Data API sí puede publicarse, verificarse, fijar `published_at` y poner `visibility_level='premium'` en un producto de otra empresa (escrituras revertidas). concierge: workspace, bandeja "Sin asignar" con 2 expedientes demo, aislamiento vs empresa/CMS/admin y alcances `lead`/`admin` bloqueados = PASS; **FAIL P1**: el detalle de expediente no asignado renderiza en blanco (`concierge_case_get` → forbidden). Sin avanzar al Lote 3.
- [ ] P0 (Lote 3, pendiente de autorización): endurecer RLS de `businesses` (`status`, `verified`, `published_at`, lectura de borradores ajenos) y de `products.visibility_level` (escritura cruzada entre empresas).
- [x] Lote 3A · Remediación P0 de RLS: `businesses_perm_write`/`products_perm_write`/`promotions_perm_write` restringidas a personal interno + disparadores `enforce_reserved_business_fields`/`enforce_reserved_product_fields` (publicación, verificación, `published_at`, `can_self_publish`, `visibility_level` reservados). 22/22 PASS con cuenta temporal eliminada; typecheck, build y 756/756. Informe: `docs/governance/audit/2026-09-04-LOTE-3A-REMEDIACION-P0-RLS-v1.0.md`. Lote 3B NO iniciado.

## Lote 3C · Cierre definitivo (2026-09-04)
- [x] /arma-tu-viaje: fallback seguro a TripPlannerSurface cuando la composición publicada no tiene bloques.
- [x] Alux: contexto canónico también en /rutas, /rutas/$slug y /casas-de-vacaciones.
- [ ] Pruebas autenticadas de roles business_owner y concierge con cuentas temporales (crear, probar, eliminar).
- [ ] Validación final: typecheck, build, pruebas, RLS, QA responsive 1440/834/430/390 e informe con matriz.

## Lote 3E · Confianza de datos públicos y Experiencias CMS-first (2026-09-05)
- [x] 3E.1 Home/superficies públicas sin `@/mocks/*` (Categorías, Empresas, Reseñas, Rutas, buscador del Hero, registro de vistas previas del Constructor) → lecturas CMS + estados vacíos honestos.
- [x] 3E.2 Experiencias fuente única `products` (`product_type=experiencia`): lector público sin service role, sólo publicados; revisión interna autenticada para `in_review`; `experience-demo-dataset.ts` fuera de toda lectura pública.
- [x] 3E.3 Migración aditiva/reversible: eje `tipo_experiencia` en `tourism_attribute_definitions/_options` (familia `experiencias`); relocalizar `metadata.category_label` de registros DEMO.
- [x] 3E.4 CMS + Portal Empresa: editor de atributos de Experiencia (admin/editor + dueño); RLS de campos reservados intacta.
- [x] 3E.5 Conexión pública: listado, filtros y perfil (`/producto/$slug`) con atributos reales; micrositio primero destino activo.
- [x] 3E.6 Pruebas de contrato anti-regresión + cuentas temporales + gates + QA responsive + informe `docs/governance/audit/2026-09-05-LOTE-3E-CONFIANZA-DATOS-PUBLICOS-Y-EXPERIENCIAS-CMS-FIRST-v1.0.md`.
- Pendientes P1 documentados (no bloquean): atributos/portada de las 4 experiencias publicadas reales; breadcrumb de `/producto/$slug` hereda destino del contexto.
- [x] Lote 3F-Preflight (diagnóstico read-only Google Maps y dominios).
- [x] Lote 3F-B1 (remediación interna de mapas): cargador único, `gm_authFailure` multiinstancia, fallback accesible, montaje condicional. Cerrado sin FAIL ni NO VERIFICADO — informe `docs/governance/audit/2026-09-05-LOTE-3F-B1-REMEDIACION-INTERNA-MAPAS-v1.0.md`.
- [x] Lote 3G (sistema visual compacto: categorías, chips y Alux): `TourismChip`/`TourismChipRow` como primitive único, `CategoryNavGrid` compacto con rail móvil, Alux embebido compacto con CTA textual y anti-superposición del flotante, P1 resueltos (un `main`/`h1` por página, clave React duplicada, táctiles críticos ≥44 px). Cerrado sin FAIL ni NO VERIFICADO — informe `docs/governance/audit/2026-09-05-LOTE-3G-SISTEMA-VISUAL-COMPACTO-CATEGORIAS-CHIPS-ALUX-v1.0.md`.
- Lote 3H o siguiente: a la espera de autorización del Founder.
