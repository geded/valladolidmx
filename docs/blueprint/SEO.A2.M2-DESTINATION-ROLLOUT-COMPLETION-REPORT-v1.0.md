# SEO.A2.M2 · Destination Rollout — Completion Report v1.0

**Estado:** ✅ COMPLETED · **Fecha:** 2026-07-16
**Depende de:** SEO.A2.M1 (Territorial Landing MVP) — arquitectura validada.
**Fuentes:** `SEO-DEMAND-ARCHITECTURE-AUDIT-v1.0.md`, `SEO.A2-DESTINATION-LANDING-ARCHITECTURE-v1.0.md`.

---

## 1. Objetivo

Expandir la arquitectura territorial validada en M1 (una sola `LandingSurface`
servida por Experience Builder a través de `__tpl_destination__` +
`vmx.surface.destination`) a **todas las entidades territoriales
prioritarias** del Oriente Maya, sin crear una segunda arquitectura, sin
nuevos renderizadores y sin nuevos bloques `vmx.*`.

## 2. Reglas aplicadas

| Regla | Cumplimiento |
|-------|--------------|
| No segunda arquitectura | ✅ Se reutilizó exclusivamente `src/routes/oriente-maya/$destino.index.tsx` |
| No nuevos renderizadores | ✅ Único renderer: `CompositionRenderer` + fallback `DestinationSurface` |
| No nuevos bloques `vmx.*` | ✅ Cero bloques creados. Se reutiliza `vmx.surface.destination` |
| Reutiliza `LandingSurface` | ✅ Vía `CompositionRenderer` (superficie única) |
| Reutiliza Experience Builder | ✅ Plantilla `__tpl_destination__` publicada, resuelta por slug |
| Reutiliza composición existente | ✅ Sin variantes por destino |

## 3. Entidades incorporadas al rollout

Todas las entidades resuelven contra la misma plantilla y provider. El
coste marginal por destino nuevo es **cero líneas de código**.

| # | Slug | Nombre | Región | Status | Ruta pública |
|---|------|--------|--------|--------|--------------|
| 1 | `valladolid` | Valladolid | oriente-maya | published | `/oriente-maya/valladolid` |
| 2 | `chichen-itza` | Chichén Itzá | oriente-maya | published | `/oriente-maya/chichen-itza` |
| 3 | `ek-balam` | Ek Balam | oriente-maya | published | `/oriente-maya/ek-balam` |
| 4 | `izamal` | Izamal | oriente-maya | published | `/oriente-maya/izamal` |
| 5 | `espita` | Espita | oriente-maya | published | `/oriente-maya/espita` |
| 6 | `uayma` | Uayma | oriente-maya | published | `/oriente-maya/uayma` |
| 7 | `rio-lagartos` | Río Lagartos | oriente-maya | published | `/oriente-maya/rio-lagartos` |
| 8 | `las-coloradas` | Las Coloradas | oriente-maya | published | `/oriente-maya/las-coloradas` |

Cobertura: **8/8 destinos publicados** de la Región Oriente Maya · **100%**
de las entidades territoriales prioritarias identificadas en el
`SEO-DEMAND-ARCHITECTURE-AUDIT-v1.0.md`. Los tres Pueblos Mágicos
(Valladolid, Izamal, Espita) están cubiertos.

## 4. Componentes reutilizados (0 nuevos)

| Componente | Rol | Origen |
|-----------|-----|--------|
| `src/routes/oriente-maya/$destino.index.tsx` | Ruta única compuesta composition-first | M1 |
| `getPublishedCompositionBySlug` | Resolución específica → plantilla | Experience Builder |
| `CompositionRenderer` | Único renderer de bloques `vmx.*` | Experience Builder |
| `vmx.surface.destination` | Bloque único territorial | H-03 |
| `DestinationSurfaceProvider` | Hidratación server-side (BD, related, mapPoints, gallery) | M1 |
| `DestinationSurface` | Fallback defensivo (misma UI) | H-03 |
| `ContextEngineProvider` | Contexto territorial declarativo | Context Engine |
| `RegionSurface` / `listPublishedDestinations` | Grid regional que enlaza los 8 destinos | US-R3 |

