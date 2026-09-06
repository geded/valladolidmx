# Lote 3M-A.2 · Simulación controlada y verificación exclusivamente en vista previa (v1.0)

**Fecha:** 2026-09-05 · **Rama:** `integration/lovable-valladolidmx` · **Alcance:** vista previa únicamente.

**Lo que NO se hizo (por instrucción explícita del Founder):** no se publicó ni se desplegó; no se tocó `main`; no se crearon ramas, PR ni merges; no se modificaron ni se ejecutaron manualmente los jobs productivos 84/86/89; no se retiró la cabecera de transición en producción (`cron_hooks_invoke(..., false)` sigue pendiente); no se enviaron comunicaciones; no se modificaron datos; no se avanzó al job 54.

---

## 1. Separación de entornos (estado al cierre)

| Entorno | Código que corre | Estado |
| --- | --- | --- |
| **Vista previa** (`project--…-dev.lovable.app`) | Endurecido (3M-A) + modo simulación (3M-A.2) | **Endurecido y probado en vivo** (§4) |
| **Producción** (`project--….lovable.app` / dominios) | Anterior al 3M-A (acepta `apikey`) | **Sin modificar** en este lote |
| **Jobs productivos 84 / 86 / 89** | `cron_hooks_invoke('<ruta>', true)` con cabecera de transición | **Intactos**: mismo `jobid`, horario, comando, `active = true` (§5) |
| **Job 86 (diario, 13:15 UTC)** | Igual que arriba | **Todavía no observado en vivo** (§5) |

---

## 2. Reconciliación de HEAD (verificada en el turno anterior)

`a51aca7c` es el merge automático de la plataforma y `265ea798` su segundo padre (último commit propio). `git diff 265ea798 a51aca7c` es vacío: árboles idénticos, los 15 archivos del Lote 3M-A íntegros. No hubo nada que rescatar ni resincronizar.

---

## 3. Modo simulación (`x-cron-dry-run`) · contrato y pruebas

Módulo: `src/lib/cron/cron-dry-run.server.ts`. Integración: `handleCronHook` (`src/lib/cron/cron-hook-auth.server.ts`) y los tres runners de `src/lib/cron/jobs/*`.

Garantías:

1. La simulación se evalúa **después** de la autorización canónica; nunca sustituye ni relaja `x-cron-secret`.
2. pg_cron no emite la cabecera (`cron_hooks_invoke` no la conoce): las ejecuciones programadas siguen siendo reales.
3. El cliente de servicio se envuelve en un guardián de sólo lectura: `insert`/`update`/`upsert`/`delete` y toda RPC fuera de la lista blanca lanzan `CronDryRunViolation`; `storage`, `functions`, `schema`, `channel` y `realtime` quedan vedados.
4. Lista blanca = las cuatro funciones `STABLE` de selección: `get_orders_needing_trip_email`, `get_coupons_needing_review_reminder`, `list_visibility_grants_expiring`, `list_visibility_grants_recently_expired`. `enqueue_email` está bloqueada.
5. La respuesta contiene sólo contadores (`candidates` / `would_send` / `would_suppress` / `render_failed`) y `dry_run: true`. Nunca correos, nombres, folios, ids ni HTML.

Nuevo archivo de pruebas: `scripts/cron/cron-dry-run.test.ts` (**27 pruebas**).

