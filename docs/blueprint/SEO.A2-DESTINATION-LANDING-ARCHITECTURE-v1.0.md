# SEO.A2 · Destination Landing Architecture — v1.0

**Programa:** SEO Evolution & Demand Capture
**Fase:** Diseño arquitectónico (sin implementación)
**Fecha:** 2026-07-16 · **Autor:** Lovable Agent · **Estado:** Blueprint para aprobación Founder
**Basado en:** `SEO-DEMAND-ARCHITECTURE-AUDIT-v1.0`, `Navigation Blueprint v1.0`, `Founder Entity First SEO`, `Founder Discovery Standard`, `Single Studio Principle`, `Experience Builder Vision`, Page Kind Registry actual, Block Library oficial (`vmx.*`).

> Este documento es exclusivamente de diseño. No autoriza tocar código, rutas, tablas ni composiciones. La ejecución se autorizará por sub-olas independientes A2.M1..A2.M8 posteriores.

---

## 0. Principios rectores (no negociables)

1. **Single Studio.** Toda landing se crea, edita y publica desde el Experience Builder. Cero editores paralelos.
2. **Entity First SEO.** Cada landing es primero una **entidad semántica** (Place, TouristAttraction, Event, TouristTrip, Collection) y después una página.
3. **Build Once, Reuse Everywhere.** Los tipos de landing comparten un núcleo común (`LandingSurface` + bloques oficiales) y sólo se diferencian por su **plantilla semilla** y sus **fuentes de datos**.
4. **Zero Duplicated Architecture.** Ningún tipo nuevo introduce ruta, motor, engine, superficie o registry propio. Se reutilizan `page_compositions`, Page Kind Registry, Block Library, `PublicShell`, `CompositionRenderer`, Navigation Contract, sitemap dinámico.
5. **Founder Discovery Standard.** Los listados usan `TourismListingSurface`; las fichas de POI usan Tourist Hero + bloques de la familia `vmx.experience.*`.
6. **Escalable a miles.** El coste marginal por landing = 1 fila en `page_compositions` + contenido editorial. Nunca 1 archivo de código.

---

## 1. Taxonomía oficial de Landing Pages

Cada tipo se declara como `PageKind` (algunos ya existen, otros son extensiones ADITIVAS al registry). El `kind` sólo determina plantilla semilla + JSON-LD por defecto + subset de bloques sugeridos — nunca un editor distinto.

### 1.1 Familia TERRITORIAL (canónica del Navigation Blueprint)

| # | Tipo | Kind actual | Ruta canónica | Entidad primaria | Volumen esperado |
|---|---|---|---|---|---|
| T1 | Región | `region` ✅ | `/{regionSlug}` (`/oriente-maya`) | `regions` | 1–5 |
| T2 | Destino | `destination` ✅ | `/oriente-maya/{destino}` | `destinations` | 10–50 |
| T3 | Listado categoría en destino | (composición implícita) | `/oriente-maya/{destino}/{categoria}` | Vista `businesses × destino × categoría` | 100–500 |
| T4 | Empresa | `business` ✅ | `/oriente-maya/{destino}/{categoria}/{empresa}` | `businesses` | 100–1 000 |
| T5 | Producto | `product` ✅ | `/oriente-maya/{destino}/{categoria}/{empresa}/{producto}` | `products` | 500–5 000 |

### 1.2 Familia POI EDITORIAL (nueva — cubre gaps de demanda del audit A1)

