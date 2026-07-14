---
name: Founder Simulation Isolation Principle
description: CV8.S+ · Todo dato simulado del Visitor Intelligence Center debe ser inequívocamente identificable, nunca confundible con producción y siempre filtrable en cada consulta (real / simulado / real+simulado autorizado).
type: constraint
---
**Founder Simulation Isolation Principle** (vinculante, CV8.S+).

Complementa a `founder-reproducible-simulation`. Rige la separación operativa entre datos reales y simulados.

## Reglas

- Toda fila generada por el Simulation Pack lleva `is_simulation = true` y `simulation_run_id` no nulo referenciando `visitor_intel.simulation_runs`.
- Toda fila productiva lleva `is_simulation = false` y `simulation_run_id = NULL`. Guardrail por trigger obligatorio.
- Toda consulta del Visitor Intelligence Center (CV8.3..CV8.8) debe poder ejecutarse sobre uno de tres modos: `real` (default), `simulation` (con `run_id`), `combined` (sólo bajo autorización explícita del Founder para validación).
- Prohibido cualquier join, agregación o dashboard que mezcle real+simulado sin declarar el modo activo en la UI.
- El borrado (`wipe_simulation_run`) sólo puede eliminar filas con `is_simulation = true` y `simulation_run_id` coincidente. Cero riesgo sobre productivos.
- Los identificadores de sujetos simulados usan prefijo determinístico `sim_<run_id_short>_<n>` — jamás colisionan con productivos.

**How to apply:** rechazar cualquier PR que (a) inserte en tablas afectadas sin las dos columnas, (b) exponga un dashboard/consulta sin selector de modo, (c) permita rutas de borrado que no filtren simultáneamente por `is_simulation=true` y `simulation_run_id`.