| # | Escenario | Resultado |
| --- | --- | --- |
| 0 | `isDryRunRequest` sólo acepta `1`/`true` (con espacios y mayúsculas); rechaza `0`, `false`, `yes`, vacío y ausencia | **PASS** |
| 1 | Autorización previa: `apikey`, bearer, secreto incorrecto y sin credencial **con** `x-cron-dry-run` → 401, sin crear el cliente de servicio, 0 RPC, 0 escrituras | **PASS** ×4 |
| 1b | Servidor sin secreto → 401 aunque se pida simulación (fail closed) | **PASS** |
| 2 | `insert`/`update`/`upsert`/`delete` lanzan `CronDryRunViolation` y no llegan al cliente real | **PASS** ×4 |
| 2b | Las lecturas (`select`/`eq`/`maybeSingle`) sí pasan al cliente real | **PASS** |
| 2c | `storage`, `functions`, `schema`, `channel`, `realtime` vedados | **PASS** |
| 3 | `enqueue_email` bloqueada: 0 llamadas al transporte | **PASS** |
| 3b | Cualquier RPC fuera de la lista blanca bloqueada (`create_unsubscribe_token`, `mark_trip_email_sent`, `exec_sql`) | **PASS** |
| 4 | La lista blanca contiene exactamente las cuatro funciones de selección, y cada una llega al cliente real | **PASS** ×5 |
| 5 | Los tres ganchos en simulación: contadores correctos (`would_send`, `would_suppress`), `dry_run:true`, 0 envíos y 0 escrituras | **PASS** ×4 |
| 5b | Ninguna respuesta de los tres ganchos contiene PII ni secretos: sin `@`, sin dominio de prueba, sin nombres, sin folio, sin ids, sin HTML, sin el secreto | **PASS** |
| 6 | Sin la cabecera, la ruta real no cambia: encola y marca igual que antes, sin `dry_run` en cuerpo ni cabecera | **PASS** |
| 6b | Un trabajo que intente escribir en simulación se detiene con 500 `{"ok":false,"dry_run":true,"error":"write_blocked"}` sin mutar nada | **PASS** |
| 7 | `recordDryRunOutcome` acumula candidatos y desglose | **PASS** |

`bun test scripts/cron/` → **71 pass / 0 fail** (44 del 3M-A + 27 nuevas), 290 aserciones.

---

## 4. Prueba manual en vivo · exclusivamente vista previa

Base: `https://project--fd89b51f-9afc-4e15-8ee2-21fe468f6aa9-dev.lovable.app`. Producción no fue invocada en ningún momento.

| Gancho | Secreto + `x-cron-dry-run: 1` | Clave pública (`apikey`) | Secreto incorrecto | Sin credencial |
| --- | --- | --- | --- | --- |
| `trip-journey-emails` | **200** · `{"ok":true,"results":{"t14":{"candidates":0,…},"t3":…,"welcome":…,"post":…},"selection_errors":[],"dry_run":true}` | **401** `Unauthorized` | **401** | **401** |
| `coupon-review-reminders` | **200** · `{"ok":true,"reminder_1":{…ceros},"reminder_2":{…ceros},"selection_errors":[],"dry_run":true}` | **401** | **401** | **401** |
| `visibility-notifications` | **200** · `{"ok":true,"expiring_7d":{…ceros},"expiring_1d":{…ceros},"expired":{…ceros},"selection_errors":[],"dry_run":true}` | **401** | **401** | **401** |

`selection_errors: []` en los tres casos acredita que las cuatro RPC de selección se ejecutaron realmente contra la base a través del guardián (lecturas permitidas). Los contadores en cero reflejan que hoy no hay candidatos pendientes en ninguna ventana.

### Comparación antes / después (cero mutaciones)

| Métrica | Antes (17:11:19 UTC) | Después (17:12:09 UTC) |
| --- | --- | --- |
| `email_send_log` | 27 | **27** |
| `email_send_state` | 1 | **1** |
| `email_unsubscribe_tokens` | 2 | **2** |
| `suppressed_emails` | 5 | **5** |
| `max(email_send_log.created_at)` | 2026-09-04 22:30:53 | **2026-09-04 22:30:53** |

Sin altas, sin marcas, sin tokens, sin correos encolados. Cero envíos.

---

## 5. Jobs productivos: intactos y sin ejecutar manualmente

