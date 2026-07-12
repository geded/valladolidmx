---
name: Travel Plan Contract v1.0 + Addendum
description: Contrato fundacional oficial del Travel Plan como entidad canónica del producto, incluyendo addenda aprobadas sobre Travel Intent, Responsabilidad Comercial y Founder Travel Intelligence Principle.
type: constraint
---
Doc oficial: `docs/blueprint/16.CV0-TRAVEL-PLAN-CONTRACT-v1.0.md` (Addendum incorporado al final como v1.0.1 documental).

Reglas vinculantes:
- Travel Plan = entidad canónica única. Prohibido segundo modelo de viaje, snapshot paralelo, carrito alternativo o base de contexto adicional.
- Read Contract: `getMyActivePlan`, `getPlanForConcierge`, `getPlanContextForAlux`, `getPlanSnapshot`.
- Write Contract: `addPlanItem/removePlanItem/updatePlanItem`, `updatePlanMeta`, `promotePlanToCase` (única puerta al Concierge), `attachAluxSuggestion` (Alux propone, viajero confirma), `acceptProposal`, `cancelPlan`. Prohibido escribir directo a `travel_plans`/`travel_plan_items`.
- Signal Contract: `plan.item_added/removed/updated`, `plan.meta_updated`, `plan.promoted_to_case`, `plan.proposal_received`, `plan.accepted/paid/completed/cancelled`.
- Alux NUNCA modifica el plan sin confirmación explícita del viajero.
- Snapshot al promover a caso es INMUTABLE.
- Governance: cambios al contrato requieren semver; breaking requiere aprobación Founder.
- Roadmap oficial dependiente: CV0 ✅ → CV2 (Bridge Alux↔Plan↔Concierge) → CV3 (Travel Drawer) → CV1 (Panel Admin) → CV4 (Checkout).

Addenda aprobados (v1.0.1 documental, sin cambios de código):
- **Travel Intent:** nivel de intención derivado/calculado para priorizar Concierge, CRM, Analytics y automatizaciones de Alux.
- **Responsabilidad Comercial:** el Concierge Humano es owner principal de la etapa Venta; Alux, Travel Plan y Checkout son apoyos.
- **Founder Travel Intelligence Principle:** toda capacidad nueva debe responder si ayuda a descubrir, decidir, organizar, comprar, disfrutar o regresar; de lo contrario debe justificarse explícitamente.

Why: unificar la columna vertebral del producto y evitar fragmentación funcional en Alux, Concierge, Drawer, Analytics, Pagos y CRM.
