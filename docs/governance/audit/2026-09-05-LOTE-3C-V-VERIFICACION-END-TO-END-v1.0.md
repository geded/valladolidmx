# Lote 3C-V · Verificación end-to-end (Casas de Vacaciones y Rutas)

Fecha: 2026-09-05 · Rama: `integration/lovable-valladolidmx` · Sin ramas/PR/merge/deploy/pagos.

## A. Seguridad y permisos

| Punto | Resultado | Evidencia |
|---|---|---|
| Usuario autenticado sin rol editor no puede editar `businesses` demo | PASS | `update ... where slug in (...)` con `request.jwt.claims.sub` sintético → 0 filas |
| Usuario real no editor no puede editar `editorial_routes` | PASS | update con sub `3ff115b5…` → 0 filas |
| Usuario real no editor no puede editar/borrar `editorial_route_stops` | PASS | update/delete → 0 filas; insert → `42501 RLS` |
| `business_owner` / `concierge` excluidos de escritura editorial | PASS estructural | `public.is_editor_or_admin()` sólo admite `editor|admin|super_admin`; no existen cuentas reales con esos roles para prueba de sesión (NO VERIFICADO por UI) |
| Anónimo no puede escribir rutas ni negocios (Data API) | PASS | PATCH REST → 0 filas afectadas; valores en BD sin cambio |
| Anónimo sólo lee rutas publicadas | PASS | Ruta demo puesta en `draft` → desaparece de la API y `/rutas/costa-rosada` devuelve 404; sus paradas devuelven `[]`. Restaurada a `published` |

No se creó ninguna cuenta ficticia: `user_roles.user_id` es FK a `auth.users` y sólo existen 6 cuentas reales.

## B. Listado de Casas de Vacaciones

- `/casas-de-vacaciones` 200 con las dos casas demo y enlaces canónicos
  `/oriente-maya/{destino}/casas-de-vacaciones/{slug}`.
- Facetas reales operativas: Zona, Tipo de propiedad, Espacios y servicios.
  Zona=Sisal → sólo Casa Colonial Sisal; Tipo=Villa → sólo Villa Amarilla;
  Capacidad 7-8 → sólo Villa Amarilla; Piscina → ambas (ambas la tienen). PASS.
- Los chips superiores son sugerencias de intención de Alux, no filtros; no
  alteran el listado (comportamiento esperado del contrato actual).

## C. Rutas / Itinerarios y Mi Viaje

- `/rutas` y `/rutas/{slug}` 200; itinerario por días con paradas y enlaces
  canónicos verificados: `/oriente-maya/valladolid/lugares/cenote-zaci`,
  `/oriente-maya/valladolid/restaurantes/yerbabuena-del-sisal`,
  `/oriente-maya/valladolid/lugares/cenote-suytun`, `/oriente-maya/ek-balam`.
- "Agregar a mi viaje" guarda una referencia privada `kind: "route"` con
  `targetId`, `slug`, título e imagen; persiste tras recarga y el panel
  "Tu viaje" la muestra etiquetada como RUTA. PASS.

## D. Contexto territorial y Alux

- Corrección mínima aplicada: `src/routes/rutas.$slug.tsx` declara ancestros
  explícitos (región + destino de origen) en lugar de heredarlos. Verificado en
  la sesión de navegación (`vll:nav:session:v1` con destino Valladolid).
- Observación fuera de alcance: `AluxFloatingTrigger` sólo confía en el
  contexto territorial cuando la ruta empieza por `/oriente-maya/`, por lo que
  en `/rutas/*`, `/casas-de-vacaciones`, `/hoteles`, etc. abre en modo
  descubrimiento. Comportamiento preexistente y deliberado; no se modifica.

## Hallazgos abiertos (fuera de alcance del Lote 3C)

1. `/arma-tu-viaje` tiene una composición publicada con 0 bloques, por lo que
   la página se renderiza prácticamente vacía y no cae al fallback de código
   (`TripPlannerSurface`). Requiere decisión editorial o ajuste de fallback.
2. Matriz por rol `business_owner` / `concierge` sigue NO VERIFICADA por
   sesión de usuario real (no hay cuentas con esos roles y no se simulan).

## Verificaciones técnicas

- `bunx tsgo --noEmit`: limpio.
- `bun run build`: correcto.
- `bun test`: 761/761.
- QA responsive 1440/834/430/390 en `/rutas`, `/rutas/valladolid-ek-balam`,
  `/casas-de-vacaciones` y el perfil de casa: todos 200, overflow horizontal 0.

## Datos demo

Intactos (`lote-3c-casas-demo`, `lote-3c-rutas-demo`). La ruta "Costa rosada"
volvió a `published` tras la prueba de visibilidad.
