# Roadmap

## En curso

- [x] Experience Builder · Catálogo operativo limitado a familias conectadas; vista inicial sólo publicada, con borradores y archivadas accesibles por filtro. Pruebas históricas desconectadas quedan ocultas de forma reversible y sin borrar datos.

- [ ] Qué hacer · Evolución editorial CMS-first: crear su administración dentro del Experience Builder para ordenar/activar Destinos recomendados, Eventos, Experiencias y Lugares de interés; integrar los contratos desde Administración → Visibilidad como elegibilidad comercial separada y limitada, con indicación `Promovido` discreta fuera de la fotografía, sin duplicar Lugares, planes, pagos ni superficies.

- [x] Reservación de productos · Calendario oficial con días disponibles en verde y cupo visible, selección progresiva día → horario → personas y horario único preseleccionado. Inventario, apartados, checkout ERL, ficha Premium y datos CMS preservados; contratos, typecheck, `git diff --check` y QA 1440/834/430/390 en PASS, sin overflow. El aviso de Google Maps en localhost es externo al flujo.

- [x] Incidencia recurrente móvil/PWA: impedir que una versión anterior deje la portada sin estilos; fallback autónomo, recuperación en línea, actualización segura y caché de archivos versionados para reabrir páginas públicas visitadas sin conexión. QA 1440/834/430/390 y typecheck en PASS; pendiente publicar y confirmar reemplazo del worker anterior en el celular afectado.

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
- [x] Conectar la ficha de Lugares y sitios de interés al constructor: plantilla oficial "Plantilla · Lugar" (**tpl_place**) con textos de sección editables; ficha pública lee la composición publicada con respaldo a los textos aprobados. Validado en 1440/834/430/390.

## Menú móvil · Refinamiento Airbnb (2026-09-13)

- [x] Texto del buscador: "¿Donde empezamos?" con subtítulo "Explora el Oriente Maya de Yucatán" visible en móvil.
- [x] Botones CTA del drawer móvil ("Arma tu Viaje", "Iniciar sesión"): estilo Airbnb — sin relleno ocre sólido; usar foreground/outline refinado.
- [x] Retirar “Destinos populares” sólo del menú hamburguesa y conservar el acceso territorial desde el buscador superior.
- [x] Mantener “Arma tu Viaje” e “Iniciar sesión” visibles en móvil y tableta; `/auth` abre correctamente en 430/390, sin desbordamiento en 834/430/390.

- [x] Compactar `/auth` y armonizar tipografía al estilo Airbnb solicitado.
- [x] Afinar exclusivamente `/auth` en móvil sin cambiar su composición: escala tipográfica, ritmo vertical y proporciones compactas; Preservation Gate 1440/834/430/390 en PASS, sin desbordes ni errores.

## Incidencia · Envío de Mi Viaje al Concierge (2026-09-14)

- [x] Diagnosticar por qué el viaje de kafir hadded no creó expediente ni llegó a revisión/cotización del concierge: el estado sin expediente ocultaba el formulario `promotePlanToCase` detrás de una pantalla vacía cuyo CTA regresaba a Resumen.
- [x] Contrastar diagnóstico y corrección con la documentación oficial versionada: `promotePlanToCase` permanece como única puerta y conserva snapshot, vínculo, estado compartido y expediente `new`.
- [x] Corregir únicamente el bloqueo de acceso al formulario y verificar viaje → expediente → panel de seguimiento: caso `941c04fd-b8d2-46dd-a211-65a121805a58` creado con 6 elementos, viaje vinculado como `shared_with_concierge`, UI desktop/móvil sin errores. Sin publicación.
- [x] Corregir la visibilidad inicial en Centro Concierge: los expedientes nuevos nacen sin asignación, por lo que la bandeja abre en “Sin asignar” en vez de “Mis expedientes”.
- [x] Convertir el detalle del expediente a lenguaje operativo claro: estados, prioridad, origen, solicitudes, línea de tiempo y contexto de Alux sin claves internas; resultados de Alux presentados para lectura humana. Sin cambios de datos, permisos o flujo.

## Alux multimarca · configuración desde Marca (2026-09-14)

