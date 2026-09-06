# Lote 2 · Auditoría Autenticada y Matriz de Capacidades OMXDS — v1.0

- **Fecha:** 2026-09-04 (UTC)
- **Rama:** `integration/lovable-valladolidmx` (no se creó ninguna rama, PR, merge ni deploy)
- **HEAD auditado:** `0cea7288607503d31575d5db947bdc9f8f29bcb7` — "Corrigió cierre del Lote 1"
- **Modo:** SÓLO LECTURA. No se modificó producto, diseño, datos, migraciones, flags ni permisos.
- **Único artefacto creado:** este informe + una línea de estado en `roadmap.md`.

---

## PASO 0 · Gate de rama (SUPERADO)

| Comprobación | Resultado |
|---|---|
| HEAD efectivo | `0cea7288607503d31575d5db947bdc9f8f29bcb7` |
| `refs/heads/integration/lovable-valladolidmx` | `0cea7288607503d31575d5db947bdc9f8f29bcb7` |
| `refs/remotes/origin/integration/lovable-valladolidmx` | `0cea7288607503d31575d5db947bdc9f8f29bcb7` |
| Árbol de trabajo | limpio (`git status --porcelain` vacío) |
| Commit incorporado a integración | Sí — es la punta exacta, local y remota |

Sin diferencias que explicar. Se audita esta base y ninguna otra.

---

## Limitación de acceso declarada (afecta a la clasificación)

`LOVABLE_BROWSER_AUTH_STATUS = signed_out` y la emisión de una sesión de prueba
para un usuario concreto **fue rechazada por el entorno** (requiere aprobación
interactiva no disponible). Usuarios existentes en `auth.users`:

| Correo | Roles |
|---|---|
| geded@valladolid.com.mx | admin, super_admin, traveler |
| geded@caribemexicano.com | editor, traveler |
| viajero-demo@valladolid.mx | traveler |
| 4 cuentas más | traveler |

**No existe usuario de prueba con rol `business_owner`, `concierge` ni
`concierge_lead`.** En consecuencia:

- Toda verificación de **UI autenticada en runtime** (Founder, CMS, Studio,
  Portal Empresa, Concierge) queda clasificada **NO VERIFICADO (sin sesión)**.
- La auditoría autenticada se sustenta en **evidencia estática equivalente y
  auditable**: código de rutas `_authenticated/**`, server functions con
  `requireSupabaseAuth`, RPC `SECURITY DEFINER`, políticas RLS y consultas de
  sólo lectura al esquema/registros de Lovable Cloud.
- Ningún hallazgo marcado "conectado" se apoya en la mera existencia de un
  componente: se exige cadena escritura autorizada → persistencia → lectura
  pública. Donde la cadena no se pudo cerrar, se dice explícitamente.

---

## A · Resumen ejecutivo

**Lo que sí tenemos (real, conectado, con datos en Lovable Cloud):**

1. **Modelo territorial y de contenido productivo.** `tourism_regions` (1),
   `destinations` (10 · 7 publicados), `businesses` (54 · 10 publicados),
   `products` (17 · 4 publicados), `events` (18 · 8 publicados),
   `points_of_interest` (7 · 5 publicados), `business_locations` (39),
   `media_assets` (89), `page_compositions` (15), `reviews` (12).
2. **CMS-first por familia.** Editor propio y server functions reales para
   región, destino, zona, negocio (hotel/restaurante), producto/experiencia,
   evento y lugar/POI, con paneles de medios, atributos, ubicación y relaciones.
3. **Single Studio.** Experience Builder con contratos de bloque tipados,
   `block_definitions`/`block_versions` y `page_compositions` en base de datos.
4. **Separación de poder empresa ↔ administración verificada en el código y en
   la base:** `has_role` / `is_admin` / `has_business_access` (`SECURITY
   DEFINER`), enum `app_role` separado de `business_user_role`, y flujo
   proponer→revisar→aprobar en `business_visibility_grants` (3 concesiones
   activas). Una empresa **no puede** autoasignarse Premium/Destacado/aprobación.
5. **Comercio "carrito" completo** (`orders` → Stripe → webhook firmado →
   `payment_events` → `order_mark_paid`), con revalidación de precio server-side.