**Bloques `vmx.*` creados en M2:** 0.
**Renderizadores creados en M2:** 0.
**Rutas creadas en M2:** 0 (ruta paramétrica única resuelve todas).

## 5. Validaciones ejecutadas

| Validación | Resultado |
|-----------|-----------|
| Todas las páginas usan la misma plantilla `__tpl_destination__` | ✅ Verificado en loader de `$destino.index.tsx` |
| No hay excepciones ni ramas por slug | ✅ Cero condicionales por destino |
| SEO técnico consistente (title, description, canonical, breadcrumbs, `TouristDestination` JSON-LD, `containedInPlace` = ORIENTE_MAYA) | ✅ `buildPublicHead` + `touristDestinationJsonLd` centralizados |
| OG image por destino cuando `hero_url` existe | ✅ (Ek Balam, Izamal, Uayma, Río Lagartos, Las Coloradas, Valladolid). Chichén Itzá y Espita usan fallback social — mejora editorial trasladada al backlog de CMS, no bloqueante |
| Geolocalización | ✅ 8/8 con `latitude`/`longitude` |
| Highlights ≥ 4 | ✅ 8/8 (rango 4–6) |
| Interlinking regional | ✅ `/oriente-maya` lista los 8 vía `listPublishedDestinations` (sin mocks) |
| Breadcrumbs `Inicio → Oriente Maya → {Destino}` | ✅ Contexto territorial declarado |
| Typecheck | ✅ Sin errores nuevos introducidos por M2 (baseline preexistente idéntico) |
| Build | ✅ N/A · sin cambios de código |

## 6. Cobertura alcanzada

- **Cobertura territorial Oriente Maya:** 100% (8/8).
- **Cobertura Pueblos Mágicos del Oriente Maya:** 100% (Valladolid, Izamal, Espita).
- **Cobertura íconos arqueológicos:** 100% (Chichén Itzá, Ek Balam).
- **Cobertura reservas naturales:** 100% (Río Lagartos, Las Coloradas).
- **Nuevas arquitecturas creadas:** 0.
- **Nuevos renderizadores:** 0.
- **Nuevos bloques `vmx.*`:** 0.

## 7. Rollback

M2 no introduce migraciones ni cambios de código. El rollback es
inmediato y no destructivo:

1. Despublicar el destino afectado en `destinations` (`status = 'draft'`)
   → la ruta responde `notFound` sin afectar los demás.
2. Si se requiriera revertir la plantilla, restaurar el snapshot previo
   de `__tpl_destination__` en `page_revisions` (misma vía usada en M1).
3. El fallback `DestinationSurface` sigue disponible ante cualquier
   fallo de composición — no hay pérdida de UI.

## 8. Oportunidades detectadas (no bloqueantes)

- **Hero editorial** para Chichén Itzá y Espita (subir `hero_media_id`
  en CMS). Backlog editorial, no bloquea SEO.A2.M3.
- **Composiciones específicas por destino** (`dest-<slug>`) para
  destacar narrativa local sin tocar la plantilla base — la ruta ya
  resuelve override cuando existan.
- **Cluster de cenotes** (Suytun, Zací, Ik-Kil, X'kekén…) queda para
  SEO.A2.M3 · POI Editorial Landings (categoría POI, no Territorial).

## 9. Cierre

SEO.A2.M2 · Destination Rollout **cumple** el alcance autorizado:
arquitectura única, cero renderers nuevos, cero bloques nuevos, 8/8
destinos publicados sirviéndose de la misma superficie validada en M1.

**Siguiente ola sugerida:** SEO.A2.M3 · POI Editorial Landings
(Chichén Itzá como POI arqueológico, Cenote Suytun, Cenote Ik-Kil,
Cenote Zací) reutilizando `LandingSurface` + `vmx.surface.destination`
con `PageKind = poi_*`, siguiendo el mismo patrón M1/M2.