- [x] Extender `brand.identity` con paleta de interfaz y textos de Alux configurables por marca, con herencia segura de los valores vigentes.
- [x] Conectar la autoridad de Marca a las superficies canónicas de Alux, sin cambiar ilustración, comportamiento ni crear configuraciones paralelas.
- [x] Scope Gate y QA 1440/834/430/390: PASS (un H1, sin desbordamiento ni errores de consola); typecheck y 86 contratos Alux PASS. Preservation Gate específico de Alux PASS; la suite Premium ampliada conserva 6 fallos previos fuera de alcance. No publicado.

- [x] Dar presencia a Alux tras enviar a Concierge: acompañar la espera y avisar desde Mi Viaje cuando exista una propuesta nueva.
- [x] Reparar asignación y cotización del expediente: autoasignación ligada a la sesión desde la bandeja y el detalle, avisos claros, solicitud de cotización por servicio con empresa y refresco inmediato; validado con sesión Concierge y QA en 1440/834/430/390.

## Mejora de expedientes Concierge

- [x] Auditar documentación oficial: contacto, alcance de cotización y autoría de propuesta.
- [x] Comparar contrato documentado con captura e implementación actual.
- [x] Definir delta mínimo con Scope Gate y Preservation Gate antes de modificar.

- [x] Confirmar que contacto interno, privacidad empresarial y autoría de propuestas respetan las adendas oficiales sincronizadas desde GitHub.
- [x] Validar contratos Concierge, typecheck, formato y diff check. El render autenticado completo requiere una sesión de QA; 1440/834/430/390 alcanzaron correctamente el control de sesión sin desbordamiento.

## Propuesta con partidas propias del Concierge (2026-09-14)

- [x] Permitir partidas escritas por el Concierge (título, importe, notas) sin empresa ni cotización, mezclables con cotizaciones recibidas.
- [ ] Dejar claro en el compositor que la empresa sólo se involucra cuando se le solicita cotización desde el servicio.

## Itinerario tras aceptación + pago en efectivo (2026-09-14)

- [x] La reservación creada desde la propuesta queda enlazada al viaje del cliente.
- [x] Pago en efectivo: el viajero confirma y queda pagado; el concierge también puede registrarlo desde el expediente.
- [x] Al pagar, el expediente pasa a cerrado ganado y se abre el itinerario confirmado del viajero.
- [ ] Conectar pago real con proveedor cuando el Founder lo autorice.
- [x] Confirmación de viaje antes de enviar al Concierge (TripBriefForm 3 secciones: datos del viaje, quiénes viajan, transportación con 'aún no lo decido'). Brief en travel_plans.meta.trip_brief, incluido en handoff context, mostrado en CaseFileView. Typecheck + build + Playwright 1440/834/430/390 OK. No publicado.

## Recordatorios de pago de propuesta aceptada (2026-09-14)

- Propuesta `accepted` sin reservación pagada → correo al viajero a 1 h, 24 h y 72 h, y aviso interno al equipo a las 72 h.
- Fuentes reales: `concierge_proposals.status`, `concierge_cases.status`, `concierge_orders.status`. Sin estados nuevos.
- Idempotencia: columnas `pay_reminder_r1/r2/r3/team_sent_at` en `concierge_proposals`.
- Selección: `get_proposals_needing_payment_reminder(_kind)` (SECURITY DEFINER, sólo `service_role`).
- Trabajo `src/lib/cron/jobs/proposal-payment-reminders.server.ts` + gancho `/api/public/hooks/proposal-payment-reminders` (x-cron-secret, dry-run soportado).
- Cron horario `proposal-payment-reminders-hourly` ('20 \* \* \* \*').
- Plantillas `proposal-payment-reminder` y `proposal-payment-stalled-team`.
- 2026-09-14: verificado en producción — r1 enviado 15:20 UTC a Kafir (`email_send_log` = sent); r2 enviado manualmente 17:49 UTC a petición del Founder y marcado `pay_reminder_r2_sent_at`.
- 2026-09-14: cron `eb-process-scheduled-publish` devolvía 401 cada 5 min (enviaba `apikey`, la ruta exigía `EB_CRON_SECRET`). Se migró el job a `cron_hooks_invoke(...)` y la ruta acepta también `CRON_HOOKS_SECRET`. Efectivo en producción al publicar.

