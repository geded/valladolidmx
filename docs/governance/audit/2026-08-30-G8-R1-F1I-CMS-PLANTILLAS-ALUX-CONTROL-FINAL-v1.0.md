# CONTROL FINAL READ-ONLY · G8-R1-F1I — CMS → Plantillas → Alux

- **Fecha:** 2026-08-30 (UTC)
- **Modo:** exclusivamente READ-ONLY. Cero correcciones, cero cambios de código, schema, datos, medios, estados, robots, sitemap, allowlist, flags, gobernanza, rutas, PR o despliegue.
- **HEAD:** `24015fb1` · rama `edit/edt-30c2067e-7492-4345-8c87-e4a7c06ac9e6` · worktree limpio.
- **Migraciones:** 226 (última `20260830013318_5ba0c631…`, correspondiente a G8-R1-F1H).
- **Flag:** `omxds_visual_v1_contracts_enabled = false` (OFF).
- **Veredicto global:** **GO para revisión Founder del piloto** · **NO-GO para retirar `noindex` y para activar el flag** (motivos en §10 y §14).

---

## 1 · Estado y universo (acreditado en base de datos)

Lote `G8-R1-F1G-EVALUATION-CONTENT`:

| Familia | Published real (`is_demo_seed=false`) | Draft demo | Archivado |
|---|---|---|---|
| Destinos | 6 | 0 | 0 |
| Lugares | 5 | 0 | 0 |
| Empresas | 7 | 16 | 0 |
| Productos | 4 | 5 | 0 |
| Eventos | 0 | 0 | 10 |
| **Total** | **22** | **21** | **10** |

- Allowlist `G8-R1-F1H-PUBLIC-PILOT` (`src/lib/omxds/pilot-allowlist.ts`): **exactamente 22** rutas canónicas — 6 destinos · 5 lugares · 7 empresas · 4 productos. **Cero demos**.
- 21 fichas retiradas a borrador = 12 retiradas (F1G) + 9 Clase B (F1H). ✅
- 10 eventos archivados. ✅
- `taberna-de-los-frailes`: `draft`, `is_demo_seed=true`, fuera del piloto. ✅
- Publicados con `is_demo_seed=true` en **todo** el sistema: **0** (empresas, productos, destinos, lugares, eventos). ✅
- Tres `owner_submitted` sin revisar (`hacienda-san-servacio-boutique`, `cocina-del-frailes`, `ruta-cenotes-y-selva`): `published`, en cuarentena — fuera del piloto, del sitemap y de Alux (§10).

---

## 2 · Firma y registro de plantillas

Cadena de autoridad verificada (una sola, en capas, sin resolutores paralelos):

`resolveEntityTemplate` (`entity-premium-templates.ts:480-517`) → `resolveCanonicalEntityTemplate` (`canonical-entity-resolver.ts:126-168`, único punto de entrada, 7 consumidores) → `resolvePresentationFamily` (`presentation-family.ts:52-113`) → `canonical-entity-binding.ts:118-192` → `resolveCanonicalPath` (`navigation/canonical-paths.ts:29-55`).

Autoridades únicas confirmadas:

| Dominio | Autoridad única | Estado |
|---|---|---|
| Familia / variante | `resolveCanonicalEntityTemplate` + `resolvePresentationFamily` | PASS |
| Presentación | `entity-presentation.ts` (`resolveEffectivePresentation`, `evaluateGovernedCover`) | PASS |
| URL canónica | `resolveCanonicalPath` / `buildCanonicalEntityUrl` | PASS con 1 excepción (DEF-F1I-002) |
| Medios | `resolveMediaSource` (`media/resolve-source.ts`) | PASS declarado; uso exhaustivo no reauditado |
| Elegibilidad premium | `evaluatePremiumEligibility` (`premium-eligibility.ts:67-92`, fail-closed) | PASS |

Hallazgos de registro:

- `PREMIUM_TEMPLATE_PRESETS` (`premium-template-registry.ts:74-150`: home, destino, 6 lugares, 6 listados) sólo es importado por rutas `/lovable/*` de Studio. Las rutas productivas (`index.tsx`, `$destino.index.tsx`, `hoteles.tsx` y hermanas) resuelven por convención de slug (`__tpl_destination__`) o construyen `ListingPremiumSurfaceFromDTO` directamente → **presets declarativos usados sólo por Studio** (DEF-F1I-003).
- Registros huérfanos: ninguno sin ruta declarada; los 6 presets `premium-entity-place-*` sí están cableados a `bindPlaceRoute`.
- `canonicalRoutePattern` / `alternateRoutePatterns` son strings literales sin test que los contraste contra el router (DEF-F1I-005).

