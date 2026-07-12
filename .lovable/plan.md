## Ola CV3 · "Tu viaje" siempre presente en Discovery

Cerramos CV2 (Bridge bidireccional Alux ↔ Plan ↔ Concierge, incluida la Ola A19 y locale-aware). Toca CV3 del roadmap CV: hacer que el Travel Plan sea **visible y actuable en toda la superficie pública**, sin salir a `/cuenta/mi-viaje`.

### Objetivo

Que cualquier visitante autenticado, mientras explora destinos / experiencias / hoteles / restaurantes / promociones, vea un contador vivo de su plan y pueda:

1. Ver los ítems que ya guardó y su estatus.
2. Añadir un ítem desde la tarjeta activa sin recargar.
3. Escalar a Concierge desde el drawer.
4. Ver una micro-narrativa de Alux ("Vas 3 ítems, aún te falta hospedaje").
5. Recibir notificación in-site cuando el concierge proponga algo nuevo.

### Alcance funcional

- **FloatingTravelPlanDock** (mobile-first): botón flotante bottom-right con badge `N` (nº ítems). Al tap → abre `TravelPlanSheet` (sheet lateral en desktop, bottom-sheet en móvil). Reutiliza el Sheet Stack del Workspace/Discovery Layer.
- **Contenido del sheet**:
  - Encabezado con destino y fechas (o CTA para definirlas).
  - Lista de ítems con `source` badge (`viajero` / `alux` / `concierge`).
  - Botón "Enviar a mi concierge" → `travel_plan_request_concierge`.
  - Bloque **Alux narra tu viaje**: llama `runAluxTraveler("narrate_plan", …)` en `locale` activo, cacheado por hash del plan.
  - Sección "Novedades del concierge": lee `concierge_proposals` en estado `pending`, badge distintivo, botón "Aceptar" (usa CV2.4).
- **Presencia global**: montar `FloatingTravelPlanDock` en `PublicShell` (Discovery Layer), oculto para invitados y en rutas `/cuenta/**` (donde ya existe la vista dedicada).
- **Notificación in-site**: hook `useConciergeProposalToasts` que suscribe realtime a `concierge_proposals` del usuario y dispara toast + incrementa un dot en el dock.

### Cambios de código

- `src/components/travel-plan/FloatingTravelPlanDock.tsx` (nuevo).
- `src/components/travel-plan/TravelPlanSheet.tsx` (nuevo, extraído/compartido con `/cuenta/mi-viaje`).
- `src/components/travel-plan/AluxPlanNarrationCard.tsx` (nuevo, consume nueva capacidad).
- `src/lib/traveler/alux-traveler.functions.ts`: añadir capacidad `narrate_plan` (respeta prompt corto, locale-aware, sin CTA de escritura).
- `src/lib/travel-plan/plan-realtime.ts` (nuevo): hook realtime + queryClient invalidations.
- `src/routes/__root.tsx` o el shell público (`PublicShell`): montar el dock condicional.

### Datos

Sin nuevas tablas ni RLS. Sólo suscripción realtime a `concierge_proposals` (RLS ya lo cubre) y lectura ligera de `travel_plans` + `travel_plan_items` (server fn ya existente `getActiveTravelPlan`).

### Contratos y reglas ya vigentes que respetamos

- Workspace/Discovery First: usamos SheetStack existente, sin motor nuevo.
- Todas las mutaciones vía Write API oficial (CV2.1).
- Alux nunca escribe al plan sin confirmación; `narrate_plan` es sólo lectura.
- Locale-aware end-to-end (A18/A19).

### Fuera de alcance

- Panel admin (CV1).
- Stripe / cierre de venta (CV4).
- Edición avanzada del plan en el sheet (drag reorder, fechas por ítem).

### DoD

- Typecheck + build limpio.
- Dock visible sólo autenticado, sólo en Discovery, oculto en `/cuenta/**`.
- Sheet abre/cierra sin romper scroll ni foco.
- `narrate_plan` responde en el locale activo, con encabezados oficiales.
- Realtime dispara toast al recibir `concierge_proposal` nueva.
- Demo Pack: viajero demo con 3 ítems + 1 propuesta pendiente + captura móvil/desktop + reproducción en es/en.
- Completion Report en `docs/blueprint/16.CV3-…md`.

Confirmo y arranco con la primera micro-ola (CV3.1 · Sheet reutilizable + Dock básico con contador vivo) o ajustas alcance antes de empezar.
