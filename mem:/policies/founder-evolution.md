---
name: Founder Evolution Principle
description: CV8.S+ · CV8.S es la primera implementación funcional del sistema de simulación; sus decisiones arquitectónicas no deben impedir la evolución futura hacia un Visitor Intelligence Simulation Engine configurable y reutilizable.
type: constraint
---
**Founder Evolution Principle** (vinculante, CV8.S+).

## Reglas

- La evolución futura hacia un Simulation Engine debe poder reutilizar los contratos construidos en CV8.S sin rediseñar el Visitor Intelligence Center.
- **Regla de Compatibilidad** — cinco capas separadas, cada una capaz de evolucionar independientemente:
  1. **Contratos** (`SimulationScenario`, `SimulationRun`, `SimulatedEventEnvelope`).
  2. **Generación de escenarios** (perfiles, calendario, paths).
  3. **Ejecución** (motor de eventos + sub-motores).
  4. **Visualización** (selector de modo real/simulación/combinado en el Center).
  5. **Limpieza** (wipe por `run_id`).
- Prohibido acoplar dos capas al punto de requerir refactor cruzado para cambiar una.
- Prohibido persistir escenarios como código; siempre serializables (JSON/Zod) para reutilización futura.

**How to apply:** cada sub-ola CV8.S.* debe declarar en su Completion Report a qué capa pertenece y cómo mantiene la separación.