---

## 3 · CMS → plantilla (por familia)

| Familia | templateKey | Ver. | Resolver | Adaptador/DTO | Ruta consumidora | Presentación | Fallback | Estado |
|---|---|---|---|---|---|---|---|---|
| Destino | `destino-premium-g4-approved` | 1.0.0 | composición `__tpl_destination__` | `DestinationSurface` | `oriente-maya/$destino.index.tsx` | Editorial | `DestinationSurface` | PASS |
| Hotel | `premium-entity-hotel` | 1.0.0 | `bindBusinessRoute` | `adaptHotelSurfaceContract` | `$destino.$categoria.$empresa.index.tsx` | Editorial/Cine | `premium_media_fallback`→estándar | PASS |
| Restaurante | `premium-entity-restaurant` | 1.0.0 | `bindBusinessRoute` | `adaptRestaurantSurfaceContract` | idem | Editorial/Cine | idem | PASS |
| Empresa genérica | — (sin preset propio) | contrato 1.0.0 | `resolvePresentationFamily` | superficie estándar | idem | Editorial | estándar | PARCIAL |
| Casa de vacaciones | `premium-entity-vacation-rental` | 1.0.0 (`autoAssign:false`, `pendiente_aceptacion_founder`) | resuelve pero no auto-asigna | `adaptVacationRentalSurfaceContract` | idem | Editorial forzada | `standard_surface` | PARCIAL (bloqueo editorial declarado) |
| Experiencia | `premium-entity-experience` | 1.0.0 | `bindProductRoute` | `adaptExperienceSurfaceContract` | `producto.$slug.tsx` + ruta territorial de producto | Editorial/Cine | `premium_media_fallback` | PASS |
| Tour | `premium-entity-tour` | 1.0.0 | `bindProductRoute` | `adaptTourSurfaceContract` | idem | Editorial/Cine | idem | PASS |
| Producto genérico | `product_generic` (sin preset) | 1.0.0 | exclusión fail-closed | `ProductSurface` | idem | Editorial | estándar | PASS (fail-closed intencional) |
| Evento | `premium-entity-event` | 1.0.0 | `bindEventRoute` | `createEventSurfaceContract` | `eventos.$slug.tsx` | Editorial/Cine | `premium_media_fallback` | PASS sin corpus (0 eventos publicados) |
| Lugar (6 variantes) | `premium-entity-place[-slug]` | contrato place | `resolvePlace` → `bindPlaceRoute` | `adaptPlaceToPremiumSurface` | `$destino.lugares.$slug.tsx` | Editorial/Cine | fail-closed variante desconocida | PASS en runtime (5 lugares del piloto responden 200; la nota de cabecera "implementación inactiva" quedó obsoleta tras F1G — DEF-F1I-004) |
| Landing SEO | `premium-seo-landing` | 1.1.0 | `resolveSeoLandingForEntity` | `buildSeoLandingComposition` | `/l/$slug` genérico | Editorial forzada | slot vacío ⇒ bloque omitido | PASS |
| Home + 6 listados | `premium-g4-approved`, `listado-*-premium-g5-approved` | 1.0.0 | composición / DTO directo | `ListingPremiumSurfaceFromDTO` | `index.tsx`, `hoteles/restaurantes/experiencias/eventos/casas-de-vacaciones/que-hacer` | N/D | listado legacy | PASS en ruta · registry Studio-only |

Cero fixtures y cero datos demo en las 22 rutas (verificado en DOM, §11). Bloques vacíos se omiten; sin fotografía se usa marcador neutral.

---

## 4 · Presentación

- `entity_presentation_modes`: **0 filas** → las 22 fichas operan en **Editorial implícito determinista**.
- **22/22 Editorial · 0 Cinematográfica**, justificado: ninguna entidad tiene portada G8-M1 aprobada (`evaluateGovernedCover` fail-closed).
- Cinematográfica correctamente bloqueada: requiere solicitud + portada gobernada + aprobación staff; la pérdida de portada degrada a Editorial en la misma URL sin reconstruir contenido (`resolveEffectivePresentation`).
- Cero fotografías ajenas, cero galerías vacías, cero espacios rotos (§11).
- Persistencia/versionado/auditoría existen en tabla y RPC, pero **no ejercitados en producción** (0 filas) — no se auditó su flujo en vivo por la condición read-only.

