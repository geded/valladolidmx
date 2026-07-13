---
name: Founder Outcome Validation Principle
description: Una épica no se cierra sólo porque compile/pase tests/ejecute Blueprint. Todo Completion Report debe incluir sección Outcome Validation que demuestre capacidad de producir el cambio de comportamiento del Behavioral Change Statement.
type: preference
---
**Founder Outcome Validation Principle** (vinculante, complementa Founder Behavioral First Principle).

Una épica NO se considera completamente finalizada únicamente porque el código compile, los tests pasen, la arquitectura sea correcta o el Blueprint se haya ejecutado. Además debe demostrarse que la experiencia tiene capacidad de producir el cambio de comportamiento declarado en su **Behavioral Change Statement**.

## Outcome Validation (sección obligatoria en TODO Completion Report)

Todo Completion Report debe cerrar con una sección **Outcome Validation** que responda como mínimo:

1. **¿Se implementó completamente la experiencia diseñada?**
2. **¿Existe evidencia de que puede provocar el comportamiento esperado?**
3. **¿Qué métricas deberán observarse en producción para validar esa hipótesis?**
4. **¿Qué resultados podrían demostrar que la hipótesis fue incorrecta?** (criterios de falsación)
5. **¿Qué ajustes se realizarían si el comportamiento esperado no ocurre?**

## Distinción obligatoria

- **Cierre técnico** (Completion Report) — certifica que la implementación quedó correctamente construida.
- **Validación de resultados** (Outcome Validation posterior) — confirma si la experiencia realmente produjo el cambio de comportamiento previsto.

Ambos forman parte de la definición de éxito del producto y deben mantenerse claramente diferenciados.

**How to apply:** rechazar/regresar cualquier Completion Report que no cierre con la sección Outcome Validation cubriendo las 5 preguntas y vinculada explícitamente al Behavioral Change Statement del Blueprint correspondiente.