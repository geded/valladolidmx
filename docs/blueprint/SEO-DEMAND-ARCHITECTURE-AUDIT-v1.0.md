# SEO Demand Architecture Audit — v1.0

**Capítulo 2 · SEO Architecture & Demand Capture**
Fecha: 2026-07-16 · Autor: Lovable Agent · Estado: **Auditoría (sin implementación)**
Fuentes: `src/routes/`, `src/routes/sitemap[.]xml.ts`, `src/lib/experience-builder/route-inventory.ts`, base de datos Lovable Cloud (destinos, categorías, empresas, productos, eventos), Semrush (database `mx`), memoria de proyecto (Navigation Blueprint v1.0, Founder Discovery Standard, Founder Entity First SEO).

> Esta fase es exclusivamente diagnóstica. No se modifica código, ni rutas, ni tablas, ni landings. El único entregable es este documento.

---

## 1. Resumen ejecutivo

Valladolid.mx tiene una arquitectura semántica **sólida** (JSON‑LD, canonical, sitemap dinámico, breadcrumbs territoriales, dominio unificado) pero una **cobertura de demanda muy baja**: la mayoría de las búsquedas de alto valor turístico del Oriente Maya no tienen aún una superficie dedicada, indexable y optimizada.

El motor está listo. Lo que falta es **contenido territorial publicado** y **landings temáticas de intención** que capten la demanda existente.

| Indicador | Estado |
|---|---|
| Motor SEO (JSON‑LD, canonical, sitemap, robots, OG) | ✅ Completo (SEO.A1.1 / A1.2 cerradas) |
| Modelo canónico de URLs `/oriente-maya/{destino}/{cat}/{empresa}/{producto}` | ✅ Implementado |
| Cobertura de destinos publicados | ⚠️ 7 destinos, 2 sin empresas (Ek Balam, Las Coloradas) |
| Cobertura de negocios/productos publicados | 🔴 26 empresas · 5 productos · 10 eventos |
| Landings de intención (“qué hacer”, “cenotes”, “Chichén Itzá”…) | 🔴 Casi nulas |
| Clusters temáticos (cenotes, gastronomía, pueblos mágicos, cultura maya) | 🔴 No existen |
| Enlazado interno hub → spoke | ⚠️ Débil fuera de la ruta territorial |
| Blog / contenido editorial evergreen | 🔴 `/blog` sin contenido, fuera del sitemap |
| Canibalización | ⚠️ Riesgo medio en `/experiencias`, `/hoteles`, `/restaurantes`, `/que-hacer` vs listados territoriales |

**Veredicto:** *Preparada estructuralmente, sub‑explotada comercialmente.* Prioridad P0 = publicar destinos icónicos + activar clusters de intención.

---

## 2. Inventario de rutas públicas indexables

### 2.1 Rutas estáticas (studio / listados)

| Ruta | Tipo | Indexable | En sitemap | Observación |
|---|---|---|---|---|
| `/` | Home (EB) | ✅ | ✅ | Composición EB, prio 1.0 |
| `/oriente-maya` | Hub regional | ✅ | ✅ | Índice territorial |
| `/experiencias` | Listado global | ✅ | ✅ | Riesgo canibalización con `/oriente-maya/{d}/experiencias-tours` |
| `/hoteles` | Listado global | ✅ | ✅ | Idem con `/oriente-maya/{d}/hoteles` |
| `/restaurantes` | Listado global | ✅ | ✅ | Idem |
| `/eventos` | Listado global | ✅ | ✅ | |
| `/casas-de-vacaciones` | Listado global | ✅ | ✅ | |
| `/empresas` | Directorio | ✅ | ✅ | Débil intención de búsqueda |
| `/promociones` | Listado | ✅ | ❌ | No en sitemap |
| `/que-hacer` | Landing temática | ✅ | ❌ | **Compite directamente con “qué hacer en Valladolid” (720/mo). No está en sitemap.** |
| `/mapa` | Mapa interactivo | ✅ | ❌ | Utilidad, no landing |
| `/marketplace` | Listado | ✅ | ❌ | Backlog: retirar terminología |
| `/arma-tu-viaje` | Landing producto | ✅ | ✅ | Conversión |
| `/convertir-en-anfitrion` | Landing B2B | ✅ | ❌ | Captación empresas |
| `/alux` | Landing consultiva | ✅ | ❌ | |
| `/blog` | Índice editorial | ✅ (noindex actual) | ❌ | Vacío, desindexado por decisión Founder |
| `/contacto` `/privacidad` `/terminos` | Institucionales | ✅ | parcial | |