6. **Alux y Mi Viaje sobre IDs canónicos reales** (UUID de `businesses`,
   `products`, `destinations`, `events`), contexto territorial vivo y cercanía
   Haversine con coordenadas de base de datos. Sin fixtures en estos flujos.
7. **Contrato de eventos semánticos de Visitor Intelligence** versionado, con
   identidad anónima→registrada por secreto hasheado y niveles de confianza.
8. **Higiene de plataforma:** 124 tablas públicas, 122 con SELECT para
   `authenticated` y 119 para `anon`, 283 políticas RLS (40 SELECT para `anon`).
   No se detectaron tablas huérfanas de GRANT.
9. **Salud técnica:** typecheck limpio, 756/756 pruebas en verde.

**Lo que sólo parecía terminado:**

1. **`DESTINOS_MOCK` (`src/mocks/destinos.ts`) sigue vivo en rutas públicas
   no-`/lovable/*`** como fallback de nombre/etiqueta de destino en
   `hoteles.tsx`, `restaurantes.tsx`, `experiencias.tsx`,
   `casas-de-vacaciones.tsx`, `lugares.index.tsx`, `eventos.index.tsx`,
   `oriente-maya/$destino.index.tsx`, `DestinationSurface.tsx`,
   `RegionSurface.tsx`, `HeroSearchPill.tsx`, `DestinosSection.tsx`. Es el mayor
   riesgo de contenido inventado en producción.
2. **Home Premium con fallback editorial hardcodeado.** `page_compositions`
   tiene 15 filas pero **0 publicadas**: hoy la Home se sirve del árbol
   `HOME_PREMIUM_FALLBACK_TREE` + `HOME_PREMIUM_G4_CONTENT`, con copy, secciones
   y medios "conceptuales" fijos, sustituidos sólo parcialmente por corpus real.
3. **"Pueblo Mágico" con doble fuente de verdad.** Existe el registro
   institucional administrable, pero además listas estáticas en
   `destination-premium-content.ts`, `region-premium-runtime.ts` y
   `DestinationsAtlasSurface.tsx`. Viola la Institutional Badges Rule.
4. **Casa de vacaciones no es una familia CMS**: se resuelve con un `Set` de
   slugs de categoría escrito en la ruta (`casas-de-vacaciones.tsx`).
5. **Ruta/Itinerario no existe** como entidad: sólo copy dentro de la Home.
6. **Route Inventory en rojo**: `scripts/route-inventory-coverage.ts` falla con
   3 rutas sin registrar (`lovable/g4-destination-listing-premium-preview`,
   `lovable/g4-experience-listing-premium-preview`, `oriente-maya/destinos`).
7. **Marca no administrable**: `ACTIVE_BRAND` es una constante de código
   (`src/config/brand.ts`); no hay tabla ni panel CMS de marca.
8. **Comercio de experiencias en demo**: `startConciergeOrderCheckout` marca
   `paid` sin cobrar cuando `payments.demo_mode`, y la vía real lanza
   `real_provider_not_wired_yet`.
9. **Sin inventario, capacidad por salida, horarios de salida ni hold.**
10. **Monitoreo prácticamente sin instrumentar**: un único emisor real
    (`AluxFloatingTrigger`); `business_view_events` y
    `marketplace_search_metrics` existen en esquema y no las escribe ni lee
    nadie.
11. **13 productos con `is_demo_seed`** en la tabla productiva (0 publicados;
    la contención hoy depende del estado, no de un filtro explícito) y **18
    eventos marcados demo, de los cuales 8 están publicados** → alcanzables
    desde rutas públicas.

---

## B · Matriz familia × capacidad

Leyenda: ✅ real y conectado · ◐ parcial · ⚠️ hardcode/mock · ✖ ausente · ? NO VERIFICADO

