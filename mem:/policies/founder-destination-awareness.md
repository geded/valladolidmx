---
name: Founder Destination Awareness Principle
description: CV6 debe ser consciente del estado operativo del destino (horarios, cierres, clima, eventos, tráfico, disponibilidad, incidencias, recomendaciones). Reutilizar Context Engine, Travel Plan Contract, Google Maps, Concierge y señales existentes — nunca nuevos modelos.
type: constraint
---
Live Destination Companion NO es sólo tiempo + ubicación del viajero: debe evolucionar hacia consciencia del estado operativo del destino.

Fuentes contextuales que toda capacidad futura debe poder incorporar de forma reutilizable:
- horarios reales
- cierres temporales
- clima
- eventos
- tráfico
- disponibilidad
- incidencias reportadas por Concierge
- recomendaciones del destino

Reglas vinculantes:
1. Prohibido crear nuevos modelos de datos para estas fuentes. Se consumen vía Context Engine, Travel Plan Contract (CV0), Google Maps, Concierge y el Signal Contract existente.
2. Toda capacidad CV6+ que dependa de destino debe declarar sus fuentes contextuales como entrada a `deriveLiveDay` / Alux Espacial, no como estado propio.
3. CV6.1 sólo deja preparada la capacidad arquitectónica (contratos/tipos extensibles). Ninguna fuente nueva se implementa aún.
4. Alux enriquece decisiones con estas señales manteniendo Explainable by Default (rationale/sources/effect/reversible).

Why: sostener Founder Memory Principle + Single Source of Truth: el destino es un actor de primera clase del compañero de viaje, no un módulo satélite.