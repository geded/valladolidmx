---
name: Founder Reproducible Simulation Principle
description: CV8.S · Toda simulación del Visitor Intelligence Center debe ser reproducible, determinística, configurable, aislada (is_simulation=true), reversible y jamás confundible con datos reales.
type: constraint
---
**Founder Reproducible Simulation Principle** (vinculante, CV8.S+).

La simulación del Visitor Intelligence Center no es una carga única de datos.
Es herramienta permanente de validación, QA, regresión, rendimiento y demo.

## Reglas

- **Reproducible**: misma configuración + misma `seed` ⇒ mismo escenario byte-a-byte.
- **Determinística**: prohibido `Math.random` sin PRNG sembrado; toda variación pasa por generador con seed explícita.
- **Configurable** vía `SimulationScenario`: escala (light≈1k / medium≈10k / full≈100k), rango de fechas, destino principal, distribución territorial, perfiles de viajero, tasas de avance/abandono, comportamiento de Alux/Concierge, volumen de ventas, anomalías.
- **Aislada**: todo registro sembrado lleva `is_simulation = true` y `simulation_run_id`. Prohibido mezclar con datos reales.
- **Reversible**: un único comando administrativo elimina todos los registros de un `simulation_run_id` sin tocar datos reales.
- **Segura**: escala full requiere confirmación explícita (volumen estimado, costo, entorno) antes de correr; bloqueada por defecto en producción.
- **Realista**: prohibido datos uniformes/aleatorios planos; debe simular estacionalidad, weekends, clima, eventos.
- **No confundible**: credenciales/perfiles/subject_ids simulados no colisionan con productivos.

**How to apply:** rechazar cualquier sub-ola CV8.S que introduzca datos demo sin seed, sin `is_simulation`, sin `simulation_run_id`, sin comando de borrado, o con `Math.random` directo en la ruta de generación.
