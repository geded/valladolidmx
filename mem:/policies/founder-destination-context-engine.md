---
name: Founder Destination Context Engine Principle
description: CV6.4 establece la arquitectura oficial de Destination Context Contributors. Toda fuente de contexto del destino (clima, horarios, tráfico, eventos, disponibilidad, cierres, incidencias, recomendaciones, protección civil, ocupación, promociones, festividades, alertas) se integra como Contributor independiente publicando vía Context Engine. Prohibido consumir un proveedor directamente desde una superficie.
type: constraint
---
CV6.4 no es sólo "clima + horarios + tráfico". Es la arquitectura oficial mediante la cual cualquier fuente de contexto del destino podrá enriquecer las decisiones del Travel Companion sin refactor.

Reglas vinculantes:
1. Toda nueva fuente de contexto del destino se integra como `DestinationContextContributor` reutilizando el Context Engine existente. Prohibido crear un nuevo motor de contexto.
2. Cada Contributor es un proveedor independiente. NUNCA lógica embebida en Alux, Concierge, Mi Viaje, Now·Next·Later o cualquier superficie.
3. Los Contributors publican al Context Engine (canal `destination.*`). Consumidores (Alux, Mi Viaje, Concierge, Decision Center, futuras capacidades) SÓLO leen del Context Engine — jamás directo del proveedor.
4. La arquitectura debe quedar preparada para incorporar sin refactor: eventos, disponibilidad, cierres temporales, incidencias del Concierge, recomendaciones, protección civil, ocupación turística, promociones, festividades, alertas operativas.
5. Contributors iniciales (CV6.4): `weather`, `hours`, `traffic`. Sub-olas futuras registran nuevos IDs sin tocar consumidores.
6. Cada señal publicada declara: `source`, `at`, `ttl`, `scope` (geo/entidad), `payload` tipado, y `explain` (rationale legible por Alux).

Why: sostener Single Source of Truth + Founder Destination Awareness + Explainable by Default. El destino es un actor de primera clase; su consciencia se distribuye sin acoplarse a superficies.
