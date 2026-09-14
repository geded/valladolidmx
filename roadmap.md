# Roadmap

## En curso

- [x] Reconciliación visual Premium de `/que-hacer`: header, filtros, cards/fallback, mapa y temas compactos; QA 1440/834/430/390 sin overflow, un H1 y un solo Alux. Data Readiness: 11 resultados actuales sin portada canónica. La URL territorial `/oriente-maya/valladolid/que-hacer` no existe y queda fuera de alcance para no crear una ruta nueva.
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
- [x] Lote 3G.1 (jerarquía visual de Alux): módulo embebido convertido en banda secundaria clara con acento de marca, píldoras `xs` con 44 px táctiles, CTA compacto de contorno, tira desplazable en móvil; altura −27 % en móvil y −33 % en escritorio. Informe `docs/governance/audit/2026-09-05-LOTE-3G1-JERARQUIA-VISUAL-ALUX-v1.0.md`. Pendiente autorizar el aligeramiento del bloque verde de Mi Viaje.
- [x] Lote 3G.2 (jerarquía visual de Mi Viaje): nueva autoridad compartida `TravelPlanBand`; banda clara con acento discreto, acciones compactas de 44 px táctiles; altura −42 % (1440), −44 % (834), −59 % (430), −46 % (390). Informe `docs/governance/audit/2026-09-05-LOTE-3G2-JERARQUIA-VISUAL-MI-VIAJE-v1.0.md`.
- [x] Lote 3M-A · Endurecimiento de autorización de los cron hooks de correo (`trip-journey-emails`, `coupon-review-reminders`, `visibility-notifications`): módulo único `handleCronHook` (sólo `x-cron-secret` vs `CRON_HOOKS_SECRET`, fail closed, 401 uniforme, sin `apikey`/bearer/URL), runners extraídos a `src/lib/cron/jobs/*`, 44 pruebas nuevas (869/869), invocador SQL `cron_hooks_invoke` que lee el secreto de Vault, jobs 84/86/89 reapuntados sin cambiar horarios; primer tic real 200 en 89 y 84. Informe `docs/governance/audit/2026-09-05-LOTE-3M-A-ENDURECIMIENTO-AUTORIZACION-CRON-v1.0.md`.
- [x] Lote 3M-A.2 · Simulación controlada y verificación **exclusivamente en vista previa**: módulo `cron-dry-run.server.ts` (cabecera `x-cron-dry-run` evaluada sólo tras autorizar; guardián de sólo lectura que bloquea escrituras, `enqueue_email` y toda RPC fuera de las 4 funciones `STABLE` de selección; respuesta sólo con contadores y `dry_run:true`), 27 pruebas nuevas (`scripts/cron/cron-dry-run.test.ts`, 71/71 en `scripts/cron/`), prueba manual de los tres ganchos contra vista previa (secreto+dry-run → 200 `dry_run:true` con cero envíos; clave pública / secreto incorrecto / sin credencial → 401) y comparación antes/después sin una sola mutación. Typecheck · suite **896/896** · build · Route Inventory 247 · escaneo de secretos limpio. **Producción sin modificar** (sigue aceptando `apikey`, transición intacta) y **jobs 84/86/89 intactos**, sin ejecución manual. Informe `docs/governance/audit/2026-09-05-LOTE-3M-A2-SIMULACION-CONTROLADA-EN-PREVIEW-v1.0.md`.
- [ ] Lote 3M-A · Parte 3 (tras publicar): quitar la cabecera heredada (`cron_hooks_invoke(..., false)`) y confirmar 200 en los tres jobs.
- [ ] Job 86 (`visibility-notifications-daily`) · **todavía no observado en vivo**: próximo tic 2026-09-06 13:15 UTC; criterio = `job_run_details` `succeeded` + `net._http_response` 200 `{"ok":true,…}` con cero envíos.
- [x] Plantilla Premium de destinos: distribución del hero preservada; `tagline` funciona como descripción corta y `description` completa aparece inmediatamente debajo en el bloque editorial aprobado. Las fotografías secundarias se toman exclusivamente del CMS, sin duplicar portada ni inventar medios; cuando no existen, el bloque colapsa sin huecos. QA Valladolid/Izamal 1440/834/430/390: 200, un H1, overflow 0 y sin errores de página. Data Readiness: ambos destinos carecen actualmente de galería CMS para este bloque.
- [x] Lote 3M-B · Remediación mecánica del lint gate en el alcance autorizado (`src/routes/lovable/*`, `src/routes/rutas*`, `src/routes/restaurantes.tsx`, `src/routes/oriente-maya/$destino.index.tsx`): 76 errores `prettier/prettier` → 0 mediante autofix limitado a 8 archivos exactos; `git diff -w` vacío y comparativa DOM antes/después idéntica en 8 rutas (status, texto, enlaces, `h1`, overflow). Typecheck · suite 896/896 · build · Route Inventory 247 · smoke 1440/834/430/390 · escaneo de secretos limpio. Informe `docs/governance/audit/2026-09-06-LOTE-3M-B-LINT-GATE-REMEDIATION-v1.0.md`.
- [x] Lote 3M-B.2 · Lint Gate completo cerrado en `a8a5beacfd31c40cf183cdf9161ac38b8eb75266`: 51 buckets restantes y 13 pendientes adicionales corregidos con ajustes mecánicos o mínimos equivalentes; `bun run lint` **PASS** sin deuda nueva, typecheck · suite 896/896 · build · Route Inventory 247 **PASS**. La deuda histórica continúa visible y gobernada por el baseline. Informe 3M-B actualizado con addendum de cierre.
- [x] Lote 3N-A · P2 de accesibilidad, semántica, foco, CLS y preview expirado cerrados sobre integración: responsive 13 superficies × 1440/834/430/390 sin overflow ni errores de página; Región CLS máximo 0.0049; preview expirado HTTP 404 con `main` y un `h1`. Sin publicación, PR, merge ni despliegue.
- [ ] Carril B · siguiente candidato: migrar `eb-process-scheduled-publish` (job 54, falla 401 desde antes) al mismo `handleCronHook` + `cron_hooks_invoke`.
- Lote 3H o siguiente: a la espera de autorización del Founder.