## Zona horaria oficial fija: America/Merida (2026-09-14)

- `src/lib/time/merida.ts` es la fuente única: `MERIDA_TIME_ZONE`, `formatInMerida`, `meridaDate/DateTime/LongDate/DayMonth/Clock`, `meridaToday`.
- Aplicado en expedientes Concierge, bandejas, Mi Viaje, itinerario, reservaciones, historial, documentos, cupones, recuerdos, recap en vivo, portal empresarial y todas las plantillas/cron de correo.
- Regla: prohibido formatear fechas visibles con la zona del dispositivo o del servidor.

## Estudio de Propuesta del Concierge (2026-09-14)

- [x] Propuesta con espacio propio (no dentro del expediente), día/hora/duración por partida y paso al itinerario.
- [ ] Velocidad para cientos de propuestas: plantillas reutilizables, alta rápida y atajos de teclado.
- [ ] Alux copiloto del Concierge con contexto real del destino (horarios, clima, distancias, eventos) vía Context Engine.
- [ ] Vista del viajero para propuestas largas: resumen por días, secciones plegables y descarga en PDF.

- [ ] Diseñar carga inteligente obligatoria de imágenes: validación de tamaños, optimización automática y cola segura para cargas masivas.
- [ ] Definir biblioteca Media por empresa: visibilidad, permisos, búsqueda, filtros y usos portada/galería/logo/miniatura.
- [ ] Definir continuidad de imágenes al reclamar empresa: conservar asignación, procedencia y permisos del nuevo dueño sin transferir autoría.

- [ ] Folios diarios de reservación: ERL-YYMMDD-### para venta en línea y AVL-YYMMDD-### para Arma tu Viaje.

- [x] Portada: corregir apariencia del calendario "Buscar por fecha" en escritorio (elegante, alineado con DSL)
- [x] Portada: restablecer miniaturas de eventos (acreditación de medios)

- [x] Identificar y comparar la última versión Premium aprobada de Zazil Tunich.

- [ ] Reconstruir la autoridad documental de Experiencias, venta en línea y Concierge desde GitHub y el repositorio.
- [ ] Definir el delta mínimo para administrar Experiencias desde CMS sin duplicar reservas, pagos ni operación Concierge.

## Experiencias · venta en línea (Carril A)

- [ ] Sección de Experiencias tipo Airbnb con reservación en línea, sobre la plantilla existente de `/experiencias` y con la marca actual (botón propio de Experiencias en el menú).
- [ ] Alta por parte de las empresas autorizadas, eligiendo si su producto se vende en línea, se usa en Arma tu Viaje o ambos.
- [ ] Todo lo vendido (en línea y por propuesta del concierge) llega al Centro Concierge con control, reportes y corte del día.

- [x] Botón/acceso propio de Experiencias: acceso destacado en portada (antes de la rejilla de categorías); ya existía en rejilla de categorías, buscador, menú normal y hamburguesa.

- [x] Afinar visualmente /experiencias sin modificar el acabado oficial de los iconos de categorías; preservar TourismCategoryIcon y sus activos canónicos.
- [ ] Corregir regresión visible en `/experiencias`: buscador principal presente, categorías con escala canónica armonizada y mapa general de todas las experiencias, usando los patrones Premium existentes.
- [ ] Replantear la maqueta de la tienda pública con funcionalidad de exploración inspirada en Airbnb Experiences (búsqueda, filtros, tarjetas y mapa sincronizado), preservando íntegramente la marca Premium Valladolid.mx; requiere comparación y aprobación visual antes de sustituir `/experiencias`.
- [ ] Reutilizar exactamente el buscador turístico ya aprobado del Home, ampliado sólo con fecha y viajeros para Tours; conservar sin cambios los iconos bordados y la imagen/colores oficiales de Alux, y reutilizar el patrón existente de listados con mapa.
- [ ] Filtros de la tienda de Experiencias: barra compacta, profesional e intuitiva (criterios rápidos visibles, panel completo, conteo de resultados y limpieza); Alux queda fuera del alcance de esta iniciativa.
- [x] Unificar la ficha pública de Experiencias con los bloques Premium oficiales de hoteles/restaurantes, preservando sus secciones turísticas propias y la venta fail-closed. QA comparativa hotel/restaurante/experiencia 1440/834/430/390: 200, un H1, sin overflow ni errores de página; sin publicar.
- [x] Añadir ubicación efectiva de Experiencia en CMS con herencia de la ubicación principal del negocio y excepción mediante punto de encuentro específico, sin duplicar coordenadas. Validación de pertenencia activa y función interna sin ejecución pública.
- [ ] Cierre global de Governance Integrity: bloqueado por 69 artefactos/fingerprints acumulados no registrados, incluidos cambios anteriores fuera de este delta; Route Inventory 262/262 y proyecciones PASS. El linter de Lovable Cloud conserva 328 avisos globales históricos; la función nueva de ubicación no es SECURITY DEFINER y sólo puede ejecutarla el servicio interno.

