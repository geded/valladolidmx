# Lote 3M-A · Endurecimiento de autorización de los procesos programados (cron hooks)

- **Fecha:** 2026-09-05
- **Rama:** `integration/lovable-valladolidmx` (sin publicar, sin desplegar, sin ramas nuevas, sin PR ni merge, sin tocar `main`)
- **Carril:** B · Hardening (no bloquea Carril A)
- **Alcance autorizado:** los tres ganchos cron de correo — `trip-journey-emails`, `visibility-notifications`, `coupon-review-reminders` — y el mecanismo con que pg_cron los invoca.
- **Fuera de alcance (sin tocar):** `eb-process-scheduled-publish` (job 54, que ya fallaba con 401 antes de este lote), plantillas de correo, lógica de selección de destinatarios, horarios, datos reales.

## 1. Problema que se corrige

Los tres ganchos aceptaban como credencial la **clave pública** del proyecto (`apikey`), que por definición está en el navegador de cualquier visitante. Cualquiera que la conociera podía disparar el envío de correos reales (recordatorios de viaje, reseñas y vencimientos de visibilidad). Además, cada ruta implementaba su propia comprobación con pequeñas diferencias entre sí.

## 2. Resultado

| Antes | Después |
| --- | --- |
| `apikey` (clave pública) **o** `EB_CRON_SECRET` por `x-cron-secret`/bearer | **Sólo** `x-cron-secret` comparado en tiempo constante con `CRON_HOOKS_SECRET` (64 caracteres, server-only) |
| Tres implementaciones distintas | Un único módulo `handleCronHook()` reutilizado por las tres rutas |
| Sin secreto configurado → dependía de la ruta | **Fail closed** universal (secreto ausente o < 32 caracteres → 401) |
| Motivos de rechazo variables | Rechazo uniforme `401 Unauthorized` + `Cache-Control: no-store`, sin motivo interno |
| pg_cron enviaba la clave pública en cada petición | pg_cron llama a `cron_hooks_invoke()`, que lee el secreto de la bóveda (Vault) y lo emite en la cabecera privada |
| Excepciones podían filtrar texto arbitrario | Cualquier excepción del job → `500 {"ok":false}`; el texto del secreto se redacta antes de registrar |

## 3. Arquitectura entregada

```text
pg_cron (jobs 84 · 86 · 89, mismos horarios)
  └─ SELECT public.cron_hooks_invoke('/api/public/hooks/<job>', true)
       ├─ lee `cron_hooks_secret` de Vault (falla y detiene el job si no existe)
       └─ net.http_post → https://project--<id>.lovable.app/api/public/hooks/<job>
            cabeceras: Content-Type · x-cron-secret · (apikey sólo mientras dure la transición)

Ruta TanStack (12 líneas)  →  handleCronHook(request, runJob)
   1. isAuthorizedCronRequest(): sólo `x-cron-secret`, fail closed, timingSafeEqual
   2. crea el cliente de servicio SÓLO si la petición fue autorizada
   3. ejecuta el runner del job (src/lib/cron/jobs/*.server.ts) y devuelve JSON
   4. catch → 500 sanitizado (redactSecret) · nunca se propaga el secreto
```

### Archivos

| Archivo | Cambio |
| --- | --- |
| `src/lib/cron/cron-hook-auth.server.ts` | **Nuevo.** Autorización canónica + `handleCronHook`. |
| `src/lib/cron/jobs/trip-journey-emails.server.ts` | **Nuevo.** Runner extraído sin cambios funcionales. |
| `src/lib/cron/jobs/coupon-review-reminders.server.ts` | **Nuevo.** Runner extraído sin cambios funcionales. |
| `src/lib/cron/jobs/visibility-notifications.server.ts` | **Nuevo.** Runner extraído sin cambios funcionales. |
| `src/routes/api/public/hooks/{trip-journey-emails,coupon-review-reminders,visibility-notifications}.ts` | Reducidas a la delegación en `handleCronHook`. |
| `scripts/cron/fake-supabase.ts` | **Nuevo.** Cliente simulado (RPC + tabla thenable) para pruebas sin transporte real. |
| `scripts/cron/cron-hook-auth.test.ts` | **Nuevo.** 36 pruebas de autorización y contrato de fuente. |
| `scripts/cron/cron-jobs-isolation.test.ts` | **Nuevo.** 8 pruebas de aislamiento de los jobs con transporte simulado. |
| `supabase/migrations/20260905155935_*.sql` | Parte 1: `supabase_vault`, `cron_hooks_bootstrap_secret`, `cron_hooks_get_secret`, `cron_hooks_invoke` (SECURITY DEFINER, `search_path` fijado, EXECUTE revocado a `PUBLIC/anon/authenticated`; bootstrap sólo `service_role`). |
| `supabase/migrations/20260905160336_*.sql` | Parte 2: `cron.alter_job` idempotente por `jobname` sobre los tres jobs (mismo `jobid`, horario, base y usuario). |
| `src/integrations/supabase/types.ts` | Regenerado automáticamente (+6 líneas de tipos de las funciones). |

### Secreto