## Reconciliación de fichas Premium (2026-09-12)

- [x] Casa de vacaciones: reconciliada con la autoridad Premium aprobada; compartir, mapa/reseñas condicionales y QA 1440/834/430/390 en PASS.
- [x] Hotel: reconciliado con la autoridad Premium aprobada; estado sin reseñas/medios adicionales no inventa contenido y QA 1440/834/430/390 en PASS.
- [x] Restaurante: reconciliado con la autoridad Premium aprobada; compartir, mapa/reseñas condicionales y QA 1440/834/430/390 en PASS.
- [ ] Gates finales: lint dirigido, typecheck, pruebas propias (22/22) y Route Inventory (249/249) en PASS. Bloqueado el cierre global por deuda previa fuera de alcance: lint baseline reporta 5 errores nuevos en 4 archivos ajenos y Governance Integrity reporta artefactos/fingerprints acumulados no registrados; no se amplía alcance.

## Lote 3N · Composición Airbnb de fichas de alojamiento (2026-09-12)

- [ ] Casa de vacaciones (`BusinessSurface`, familia `vacation_rental`): mosaico de galería CMS tipo Airbnb, datos escaneables y mapa full-width en escritorio con ubicación debajo (paridad con hoteles).
- [ ] Sin reserva en línea ni pagos: la acción principal es "Agregar a Mi Viaje"; prohibido mostrar precio de reserva, desglose de cobro o políticas de cancelación de pago mientras no exista el sistema de reservación.
- [x] Decisión del Founder (2026-09-12): la ficha muestra precio orientativo "desde … por noche" al estilo de las fichas de alojamiento de referencia, tomado del catálogo publicado en CMS, con acción principal "Agregar a Mi Viaje" y sin cobro ni reservación en línea. Sin tarifa publicada el bloque no se renderiza.
- [x] Demo Pack (lote `demo-2026-09-12`): Casa Colonial Sisal con 4 fotografías CMS (`business_media` → `media_assets`, bucket privado firmado), tarifa demo publicada ($2,400 MXN/noche) y 3 reseñas demo publicadas con respuesta del anfitrión. Datos temporales: no eliminar hasta autorización literal del Founder.

