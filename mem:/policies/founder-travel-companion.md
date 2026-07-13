---
name: Founder Travel Companion Principle
description: Mi Viaje es el compañero digital del viajero antes/durante/después. La UI se adapta a la fase (Planeando · Confirmado · En viaje · Finalizado) sin cambiar de producto. Vinculante para todas las sub-olas CV5.
type: constraint
---
"Mi Viaje" NO es un editor de itinerarios; es el compañero digital del viajero durante todo el ciclo de viaje al Oriente Maya de Yucatán.

Fases oficiales (derivadas del Travel Plan + orden confirmada, sin nuevo modelo):
- **Planeando** — plan activo sin orden pagada. Predomina: organización, inspiración, Alux, agregar ítems.
- **Confirmado** — orden pagada, viaje futuro. Predomina: reservas, documentos, cuenta regresiva, preparación.
- **En viaje** — hoy está dentro de `[plan_start_date, plan_end_date]`. Predomina: navegación/mapas/horarios, Concierge en línea, Alux espacial.
- **Finalizado** — hoy > `plan_end_date`. Predomina: recuerdos, reseñas, preparación del siguiente viaje.

Reglas vinculantes CV5:
1. Las 7 vistas (Resumen · Itinerario · Reservas · Concierge · Alux · Documentos · Recuerdos) son vistas del MISMO `travel_plans` activo — jamás módulos independientes.
2. La fase se calcula, no se persiste: helper único `deriveTripPhase(plan, confirmed)` consumido por todo CV5.
3. El Itinerario nace preparado para 3 visualizaciones sobre el mismo modelo (`travel_plan_items`): **Timeline** (principal en viaje) · **Lista** · **Mapa**. Prohibido segundo modelo.
4. El Itinerario evolucionará hacia Motor de Optimización (Alux propone: distancias, horarios, clima, tráfico, presupuesto, experiencia). Diseñar con esa evolución en mente; viajero siempre decide.
5. Reutilización obligatoria: Travel Plan Contract (CV0), Context Engine, Alux Registry, Concierge, Google Maps, Navigation Contract, Workspace Engine. Prohibidos nuevos motores o modelos paralelos.

Why: sostener el Founder Memory Principle — el viajero nunca reinicia; Mi Viaje lo acompaña antes, durante y después.