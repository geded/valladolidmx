# MCP M1 · Discovery-Grade Tools — Plan de Ejecución

**Autorizado:** GO Founder · Alcance: sólo lecturas · Fuera: mutaciones, pagos, Alux-as-a-Service.

## Sub-olas (una a la vez, con Completion Report y Founder GO/NO-GO entre cada una)

### M1.0 · Foundations & Hardening (R1, R2, R3)
**Objetivo:** dejar operativa la infraestructura transversal que todas las tools consumirán.

- **R2 · Auditoría MCP:** migración `mcp_tool_invocations` (invocation_id, client_id, user_id, tool_name, contract_version, input_hash SHA-256, duration_ms, success, error_code, locale, timestamp). RLS: sólo admin lee; inserta un helper `logMcpInvocation()` (RPC `SECURITY DEFINER` acotado a llamar desde el servidor). Prohibido registrar tokens/PII.
- **R1 · Rate limiter:** tabla `mcp_rate_buckets` (client_id, user_id/IP fallback, tool_name, window_started_at, count) + helper `enforceRateLimit(ctx, tool, {perMin, perHour})`. Respuesta 429 con `Retry-After`. Registra en auditoría.
- **R3 · Protección de búsqueda:** helper `sanitizeSearchQuery(q)` — mínimo 3 alfanuméricos, rechaza `%%`/`__`/wildcards puros, escapa `%_\`, cap a 60 chars, cap resultados 25. Base para FTS futura sin bloquear M1.
- **Output schemas Zod** en `search_businesses`, `get_my_traveler_profile`, `list_my_travel_plans` + añadir `locale` input (`es|en|fr|de|it|pt`).
- **Helper compartido** `src/lib/mcp/lib/` con: `ctx-supabase.ts` (cliente por token/anón), `audit.ts`, `rate-limit.ts`, `sanitize.ts`, `locale.ts` (fallback explícito auditable), `contracts.ts` (schemas comunes: `GeoPoint`, `LocalizedText`, `SourceCitation`).
- **Consent screen** (`src/routes/[.]lovable.oauth.consent.tsx`): copy claro en lenguaje humano ("consultar tu perfil de viajero", "consultar tus planes", "buscar información turística"), no scopes técnicos. Enlace al dominio canónico `https://quehacerenvalladolid.com/mcp`.

**DoD M1.0:** typecheck+build limpios, migración aplicada con GRANTs, RLS probado (anon no lee auditoría), 3 tools existentes con outputSchema tipado + locale, consent screen actualizada. Completion Report M1.0.

### M1.1 · Discovery Tools Batch A (contenido)
- `search_experiences` (products tipo experiencia) — reutiliza `catalog/marketplace-reads`.
- `search_events` — reutiliza `events/public-reads`.
- `get_business(slug)` — reutiliza `catalog/business-related`.
- `get_destination_context(slug)` — reutiliza `destinations/public-reads` + zonas + badges Pueblo Mágico.

Todas con: contractVersion 1.0.0, outputSchema Zod tipado, locale, rate limit, auditoría, explainability (`sources[]`, `rationale`, `freshness`, `limitations`). Cero motores paralelos: sólo wrappers sobre server functions aprobadas.

### M1.2 · Discovery Tools Batch B (territorio)
- `nearby_from_coords(lat, lng, radius_m, categories?)` — **Geolocation Mandatory**: sólo devuelve entidades con lat/lng; incluye `distance_m` por Haversine RPC ya existente.
- `list_destinations` — con badge Pueblo Mágico.
- `list_pueblos_magicos` — filtro derivado del registry (Valladolid/Izamal/Espita).
- `list_categories` — categorías oficiales de negocios.

### M1.3 · Validación & Cierre
- Prueba RLS: token válido, sin token (401), token de otro usuario (rows scoped).
- Prueba multi-idioma (es/en/fr mínimo).
- Prueba real desde ChatGPT y Claude con dominio canónico.
- Regenerar manifiesto (`app_mcp_server--extract_mcp_manifest`).
- **Completion Report** con matriz Tool → Fuente → Permiso → Schema → Rate limit → Auditoría → Fallback.
- Outcome Validation + Veredicto GO/NO-GO para beta cerrada.

## Reglas vinculantes durante toda la ola
- Cero `SUPABASE_SERVICE_ROLE_KEY` en `src/lib/mcp/`.
- Cero motores paralelos: toda tool consume server functions/RPCs aprobados.
- Explainable-by-Default: cada respuesta incluye `sources`, `freshness_hint`, `limitations` cuando aplique.
- Geolocation Mandatory en toda tool territorial.
- Documentación y consent apuntan sólo a `https://quehacerenvalladolid.com/mcp`.

## Fuera de alcance (M2+)
Mutaciones Travel Plan, Concierge handoff, Commerce, Pagos, Alux-as-a-Service, tools para empresas.

## Siguiente paso
Ejecutar **M1.0 · Foundations & Hardening** ahora y presentar Completion Report antes de abrir M1.1.
