---
name: Founder Travel Lifecycle Principle
description: El viaje nunca termina. Ciclo oficial del viajero — Inspiración → Exploración → Planeación → Pre-viaje → En destino → Post-viaje → Inspiración. El Post-viaje inicia el siguiente viaje. Vinculante para toda evolución de producto.
type: constraint
---
Principio Founder vinculante (2026-07-13). Reglas:

1. Toda superficie, capacidad, notificación, email, contenido, propuesta de Alux, sección del Workspace y evento del CRM debe declarar en qué etapa del Journey opera y cómo empuja al viajero hacia la siguiente etapa (incluida la vuelta a Inspiración).
2. Etapas oficiales (canónicas, sin sinónimos): `inspiration` · `exploration` · `planning` · `pre_trip` · `on_trip` · `post_trip`. El helper único de derivación es `src/lib/traveler/journey-stage.ts`.
3. Prohibido tratar Post-viaje como final: cada capacidad Post-viaje debe abrir explícitamente el siguiente ciclo (recuerdos → recomendaciones → siguiente destino → nueva inspiración).
4. Prohibido crear taxonomías paralelas de "fases", "estados" o "modos" del viajero fuera de este ciclo.
5. Aplica retroactivamente: cualquier épica futura CV6+, CV7+ y CV8+ debe operar sobre las 6 etapas.

Why: sostener continuidad y recurrencia; alinear Travel Plan, Travel Passport, Alux, Concierge y CRM sobre un ciclo único de vida del viaje.