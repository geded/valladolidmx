# LOTE 3J.3 · Siembra demo administrable y cierre de verificación — v1.0

- Fecha: 2026-09-06
- Rama: `integration/lovable-valladolidmx` (sin publicar, sin PR, sin merge)
- Lote de datos: `demo-3j3-2026-09-06`
- Carril: A (Producto)

## 1. Objetivo

Sembrar un catálogo demo real y administrable que cubra todas las familias
públicas, con cuentas demo de viajero, empresario y concierge, y cerrar la
verificación end-to-end de resolución canónica y de sugerencias de Alux.

## 2. Cuentas demo

| Rol | Correo | Contraseña | user_id |
| --- | --- | --- | --- |
| Viajero | demo.traveler.3j3@valladolid.demo | Demo3J3!traveler | `d3330000-…-000000000001` |
| Empresario | demo.owner.3j3@valladolid.demo | Demo3J3!owner | `d3330000-…-000000000002` |
| Concierge | demo.concierge.3j3@valladolid.demo | Demo3J3!concierge | `d3330000-…-000000000003` |

Roles en `public.user_roles` (`business_owner`, `concierge`), ficha en
`concierge_profiles`, y propiedad en `business_users` limitada a dos empresas
demo. Sin autopublicación ni verificación.

## 3. Registros sembrados

Todos con `is_demo_seed = true`, `demo_seed_batch = 'demo-3j3-2026-09-06'`,
`record_origin = 'demo'`, `source_review_state = 'approved'` y descripción que
declara explícitamente su carácter temporal.

| Familia | Registros |
| --- | --- |
| `businesses` | 4 (hotel Valladolid, restaurante Espita, casa de vacaciones Uayma, operadora de experiencias Izamal) |
| `business_locations` | 4 (coordenadas reales, cumple Geolocation Mandatory Rule) |
| `business_hours` | 28 (7 días × 4 empresas) |
| `products` | 1 (experiencia nocturna en Izamal) |
| `points_of_interest` | 1 (mirador de Uayma) |
| `events` | 1 (noche artesanal de Uayma, +21 días) |
| `editorial_routes` | 1 (ruta Uayma–Espita, 2 días) |

Atributos de búsqueda (`filter_attributes`) alineados al catálogo oficial de
`tourism_attribute_definitions` por familia.

## 4. Defecto real corregido

La categoría "Casas de vacaciones" tenía el identificador `Casas-de-vacaciones`
con mayúscula. El resolutor territorial exige kebab-case, por lo que **toda**
ficha de esa familia devolvía error 500 (incluida la ficha productiva
`casa-colonial-sisal`). Se normalizó a `casas-de-vacaciones`. No existía ninguna
referencia al valor anterior en código.

## 5. Alux — exclusión de lo ya guardado

`src/lib/alux/contextual-suggest.functions.ts`: se añadió filtro duro
`plannedSlugSet`, construido con las entradas de tipo empresa del plan activo
del viajero (`travelerPlan.saved_items`). Alux ya excluía la ficha en curso;
ahora tampoco repite lo que el viajero ya guardó en Mi Viaje.

## 6. URLs de verificación (todas 200)

- `/oriente-maya/valladolid/hoteles/demo-3j3-hotel-casa-piedra`
- `/oriente-maya/espita/restaurantes/demo-3j3-restaurante-fogon-espita`
- `/oriente-maya/uayma/casas-de-vacaciones/demo-3j3-casa-uayma-roja`
- `/oriente-maya/izamal/experiencias/demo-3j3-experiencias-sac-be`
- `/oriente-maya/izamal/experiencias/demo-3j3-experiencias-sac-be/demo-3j3-caminata-nocturna-izamal`
- `/oriente-maya/uayma/lugares/demo-3j3-mirador-uayma`
- `/eventos/demo-3j3-noche-artesanal-uayma`
- `/rutas/demo-3j3-ruta-uayma-espita`
- Listados: `/hoteles`, `/restaurantes`, `/experiencias`, `/casas-de-vacaciones`, `/eventos`
- Regresión productiva: `/oriente-maya/valladolid/casas-de-vacaciones/casa-colonial-sisal`

## 7. Validaciones

- `bunx tsgo --noEmit` — limpio
- `bun test` — 777/777 (5297 aserciones)
- `bun run build` — correcto
- Route Inventory — 247 rutas cubiertas

## 8. Retención (Demo Pack Policy)

Los datos del lote `demo-3j3-2026-09-06` permanecen hasta que el Founder
indique literalmente: "Demo validada. Puedes eliminar los datos temporales."
Borrado por lote: filtrar `demo_seed_batch = 'demo-3j3-2026-09-06'`.

## 9. No verificado

- Recorrido con sesión iniciada de las tres cuentas demo en navegador.
- Portada visual del restaurante de Espita (queda sin imagen a propósito, para
  probar el estado "sin foto").
