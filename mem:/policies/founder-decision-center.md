---
name: Founder Decision Center Principle
description: CV6.2 · Now-Next-Later es el Centro de Decisiones del viajero, no una línea de tiempo. Cada tarjeta prioriza acción > motivo > contexto > acciones secundarias; se prioriza por impacto experiencial; se auto-oculta cuando no aporta valor.
type: constraint
---
Regla vinculante para CV6.2 (Now · Next · Later) y toda evolución del Decision Center.

Principio rector:
> "Now · Next · Later" NO es una línea de tiempo. Es el Centro de Decisiones del viajero. Su objetivo es ayudar a decidir, no informar.

Jerarquía de decisión por tarjeta (orden inviolable):
1. ¿Qué debo hacer AHORA? (acción concreta)
2. ¿Por qué? (motivo de la recomendación)
3. Contexto (ubicación, horario, clima, tráfico, disponibilidad, estado operativo)
4. Acciones secundarias

Regla de priorización (cuando hay múltiples eventos simultáneos):
- Priorizar automáticamente por mayor impacto sobre la experiencia del viajero.
- Ejemplos con alta prioridad: salida inmediata, cambio del Concierge, modificación del itinerario, cierre inesperado, alerta climática, oportunidad relevante cercana.

Decision Context (fuentes reutilizables, prohibido motor paralelo):
- fase del viaje (`deriveTripPhase`)
- itinerario (`travel_plan_items` vía Travel Plan Contract)
- ubicación (Context Engine · `useVisitorGeolocation`)
- clima, tráfico, horarios, disponibilidad (`DestinationContext`, CV6.3+)
- estado operativo del destino (Founder Destination Awareness Principle)
- recomendaciones del Concierge (`concierge_case_links`, señales existentes)
- contexto Alux (`attachAluxSuggestion`, `AluxContextChip`)

Action First:
- Toda tarjeta debe declarar una acción concreta cuando exista una útil (ej. "Sal ahora", "Iniciar navegación", "Confirmar asistencia", "Hablar con Concierge", "Reorganizar itinerario", "Ver alternativa", "Abrir mapa", "Ver voucher").
- La acción principal siempre pesa más visualmente que la información descriptiva.

Auto-Hide Rule:
- Una tarjeta desaparece automáticamente cuando deja de aportar valor.
- Prohibido renderizar tarjetas sólo porque exista información disponible.
- Cada tarjeta debe justificar su presencia con valor accionable al viajero en ese instante.

Evolución futura sin refactor:
- Nuevas capacidades (clima, tráfico, disponibilidad en tiempo real, cambios del Concierge, alertas operativas, promos contextualizadas, eventos cercanos, recomendaciones inteligentes) se conectan al mismo modelo `DecisionCard` mediante `contributors` aditivos.
- Reutilización obligatoria: Context Engine, Travel Plan Contract, Google Maps, Concierge, Signal Contract, Alux Registry.

Aceptación en Completion Reports (CV6.2+):
- Declarar contribuyentes activos, regla de priorización aplicada, condición de auto-ocultamiento y acción principal por tipo de tarjeta.

Why: sostener Founder Experience First Rule + Founder Travel Companion Principle + Founder Destination Awareness Principle — Now·Next·Later se juzga por decisiones facilitadas, no por datos mostrados.