| Familia | CMS | Portal | Medios | Filtros | Listado | Perfil | Alux | Mi Viaje | Territorio | SEO |
|---|---|---|---|---|---|---|---|---|---|---|
| Región | ✅ `RegionEditor` | n/a | ✅ | ✖ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ |
| Destino | ✅ `DestinationEditor`+`Location`+`Media` | n/a | ✅ | ✖ | ✅ atlas | ✅ | ✅ | ◐ | ✅ | ✅ |
| Hotel | ✅ `BusinessEditor` | ✅ | ✅ | ✅ `filter_attributes` | ✅ | ✅ | ✅ | ✅ | ⚠️ label vía mock | ✅ |
| Restaurante | ✅ `BusinessEditor` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ label vía mock | ✅ |
| Casa de vacaciones | ✖ (reusa negocio) | ◐ | ✅ | ◐ | ⚠️ slugs hardcode | ◐ | ✅ | ✅ | ⚠️ | ◐ |
| Evento | ✅ `EventEditor`+`Attributes` | ◐ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ `addressLocality` fijo | ✅ JSON-LD |
| Lugar / sitio de interés | ✅ `PlaceEditor`+paneles | ✖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ zona/subzona | ✅ |
| Experiencia / producto | ✅ `ProductEditor`+`Attributes` | ✅ `ProductAttributesPanel` | ✅ `product_media` | ✅ familia "experiencias" | ✅ | ✅ | ✅ | ✅ | ⚠️ label vía mock | ✅ |
| Ruta / itinerario | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ |
| Home / páginas compuestas | ◐ Studio genérico | n/a | ⚠️ medios conceptuales | n/a | n/a | ⚠️ fallback fijo | ✅ | n/a | ◐ | ✅ |

---

## C · Matriz OMXDS de capacidades (12 pilares)

| # | Pilar / capacidad | Clasificación | Evidencia |
|---|---|---|---|
| 1 | Navegación región→destino→categoría→entidad | **Implementada y conectada** | `src/lib/navigation/*`, `src/routes/oriente-maya/$destino.$categoria.$empresa.tsx`, breadcrumb territorial unificado (`CompactCrumbs`) |
| 1b | Etiquetas de destino en listados | **Hardcodeada** | `src/mocks/destinos.ts` como fallback en 10+ superficies públicas |
| 2 | CMS-first por familia | **Implementada y conectada** | `src/components/cms/*`, `src/routes/_authenticated/cms/*` (~55 rutas), server fns `*-cms.functions.ts` |
| 2b | Marca administrable | **Hardcodeada / sin conexión CMS** | `src/config/brand.ts` (`ACTIVE_BRAND` constante) |
| 2c | Distintivo Pueblo Mágico | **Implementada parcialmente** | registro institucional + listas estáticas duplicadas |
| 3 | Plantillas madre y URL canónica única | **Implementada y conectada** | `route-inventory.ts` + contrato de navegación; **excepción:** cobertura en rojo (3 rutas) |
| 3b | Presentación Editorial/Cinematográfica | **Implementada parcialmente** | parámetro `?presentacion=`, no campo CMS; en lugares exige portada gobernada (`place-presentation.functions.ts`) |
| 4 | Descubrimiento (home, atlas, micrositios, listados, perfiles, filtros, mapas, cercanía) | **Implementada y conectada** salvo Home | listados premium sobre `getPublicListing`; Home **sólo maqueta** por 0 composiciones publicadas |
| 5 | Mi Viaje / Travel Plan + continuidad anónima→registrada | **Implementada y conectada** | `travel_plans` (8 planes), `travel_plan_items`, `traveler_favorites`, fusión por hash SHA-256 en `memory-projection.functions.ts` |
| 6 | Alux contextual (destino, etapa, intereses, cercanía, guardados) | **Implementada y conectada** | `src/routes/api/public/alux/chat.ts` (consulta real + Haversine), `use-alux-context.ts`, tablas `alux_*` |
| 7 | Portal Empresa · proponer→revisar→aprobar | **Implementada y conectada** | `requestVisibilityGrant` (`status:'pending'`) vs `activateVisibilityGrant`/`rejectVisibilityGrant` con `assertAdmin`; RPC `publish_business_product` exige `has_business_access` + `verified`/`can_self_publish` |
| 8 | Concierge y expediente del viajero | **Implementada parcialmente · NO VERIFICADO en runtime** | `concierge_*` (12 tablas), rutas `_authenticated/concierge/*`; sin usuario de prueba con rol concierge |
| 9 | Confianza (operador, ubicación, horarios, accesibilidad, condiciones, reseñas) | **Implementada parcialmente** | `business_hours`, `business_locations` (39), `reviews` moderadas; accesibilidad/condiciones sólo como atributos opcionales |
| 10 | Medios acreditados, reemplazables, administrables | **Implementada y conectada** | `media_assets` (89), paneles por familia, política de original inmutable + derivación transparente |
| 10b | Corpus DEMO/IA temporal | **Sólo maqueta/demo** | 13 productos y 18 eventos con `is_demo_seed`; **8 eventos demo están publicados** |
| 11 | Instrumentación de journey y privacidad | **Preparada para fase siguiente** | contrato `visitor_intel` completo y RPC de ingesta; un único emisor en UI |
| 11b | `business_view_events`, `marketplace_search_metrics` | **Sin conexión / sólo contrato** | tablas sin lector ni escritor en `src/` |
| 12 | Gobernanza: Single Studio, contratos de bloque, autoridad visual, evidencia, rollback | **Implementada y conectada** | Experience Builder, `block_definitions`/`block_versions`, `docs/governance/*`, pruebas de contrato (756/756) |
| 12b | Route Inventory Rule | **Bloqueador P1** | `scripts/route-inventory-coverage.ts` en rojo |
| — | Reservaciones (inventario, capacidad, salidas, hold, liquidación) | **Bloqueador de reservaciones** | ver sección F |
| — | Analítica productiva | **Bloqueador de monitoreo** | ver sección F |
| — | Pagos Paddle/MercadoPago/PayPal | **Fuera de alcance actual** | `registry.server.ts` = `null` |