---

## 5 · Datos CMS en bloques (muestra: `zazil-tunich`, `cenote-zaci`, `valladolid`)

| Bloque | Campo CMS | DTO | Componente | Vacío | Resultado |
|---|---|---|---|---|---|
| Hero | `name`, `short_description`, media | contrato de superficie | Hero/ExperienceHero | marcador neutral | PASS |
| Descripción / historia | `description`, `story` | DTO familia | secciones editoriales | bloque omitido | PASS |
| Reconocimientos / badges | badges institucionales (datos) | DTO | `institutional-badges` | omitido | PASS |
| Características | atributos CMS | DTO | features | omitido | PASS |
| Horarios / info práctica / accesibilidad | campos CMS | DTO | info-grid | omitido | PASS |
| Contacto / ubicación / mapa | contactos + lat/lng | DTO | mapa + ficha | omitido | PASS (Maps con error de referer en local, §11) |
| Productos / relacionados | consultas publicadas | DTO | grids | omitido | PARCIAL (relacionados incluyen empresas en cuarentena, DEF-F1I-001) |
| FAQ / CTA | CMS | DTO | bloques | omitido | PASS |
| SEO / JSON-LD | `buildPublicHead` | — | head | — | PASS |

Ningún componente completa datos faltantes con demostraciones.

---

## 6 · Rutas y navegación

22 rutas del piloto + Home, Oriente Maya, Valladolid, Izamal, Espita, Hoteles, Restaurantes, Experiencias, Eventos, Casas de Vacaciones y Qué hacer: **HTTP 200 en todas**, canonical correcto al dominio público, breadcrumb territorial presente, un único H1, header/footer canónicos, cero 404. No se detectó ningún enlace a entidades retiradas, archivadas o demo.

---

## 7 · Alux (acreditado por código y en runtime)

Runtime en `/oriente-maya/valladolid` (390 px), panel abierto — enlaces servidos exclusivamente:

`/oriente-maya/valladolid`, `…/cenotes/zazil-tunich` (+3 productos), `…/experiencias/coqui-coqui-valladolid`, `…/hoteles/hotel-casa-tia-micha`, `…/restaurantes/conato-1910`, `…/restaurantes/yerbabuena-del-sisal`.

- Cero demos, cero drafts, cero archivados, cero Clase B, cero `owner_submitted` en cuarentena. ✅
- Misma URL canónica, mismo destino/zona, misma identidad y tipo que las plantillas. ✅
- Toda sugerencia trae `rationale` + `source:{table,id}`; el reordenamiento IA está *grounded* (ids inválidos descartados) con fallback determinista. ✅
- Cero precio, cero disponibilidad, cero pago en el copy; CTAs limitados a `view` / `directions` / `promotion` / `coupon`. ✅
- `Guardar` (favoritos) y `Agregar a Mi Viaje` (plan) aparecen como acciones distintas por tarjeta. ✅
- Un solo dock (`AluxFloatingTrigger` + `FloatingTravelPlanDock`, montados una única vez en `__root.tsx:307,311`). ✅
- Escenarios de perfil (anónimo, recurrente, registrado, pareja, familia, grupo, plan vacío/con contenido, contexto insuficiente, ubicación permitida/denegada, ficha sin foto, precio ausente, evento vacío) están cubiertos por el motor determinista; se ejercitó en runtime el **anónimo con plan vacío y ubicación no otorgada** — el resto se acredita por código (limitación declarada, §Defectos DEF-F1I-006).

---

## 8 · Guardar y Mi Viaje (acreditado por código; no ejercitado en escritura por la condición read-only)

Guardar → `traveler_favorites` (`traveler-favorites.functions.ts`), Mi Viaje → `travel_plans`/`travel_plan_items` (`travel-plans.functions.ts`). Acciones distintas y no intercambiables (`favoriteKind` vs `planKind`). Idempotencia por unique key en ambas. Continuidad anónima en IndexedDB e importación única e idempotente vía `importAnonymousDraft`. Propuestas de Alux en cola `alux_plan_proposals` con aceptación explícita ("Alux propone; el viajero confirma"). Entidad retirada: favoritos degradan a estado limpiable, el plan conserva snapshot inmutable y no se rompe. Canonical estable.

---

## 9 · Precios

