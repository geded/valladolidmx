---
name: Founder Ecosystem Interaction Principle
description: Los sub-motores no generan actividad artificial desconectada del Journey — cada interacción de Alux, Concierge, Commerce y Reviews surge como consecuencia coherente del perfil, la etapa, la intención y las decisiones previas del viajero simulado.
type: constraint
---

**Regla vinculante (CV8.S.3+):** El objetivo de los sub-motores es modelar cómo cada capacidad del ecosistema influye realmente en la evolución del viajero.

**Prohibiciones absolutas:**
- Compras sin propuesta o intención previa registrada en la traza.
- Reseñas sin experiencia completada (sin T8 previo).
- Concierge sin caso abierto.
- Aceptación de Alux sin recomendación registrada.

**Requisito de cohesión:** Los cuatro sub-motores comparten el mismo `subject_id`, Journey, calendario y contexto territorial. Toda interacción debe ser explicable — `decision.offered.rationale` obligatorio, y `causality.prerequisite` debe apuntar a un evento previo real de la traza.

**Reglas específicas:**
- **Alux:** simula preguntas, recomendaciones, aceptaciones, rechazos, optimizaciones de itinerario, consultas onsite; puede influir en probabilidad de transición.
- **Concierge:** ciclo completo (apertura → asignación → primera respuesta → propuesta → seguimiento → aceptación/rechazo/abandono → cierre exitoso/perdido); SLA afecta conversión.
- **Commerce:** propuesta aceptada → orden → pago pendiente → pago exitoso/cancelación/expiración/reembolso; toda venta vinculada a causa previa.
- **Reviews:** solicitud → publicación (subset, no todos reseñan) → calificación → texto → respuesta del negocio → posible conversión a embajador/recurrente.

**Meta producto:** Demostrar qué combinaciones de interacción generan mayor confianza, permanencia, conversión y recomendación dentro del Oriente Maya de Yucatán.