# G8-R1-F1L-R3 · Cableado canónico Home Premium → Alux y Travel Plan v1.0

**Estado:** Approved  
**Autoridad:** instrucción Founder del 2026-08-31  
**Base:** `main@f8390e5d2c25af5b9b30c3534a9a08ce151646de`

## Objetivo cerrado

Conectar exclusivamente los controles ya visibles de la Home Premium con las
capacidades canónicas existentes:

1. “Personalizar con Alux” abre el único dock global mediante
   `openAluxFloating` y transmite prompt, ruta, secuencia y el primer destino
   canónico resoluble.
2. El dock conserva esa selección como contexto de lanzamiento y reutiliza su
   perfil, memoria anónima, plan, ubicación consentida, catálogo y ranking
   existentes.
3. “Agregar ruta a Mi Viaje” persiste la ruta editorial como `note`, el tipo
   canónico ya disponible. Para visitantes anónimos utiliza
   `AnonymousTravelDraft`; tras registro entra por el importador existente.

## Límites

- Sin segundo motor, store, perfil, catálogo, ranking o Context Engine.
- Sin nuevo `TravelItemKind`: `route` continúa inexistente.
- Sin datos, medios, migraciones, dependencias, flags, rutas, SEO o despliegue.
- Sin cambios a otras plantillas.

## Archivos funcionales exactos

- `src/components/home-premium/HomePremiumSurface.tsx`
- `src/components/home-premium/AddHomeRouteToTravelPlanButton.tsx`
- `src/components/layout/AluxFloatingTrigger.tsx`
- `src/lib/alux/floating-bus.ts`

## Aceptación

- Ningún botón de la Home simula persistencia mediante `setAdded(true)`.
- El dock recibe y muestra la selección de Home.
- La recomendación sigue consumiendo las autoridades existentes.
- La ruta se conserva como nota para no ampliar el dominio ni el schema.
- Un único commit en una rama; sin PR, merge ni despliegue.