### 2.2 Rutas dinámicas territoriales (canónicas — Navigation Blueprint N2)

| Patrón | Entidad | Publicadas | Ejemplos |
|---|---|---|---|
| `/oriente-maya/{destino}` | Destino | **7** | valladolid, izamal, espita, uayma, rio-lagartos, las-coloradas, ek-balam |
| `/oriente-maya/{destino}/{categoria}` | Listado categoría en destino | ~ N×15 posibles | 15 categorías × 7 destinos |
| `/oriente-maya/{destino}/{categoria}/{empresa}` | Ficha empresa canónica | **26** | Sólo empresas con destino+categoría publicados |
| `/oriente-maya/{destino}/{categoria}/{empresa}/{producto}` | Ficha producto canónica | **5** | |
| `/eventos/{slug}` | Evento | **10** | |
| `/producto/{slug}` | Ficha producto (shim) | 301 → canónica | |
| `/p/{slug}` | Página EB publicada | variable | Landings/microsites |
| `/l/{slug}` | Landing EB tipo campaña | variable | |
| `/viajero/{handle}` | Perfil público viajero | ✅ | Contenido UGC |

### 2.3 Rutas técnicas (fuera del audit SEO)
`/auth`, `/reset-password`, `/offline`, `/preview/*`, `/api/*`, `/.mcp/*`, `/.well-known/*`, `/lovable/*`, todo `_authenticated/*` — correctamente **noindex** (blindaje SEO.A1.2 cerrado).

---

## 3. Entidades sin superficie pública indexable

| Entidad | Motivo | Prioridad |
|---|---|---|
| **Ek Balam** (destino publicado, 0 empresas) | Sin negocios ni experiencias asociadas → ficha vacía, riesgo Thin Content | P0 |
| **Las Coloradas** (destino publicado, 0 empresas) | Idem | P0 |
| **Río Lagartos** (1 empresa) | Contenido escaso pese a demanda 6.6k/mo | P0 |
| **Chichén Itzá** | ❌ No existe como destino ni landing | **P0 crítico** — 135k búsquedas/mes |
| **Cenote Suytun / X’kekén / Zací / Oxman / Palomitas / Samulá** | ❌ No existen como entidad ni landing | P0 — Suytun sólo 33.1k/mo |
| **Pueblos Mágicos (cluster)** | ❌ Sin hub temático (Valladolid + Izamal + Espita) | P1 |
| **Categorías temáticas** (cenotes, gastronomía yucateca, cultura maya, artesanías) | Slugs en BD pero sin landing editorial | P1 |
| **Rutas / itinerarios curados** (`/rutas/...`) | Mock existente, no publicado | P2 |
| **Reseñas públicas** | Existen datos, sin superficie propia (`/reseñas/{slug}`) | P3 |
| **Blog / guías evergreen** | `/blog` vacío y desindexado | P1 |

---

## 4. Demanda de búsqueda vs cobertura actual (Semrush · MX)

> Semrush estima el mercado orgánico Google en México. Ordenado por volumen.

| Keyword | Vol/mes | KD | Landing dedicada | Estado |
|---|---|---|---|---|
| chichen itza | **135 000** | 71 hard | ❌ | Falta entidad + landing (P0) |
| cenote suytun | **33 100** | 40 posible | ❌ | Falta entidad Suytun (P0) |
| ek balam | **27 100** | 52 difícil | ⚠️ Destino publicado sin contenido | P0 |
| las coloradas | **27 100** | 39 posible | ⚠️ Destino publicado sin contenido | P0 |
| rio lagartos | **6 600** | 35 posible | ⚠️ 1 empresa | P0 |
| izamal pueblo magico | **3 600** | 31 posible | ⚠️ Destino sí, ángulo “Pueblo Mágico” no | P1 |
| hoteles en valladolid yucatan | **1 300** | 21 easy | ⚠️ `/hoteles` + `/oriente-maya/valladolid/hoteles` | Canibalización P1 |
| que hacer en valladolid yucatan | **720** | 30 posible | ⚠️ `/que-hacer` existe pero fuera del sitemap | P0 fácil |
| cenotes en valladolid | **720** | 33 posible | ❌ Sin hub cenotes | P0 |
| restaurantes en valladolid yucatan | **720** | 27 easy | ⚠️ `/restaurantes` + territorial | P1 |

