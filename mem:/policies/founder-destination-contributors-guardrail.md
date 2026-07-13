---
name: Architectural Guardrail — Destination Context Contributors
description: CV6.4+ vinculante. Los Destination Contributors son proveedores independientes de DestinationSignal. Ningún Contributor depende de otro. Toda correlación/priorización/resolución de conflictos vive exclusivamente en el Decision Center consumiendo ResolvedDestinationContext. Consumidores (Decision Center, IA, recomendaciones, Experience Builder, etc.) nunca acceden a Contributors individuales.
type: constraint
---
Reglas vinculantes (complementan Founder Destination Context Engine Principle):

1. Cada `DestinationContextContributor` es independiente. Prohibido que un Contributor importe, invoque o dependa (directa o indirectamente) de otro Contributor.
2. Contributors sólo generan señales normalizadas (`DestinationSignal`). Prohibida lógica de negocio, priorización, combinación o resolución de conflictos dentro de un Contributor.
3. Toda correlación, priorización, combinación y resolución de conflictos entre señales vive EXCLUSIVAMENTE en el Decision Center, operando sobre `ResolvedDestinationContext`.
4. Consumidores de contexto (Decision Center, Alux, recomendaciones, Experience Builder, Mi Viaje, Concierge, futuros) NUNCA acceden a Contributors individuales — sólo a `ResolvedDestinationContext` publicado por el resolver.
5. La explicabilidad (`Explain`) se mantiene centralizada en el Decision Center; los Contributors sólo aportan `explain.rationale` a nivel de señal.

Beneficios que la regla garantiza:
- Independencia total entre proveedores.
- Reemplazo de APIs (Open-Meteo → Google Weather, CMS hours → PMS, etc.) sin refactor.
- Incorporación de nuevas fuentes (Google Maps, Google Places, Protección Civil, Eventos, Promociones, Occupancy, etc.) mediante simple registro.
- Cumplimiento del Founder Destination Context Engine Principle.

Criterios de aceptación permanentes para CV6.5+:
- El Decision Center consume EXCLUSIVAMENTE `ResolvedDestinationContext`.
- CMS (horarios) y Google Maps (tráfico) se implementan como Contributors independientes.
- Ninguna lógica de negocio dentro de Contributors.
- Priorización + Explain centralizadas en Decision Center.