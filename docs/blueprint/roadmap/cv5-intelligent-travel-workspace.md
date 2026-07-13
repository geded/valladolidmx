---
name: CV5 Intelligent Travel Workspace (visión, no implementar)
description: Evolución del Travel Plan hacia Mi Viaje como compañero digital completo (vistas Resumen/Itinerario/Reservas/Concierge/Alux/Documentos/Recuerdos). Prohibido segundo modelo de viaje o herramientas paralelas.
type: constraint
---
Doc oficial: `docs/blueprint/16.CV5-INTELLIGENT-TRAVEL-WORKSPACE-v1.0.md`.

Reglas vinculantes al autorizar implementación:
- Fuente única `travel_plans` + `travel_plan_items`. Prohibido segundo modelo de viaje o itinerario paralelo.
- Mi Viaje = espacio personal. Itinerario/Reservas/Documentos/Recuerdos son VISTAS del Travel Plan, no módulos.
- Cada cambio sincroniza Travel Plan, Concierge, Alux, Timeline, email, PDF y link compartido.
- Roles: Viajero decide → Alux propone → Concierge perfecciona. Alux nunca modifica sin confirmación (CV0).
- Reutilización obligatoria: Travel Plan, Context Engine, Alux, Concierge, Navigation Contract, Google Maps, Travel Workspace.
- Acceso permanente "❤️ Mi Viaje" con CTA destacado si hay viaje activo.
- Founder Memory Principle: contexto continuo, el viajero nunca reinicia.

Estado: NO IMPLEMENTAR hasta autorización explícita. Se dividirá en épicas priorizadas contra Roadmap v2.0.