| # | Tipo | Kind propuesto | Ruta canónica sugerida | Entidad primaria | Ejemplos |
|---|---|---|---|---|---|
| P1 | Zona arqueológica | `poi_archaeological` | `/oriente-maya/{destino}/zonas-arqueologicas/{slug}` | `points_of_interest` (POI) | Chichén Itzá, Ek Balam, Cobá |
| P2 | Cenote | `poi_cenote` | `/oriente-maya/{destino}/cenotes/{slug}` | POI | Suytun, X'kekén, Zací, Oxman, Samulá |
| P3 | Pueblo Mágico | `poi_pueblo_magico` | `/oriente-maya/{destino}` con overlay + hub `/pueblos-magicos` | `destinations` marcados + badge | Valladolid, Izamal, Espita |
| P4 | Playa / Costa | `poi_beach` | `/oriente-maya/{destino}/playas/{slug}` | POI | San Felipe, Chuburná |
| P5 | Reserva natural | `poi_nature` | `/oriente-maya/{destino}/naturaleza/{slug}` | POI | Ría Lagartos, Punta Laguna |
| P6 | Hacienda / Patrimonio | `poi_heritage` | `/oriente-maya/{destino}/patrimonio/{slug}` | POI | Hacienda X, Convento de Sisal |

> **Modelo de datos común:** todos los POI viven en una única tabla `points_of_interest` con enum `poi_kind`. Un solo motor, N variantes de UI/JSON-LD.

### 1.3 Familia EDITORIAL / ITINERARIOS

| # | Tipo | Kind actual/propuesto | Ruta canónica | Entidad primaria |
|---|---|---|---|---|
| E1 | Ruta / Itinerario | `route` ✅ | `/rutas/{slug}` | `routes` (nueva, ligera) |
| E2 | Colección temática (hub) | `collection` (propuesto) | `/coleccion/{slug}` | `thematic_collections` (spokes derivados) |
| E3 | Landing de intención (evergreen) | `landing` ✅ | `/l/{slug}` | Composición EB pura |
| E4 | Guía / artículo blog | `blog_post` (propuesto) | `/blog/{slug}` | `blog_posts` |
| E5 | Boda destino | `wedding` ✅ | `/l/{slug}` | Composición EB |

### 1.4 Familia ENTIDAD EDITORIAL (fichas ya existentes)

`experience`, `hotel`, `restaurant`, `event` (todos ya en el registry). Se mantienen tal cual — su plantilla semilla se armoniza con esta arquitectura pero no cambia su ruta ni su editor.

---

## 2. Plantilla reutilizable: `LandingSurface`

Todas las familias comparten una **única superficie**: `LandingSurface`, que ya existe conceptualmente como `PublicShell + CompositionRenderer`. La superficie NO cambia por tipo. Lo que cambia es:

```text
 PublicShell (header + footer + breadcrumbs canónicos)
   └─ ContextEngineProvider (contexto territorial resuelto)
        └─ CompositionRenderer(tree, pageType, entity)
             ├─ renderiza bloques oficiales vmx.*
             └─ resuelve Smart Blocks contra la entidad
```

Diferenciadores por tipo:
- **Plantilla semilla** (composición inicial en `page_compositions`).
- **`entity_kind` + `entity_id`** que el renderer inyecta a los Smart Blocks.
- **JSON-LD `@type` por defecto** (ya declarado en `resolvePageKindDefaults`).
- **Subset de bloques sugeridos** en el picker del Studio (`allowedBlockCategories`).

**No se crea `DestinationLandingSurface`, `CenoteLandingSurface`, etc. Prohibido.** Todas son la misma superficie con distinta composición.

---

## 3. Composición por tipo (plantillas semilla oficiales)

Cada plantilla se expresa como una lista ordenada de bloques oficiales (`vmx.*`) ya existentes en la Block Library. Se marcan bloques `[smart]` (fuente = entidad/consulta) y `[edit]` (contenido editorial). **Cero bloques nuevos requeridos para v1.**

### 3.1 T2 · Destino (`destination`)