---

## D · Flujo comprobado extremo a extremo, por familia

Cadena exigida: escritura autorizada → persistencia → lectura pública → interacción.

| Familia | Escritura autorizada | Persistencia | Lectura pública | Interacción (Mi Viaje/Alux) | Veredicto |
|---|---|---|---|---|---|
| Región | `regions` CMS fns | `tourism_regions` (1) | `/oriente-maya` | Alux territorial | **Cerrado** (UI autenticada NO VERIFICADA) |
| Destino | `DestinationEditor` + `upsertBusinessPrimaryLocation` | `destinations` (7 pub.) | `/oriente-maya/$destino` | Alux + cercanía | **Cerrado con reserva**: etiquetas caen a mock si falta dato |
| Hotel | `BusinessEditor`, `publish_business_product` | `businesses` (10 pub.) | `/hoteles`, ficha canónica | Mi Viaje ✅ | **Cerrado** |
| Restaurante | idem | `businesses` | `/restaurantes` | Mi Viaje ✅ | **Cerrado** |
| Casa de vacaciones | idem (sin editor propio) | `businesses` | `/casas-de-vacaciones` (slugs en código) | Mi Viaje ✅ | **Abierto**: taxonomía no administrable |
| Evento | `EventEditor` | `events` (8 pub., todos `is_demo_seed`) | `/eventos`, `/eventos/$slug` | Mi Viaje ✅ | **Cerrado técnicamente / contaminado por demo** |
| Lugar/POI | `PlaceEditor` + paneles | `points_of_interest` (5 pub.) | `/lugares`, `/oriente-maya/$destino/lugares/$slug` | Mi Viaje + Alux ✅ | **Cerrado** |
| Experiencia/producto | `ProductEditor`, `ProductAttributesPanel` | `products` (4 pub.; 13 demo no publicados) | `/experiencias`, ficha | Mi Viaje ✅ / Reservar bloqueado por contrato | **Cerrado en contenido, abierto en comercio** |
| Ruta/itinerario | — | — | — | — | **No existe** |
| Home / compuestas | Studio | `page_compositions` (15, **0 publicadas**) | `/` sirve fallback en código | — | **Abierto: la Home pública no es CMS hoy** |

---

## E · Inventario de hardcodes, mocks, duplicaciones y excepciones