- `CRON_HOOKS_SECRET`: generado con el generador de secretos de la plataforma (64 caracteres alfanuméricos). Ni el agente ni este informe conocen su valor.
- Réplica en Vault: `cron_hooks_secret` (id `7cd9eb03-4904-4c26-9c7a-875f5c945b4c`). Sincronizada con `cron_hooks_bootstrap_secret()` desde un script temporal ya eliminado que sólo imprimió `{"verified":true,"length":64}`.
- `EB_CRON_SECRET` deja de usarse en estas tres rutas (sigue existiendo para `eb-process-scheduled-publish`, fuera de alcance).

## 4. Matriz de verificación

| # | Escenario | Resultado | Evidencia |
| --- | --- | --- | --- |
| a | Sin credencial → 401 | **PASS** | Unit ×3 rutas + curl en vivo ×3 (`none=401`) |
| b | `apikey` con la clave pública → 401 | **PASS** | Unit ×3 + curl en vivo ×3 (`apikey=401`) |
| b' | Bearer con la clave pública / parámetro de URL → 401 | **PASS** | Unit ×3 + curl en vivo ×3 (`bearer=401`, `query=401`) |
| c | `x-cron-secret` incorrecto (misma longitud) → 401 | **PASS** | Unit ×3 + curl en vivo ×3 (`wrong=401`) |
| d | Secreto correcto → el job corre con transporte simulado y escribe sólo en el cliente simulado | **PASS** | 8 pruebas de aislamiento: 0 escrituras sin candidatos; `enqueue_email` ×1 con candidato sintético; supresión → 0 transporte; visibilidad → 3 RPC + marca `notified_expiring_*_at`. Destinatarios `example.com` (RFC 2606). |
| e | Servidor sin secreto / secreto corto → 401 (fail closed) | **PASS** | Unit (`handleCronHook` no crea el cliente ni ejecuta el runner) |
| f | La respuesta y el registro no contienen el secreto ni motivo interno | **PASS** | Unit: cuerpo literal `Unauthorized`; excepción del runner → 500 `{"ok":false}` sin secreto en cuerpo ni en `console.error` |
| g | Contrato de fuente: las rutas y el módulo no leen `apikey`, bearer, `searchParams`, `SUPABASE_PUBLISHABLE_KEY` ni `EB_CRON_SECRET` (comentarios excluidos); única cabecera leída = `CRON_HOOK_HEADER` | **PASS** | Unit ×4 |
| h | Anónimo no puede invocar las funciones nuevas por Data API | **PASS** | `cron_hooks_get_secret`, `cron_hooks_bootstrap_secret`, `cron_hooks_invoke` → HTTP 401 `42501 permission denied` |
| i | `cron_hooks_invoke` lee Vault y emite la petición | **PASS** | Sondeo con ruta inexistente `/api/public/hooks/l3ma-probe` → request 2960 → `404` del sitio publicado (ningún job ejecutado) |
| j | Jobs reapuntados conservando `jobid`, horario, base y usuario | **PASS** | `cron.job`: 84 `17 * * * *`, 86 `15 13 * * *`, 89 `15 * * * *`, comando `SELECT public.cron_hooks_invoke('/api/public/hooks/<job>', true);` |
| k | Primer tic real tras el reapunte responde como antes (200) | **PASS** (89 y 84) · **NO VERIFICADO** (86, diario 13:15 UTC; mismo invocador) | §9 |
| l | El paquete del navegador no contiene `CRON_HOOKS_SECRET`, `x-cron-secret`, `cron_hooks_invoke`, `handleCronHook` ni `SUPABASE_SERVICE_ROLE_KEY` | **PASS** | `rg` sobre `dist/client` → 0 coincidencias |
| m | Ningún archivo del cambio ni migración contiene un valor de 64 caracteres | **PASS** | Escaneo del diff y de las dos migraciones → 0 |
| n | Typecheck · ESLint · Suite · Build · Route Inventory | **PASS** | `tsgo` limpio · ESLint limpio tras `--fix` · **869/869** (825 + 44 nuevas) · `bun run build` OK · 247 rutas |
| o | QA responsive 1440/834/430/390 | **PASS** | Sin cambios de UI en este lote. Smoke de no regresión en `/` y `/oriente-maya/valladolid`: desbordamiento horizontal 0, un `main` y un `h1` por página en los 4 anchos; único mensaje de consola = restricción de referer de Google Maps en `localhost` (preexistente, documentada en 3F-Preflight). |

## 5. Rollback (sin secretos)

Restaurar la orden anterior de cada job (la clave pública se toma de la configuración del proyecto, nunca se pega en el repositorio):

