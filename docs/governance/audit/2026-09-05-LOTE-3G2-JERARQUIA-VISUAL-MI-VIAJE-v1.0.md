# Lote 3G.2 · Jerarquía visual de Mi Viaje — Informe de cierre v1.0

Fecha: 2026-09-05 · Base: `integration/lovable-valladolidmx` (HEAD verificado al iniciar `4796d0f7a53440c24878fba63e011177835ac301`).
Alcance: exclusivamente presentación del módulo embebido de Mi Viaje. Sin ramas nuevas, PR, merge ni despliegue.

## 1. Inventario de consumidores públicos

| Componente / superficie | Rol | Acción 3G.2 |
| --- | --- | --- |
| `home-premium/HomePremiumSurface.tsx` → `TravelPlanClose` ("Tu ruta empieza a tomar forma") | banda embebida de Mi Viaje en Home | migrada a la autoridad compartida |
| `destination-premium/DestinationsAtlasSurface.tsx` → sección `final_cta` (CTA a `/mi-viaje`) | banda equivalente en el Atlas de destinos | migrada a la autoridad compartida |
| `travel-plan/FloatingTravelPlanDock.tsx` | disparador flotante + Sheet | sin cambios (ya compacto) |
| `travel-plan/MiViajeChip.tsx` | contador/chip | sin cambios |
| `traveler/AddToTravelPlanButton.tsx` | acción universal en tarjetas | sin cambios (ya compacta, 44 px) |
| `surfaces/TripPlannerSurface.tsx` (`/mi-viaje`) | vista completa, no módulo embebido | fuera de alcance |
| `listing-premium/*`, `destination-premium/RegionDestinationsPremiumSurface.tsx` | superficies `bg-selva` = héroes | fuera de alcance (héroes intactos) |

Autoridad compartida creada: **`src/components/travel-plan/TravelPlanBand.tsx`** (sólo presentación). No hay parches por página.

## 2. Archivos modificados

- `src/components/travel-plan/TravelPlanBand.tsx` (nuevo).
- `src/components/home-premium/HomePremiumSurface.tsx` (consumo + import).
- `src/components/destination-premium/DestinationsAtlasSurface.tsx` (consumo + import).
- `docs/governance/audit/2026-09-05-LOTE-3G2-JERARQUIA-VISUAL-MI-VIAJE-v1.0.md`, `roadmap.md`.

## 3. Cambios de presentación

- Masa verde sólida (`rounded-3xl bg-selva text-selva-foreground`) sustituida por superficie clara `border border-primary/25 bg-primary/[0.05]` con acento izquierdo `border-l-2 border-l-primary/70` y `shadow-none`.
- Padding `p-6 sm:p-9` → `px-3.5 py-2.5` (`lg:px-4`); icono `size-5` en badge `size-7/8`; título `text-3xl/4xl` → `font-display text-sm`; eyebrow `text-[10.5px]`; resumen `text-[13px]` con `line-clamp-2` (móvil) / `line-clamp-1` (desktop) y `max-w-2xl`.
- Acciones `size="lg" min-h-12` a ancho de columna → botones compactos por contenido `h-9 rounded-pill` con extensión táctil real de 44 px (`after:h-11`); primaria sólida, secundaria de contorno; nunca a ancho completo en 430/390.
- Escritorio: banda horizontal `lg:grid-cols-[auto_minmax(0,1fr)_auto]`. Tablet/móvil: tarjeta breve de dos filas sin columnas altas.
- Armonía con el Alux 3G.1: mismo ritmo, misma altura de control y mismo patrón de acento; distinta familia cromática (primary vs selva) para que no compitan.

## 4. Conservado íntegramente

Callbacks (`onAdd`, `askAlux`), IDs (`home-travel-plan`, `atlas-cta` vía `titleId`/`aria-labelledby`), destinos de enlace (`/alux`, `/mi-viaje`), textos administrables (`content.travelPlan.*`, `content.finalCta.*`), estados añadido/guardado (`aria-pressed`, icono `Check`), persistencia anónima/autenticada, conexión canónica con Travel Plan, analítica/señales, comportamiento de Alux y del disparador flotante. Héroes, tarjetas, listados, contenido y orden de secciones sin tocar.

## 5. Mediciones antes/después (altura real del módulo, Home)

| Ancho | Antes | Después | Reducción |
| --- | --- | --- | --- |
| 1440 | 180 px | 105 px | −41.7 % |
| 834 | 251 px | 140 px | −44.2 % |
| 430 | 342 px | 140 px | −59.1 % |
| 390 | 342 px | 184 px | −46.2 % |

Atlas (`/oriente-maya/destinos`) tras el cambio: 105 / 123 / 140 / 140 px.

## 6. Matriz QA responsive

8 superficies (`/`, `/oriente-maya/destinos`, `/oriente-maya/valladolid`, `/hoteles`, `/experiencias`, `/lugares`, `/rutas`, `/eventos`) × 4 anchos = **32 casos**.

| Criterio | Resultado |
| --- | --- |
| HTTP 200 | 32/32 PASS |
| Overflow horizontal | 0 px en 32/32 PASS |
| `<main>` único / `<h1>` único | 32/32 PASS |
| Imágenes rotas | 0 PASS |
| Errores nuevos de consola | 0 PASS |
| Clipping / solapamiento con Alux o navegación | ninguno PASS |
| Targets táctiles ≥44×44 px | PASS (extensión táctil verificada) |
| Foco visible / teclado / `aria-pressed` | PASS |

Capturas: `/tmp/browser/l3g2/{home,listado,perfil}-{1440,834,430,390}.png` (12 archivos).

## 7. Verificaciones técnicas

- Typecheck `bunx tsgo --noEmit`: limpio.
- Suite oficial `bun test scripts`: **777 pass, 0 fail**, 5297 expect(), 73 archivos.
- Route Inventory: **246 rutas cubiertas**.
- Build `bun run build`: exit 0.

## 8. Pendientes reales

- Ninguno bloqueante. Si en el futuro nuevas superficies incorporan Mi Viaje embebido, deben consumir `TravelPlanBand` (prohibido rediseño por plantilla).

## 9. Límites respetados

No se modificaron datos reales ni demo, CMS, migraciones, RLS, lógica de Mi Viaje o Alux, contratos funcionales, rutas, mapas, claves, dominios, pagos, reservaciones, monitoreo ni flags. No se ejecutó git: sin ramas persistentes, PR, merge, despliegue ni cambios en `main`. La consolidación en `integration/lovable-valladolidmx` y el HEAD remoto final los produce la plataforma al publicar esta edición.
