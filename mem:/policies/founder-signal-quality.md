---
name: Founder Signal Quality Principle
description: Visitor Intelligence prioriza calidad de señales sobre cantidad de eventos. Sólo se ingieren eventos que expliquen una transición del Journey o alimenten aprendizaje/decisión de negocio. Modelo append-only estable; evolución sólo aditiva y compatible con contratos v1.0.
type: constraint
---
**Founder Signal Quality Principle** (vinculante, CV8.1+).

El objetivo de la ingesta NO es registrar todos los clics del visitante. Es registrar únicamente los eventos que ayuden a comprender la evolución del viajero dentro del Journey.

## Regla de Eventos (obligatoria)

Todo evento incorporado debe declarar explícitamente:

1. Qué etapa del Journey afecta.
2. Qué transición (T1..T9) puede provocar.
3. Qué KPI del catálogo alimenta.
4. Qué decisión de negocio permitirá responder en el futuro.

Si un evento no puede responder las 4 preguntas, NO se incorpora al modelo.

## Regla de Evolución

- Modelo append-only estable. Prohibido mutar eventos ya emitidos.
- Toda evolución futura debe ser aditiva y compatible con `VISITOR_EVENT_SCHEMA_VERSION` v1.0.0.
- Cambios breaking requieren autorización Founder + nueva mayor de contrato.

**How to apply:** rechazar cualquier PR de instrumentación (CV8.1+) que introduzca eventos sin declarar transición/KPI/decisión, o que mute registros existentes. Preferir NO instrumentar antes que instrumentar ruido.