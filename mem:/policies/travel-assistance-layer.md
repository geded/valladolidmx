---
name: Travel Assistance Layer Principle
description: CV6.7 establece el Travel Assistance Layer como única capa de asistencia al viajero durante fase onsite (y extensiones a confirmed/T-3). Un solo contrato de dominio, un solo punto de entrada y una sola experiencia. Prohibido crear flujos paralelos (Concierge, Chat, SOS, Premium, Voz, Llamadas, WhatsApp, Incidencias, IA colaborativa, Automatizaciones, Seguimiento). Toda evolución se realiza extendiendo el contrato existente.
type: constraint
---
CV6.7 no es un banner del Concierge: es la primera capa del Travel Assistance Layer de Alux. Reglas vinculantes:

1. Single Entry Point: toda interacción de asistencia durante el viaje (concierge, chat, SOS, voz, llamadas, WhatsApp, incidencias, IA colaborativa, seguimiento) se origina desde este contrato. Prohibidos flujos paralelos.
2. Pure Domain: `deriveOnTripConciergeState()` es el contrato oficial. Debe permanecer puro, determinista, sin efectos secundarios, fácilmente testeable y reutilizable. Toda decisión pertenece al derivador — nunca al componente visual.
3. Stateless UI: el banner es 100% presentacional (props → render). Prohibido consultar APIs, abrir stores, polling, timers, mutaciones o reglas de negocio en la capa visual.
4. Strict Reuse: se reutilizan EXCLUSIVAMENTE `LiveDayContext`, `promotePlanToCase`, `concierge_orders` y CV6.1–CV6.6. Prohibido crear nuevos Providers, Contexts, consultas al CMS o a Contributors, o acceso directo a APIs externas.
5. Explainable by Default: cada superficie explica por qué aparece, SLA vigente, estado del Concierge y qué ocurrirá al pulsar el CTA. El sistema explica su comportamiento; el viajero nunca lo interpreta.
6. Evolution without Refactoring: futuras capacidades (Chat en vivo, Voz, Llamadas, WhatsApp, Premium, SOS, Incidencias, IA colaborativa, Automatizaciones, Seguimiento) se incorporan extendiendo el contrato — nunca una segunda arquitectura.

Why: consolidar la asistencia al viajero como capa de plataforma (no como feature aislado), preservando simplicidad del dominio, reutilización del código y experiencia consistente.