1. `vmx.experience.hero` `[smart]` — nombre, tagline, hero_url, badges
2. `vmx.experience.institutional-badges` `[smart]` — Pueblo Mágico, Oriente Maya, Patrimonio
3. `vmx.experience.subnav` `[edit]` — anclas: Qué hacer · Cenotes · Hoteles · Restaurantes · Cómo llegar
4. `vmx.experience.section` + `vmx.experience.features` `[edit]` — "5 razones para venir"
5. `vmx.smart.destinations-grid` (variante "cercanos") `[smart]`
6. `vmx.smart.businesses-grid` filtrada por destino + facets `[smart]`
7. `vmx.smart.products-grid` (experiencias del destino) `[smart]`
8. `vmx.experience.map` con POIs del destino `[smart]`
9. `vmx.experience.related-collection` (rutas / colecciones que lo incluyen) `[smart]`
10. `vmx.experience.cta-bar` — "Arma tu viaje" / "Habla con Alux"

### 3.2 P1 · Zona arqueológica (`poi_archaeological`)

1. `vmx.experience.hero` `[smart]`
2. `vmx.experience.institutional-badges` `[smart]` (Patrimonio Humanidad, INAH…)
3. `vmx.experience.info-grid` `[smart]` — horario, precio, tiempo desde Valladolid, dificultad
4. `vmx.experience.section` `[edit]` — historia y contexto maya
5. `vmx.experience.gallery` `[smart]`
6. `vmx.experience.map` `[smart]` + `vmx.business.contact` (cómo llegar)
7. `vmx.smart.products-grid` — tours a la zona `[smart]`
8. `vmx.smart.businesses-grid` — hoteles cercanos `[smart]`
9. `vmx.experience.related-collection` — otras zonas arqueológicas del Oriente Maya `[smart]`
10. `vmx.product.faq` `[edit]`
11. `vmx.experience.cta-bar`

### 3.3 P2 · Cenote (`poi_cenote`)

Como P1, con `info-grid` orientado a cenotes (tipo — abierto/semiabierto/cerrado, profundidad, servicios, apto para niños, snorkel/buceo). Related collection = otros cenotes del destino.

### 3.4 P4/P5/P6 · Playa / Naturaleza / Patrimonio

Misma estructura P1, con `info-grid` especializado por variante del bloque (mismo contrato, diferentes `capabilities`).

### 3.5 E1 · Ruta / Itinerario (`route`)

1. `vmx.experience.hero` `[edit]`
2. `vmx.experience.info-grid` — duración, dificultad, temporada, presupuesto
3. `vmx.experience.section` (día 1) → `vmx.smart.businesses-grid` de POIs del día
4. Repetir por día (día 2, día 3…)
5. `vmx.experience.map` con la ruta completa
6. `vmx.experience.cta-bar` — "Personaliza este itinerario con Alux"

**JSON-LD:** `TouristTrip` con `itinerary` = ordered list de `TouristAttraction`.

### 3.6 E2 · Colección temática (`collection`)

Hub tipo "Cenotes del Oriente Maya", "Pueblos Mágicos", "Ruta gastronómica".

1. `vmx.experience.hero` `[edit]`
2. `vmx.experience.section` `[edit]` — narrativa editorial
3. `vmx.smart.destinations-grid` / `vmx.smart.businesses-grid` / grid de POIs (spokes)
4. `vmx.experience.map` con todos los spokes
5. `vmx.experience.related-collection` (otras colecciones)
6. `vmx.experience.cta-bar`

**JSON-LD:** `CollectionPage` + `ItemList` con los spokes.

### 3.7 E3 · Landing de intención (`landing`)

Composición 100 % editorial (`/que-hacer-en-valladolid`, `/hoteles-en-valladolid`, `/cenotes-en-valladolid`). Reutiliza bloques smart apuntados a la vista territorial correspondiente. Canonical = la landing misma.

### 3.8 E4 · Blog / Guía (`blog_post`)

1. `vmx.experience.hero` (variante editorial)
2. `vmx.experience.section` (cuerpo — soporta MD/HTML editorial)
3. `vmx.smart.businesses-grid` / `vmx.smart.products-grid` como piezas relacionadas
4. `vmx.experience.related-collection` — otras guías del cluster
5. `vmx.experience.cta-bar`