Regla acreditada en `place-public-contract.ts:221-228`: rango, `"Desde …"`, `"Hasta …"` o `null` (sin precio). En las 22 fichas del piloto: **cero precios mostrados** (ninguno acreditado), cero disponibilidad, cero "Reservar", cero "Pagar", cero checkout alcanzable desde superficies públicas (`DirectSaleBuyButton` sólo vive en el portal autenticado del empresario). Reservaciones permanece fuera de alcance.

---

## 10 · Aislamiento

- 22/22 fichas piloto con `noindex, nofollow` en las tres anchuras (66/66 comprobaciones). ✅
- Sitemap: 14 URLs, **cero** del piloto y **cero** de las tres en cuarentena. ✅
- Navegación accesible y Alux habilitado conforme a F1H. ✅
- Demos, retiradas y archivadas: no aparecen en ninguna superficie auditada. ✅
- Identificadores internos del lote (`G8-R1-F1G-EVALUATION-CONTENT`, `G8-R1-F1H-PUBLIC-PILOT`, `demo_seed`) : **cero apariciones** en DOM o JSON-LD. ✅
- Las tres `owner_submitted` **no contaminan** sitemap ni Alux, pero **siguen enlazadas** desde listados indexables (`/hoteles`, `/restaurantes`, `/experiencias`) y desde `/oriente-maya/valladolid` → DEF-F1I-001.

---

## 11 · QA empírica

132 comprobaciones (22 rutas × 390/768/1440 + 11 superficies × 390/430/768/1024/1280/1440):

- HTTP 200: 132/132 · overflow horizontal: **0** · H1 único: 132/132 · hidratación rota: 0 · estados loading/empty/error correctos · marcador neutral correcto en fichas sin fotografía · contenido no cubierto por el dock · un solo dock y un solo planner.
- Consola: **7 errores**, todos `RefererNotAllowedMapError` de Google Maps por ejecutar en `localhost` (dominio no autorizado en la clave). Ambiental, no de producto → DEF-F1I-007 (INFO).

Evidencia: `/tmp/browser/f1i/result.json` (no versionada; reproducible con el script del control).

---

## 12 · Gates

| Gate | Resultado |
|---|---|
| lint | PASS (sin nueva deuda; baseline histórico visible) |
| typecheck | PASS |
| Route Inventory | PASS (220 rutas cubiertas) |
| gobernanza (`governance:check`) | PASS (94.56 % cobertura, 0 errores) |
| sitemap / canonical / allowlist / aislamiento demo | PASS |
| Alux | PASS |
| Mi Viaje | PASS (código; escritura no ejercitada) |
| F1C-A / F1G / F1H / G8-M1 / R1-D / R1-E-R3 | PASS (suites previas, sin cambios de código en este control) |
| RLS/ACL y seguridad | PASS (sin cambios desde el cierre F1A/Q2A-R1) |
| build | No ejecutado en este control (read-only, sin cambios de código; typecheck + lint en PASS) |

---

## 13 · Veredicto por familia

| Familia | CMS | Resolver | DTO | Plantilla | Ruta | Medios | Alux | Mi Viaje | Estado |
|---|---|---|---|---|---|---|---|---|---|
| Destino | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | PASS |
| Lugar (6 variantes) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | PASS |
| Hotel | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | PASS |
| Restaurante | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | PASS |
| Experiencia | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | PASS |
| Tour | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠ sin corpus | ✅ | PARCIAL (sin entidad real) |
| Producto genérico | ✅ | ✅ | ✅ | fail-closed | ✅ | ✅ | ✅ | ✅ | PASS |
| Empresa genérica | ✅ | ✅ | — | sin preset propio | ✅ | ✅ | ✅ | ✅ | PARCIAL |
| Casa de vacaciones | ✅ | ⚠ `autoAssign:false` | ✅ | congelada | ✅ | ✅ | ⚠ sin corpus | ✅ | PARCIAL |
| Evento | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠ 0 publicados | ✅ | PARCIAL (sin corpus) |
| Landing SEO | ✅ | ✅ | ✅ | ✅ | `/l/$slug` | ✅ | N/D | N/D | PASS |
| Home / Oriente Maya / 6 listados | ✅ | composición | ✅ | ✅ | ✅ | ✅ | N/D | N/D | PASS (registry Studio-only) |

---

## Defectos por severidad