| # | Hallazgo | Ubicación | Tipo |
|---|---|---|---|
| E1 | `DESTINOS_MOCK` como fallback público | `src/mocks/destinos.ts` + 10 consumidores no-lovable | Mock alcanzable en público |
| E2 | Contenido editorial fijo de Home | `home-premium-content.ts` (`HOME_PREMIUM_G4_CONTENT`), `index.tsx` fallback tree | Hardcode estructural |
| E3 | Medios "conceptuales" fijos de Home | `HOME_PREMIUM_MEDIA` → `/api/public/studio-media/conceptual-preview/*` | Medios temporales en producción |
| E4 | Lista estática Pueblo Mágico | `destination-premium-content.ts`, `region-premium-runtime.ts:47,74`, `DestinationsAtlasSurface.tsx:1069` | Duplicación de fuente de verdad |
| E5 | Categorías de casa de vacaciones | `casas-de-vacaciones.tsx:20-27` (`CATEGORY_SLUGS`) | Taxonomía hardcodeada |
| E6 | `addressLocality` literal "Valladolid" en JSON-LD de evento | `eventos.$slug.tsx:95` | Hardcode SEO |
| E7 | Descripciones territoriales fijas | `src/routes/llms[.]txt.ts:61-108` | Ruta pública sin CMS |
| E8 | Marca en código | `src/config/brand.ts` | Sin conexión CMS |
| E9 | 8 eventos `is_demo_seed` publicados | tabla `events` | DEMO alcanzable en público |
| E10 | 13 productos `is_demo_seed` (0 publicados) | tabla `products` | DEMO contenido por estado, sin filtro explícito |
| E11 | 3 rutas fuera del Route Inventory | `scripts/route-inventory-coverage.ts` | Excepción de gobernanza |
| E12 | Checkout demo del concierge | `orders.functions.ts:171-195` | Comercio simulado tras bandera |
| E13 | Motor de simulación de Visitor Intelligence | `src/lib/visitor-intel/simulation/*` | Riesgo de KPI simulado en paneles (NO VERIFICADO) |
| E14 | Ejes de filtro sin contraparte administrable | `ExperiencesListingSurface.tsx:59` | Filtro parcialmente hardcodeado |

---

## F · Bloqueadores

**P0 — antes de cualquier reparación visual**

- **P0-1** Home pública servida por fallback en código (0 composiciones
  publicadas). Reparar diseño encima de contenido no administrable es trabajo
  perdido. (E2, E3)
- **P0-2** `DESTINOS_MOCK` alcanzable desde 10 superficies públicas. (E1)
- **P0-3** 8 eventos DEMO publicados en rutas públicas. (E9)
- **P0-4** Doble fuente de verdad de Pueblo Mágico — incumple la Institutional
  Badges Rule vigente. (E4)

**P1 — antes de reservaciones**

- **P1-1** Sin inventario, capacidad por salida ni horarios de salida.
- **P1-2** Sin hold/retención de disponibilidad; sólo idempotencia por
  `client_request_id`.
- **P1-3** Checkout de concierge en modo demo (`real_provider_not_wired_yet`).
- **P1-4** Políticas de cancelación/términos/lead-time almacenadas pero no
  aplicadas por ninguna regla.
- **P1-5** Sin liquidación/payout a operadores (`direct_sale_commission_bps`
  existe; no hay flujo de transferencia).
- **P1-6** Route Inventory en rojo (gobernanza bloqueante por regla propia).
- **P1-7** Casa de vacaciones sin familia CMS; ruta/itinerario inexistente.

**P2 — antes de monitoreo**

- **P2-1** Instrumentación con un solo emisor real; sin cobertura de listados,
  fichas, búsqueda ni checkout.
- **P2-2** `business_view_events` y `marketplace_search_metrics` huérfanas.
- **P2-3** Sin módulo central de consentimiento fuera de Alux/geolocalización.
- **P2-4** Origen de los KPIs de los paneles (real vs simulación) NO VERIFICADO.
- **P2-5** Marca no administrable (bloquea personalización por destino).

---

## G · Recomendación de ajuste a los Lotes 3–8 (no ejecutada)