**Semrush estima ~236 000 búsquedas/mes** solo en los 10 términos anteriores. La cobertura útil actual es marginal.

---

## 5. Arquitectura de URLs — duplicidad y solapamiento

| Patrón | Riesgo | Recomendación |
|---|---|---|
| `/hoteles` vs `/oriente-maya/{destino}/hoteles` | Canibalización media | Convertir `/hoteles` en **hub regional filtrable** que enlace a los territoriales |
| `/experiencias` vs `/oriente-maya/{destino}/experiencias-tours` | Canibalización media | Idem |
| `/restaurantes` vs `/oriente-maya/{destino}/restaurantes` | Canibalización media | Idem |
| `/que-hacer` vs futura `/oriente-maya/valladolid/que-hacer` | Duplicidad | Definir canonical explícito por keyword |
| `/marketplace` + `/marketplace/*` + `/oriente-maya/*` | Concepto duplicado | Backlog `retire-marketplace-terminology` ya reconoce el problema |
| `/producto/{slug}` (shim 301) | ✅ Resuelto | Mantener |
| Categorías con slugs duplicados (`eventos` vs `eventos-home`, `experiencias` vs `experiencias-tours`, `tours`) | **Riesgo alto de fragmentación** | Consolidar en 1 slug por concepto en `business_categories` |

---

## 6. Enlazado interno

| Aspecto | Diagnóstico |
|---|---|
| Profundidad de clic a ficha empresa | 3 (Home → Destino → Categoría → Empresa) ✅ |
| Profundidad a ficha producto | 4 ✅ dentro del estándar |
| Hubs por destino | ✅ Existen (`/oriente-maya/{d}`) pero con poca densidad de enlaces salientes cuando hay <5 empresas |
| Hubs temáticos (cenotes, gastronomía, cultura maya) | ❌ No existen |
| Enlaces salientes desde `/`, `/oriente-maya`, `/experiencias` hacia entidades | ⚠️ Dependen de composiciones EB; auditar densidad |
| Páginas huérfanas | `/promociones`, `/que-hacer`, `/mapa`, `/convertir-en-anfitrion`, `/alux` no aparecen en sitemap y probablemente reciben pocos enlaces internos |
| Breadcrumbs JSON‑LD | ✅ Implementado (SEO.A1.1 PR‑1) |
| Related collections producto/empresa | ✅ Implementado |
| Related territorial (destino → destino cercano) | ⚠️ Débil |

---

## 7. Cobertura territorial

**Modelo canónico:** `Región (Oriente Maya) → Destino → Categoría → Empresa → Producto` ✅
**Modelo alterno:** `Región → Destino → Experiencia` ✅ (mismo árbol, categoría = experiencias‑tours)

Cobertura real:

| Nivel | Publicado | Potencial |
|---|---|---|
| Región | 1 (Oriente Maya) | + Costa Maya, Zona Puuc… (roadmap) |
| Destinos | 7 | +Chichén Itzá, +Cuncunul, +Chemax, +Tizimín, +San Felipe |
| Categorías activas por destino | 3–5 | 15 posibles |
| Empresas | 26 (13 Valladolid, 7 Izamal, 4 Espita, 1 Uayma, 1 Río Lagartos, **0 Ek Balam, 0 Las Coloradas**) | Meta razonable: 150+ |
| Productos | 5 | Meta razonable: 200+ |
| Eventos | 10 | Meta razonable: 30+/mes |

---

## 8. Oportunidades de clusters temáticos (P1)

Cada cluster = 1 hub + N spokes (fichas + guías) + interlinking bidireccional.