- [x] Logotipos de empresa: logo transparente de Zazil Tunich cargado en CMS y visible en su experiencia (ficha de Lugar pendiente de autorización).

- [x] Perfil Zazil Tunich: retirada la excepción hardcodeada `business.slug === "zazil-tunich"`; el perfil vuelve a la plantilla oficial de empresa con logotipo. Landing de promoción vive en `/l/<slug>` (Experience Builder) y su enlace se muestra en el panel "Landing SEO premium" del editor de empresa. Logotipo acreditado también en el hero de la landing (`LandingBrandLogo`, fail-closed).
- [ ] Publicar la Landing SEO de Zazil Tunich (`landing-business-zazil-tunich`, hoy borrador) — pendiente de autorización Founder.

- [x] Inteligencia del Visitante · profundidad anónima (CV8): sesión anónima T1, exploración profunda T3, intención anónima T4, consentimiento por propósito y k-anonimato k≥25 en lecturas agregadas.
- [x] Inteligencia del Visitante · menús por módulo del blueprint CV8.3 (12 módulos: Embudo, Anónimos, Conversión, Travel Plans, Alux, Concierge, Empresas, Destinos, Revenue, Permanencia, Embajadores, Alertas) dentro de `/cms/visitor-intel`.

- [x] Unificar todas las fichas de empresa en la plantilla Premium aprobada y retirar el formato editorial antiguo, preservando landings SEO independientes. La ruta territorial usa exclusivamente `BusinessSurface`; las composiciones `biz-*` sólo pueden aportar textos compatibles y `/l/<slug>` permanece independiente.
- [x] Refinar la ficha Premium empresarial sin cambiar forma ni colores de marca: logotipo ligeramente dominante junto al nombre y experiencias/productos en carrusel compacto tipo Airbnb; validado en 1440/834/430/390.
- [x] Retirar de la ficha empresarial las tarjetas redundantes Destino/Categoría/Estado; conservar breadcrumb y contexto territorial canónico.
- [x] Unificar tarjetas de experiencias/servicios como acceso de descubrimiento: corazón sobre la foto y un único CTA “Ver experiencia”; reservar y agregar a Mi Viaje viven exclusivamente dentro de la ficha completa.
- [x] Añadir en la ficha de experiencia un regreso visible al perfil territorial de la empresa para explorar sus demás experiencias.
- [x] Armonizar todos los listados territoriales de empresas —hoteles, cenotes, artesanías, transportes y futuras categorías— con la única plantilla Premium ya aprobada para empresas de hoteles; retirar el fallback visual antiguo sin cambiar perfiles, CMS ni datos.
- [x] Crear el listado regional de empresas por categoría en todo el Oriente Maya, con filtro por destino, y hacer que el listado de cada destino filtre por zonas del propio destino.

## Menú de escritorio compacto (2026-09-18)

- [x] Barra principal de escritorio reducida a Oriente Maya, Hoteles, Restaurantes y Experiencias; se retira la opción “Más”.
- [x] Panel de menú (hamburguesa) disponible también en escritorio con Casas de vacaciones, ¿Qué hacer?, Eventos, Promociones, Mapa, Blog, Contacto, “Arma tu Viaje” e inicio de sesión; el idioma permanece exclusivamente en el header para evitar duplicación y fallos.
- [x] Validado en 1440/834/430/390 sin desbordamiento; logotipo, buscador, Mi Viaje, cuenta y rutas preservados. Sin publicar.