| Job | Nombre | Horario | Comando | Activo |
| --- | --- | --- | --- | --- |
| 84 | `coupon-review-reminders-hourly` | `17 * * * *` | `SELECT public.cron_hooks_invoke('/api/public/hooks/coupon-review-reminders', true);` | sí |
| 86 | `visibility-notifications-daily` | `15 13 * * *` | `SELECT public.cron_hooks_invoke('/api/public/hooks/visibility-notifications', true);` | sí |
| 89 | `trip-journey-emails-hourly` | `15 * * * *` | `SELECT public.cron_hooks_invoke('/api/public/hooks/trip-journey-emails', true);` | sí |

Últimos tics propios (sin intervención): 89 a las 17:15:00 `succeeded`, 84 a las 17:17:00 `succeeded` (y las horas previas). Ninguna ejecución manual.

**Job 86 · NO VERIFICADO en vivo.** Próximo tic: **2026-09-06 13:15 UTC**. Criterio de cierre: `cron.job_run_details` = `succeeded` y `net._http_response` = 200 con `{"ok":true,…}` y cero envíos. Comparte invocador, ruta y módulo con 84 y 89, y está cubierto por las pruebas d/j del 3M-A y por §3/§4 de este informe.

---

## 6. Puertas de calidad

| Puerta | Resultado |
| --- | --- |
| Typecheck (`tsc --noEmit`) | **PASS** (limpio) |
| Pruebas específicas (`bun test scripts/cron/`) | **PASS** 71/71 |
| Suite completa (`bun test`) | **PASS** **896/896** en 78 archivos, 5 717 aserciones |
| Build (`bun run build`) | **PASS** (cliente + PWA 628 entradas + worker Nitro) |
| Route Inventory | **PASS** 247 rutas cubiertas |
| Lint gate (`bun run lint`) | Los cuatro archivos cron señalados fueron formateados y ya no aparecen. El gate sigue en FAIL por **deuda preexistente y ajena a este lote** (`src/routes/lovable/*`, `src/routes/rutas*`, `src/routes/restaurantes.tsx`, `src/routes/oriente-maya/$destino.index.tsx`), sin relación con los cron hooks. |
| Escaneo de secretos | **PASS** · el valor de `CRON_HOOKS_SECRET` no aparece en ningún archivo del repositorio (búsqueda literal, incluidos ocultos); ninguna clave de servicio ni `sb_secret_` real embebida (las coincidencias son detectores/depuradores de formato). |

Nota: `bunx vitest run` no es el corredor de esta suite — 58 archivos usan `bun:test` y vitest no puede importarlo. El corredor canónico del proyecto es `bun test`.

---

## 7. Riesgos residuales

- Producción sigue aceptando `apikey` hasta que se publique el código endurecido; ésa es precisamente la transición que el Founder decidió no retirar todavía.
- La cabecera `x-cron-dry-run` sólo es utilizable por quien ya posee el secreto; no amplía la superficie de ataque. Aun así, es una capacidad de diagnóstico: si en el futuro se desea, puede restringirse por entorno.
- Vault y `CRON_HOOKS_SECRET` siguen siendo dos copias del mismo valor (rotación conjunta, ya documentada en el informe del 3M-A).

## 8. Rollback

`git revert` del commit del modo simulación deja el Lote 3M-A intacto: el guardián y la cabecera son puramente aditivos y la ruta real no cambió (probado en §3, caso 6). No hay migraciones nuevas en este lote y no se tocó ningún dato.

## 9. Confirmación de rama

- Trabajo exclusivamente sobre `integration/lovable-valladolidmx`. Sin ramas manuales, PR ni merge.
- Último commit del lote: `e21863b2d4d583bee30617734af850f8fd3dca38` · árbol de trabajo **limpio** (0 archivos pendientes) · rama de edición `edit/edt-6e9ef999-ab17-4412-99f1-9e5b52fc39ba` que la plataforma integra automáticamente en `integration/lovable-valladolidmx` (base previa del lote: `3be6b472880ba2644078a60ad3a7b0b7b018d7d5`).
- Sin publicar, sin desplegar, sin tocar `main`.
