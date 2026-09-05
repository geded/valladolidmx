# Lote 3J.1 · Planear con Alux — Completion Report v1.0

Fecha: 2026-09-06 · Rama: `integration/lovable-valladolidmx` · Sin publicar · Carril A (Producto)

## Alcance entregado

1. **Contexto estructurado en el dock de Alux**
   - `src/lib/alux/floating-bus.ts`: nuevo contrato `AluxOpenSelection` (`entityRef`, `title`, `destinationSlug`, `destinationLabel`, `familySlug`, `href`) y campo opcional `selection` en `AluxOpenPayload`.
   - `src/components/layout/AluxFloatingTrigger.tsx`: sección "Tu selección", modo descubrimiento con destinos publicados reales (`usePublishedDestinations`, máx. 8 chips) y destino efectivo derivado del contexto o de la selección.
   - `src/components/alux/TourismAluxPanel.tsx`: propaga `selection` al abrir el dock.

2. **Ficha de Lugar conectada al contrato de navegación**
   - `src/routes/oriente-maya/$destino.lugares.$slug.tsx`: monta `ContextEngineProvider` con `navigationContextToDeclaration`, familia canónica `lugares` y `entityRef: place:<uuid>`.

3. **Landing SEO → Alux**
   - `seo-landing-surface-vm.ts` expone `entityRef` y destino (derivado de `readSeoLandingChrome` y del mapa) sin inventar datos.
   - `SeoLandingSurface.tsx`: CTA accesible (`<button>` con foco visible) que abre Alux con la selección.

4. **Borrador anónimo ampliado (aditivo)**
   - `contract.ts` / `hooks.ts`: `interests`, `tripDurationDays`, `accessibilityNeeds` (opcionales, nombres canónicos alineados con `traveler_profiles`). Los borradores previos validan sin migración.

5. **Tipo `place` de extremo a extremo**
   - Migración: `ALTER TYPE public.travel_item_kind ADD VALUE IF NOT EXISTS 'place';` (verificado: labels = destination, business, product, event, note, route, place).
   - `travel-plans.functions.ts`, `anonymous-draft/contract.ts`, `import-contract.ts`, `trip-eligibility.ts` (kind universal), dock flotante, Mi Viaje, plan compartido y `GuestPlanPreview` con etiqueta "Lugar" e icono `Landmark`.
   - `PlacePremiumSurface` recibe `tripSlot` opcional: el botón inerte "Agregar a Mi Viaje" ahora es el componente real `AddToTravelPlanButton` (kind `place`, ID canónico). Sin cambios de diseño: mismo bloque, misma etiqueta.

## Validaciones

| Verificación | Resultado |
| --- | --- |
| `bunx tsgo --noEmit` | Limpio |
| `bun test` | 777/777 (5297 aserciones) |
| ESLint (archivos tocados) | Limpio (1 error preexistente ajeno en `travel-plans.functions.ts:862`) |
| `bun run build` | OK |
| Route Inventory | 247 rutas |
| QA responsive ficha de Lugar (1440/834/430/390) | Desbordamiento 0 · 1 `h1` · 0 imágenes rotas · 0 errores de consola |
| Persistencia anónima | Clic en "Agregar a Mi Viaje" → tras recarga el estado se conserva ("Ya está en Mi Viaje") |
| Datos reales | `travel_plan_items` sin registros `place` creados; sólo verificación en superficie demo |

## Notas

- No se modificó el diseño aprobado en 3I.3; los activos y contenidos demo permanecen intactos.
- No se creó rama, PR ni despliegue.