**JSON-LD:** `Article` + `BreadcrumbList` + `author`.

---

## 4. Origen de datos — Entidades vs Contenido editorial

### 4.1 Matriz general

| Campo | Origen | Modo |
|---|---|---|
| Nombre, slug, tagline, hero_url, coordenadas | Entidad (BD) | Datos operativos |
| Descripción larga, historia, contexto | Editorial | Overlay EB |
| Info-grid (precio, horario, servicios) | Entidad + overrides EB | Híbrido |
| Galería | Entidad (`media_assets`) | Media Pipeline |
| Badges institucionales | Entidad (`institutional_badges`) | Registry |
| Reseñas | Entidad (`reviews`, publicadas) | Datos operativos |
| Productos/tours/hoteles cercanos | Smart Blocks (consulta) | Runtime |
| FAQ | Editorial | Overlay EB |
| CTA copy | Editorial | Overlay EB |
| Related territorial | Función `getDestinationRelated` / `getBusinessRelated` / `getProductRelated` | Runtime |

### 4.2 Contenido nuevo requerido (por tipo)

| Tipo | Entidad nueva | Contenido editorial mínimo |
|---|---|---|
| POI (cenote, arqueológico, playa, naturaleza, patrimonio) | `points_of_interest` (una tabla + enum) | tagline, descripción, historia, FAQ, cómo llegar |
| Ruta / Itinerario | `routes` (id, título, resumen, días JSON) | narrativa por día |
| Colección temática | `thematic_collections` (id, título, spokes) | intro editorial |
| Landing de intención (`/l/*`) | Ninguna (composición EB) | copy + selección de smart blocks |
| Blog | `blog_posts` (id, título, cuerpo MD, autor) | contenido evergreen |

> **Regla de mínimos:** ninguna landing se publica sin: nombre, slug, tagline, hero_url ≥1600 px, descripción ≥300 caracteres, geo (si aplica), badges (si aplica), ≥3 enlaces internos salientes.

---

## 5. Integración con Experience Builder (sin duplicar arquitectura)

### 5.1 Puntos de conexión existentes que se reutilizan

- **`page_compositions`** — única tabla de composiciones. Todas las landings viven aquí.
- **Page Kind Registry** — se **extiende aditivamente** (`poi_cenote`, `poi_archaeological`, `poi_beach`, `poi_nature`, `poi_heritage`, `collection`, `blog_post`) sin tocar los kinds existentes.
- **Block Library `vmx.*`** — v1 no requiere bloques nuevos. Evolución sólo por `variant`/`capabilities`/`extensions[]` (H-03).
- **Adapters** (`destination-to-blocks`, `business-related-to-block`, etc.) — se añaden nuevos adapters `poi-to-blocks` y `route-to-blocks` reutilizando el patrón.
- **`CompositionRenderer`** — sin cambios; ya sabe resolver Smart Blocks contra un `entity_kind` + `entity_id`.
- **Sitemap dinámico** — extendido para incluir POIs, rutas, colecciones y blog cuando `status='published'`.
- **`buildPublicHead` + `resolvePageKindDefaults`** — ya declaran JSON-LD por kind; se añaden entradas para los kinds nuevos.
- **Navigation Contract** — se amplía con `resolveCanonicalPath({kind:'poi_cenote', destination, slug})` sin romper firmas.

### 5.2 Flujo end-to-end para un tipo nuevo (ejemplo: Cenote Suytun)

```text
1. Alta de entidad en CMS → points_of_interest{kind:'cenote', destination_id, slug, name, geo, media, badges}
2. Studio crea composición → page_compositions{kind:'poi_cenote', entity_id, snapshot: seed_template_cenote}
3. Editor ajusta bloques en Visual Studio (WYSIWYG)
4. Publicación → status='published' → visible en /oriente-maya/valladolid/cenotes/suytun
5. Sitemap incluye la URL automáticamente
6. Related territorial + colección "Cenotes del Oriente Maya" lo enlazan
```