```sql
-- Sustituir <PUBLISHABLE_KEY> desde Project Settings; no confirmar este SQL en git.
SELECT cron.alter_job(84, command := $$SELECT net.http_post(url := 'https://project--fd89b51f-9afc-4e15-8ee2-21fe468f6aa9.lovable.app/api/public/hooks/coupon-review-reminders', headers := jsonb_build_object('Content-Type','application/json','apikey','<PUBLISHABLE_KEY>'), body := '{}'::jsonb);$$);
SELECT cron.alter_job(86, command := $$SELECT net.http_post(url := 'https://project--fd89b51f-9afc-4e15-8ee2-21fe468f6aa9.lovable.app/api/public/hooks/visibility-notifications', headers := jsonb_build_object('Content-Type','application/json','apikey','<PUBLISHABLE_KEY>'), body := '{}'::jsonb);$$);
SELECT cron.alter_job(89, command := $$SELECT net.http_post(url := 'https://project--fd89b51f-9afc-4e15-8ee2-21fe468f6aa9.lovable.app/api/public/hooks/trip-journey-emails', headers := jsonb_build_object('Content-Type','application/json','apikey','<PUBLISHABLE_KEY>'), body := '{}'::jsonb);$$);
```

Las funciones `cron_hooks_*` y el secreto en Vault pueden permanecer (inertes) o eliminarse con `DROP FUNCTION` + `SELECT vault.delete_secret(...)`. El código de las rutas se revierte con `git revert` de los commits del lote.

## 6. Transición y siguientes pasos (no ejecutados en este lote)

1. **Estado actual (transición):** el despliegue publicado aún corre el código anterior, que acepta `apikey`. Por eso `cron_hooks_invoke(..., true)` añade también la cabecera heredada: los jobs siguen funcionando hoy y, en cuanto se publique el código endurecido, éste ignora `apikey` y valida sólo `x-cron-secret`. No hay ventana de interrupción en ninguno de los dos estados.
2. **Tras publicar** (decisión del Founder): ejecutar la parte 3 — quitar la cabecera heredada:
   ```sql
   SELECT cron.alter_job(jobid, command := replace(command, ', true);', ', false);'))
   FROM cron.job WHERE jobid IN (84, 86, 89);
   ```
   y confirmar en `net._http_response` un `200` por job.
3. **Rotación del secreto:** cambiar `CRON_HOOKS_SECRET` en Project Settings → Secrets, volver a sincronizar Vault con `cron_hooks_bootstrap_secret` (desde un script efímero, nunca desde el repositorio) y publicar.
4. **Pendiente fuera de alcance:** `eb-process-scheduled-publish` (job 54) falla con 401 desde antes de este lote porque envía `apikey` y la ruta sólo acepta `EB_CRON_SECRET`; migrarlo al mismo módulo `handleCronHook` + `cron_hooks_invoke` es el siguiente candidato natural del Carril B.

## 7. Riesgos residuales

- **Linter de la base de datos:** 274 avisos, idénticos en número a la línea base del Lote 3L (ningún aviso nuevo; las tres funciones nuevas tienen `search_path` fijado y EXECUTE revocado, por lo que no aparecen en los avisos 0028/0029).
- **Vault y `CRON_HOOKS_SECRET` son dos copias del mismo valor.** Si se rota una sin la otra, los jobs fallan cerrados (401) sin enviar nada; la señal aparece en `net._http_response` y en `cron.job_run_details`.
- **Coste técnico:** cero dependencias nuevas; +3 funciones SQL; +1 secreto; +3 archivos de job, +1 módulo, +3 archivos de prueba. Sin cambios de UI, tokens ni diseño Premium.

## 8. Confirmación de rama

- Trabajo exclusivamente sobre `integration/lovable-valladolidmx`; la plataforma confirma los cambios automáticamente en su rama de edición y los integra en la rama de trabajo (sin ramas manuales, PR ni merge por parte del agente).
- HEAD al cierre: `2af04cdb841d4b6a8aaa1b5009eb8b0c0be23f93` · árbol de trabajo limpio (0 archivos pendientes) · base de la rama de integración al inicio del lote: `2a372e24fbb759a17b4ab6efeeeae391c43c083b`.
- Sin publicar, sin desplegar, sin tocar `main`.

## 9. Evidencia en vivo del primer tic

Ambos jobs horarios ya dispararon por el nuevo invocador (con la cabecera de transición) contra el despliegue publicado, con el mismo comportamiento que antes del lote (200, cero envíos reales):

| Job | Tic (UTC) | `cron.job_run_details` | `net._http_response` |
| --- | --- | --- | --- |
| 89 · `trip-journey-emails-hourly` | 2026-09-05 16:15:00 | `succeeded` | id 2964 · **200** · `{"ok":true,"results":{"t14":{"sent":0,…},"t3":{…},"welcome":{…},"post":{…}}}` |
| 84 · `coupon-review-reminders-hourly` | 2026-09-05 16:17:00 | `succeeded` | id 2965 · **200** · `{"ok":true,"reminder_1":0,"reminder_2":0,"failed":0,"suppressed":0}` |
| 86 · `visibility-notifications-daily` | próximo 2026-09-06 13:15:00 | — | NO VERIFICADO en vivo (mismo `cron_hooks_invoke`, misma ruta; cubierto por las pruebas d/j) |

Los `401` que aparecen a `:00/:05/:10/:15` en `net._http_response` corresponden al job 54 (`eb-process-scheduled-publish`), fuera de alcance y con fallo preexistente (§6.4).
