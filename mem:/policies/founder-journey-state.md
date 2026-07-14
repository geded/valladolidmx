---
name: Founder Journey State Principle
description: El estado del Journey nunca se persiste como fuente de verdad — se deriva siempre del historial append-only de eventos. Proyección explicable (qué eventos, qué transición, cuándo, con qué confianza) y recomputable en su totalidad. Prohibido estado editable manualmente o dependencias irreproducibles.
type: constraint
---
**Founder Journey State Principle** (vinculante, CV8.2+).

El estado del Journey de cada visitante NO se persiste como fuente de verdad. Es una **vista derivada** del historial append-only en `visitor_intel.events`.

## Regla de Proyección

Toda proyección debe poder explicar:

1. Qué eventos justifican el estado actual.
2. Qué transición produjo el cambio (T1..T9 canónicas).
3. Cuándo ocurrió.
4. Con qué nivel de confianza fue determinada.

## Regla de Recomputación

La proyección debe poder recalcularse **completamente** a partir del historial. Nunca depende de estados persistidos manualmente ni de procesos irreproducibles. Si se cachea (materialized view / snapshot), el snapshot es reemplazable en cualquier momento por una recomputación desde eventos.

**How to apply:** rechazar cualquier PR CV8.2+ que (a) introduzca UI/RPC para editar el `current_stage`, (b) escriba estado sin evento correspondiente, o (c) proyecte sin poder responder las 4 preguntas de la Regla de Proyección.