### 5.3 Lo que NO se crea

- Sin `CenoteSurface`, `ArqueoSurface`, `RouteSurface`.
- Sin nuevas rutas por tipo — todas caen bajo el patrón territorial resolvedor o `/l/*` `/p/*` `/rutas/*` `/coleccion/*` `/blog/*`.
- Sin sistemas de plantillas paralelos. Las plantillas semilla son composiciones EB en `page_compositions` con `is_template=true`.

---

## 6. Enlazado interno y clusters

### 6.1 Mapa de enlazado obligatorio (por landing publicada)

```text
Landing POI (ej. Cenote Suytun)
  ├─ ↑ Destino padre (Valladolid)
  ├─ ↑ Categoría padre (Cenotes)
  ├─ ↔ Colección temática ("Cenotes del Oriente Maya")
  ├─ ↔ Otros POIs del mismo tipo en el destino (siblings, ≤6)
  ├─ ↔ Rutas que lo incluyen
  ├─ ↓ Tours/productos que lo visitan
  └─ ↓ Hoteles cercanos (radio 15 km)
```

El enlazado se genera automáticamente por bloques `vmx.experience.related-collection`, `vmx.smart.*` y por breadcrumbs canónicos — **cero enlaces hardcoded**.

### 6.2 Clusters iniciales (definidos aquí, implementados en A2.M4)

| Cluster | Hub (E2) | Spokes | Cross-links |
|---|---|---|---|
| Cenotes del Oriente Maya | `/coleccion/cenotes-oriente-maya` | POIs `poi_cenote` | Destinos con cenotes, tours cenote |
| Zonas Arqueológicas | `/coleccion/zonas-arqueologicas` | POIs `poi_archaeological` | Tours a zonas, hoteles cercanos |
| Pueblos Mágicos del Oriente Maya | `/coleccion/pueblos-magicos` | Destinos con badge | Rutas entre pueblos |
| Ruta Flamencos & Sal | `/rutas/rio-lagartos-coloradas` | POIs Río Lagartos + Las Coloradas | Tours, hoteles |
| Gastronomía Yucateca | `/coleccion/gastronomia-yucateca` | Restaurantes categoría | Rutas gastronómicas |
| Cultura Maya Viva | `/coleccion/cultura-maya` | Experiencias culturales + POIs | Rutas culturales |

### 6.3 Reglas de interlinking

1. Toda landing pertenece a **≥1 cluster** (colección o ruta).
2. Todo hub enlaza **directamente** a todos sus spokes.
3. Todo spoke enlaza **de vuelta** al hub (breadcrumb + `related-collection`).
4. Profundidad de clic máxima Home → POI: **≤4**.
5. Ninguna landing publicada puede quedar huérfana (validación en publicación).

---

## 7. Estrategia de escalamiento (cientos → miles)

### 7.1 Coste marginal por landing

| Recurso | Coste por landing nueva |
|---|---|
| Código | **0 líneas** |
| Ruta | **0 archivos** (resolvedor territorial + `/l/`, `/rutas/`, `/coleccion/`, `/blog/`) |
| Migración | **0** (fila en tabla existente) |
| Bloques nuevos | **0** (composición sobre `vmx.*` existentes) |
| Trabajo editorial | copywriting + selección de bloques + media |

### 7.2 Palancas de escala