## Eventos recurrentes · Video Mapping Valladolid en la Historia (2026-09-13)

- [x] Ampliar el alta existente de eventos con recurrencia diaria, semanal, mensual y anual, múltiples funciones y fechas suspendidas.
- [x] Conectar recurrencia a agenda, Home y ficha Premium sin crear superficies nuevas.
- [x] Sembrar “Valladolid en la Historia” en la iglesia de San Gervasio, Centro Histórico, con funciones 20:30 español y 21:00 inglés.
- [x] Generar/cargar portada original, validar CMS y ficha pública en 1440/834/430/390: evento publicado y ligado a portada temporal aprobada; recurrencia diaria, horarios, Mi Viaje, Alux y JSON-LD visibles; un H1, sin overflow ni errores de página. Home, agenda, micrositio, destino y Mi Viaje conservan sus autoridades existentes y consumen el mismo contrato público.
- [x] Adaptar EventPremiumSurface al formato Premium de hoteles/restaurantes/casas (hero → compartir/agregar a Mi Viaje → Alux → descripción y datos → ubicación/cómo llegar/qué hay cerca) sin crear superficie nueva, sin reserva ni pagos. Validado en 1440/834/430/390.
- [x] Conectar la ficha de Lugares y sitios de interés al constructor: plantilla oficial "Plantilla · Lugar" (__tpl_place__) con textos de sección editables; ficha pública lee la composición publicada con respaldo a los textos aprobados. Validado en 1440/834/430/390.

## Menú móvil · Refinamiento Airbnb (2026-09-13)

- [ ] Texto del buscador: "¿Donde empezamos?" con subtítulo "Explora el Oriente Maya de Yucatán" visible en móvil.
- [ ] Botones CTA del drawer móvil ("Arma tu Viaje", "Iniciar sesión"): estilo Airbnb — sin relleno ocre sólido; usar foreground/outline refinado.
- [ ] Validar en 393x852 (móvil) y typecheck limpio.

- [x] Compactar `/auth` y armonizar tipografía al estilo Airbnb solicitado.

## Incidencia · Envío de Mi Viaje al Concierge (2026-09-14)

- [x] Diagnosticar por qué el viaje de kafir hadded no creó expediente ni llegó a revisión/cotización del concierge: el estado sin expediente ocultaba el formulario `promotePlanToCase` detrás de una pantalla vacía cuyo CTA regresaba a Resumen.
- [x] Contrastar diagnóstico y corrección con la documentación oficial versionada: `promotePlanToCase` permanece como única puerta y conserva snapshot, vínculo, estado compartido y expediente `new`.
- [x] Corregir únicamente el bloqueo de acceso al formulario y verificar viaje → expediente → panel de seguimiento: caso `941c04fd-b8d2-46dd-a211-65a121805a58` creado con 6 elementos, viaje vinculado como `shared_with_concierge`, UI desktop/móvil sin errores. Sin publicación.

## Alux multimarca · configuración desde Marca (2026-09-14)

- [x] Extender `brand.identity` con paleta de interfaz y textos de Alux configurables por marca, con herencia segura de los valores vigentes.
- [x] Conectar la autoridad de Marca a las superficies canónicas de Alux, sin cambiar ilustración, comportamiento ni crear configuraciones paralelas.
- [x] Scope Gate y QA 1440/834/430/390: PASS (un H1, sin desbordamiento ni errores de consola); typecheck y 86 contratos Alux PASS. Preservation Gate específico de Alux PASS; la suite Premium ampliada conserva 6 fallos previos fuera de alcance. No publicado.