1. **Cenotes del Oriente Maya** (hub `/oriente-maya/cenotes` o `/cenotes-en-valladolid`) — cobertura Suytun, X’kekén, Zací, Oxman, Samulá, Palomitas, Yokdzonot, Ik‑Kil.
2. **Chichén Itzá & Zona Arqueológica** — hub + guía de acceso + hoteles cercanos + tours desde Valladolid.
3. **Pueblos Mágicos del Oriente Maya** — Valladolid + Izamal + Espita.
4. **Río Lagartos, Las Coloradas y Reserva** — naturaleza + tours flamencos.
5. **Ek Balam & sitios mayas menos concurridos** — cultura maya.
6. **Gastronomía Yucateca en Valladolid** — cochinita, lomitos, longaniza, cenote‑restaurante.
7. **Rutas de un día desde Valladolid** — itinerarios (feed Arma tu Viaje).
8. **Hospedaje por estilo** — boutique colonial, haciendas, casas de vacaciones, glamping.

---

## 9. Canibalización potencial

| Grupo | Páginas involucradas | Nivel |
|---|---|---|
| Hoteles | `/hoteles`, `/oriente-maya/{d}/hoteles`, `/casas-de-vacaciones` | Medio |
| Experiencias / Tours | `/experiencias`, categoría `experiencias`, categoría `experiencias-tours`, categoría `tours` | **Alto** (3 slugs de categoría para el mismo concepto) |
| Restaurantes | `/restaurantes`, `/oriente-maya/{d}/restaurantes`, `/oriente-maya/{d}/gastronomia` | Medio |
| Eventos | `/eventos`, categoría `eventos`, categoría `eventos-home` | Alto (slugs duplicados en BD) |
| Qué hacer | `/que-hacer` (huérfana) vs futura `/oriente-maya/valladolid/que-hacer` | Medio |

---

## 10. Páginas con bajo potencial de posicionamiento

- `/empresas` — intención de búsqueda casi nula (directorio B2B).
- `/marketplace` — término no turístico.
- `/mapa` — utilidad interna.
- `/viajero/{handle}` — UGC, valor SEO bajo salvo perfiles de embajadores.
- `/blog` (vacío) — actualmente correctamente `noindex`.
- Rutas EB genéricas `/p/{slug}` sin propósito editorial claro.

Recomendación: mantener indexables sólo si aportan enlazado interno útil; considerar `noindex, follow` cuando el contenido es delgado.

---

## 11. Oportunidades de alto impacto económico (P0)

Ordenadas por relación **volumen × facilidad × conversión turística**:

1. **Landing “Qué hacer en Valladolid, Yucatán”** — ruta existe (`/que-hacer`), sólo falta contenido y meterla al sitemap. KD 30, 720/mo. **ROI inmediato.**
2. **Hub “Cenotes en Valladolid” + fichas por cenote** — 720/mo hub + 33k/mo Suytun + long tail. KD 33–40.
3. **Destino “Chichén Itzá” + landing “Cómo visitar Chichén Itzá desde Valladolid”** — 135k/mo, KD alto pero long‑tail navegable (“chichen itza desde valladolid”, “tours chichen itza”).
4. **Completar fichas de Ek Balam y Las Coloradas** — destinos ya publicados, sólo faltan negocios/experiencias.
5. **Hub “Pueblos Mágicos del Oriente Maya”** — capitaliza el badge institucional ya existente.
6. **Landing “Hoteles en Valladolid Yucatán”** — 1.3k/mo, KD 21 (fácil). Convertir `/hoteles` en hub regional.
7. **Cluster “Río Lagartos + Las Coloradas + Flamencos”** — 33k/mo combinados.
8. **Migrar `/blog` a contenido evergreen** — guías tipo “Mejor época para visitar”, “Qué comer”, “Ruta de 3 días”. Base para autoridad y long‑tail.

---

## 12. Hallazgos clasificados por prioridad

### P0 — Bloqueantes de captación de demanda
- Sin entidad ni landing de **Chichén Itzá** (135k/mo).
- Sin fichas para **Suytun** y otros cenotes icónicos (>50k/mo combinados).
- **Ek Balam** y **Las Coloradas** publicados pero vacíos → riesgo Thin Content.
- `/que-hacer` **fuera del sitemap** y sin contenido optimizado.
- Sin **hubs temáticos** (cenotes, pueblos mágicos, cultura maya, flamencos).