| Lote | Ajuste recomendado |
|---|---|
| **3** | Reordenar: antes de tocar diseño, **erradicar `DESTINOS_MOCK`** y publicar la composición real de Home. Sin esto, todo el trabajo visual se apoya en contenido no administrable. |
| **4** | Unificar Pueblo Mágico y demás distintivos en el registro institucional único; retirar listas estáticas. Convertir `?presentacion=` en campo administrable por entidad. |
| **5** | Cerrar familias faltantes: Casa de vacaciones como familia CMS con taxonomía administrable, y decisión formal sobre Ruta/Itinerario (crear entidad o retirarla del discurso de producto). |
| **6** | Higiene de corpus DEMO: despublicar los 8 eventos demo, marcar el corpus con filtro explícito y no sólo por estado, y fijar fecha de sustitución de medios conceptuales. |
| **7** | Readiness de reservaciones: modelar salidas/capacidad/hold **antes** de tocar pagos; retirar el modo demo de checkout del concierge tras cablear proveedor real. |
| **8** | Monitoreo: instrumentar superficies antes de encender analítica; resolver consentimiento y decidir el destino de las dos tablas huérfanas. |
| Transversal | Restablecer en verde `scripts/route-inventory-coverage.ts` y crear usuarios de prueba para `business_owner` y `concierge`, sin los cuales ningún lote futuro puede auditarse autenticado. |

---

## H · Evidencia (rutas, archivos, tablas, funciones, contratos)

**Rutas públicas:** `src/routes/index.tsx`, `oriente-maya/index.tsx`,
`oriente-maya/destinos.tsx`, `oriente-maya/$destino.*`, `hoteles.tsx`,
`restaurantes.tsx`, `casas-de-vacaciones.tsx`, `experiencias.tsx`,
`eventos.*`, `lugares.*`, `api/public/alux/chat.ts`,
`api/public/payments/$provider/webhook.ts`, `llms[.]txt.ts`.

**Rutas autenticadas:** 115 archivos bajo `src/routes/_authenticated/**`
(admin ~11, cms ~55, portal ~20, concierge 3, cuenta ~20, mi-viaje 2).

**Editores CMS:** `DestinationEditor`, `ZoneEditor`, `RegionEditor`,
`BusinessEditor` (+ `BusinessAttributesPanel`, `BusinessLocationPanel`,
`BusinessMediaPanels`), `ProductEditor` (+ `ProductAttributesPanel`,
`ProductMediaPanels`), `EventEditor` (+ `EventAttributesPanel`),
`src/components/cms/places/*`.

**Server functions y RPC clave:** `getPublicListing`,
`marketplace-reads.functions.ts`, `events/public-reads.functions.ts`,
`places-cms.functions.ts`, `product-attributes.functions.ts`,
`business-visibility-grants.functions.ts`, `admin-grants.functions.ts`
(`assertAdmin` → `has_role`), `publish_business_product`,
`payments.functions.ts`, `visitor-intel/ingest.functions.ts`,
`traveler/travel-plans.functions.ts`, `traveler/traveler-favorites.functions.ts`,
`alux/memory-projection.functions.ts`, `resolveExperienceCommerce`.

**Seguridad:** `has_role`, `is_admin`, `is_editor_or_admin`,
`has_business_access` (todas `STABLE SECURITY DEFINER SET search_path=public`);
enums `app_role` y `business_user_role`.

**Mediciones directas en Lovable Cloud (sólo lectura):** 124 tablas públicas ·
283 políticas RLS · 40 políticas SELECT para `anon` · SELECT concedido a
`authenticated` en 122/124 y a `anon` en 119/124 · `business_visibility_grants`
activos = 3 · `orders` = 0 · `page_compositions` publicadas = 0.

**Documentos rectores:** existen los 15 solicitados (01, 02, 08, 16.00 v2.1,
16.CV4.0, CV5, CV6, CV7, CV8, Governance 09/10/11/13/14, Project Constitution).
No falta ninguno.

---

## I · Observación de salud técnica (sin modificar contratos)

| Comprobación | Resultado |
|---|---|
| `bunx tsgo --noEmit -p tsconfig.json` | exit 0, sin errores |
| `bun test scripts/` | **756 pass · 0 fail**, 70 archivos, 5275 aserciones |
| `bun run build` | no ejecutado en este lote (sin cambios de código) |
| `scripts/route-inventory-coverage.ts` | **FALLA** — 3 rutas sin registrar (hallazgo E11) |

---

## Cierre

Auditoría del Lote 2 completa y detenida aquí. **No se avanza al Lote 3 sin
autorización expresa del Founder.**
