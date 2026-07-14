---
name: Founder Safe Simulation Operations Principle
description: CV8.S.4+ · Toda ejecución de simulación es explícita, identificable, reversible y auditable. La persistencia sólo ocurre vía simulation_runs con is_simulation=true; el Wipe se limita a un simulation_run_id; el modo (real/simulation/combined) es visible siempre.
type: constraint
---
**Founder Safe Simulation Operations Principle** (vinculante, CV8.S.4+).

Persistencia y UI admin no deben poner en riesgo datos reales. El operador debe saber siempre qué escenario ejecuta, con qué seed, cuántos visitantes/eventos, qué costo, qué datos serán visibles y cómo se eliminarán.

## Regla de Persistencia
- Sólo `visitor_intel.simulation_runs` orquesta el ciclo (pending → running → completed | failed | wiped).
- Todo evento simulado escribe `is_simulation = true` + `simulation_run_id`.
- Idempotencia: el mismo `event_id` no se duplica (upsert `ignoreDuplicates`).
- Prohibido mezclar con la ingesta real (`ingest.functions.ts` nunca marca simulación).
- Wipe = DELETE `events WHERE simulation_run_id = :id` + `status='wiped'` + `wiped_at=now()`. El run se preserva como evidencia.

## Regla de UI Admin (mínimo)
Seleccionar escenario, escala, seed → preview de volumen → ejecutar → progreso/estado → selector real/simulation/combined → abrir Visitor Intelligence Center con `run activo` → Wipe con doble confirmación → historial de runs.

## Regla de Seguridad
- Sólo `admin` / `super_admin` (Founder).
- `full` (100k visitantes) requiere doble confirmación reforzada y respeta `SIMULATION_ALLOW_FULL` en runtime.
- Wipe SÓLO por `simulation_run_id`. Prohibido borrar por rango, nombre o flags ambiguos.
- Ningún modo combinado es dato productivo oficial.

## Regla de Experiencia
El modo simulación es visible en todo momento vía banner persistente y no ambiguo cuando la consola muestra datos simulados o combinados.

**How to apply:** rechazar cualquier PR que persista eventos simulados fuera del ciclo `simulation_runs`, que elimine simulación por criterios distintos a `simulation_run_id`, o que muestre datos simulados/combinados sin banner persistente.