## Qué hacer · visibilidad contratada (2026-09-18)

- [ ] Prioridad tipo buscador: la ficha con contrato vigente y elegible ocupa la primera posición de cada bloque de 4; sin contratado elegible, la toma un orgánico.
- [ ] Cupo 1 de cada 4, máximo 2 apariciones por empresa (1 por carril), aplicable también a Hoteles, Restaurantes, Casas de vacaciones, Eventos, Lugares y listados territoriales.
- [ ] Etiqueta discreta "Recomendado" fuera de la fotografía para contenido contratado; carril editorial mantiene "Recomendados por Valladolid.mx".
- [ ] Reparto justo con muchos contratos: turnos por nivel de paquete, rotación determinista diaria, deuda de exposición, techo por empresa y cupo por superficie; sin posición fija garantizada.
- [ ] Alcance: aplicar cupo, prioridad y etiqueta en Home y todos los listados (incluidos territoriales y por categoría); excluir destinos, mapa, fichas, Alux, Mi Viaje y Concierge. Despliegue por etapas: /que-hacer → listados → Home.
- [ ] Destacados programados: ampliar founder_spotlights a producto/experiencia/evento/promoción con superficie, posición, fecha inicio/fin, motivo y tipo (cortesía o contratado); calendario por superficie en Administración → Visibilidad → Destacados.
- [ ] Documentar y ampliar /cms/visibilidad/spotlight como pantalla única de destacados (Founder Spotlight + fijados con fecha por superficie).
- [x] 2026-09-18 Base gobernada del reparto comercial (`src/lib/visibility/commercial-slots.ts` + pruebas): cupo 1 de cada 4, prioridad comercial por bloque, techos por empresa, fijados vigentes, deuda de exposición y rotación diaria determinista. Sin cambios en superficies públicas.

## Medición real de visibilidad (2026-09-18)

- [x] Registro real de impresiones y acciones en perfiles de empresa y fichas de experiencia (`src/lib/visibility/track.ts`, `BusinessEventTrackers.tsx`), fuente única `business_view_events`.
- [x] Nuevos eventos `add_to_trip` y `reserve_intent`; atribución automática al contrato de visibilidad vigente en `admin_visibility_performance`.
- [ ] Conectar impresiones/clics de tarjetas en listados públicos (`/que-hacer`, listados territoriales, Home) junto con el motor de cupo comercial.
- [ ] Pruebas reales del Founder: compra de visibilidad para Zazil Tunich, un hotel y un restaurante; verificar acumulación en Administración → Visibilidad → Rendimiento.

## Constructor · edición por secciones en plantillas compuestas (2026-09-18)

- [ ] Registro general de secciones internas para bloques compuestos (Inicio, micrositio de destino, listados G5), con edición sección por sección, visibilidad y reordenamiento por arrastre.
- [ ] Regla vinculante: toda plantilla compuesta nueva debe declarar sus secciones internas en el registro como parte de su Definition of Done.

- [ ] Corregir la conexión real del editor de Inicio: las 12 secciones existen en Estructura, pero el lienzo aún las trata como un solo bloque y no permite recorrerlas ni manipularlas directamente.
- [x] Contratos en verde: 655 pruebas OMXDS sin fallos.

## Constructor · biblioteca de elementos para arrastrar (2026-09-18)

- [ ] Declarar y documentar el origen de los elementos insertables: mapa oficial con marca, familias de botón, texto con enlace (p. ej. "Agregar a Mi Viaje") y sección de hoteles.
- [ ] Permitir arrastrar esos elementos desde la biblioteca oficial hacia las plantillas, sin crear bloques paralelos ni duplicados.
- [ ] Arrastrar y soltar de secciones en todas las plantillas Premium (Inicio, Destino, Lugar, Listados), con orden por defecto = orden aprobado.
- [ ] Hacer utilizables en el lienzo del constructor los elementos editables internos declarados por cada sección; no limitar el trabajo al panel Estructura.
