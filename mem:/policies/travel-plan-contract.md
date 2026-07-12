---
name: Travel Plan Contract v1.0
description: Contrato fundacional oficial del Travel Plan como entidad canónica del producto. Filosofía, Consumer Journey, Experience Ownership, Read/Write/Signal contracts, Founder Product Axiom y visión Travel Workspace.
type: constraint
---
Doc oficial: `docs/blueprint/16.CV0-TRAVEL-PLAN-CONTRACT-v1.0.md`.

Reglas vinculantes:
- Travel Plan = entidad canónica única. Prohibido segundo modelo de viaje, snapshot paralelo, carrito alternativo o base de contexto adicional.
- Read Contract: `getMyActivePlan`, `getPlanForConcierge`, `getPlanContextForAlux`, `getPlanSnapshot`.
- Write Contract: `addPlanItem/removePlanItem/updatePlanItem`, `updatePlanMeta`, `promotePlanToCase` (única puerta al Concierge), `attachAluxSuggestion` (Alux propone, viajero confirma), `acceptProposal`, `cancelPlan`. Prohibido escribir directo a `travel_plans`/`travel_plan_items`.
- Signal Contract: `plan.item_added/removed/updated`, `plan.meta_updated`, `plan.promoted_to_case`, `plan.proposal_received`, `plan.accepted/paid/completed/cancelled`.
- Alux NUNCA modifica el plan sin confirmación explícita del viajero.
- Snapshot al promover a caso es INMUTABLE.
- Governance: cambios al contrato requieren semver; breaking requiere aprobación Founder.
- Roadmap oficial dependiente: CV0 ✅ → CV2 (Bridge Alux↔Plan↔Concierge) → CV3 (Travel Drawer) → CV1 (Panel Admin) → CV4 (Checkout).

Why: unificar la columna vertebral del producto y evitar fragmentación funcional en Alux, Concierge, Drawer, Analytics, Pagos y CRM.
