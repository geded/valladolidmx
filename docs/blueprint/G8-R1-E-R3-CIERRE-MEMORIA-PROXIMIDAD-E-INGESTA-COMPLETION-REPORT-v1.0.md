# G8-R1-E-R3 · Cierre final de memoria, proximidad e ingesta — Completion Report v1.0

Base: HEAD `c86117a7` (worktree limpio). Alcance: exclusivamente los bloqueos
del Control Final G8-R1-E / R1-E-R1 / R1-E-R2. Sin publicación, sin redirects,
sin sitemap, sin cambios de contenido, `omxds_visual_v1_contracts_enabled=false`.

## 1. Persistencia end-to-end de señales (BLOQUEO CERRADO)

Causa raíz acreditada: `visitor_intel` **no está expuesto en la Data API**
(PostgREST `PGRST106 — Only the following schemas are exposed: public,
graphql_public`). El emisor y las server fns eran correctos; el fallo estaba
en el último eslabón de escritura.

Remediación mínima (un solo eslabón):

- Nueva función interna `public.visitor_intel_ingest_event(jsonb)`
  (`SECURITY DEFINER`, idempotente por `event_id`, `ON CONFLICT DO NOTHING`).
- `EXECUTE` revocado a `PUBLIC`/`anon`/`authenticated`; concedido sólo a
  `service_role`. No se expuso el esquema append-only a la API pública.
- `ingestVisitorEvent` / `ingestAnonymousVisitorEvent` escriben ahora por RPC.
  Contratos, validaciones y `IngestResult` sin cambios de forma.

Evidencia runtime (sesión anónima controlada, Playwright 390px sobre
`/oriente-maya/valladolid`):

| Momento | `select count(*) from visitor_intel.events` |
| --- | --- |
| Antes | `0` |
| Después | `1` — `intent.signal`, `surface=alux_dock`, `route=/oriente-maya/valladolid`, `trust_level=N0_anonymous`, `subject_id` seudónimo |

Cadena completa acreditada: `AluxFloatingTrigger` → `signal-emitter` →
`ingestAnonymousVisitorEvent` → `public.visitor_intel_ingest_event` →
`visitor_intel.events`.

## 2. Rate limit DURABLE (BLOQUEO CERRADO)

- Reutiliza el mecanismo existente `public.mcp_rate_buckets` + RPC atómico
  `mcp_rate_hit` (sin motor nuevo).
- `src/lib/visitor-intel/rate-limit.server.ts`: clave **seudónima**
  `subject:<subject_id>`, ventana 60 s, límite 60/min, **fail-closed** ante
  error del contador.
- Nuevo motivo tipado `rate_limited` + `retry_after_seconds`.
- Evidencia: filas reales en `mcp_rate_buckets` con
  `tool_name='visitor_intel.ingest'` y `count=1` por ventana.

## 3. Fusión anónimo → cuenta y continuidad multidispositivo

- Tabla `public.traveler_memory_projection` (RLS: cada quien sólo su fila).
- Sólo viaja el **resumen permitido** (`memory-summary.ts`, allowlist estricta
  con `.strict()`): intereses, grupo, preferencias, afinidad por categoría y
  territorio, aceptadas/rechazadas, TTL. Cero PII, cero historial detallado,
  cero ubicación precisa (probado: campos `email`, `lat`, `lng` son rechazados).
- **Posesión**: el navegador guarda un secreto aleatorio local
  (`possessionSecret`); al servidor sólo viaja su hash SHA-256. Un `subjectId`
  sin secreto no vincula memoria alguna.
- `AluxMemorySyncRunner` (montado en `__root`) recupera y publica el resumen al
  iniciar sesión (idempotente) y **limpia el resumen remoto al cerrar sesión**.
- El histórico append-only de `visitor_intel.events` no se reescribe ni
  re-atribuye.

## 4. Proximidad end-to-end (BLOQUEO CERRADO)

- `AluxContextualSuggestion.coords` expone las coordenadas **acreditadas** del
  catálogo canónico (sede real o heredada del operador).
- El dock aplica `attachDistance` con el hook existente
  `@/components/maps/useVisitorGeolocation` **antes** de `rankAluxCandidates`
  (sin hook nuevo: se respetó el freeze de infraestructura).
- Sin consentimiento, sin origen válido o sin coordenadas ⇒ no hay
  `distanceKm` y no se enuncia distancia (cero distancia inventada). La
  ubicación precisa nunca se persiste ni entra en señales/eventos.

## 5. Gates

- `bun run validate:r1:e:r3` → **PASS**: 16 (R3) + 23 (R1) + 33 (R1-E) = **72
  escenarios** en verde + `typecheck` limpio.
- QA runtime 390 px ejecutada (dock, memoria local, ingesta). Un solo motor, un
  solo dock, un solo planner.

## 6. Veredictos

| Dimensión | Veredicto |
| --- | --- |
| Perfil explícito | **PASS** (sin regresión) |
| Aprendizaje por comportamiento | **PASS** (persistencia runtime acreditada) |
| Memoria anónima | **PASS** |
| Fusión y continuidad multidispositivo | **PASS** |
| Proximidad | **PASS** |
| Paridad por plantillas | **PASS** (sin cambios) |
| Seguridad de ingesta | **PASS** (rate limit durable, fail-closed, service_role) |
| **R1-E global** | **CERRADA** |

STOP CONDITION respetada: no se inició R1-F, no se publicó nada y el flag
`omxds_visual_v1_contracts_enabled` permanece en `false`.
