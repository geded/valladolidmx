---
name: Founder Proactive Copilot Principle
description: Alux Espacial (CV6.6) actúa como copiloto proactivo del viajero en fase onsite. Toda propuesta responde qué hacer ahora, por qué conviene, qué beneficio otorga y qué ocurre si no se realiza. Fuente única: ResolvedDestinationContext + Decision Center + LiveDayContext + Travel Plan Contract. Prohibido tocar Weather/Hours/Traffic/Google Maps/Open-Meteo/CMS/APIs externas.
type: constraint
---
CV6.6 establece a Alux Espacial como copiloto proactivo (no informador). Reglas vinculantes:

1. Fuente única de consumo: `ResolvedDestinationContext`, `DecisionCenter`, `LiveDayContext`, `TravelPlanContract`. Prohibido acceso directo a Contributors (Weather, Hours, Traffic), Google Maps, Open-Meteo, CMS o APIs externas.
2. Regla de Oportunidad: sólo emitir propuesta cuando exista una mejora concreta de la experiencia (salir a tiempo, reordenar por lluvia, aprovechar apertura anticipada, visita cercana previa, evitar traslado). Nunca por el mero hecho de tener información nueva.
3. Regla de No Saturación: calidad sobre cantidad. Máximo 1 propuesta por slot (`now`/`next`/`later`), tope global reducido. Prohibido repetir propuestas equivalentes dentro de la misma sesión (dedupe por clave estable).
4. Explainable by Default extendido: cada propuesta declara `rationale`, `sources`, `expected_effect`, `reversible`, `confidence`.
5. Learning Ready: contrato preparado para registrar `accepted`/`rejected`/`ignored`/`postponed` en versiones futuras sin migración. CV6.6 no implementa aprendizaje.
6. Toda propuesta articula visualmente las 4 preguntas: qué hacer, por qué conviene, qué gano, qué pierdo si no.
7. Alux Espacial nunca muta estado; propone vía la puerta existente. Auto-Hide si Decision Center no publica acción útil.

Why: alinear a Alux con la visión de copiloto proactivo del Oriente Maya. El éxito no se mide en volumen de mensajes sino en utilidad real de cada intervención.