### P1 — Consolidación y clusters
- **Slugs de categoría duplicados** (`eventos` vs `eventos-home`, `experiencias`/`experiencias-tours`/`tours`). Riesgo de fragmentación URL + canibalización.
- `/hoteles`, `/restaurantes`, `/experiencias` como landings globales vs territoriales — falta jerarquía canonical + interlinking.
- Blog vacío — pieza faltante para autoridad temática.
- Densidad baja de negocios/productos publicados (26/5) para sostener clusters.

### P2 — Optimización y estructura
- Rutas huérfanas fuera del sitemap (`/promociones`, `/que-hacer`, `/mapa`, `/convertir-en-anfitrion`, `/alux`).
- Cobertura de related territorial (destino → destinos cercanos).
- Uniformidad de `og:image` derivada de la primera imagen editorial en landings EB.

### P3 — Higiene
- Reseñas públicas como superficie propia.
- `/viajero/{handle}` — política de indexado explícita.
- Retirar terminología `/marketplace` cuando N2.4/N2.5 lo permitan.
- Preparar deuda i18n (hreflang + subrutas por idioma) para lanzamiento internacional (memoria `founder-i18n-seo`).

---

## 13. Riesgos

| Riesgo | Impacto | Mitigación futura |
|---|---|---|
| Thin content en destinos vacíos (Ek Balam, Las Coloradas) | Google los degrada y arrastra al hub `/oriente-maya` | Bloquear indexado hasta ≥N entidades o poblar con guía editorial |
| Fragmentación de categorías por slugs duplicados | Divide autoridad y confunde canonical | Consolidar `business_categories` en migración semántica |
| Landings globales compitiendo con territoriales | Diluye señales | Definir canonical de familia + interlinking descendente |
| Publicación de landings `/p/{slug}` sin control SEO | Ruido en el sitemap | Regla EB: sólo publicar en sitemap si `chrome.seo` completo |
| Deuda i18n creciente si se agregan idiomas antes de hreflang | Duplicate content internacional | Ver `mem://policies/founder-i18n-seo.md` |

---

## 14. Recomendaciones (para futuras olas — **no implementar en esta fase**)

1. **SEO.A2 · Demand Landing Program** — inventariar 20–30 landings de intención con matriz `Keyword → Ruta → Entidad fuente → Bloques EB → Métricas objetivo`.
2. **SEO.A3 · Thematic Clusters** — modelar tabla ligera `thematic_clusters` (hub + spokes + relación con destinos/categorías/entidades).
3. **SEO.A4 · Category Consolidation** — deduplicar `business_categories` (eventos/experiencias/tours) y migrar `business_id → category_id` sin romper 301.
4. **SEO.A5 · Destino Chichén Itzá** — decidir si se modela como destino, POI cultural o landing curada (tres arquetipos posibles).
5. **SEO.A6 · Cenotes Hub** — hub + entidad `poi_cenote` reutilizando patrón `TourismListingSurface`.
6. **SEO.A7 · Editorial Blog Reactivation** — activar `/blog` con 5 guías evergreen antes de reindexar.
7. **SEO.A8 · Canonicals de familia** — establecer jerarquía canonical de `/hoteles` `/restaurantes` `/experiencias` respecto a las territoriales.
8. **SEO.A9 · Internal Link Density Report** — instrumentar métrica de enlaces internos por entidad en el DOS.

Cada iniciativa debe pasar por Blueprint + aprobación Founder antes de código, respetando `Founder Entity First SEO`, `Founder Discovery Standard`, `Navigation Blueprint v1.0` y el freeze de infraestructura.

---

## 15. Cierre

Valladolid.mx tiene un **motor SEO de clase profesional** y un **modelo canónico correcto**, pero opera hoy con **≤ 5 %** del contenido necesario para capturar la demanda real del Oriente Maya. La palanca no es técnica: es **publicar destinos icónicos, activar clusters temáticos y consolidar categorías**.

**Fin de la auditoría. Ninguna implementación autorizada por este documento.**