| ID | Sev. | Defecto | Evidencia |
|---|---|---|---|
| DEF-F1I-001 | **ALTA** | Las tres empresas en cuarentena siguen listadas y enlazadas desde `/hoteles`, `/restaurantes`, `/experiencias`, `/oriente-maya/valladolid` y bloques "relacionados": páginas indexables enlazan a fichas `noindex`. | QA §11 (leaks por URL) |
| DEF-F1I-002 | **MEDIA** | Alux construye a mano la URL territorial de negocios y sustituye la categoría ausente por el literal `"empresas"`, fuera de la autoridad canónica y sin fail-closed. | `contextual-suggest.functions.ts:494` (menores: 348, 521) |
| DEF-F1I-003 | MEDIA | `PREMIUM_TEMPLATE_PRESETS` (home, destino, listados) sólo lo consume Studio; el vínculo preset → composición publicada es convención de slug, no contrato verificado. | `premium-template-registry.ts:74-150` |
| DEF-F1I-004 | BAJA | La cabecera de la ruta de Lugar declara "implementación técnica inactiva / 404 en todos los casos reales"; ya es falso (5 lugares publicados responden 200). Documentación desactualizada. | `$destino.lugares.$slug.tsx:6-11` |
| DEF-F1I-005 | BAJA | `canonicalRoutePattern` / `alternateRoutePatterns` no están validados contra el router por ningún test. | ambos registries |
| DEF-F1I-006 | BAJA | Persistencia/versionado de presentación y escenarios avanzados de Alux/Mi Viaje no ejercitados en runtime (0 filas en `entity_presentation_modes`; escritura prohibida en este control). | §4, §7, §8 |
| DEF-F1I-007 | INFO | `RefererNotAllowedMapError` de Google Maps en `localhost` (clave restringida por dominio). | consola QA |

Ninguno es bloqueante para la **revisión Founder** del piloto; DEF-F1I-001 y DEF-F1I-002 sí deben cerrarse antes de retirar `noindex`.

---

## 14 · Respuestas obligatorias

1. **¿Las plantillas son llamadas automáticamente por el CMS correcto?** Sí, salvo Casa de vacaciones (`autoAssign:false` por decisión editorial pendiente) y Empresa genérica (clasificación sin preset premium propio).
2. **¿Existe una sola autoridad de resolución?** Sí: familia, presentación, URL, elegibilidad y medios tienen cada uno una autoridad única encadenada. La única fuga es DEF-F1I-002.
3. **¿Las 22 rutas consumen información real?** Sí: 22/22 con datos CMS reales acreditados, HTTP 200.
4. **¿Alguna ruta continúa usando fixture o demo?** No. Cero fixtures y cero demos en el DOM de las 22 rutas y de las 11 superficies estructurales.
5. **¿Editorial funciona sin fotografía?** Sí: marcador neutral, bloques vacíos omitidos, cero espacios rotos.
6. **¿Cinematográfica está correctamente bloqueada?** Sí: 0/22, fail-closed por ausencia de portada G8-M1 gobernada.
7. **¿Alux conoce las mismas entidades que muestran las plantillas?** Sí, con la misma URL canónica y clasificación territorial (verificado en runtime).
8. **¿Alux excluye demos y contenido no revisado?** Sí: demos, drafts, archivados, Clase B y las tres `owner_submitted` en cuarentena quedan fuera.
9. **¿Guardar y Mi Viaje funcionan de extremo a extremo?** Sí a nivel de contrato, acciones separadas, idempotencia, continuidad anónima y fusión; la escritura no se ejercitó por la condición read-only.
10. **¿Qué impide retirar `noindex`?** (a) DEF-F1I-001 — enlaces indexables hacia fichas en cuarentena; (b) cero portadas G8-M1, lo que dejaría el piloto público 100 % Editorial sin fotografía propia; (c) decisión Founder pendiente sobre las tres `owner_submitted`; (d) el flag visual sigue en OFF por diseño.
11. **¿El piloto está listo para revisión Founder?** Sí — **GO** para revisión humana con `noindex` puesto.
12. **¿Existe algún defecto que impida iniciar Reservaciones y Monitor?** Ninguno bloqueante; se recomienda cerrar DEF-F1I-002 antes de Reservaciones (la URL fail-open podría propagarse a confirmaciones y vouchers).

---

## Veredicto

- **GO** — revisión Founder del piloto navegable (22 entidades, `noindex` mantenido, flag OFF).
- **NO-GO** — retirar `noindex`, activar el flag, publicar o iniciar Reservaciones/Monitor sin nueva autorización.

**STOP CONDITION cumplida:** cero correcciones, cero cambios de contenido, `noindex` intacto, flag OFF, sin despliegue.