1. **Plantillas semilla versionadas** (`page_compositions where is_template=true and kind=X`). Alta = clonar plantilla + rellenar entidad.
2. **Smart Blocks** hacen el trabajo pesado: la mayoría de la página se rellena sola desde la entidad.
3. **Bulk seed operations** — importación masiva de POIs (cenotes, zonas arqueológicas del INAH…) genera automáticamente composición semilla + entrada de cluster.
4. **Asistente Alux Studio** (`ai_generated` ya en registry) — propone borrador de landing editorial dado un nombre + tipo; humano revisa y publica.
5. **Media Pipeline** (H3·A4) — variantes derivadas automáticas; el editor sólo sube el original.
6. **Governance de calidad** — checklist de publicación bloquea landings incompletas (evita Thin Content masivo).

### 7.3 Modelo de crecimiento sostenible (12 meses)

| Trimestre | Meta acumulada | Foco |
|---|---|---|
| Q1 | 30 POIs (cenotes + zonas + Pueblos Mágicos) + 5 rutas + 3 colecciones + 10 blog | Cobertura demanda P0 |
| Q2 | 100 POIs + 15 rutas + 8 colecciones + 30 blog | Long tail |
| Q3 | 300 POIs + 40 rutas + 15 colecciones + 60 blog | Expansión regional |
| Q4 | 1 000+ landings totales | Escalado y automatización asistida |

---

## 8. Roadmap de ejecución (para autorizar por sub-olas)

> Cada sub-ola sale con Blueprint propio + aprobación Founder + Completion Report + Demo Pack. Este documento sólo diseña.

| Sub-ola | Alcance | Prerrequisito |
|---|---|---|
| **A2.M1** | Extensión aditiva del Page Kind Registry (poi_*, collection, blog_post) + defaults SEO | Este blueprint aprobado |
| **A2.M2** | Modelo de datos `points_of_interest` (tabla única, enum `poi_kind`) + adapter `poi-to-blocks` | M1 |
| **A2.M3** | Plantillas semilla oficiales por kind (composiciones `is_template=true`) | M2 |
| **A2.M4** | Modelo `thematic_collections` + `routes` + ruta canónica del resolvedor | M3 |
| **A2.M5** | Extensión del sitemap + JSON-LD + breadcrumbs canónicos | M4 |
| **A2.M6** | Blog (`blog_posts`) reactivación editorial + reindexado | M5 |
| **A2.M7** | Landings de intención P0 (que-hacer, cenotes, hoteles, Chichén Itzá) | M3 |
| **A2.M8** | Asistente Alux Studio para borradores de landing | M3 |

---

## 9. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Explosión de kinds → Studio confuso | Agrupación por familia en el picker; máx 3 kinds nuevos por sub-ola |
| Thin Content en POIs masivos | Checklist de publicación con mínimos + noindex hasta cumplir |
| Canibalización entre landing de intención y territorial | Canonical explícito + interlinking descendente |
| Duplicación de superficies por presión de UX | Este blueprint prohíbe superficies por tipo; se refuerza en constitución |
| Colecciones sin mantenimiento | `thematic_collections.last_curated_at` + tarea Alux de auditoría |
| Deuda i18n (6 idiomas) | Diferida a lanzamiento internacional (memoria `founder-i18n-seo`) |

---

## 10. Definition of Done del blueprint

- Taxonomía completa de tipos de landing con familia y kind.
- Plantilla reutilizable única declarada (`LandingSurface` = `PublicShell + ContextEngine + CompositionRenderer`).
- Composición por tipo con bloques oficiales `vmx.*` existentes (v1 sin bloques nuevos).
- Origen de datos entidad vs editorial documentado.
- Integración EB sin duplicación de arquitectura.
- Estrategia de enlazado interno y clusters.
- Estrategia de escalamiento a miles.
- Roadmap de sub-olas.

---

## 11. Cierre

Con este diseño, **agregar un nuevo tipo de landing** al ecosistema Oriente Maya cuesta una entrada en el registry + una plantilla semilla en `page_compositions`; **agregar una landing concreta** cuesta una fila en la entidad + una composición clonada. La superficie, el motor, el renderer, el sitemap y el JSON-LD ya están construidos.

**Prohibido implementar hasta autorización Founder de A2.M1.**
