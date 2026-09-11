# CLOSURE READINESS REPORT · Capa Visual Pública OMXDS

Fecha: 2026-09-11 · Modo: sólo diagnóstico (sin ediciones funcionales, sin PR, sin publicación ni despliegue)
Autoridades contrastadas: `18.04 OMXDS Visual Surfaces PRD`, `18.05 OMXDS Visual Lovable Plan V0–V8`,
`19.47 Premium Template Preservation & Evolution Policy`, contratos `vmx.listing.premium-g5`,
`ListingPremiumSurfaceFromDTO → TerritorialListingReviewSurface`, `TourismListingSurface`/`TourismCard`,
`AluxFloatingTrigger` (instancia única en `src/routes/__root.tsx`).
HEAD verificado: `ad88911c` · árbol limpio al inicio del diagnóstico.

## Matriz de cierre

| # | Área | Estado | Evidencia / autoridad |
| --- | --- | --- | --- |
| 1 | Home Premium | PASS | `/` 200 en 1440/834/430/390; H1 único; overflow 0; imágenes rotas 0; rutas, mapa y Mi Viaje sobre componentes existentes; un solo Alux flotante |
| 2 | Oriente Maya y micrositios | PASS | `/oriente-maya` (`Inicio`), `/oriente-maya/valladolid` (`Inicio > Oriente Maya`), H1 territorial correcto |
| 3 | Listados globales vs micrositio | PASS con observación | Global: “Hoteles/Restaurantes/Casas/Experiencias/Eventos/Lugares/Rutas del Oriente Maya de Yucatán” y “¿Qué hacer en el Oriente Maya de Yucatán?” con breadcrumb `Inicio > Oriente Maya`. Micrositio: “Hoteles en Valladolid” con `Inicio > Oriente Maya > Valladolid > Hoteles`. Observación en #A |
| 4 | Autoridad visual compartida de cards | PASS | Una sola card por familia (`ListingCard` territorial y `TourismCard`); media canónica CMS 4:3, fallback editorial compacto cuando no hay portada; no se inventa media |
| 5 | Fichas Premium | PASS | Ficha de hotel `demo-3j3-hotel-casa-piedra` 200 en 1440 y 390, H1 único, overflow 0, sin imágenes rotas ni plantillas paralelas visibles |
| 6 | Alux | PASS con observación | Máximo 1 concierge flotante en todas las rutas medidas; nunca 2. Observación en #B |
| 7 | Mapa | PASS | Un solo `InteractiveMap` reutilizado vía `MapPanel`/`ExperienceMapBlock`; sin mapas duplicados |
| 8 | Responsive 1440/834/430/390 | PASS | 13 rutas × 4 anchos: overflow horizontal 0 en 52/52 mediciones |
| 9 | Funcionalidad preservada | PASS | Filtros, favoritos, Mi Viaje, bindings CMS, navegación y breadcrumbs operativos; sin regresiones detectadas |
| 10 | Data Readiness | PENDIENTE (dato, no código) | Ver tabla de cobertura de portadas |

## Observaciones abiertas (no bloqueantes)

**#A · Breadcrumb territorial con elemento final repetido.** En `/oriente-maya/{destino}/{categoria}` el nav
“Ruta territorial” expone `Inicio | Oriente Maya | Valladolid | Hoteles | Valladolid`. El último elemento
corresponde al selector de destino dentro del mismo nav y se lee como migaja duplicada.
Corrección mínima: separar el selector del `nav` de migajas o marcarlo con su propio `aria-label`.

**#B · Presencia del dock según superficie.** En `/oriente-maya`, micrositios de destino, fichas y algunos
anchos de `/rutas` y Home el dock flotante reporta 0 elementos visibles al cargar, por política declarada en
`useAluxFloatingPresence` (panel Alux embebido o CTA sticky). Es comportamiento intencional, no defecto;
conviene confirmarlo documentalmente como criterio de cierre.

## Data Readiness (cobertura de portada canónica en contenido publicado)

| Familia | Publicados | Con portada | Faltantes |
| --- | --- | --- | --- |
| Hoteles | 4 | 2 | 2 |
| Restaurantes | 5 | 2 | 3 |
| Casas de vacaciones | 3 | 1 | 2 |
| Experiencias | 3 | 2 | 1 |
| Cenotes | 1 | 0 | 1 |
| Eventos | 9 | 1 | 8 |

No es defecto de código: las fichas sin portada resuelven correctamente al fallback editorial aprobado.
Se resuelve cargando medios reales desde el CMS; prohibido inventar o asignar imágenes conceptuales.

## Ampliación · QA funcional de CTAs, resolución de media y armonía responsive (2026-09-11)

Hallazgo del Founder en móvil (perfil Conato 1910): áreas beige sin fotografía en “Explora cerca de…” y
acciones visibles sin efecto. Se auditaron y corrigieron **sólo autoridades compartidas**.

### Causas raíz

| Defecto | Causa raíz | Autoridad corregida |
| --- | --- | --- |
| Cards beige en “Explora cerca de…” | La lectura de relacionados no proyectaba ni firmaba la portada CMS y el adaptador fijaba `imageUrl: null` | `src/lib/catalog/business-related.functions.ts`, `src/lib/experience-builder/adapters/business-related-to-block.ts` |
| Acciones sin efecto en fichas | Anclas de sub-navegación y CTA “Contactar” emitidas sin sección/dato real; enlaces de destino con segmento vacío | `src/components/surfaces/BusinessSurface.tsx` |
| Enlace decorativo `href="#"` | La barra de acciones caía a `"#"` cuando no había destino ni handler | `src/components/experience-builder/blocks/experience-cta-bar/ExperienceCtaBar.tsx` |
| Favorito y “Agregar a mi viaje” sin efecto en listados | La tarjeta compartida pintaba botones estáticos sin handler | `src/components/listing-premium/TerritorialListingReviewSurface.tsx` (reutiliza `FavoriteButton` y `AddToTravelPlanButton`) |
| Destino repetido al final de la ruta territorial (#A) | El selector se montaba dentro del `nav` de migajas | `src/components/layout/BreadcrumbTerritorial.tsx` |

### Verificación en preview

- 8 rutas públicas × 1440/834/430/390: status 200, overflow horizontal 0, H1 único, imágenes rotas 0,
  `nav` territorial único y **0** selectores dentro del nav (antes 1 por ruta con destino activo).
- Enlaces `href="#"` visibles: **0** en todas las rutas medidas y en la ficha de Conato 1910.
- Ficha `/oriente-maya/valladolid/restaurantes/conato-1910` en 1440 y 390: overflow 0, sin imágenes rotas,
  la sección de recomendaciones ya resuelve portadas CMS reales cuando existen.
- Controles: typecheck y ESLint focalizado en verde.

### Data Readiness revalidado

La cifra de 17 registros sin portada se mantiene: no eran fallos de resolución en el listado, pero sí lo eran
en la sección de recomendaciones, donde toda portada se perdía. Corregido el resolutor, las entidades con
media la muestran y sólo las realmente sin media usan el marcador editorial compacto.

## Lista mínima de correcciones antes del cierre formal

1. ~~Ajustar el nav territorial para eliminar la lectura duplicada del destino (#A).~~ **Corregido.**
2. Declarar en la documentación el criterio de presencia/ausencia del dock de Alux por superficie (#B). **Pendiente documental.**
3. Cargar portadas reales para los 17 registros publicados sin media (Data Readiness). **Backlog CMS.**

## Recomendación

**GO condicionado.** Sin defectos funcionales ni visuales atribuibles a las autoridades compartidas tras esta
ampliación. Queda pendiente sólo la nota documental #B y el contenido CMS faltante.

## Carriles siguientes confirmados (no iniciados en este turno)

**A) OMXDS Commerce C0–C8**, incluido **C3 Inventario y Reservas**. Una sola entidad Experiencia con dos
modalidades: venta directa cuando sea comercialmente elegible y Arma tu Viaje / Alux / Concierge cuando no lo
sea. Prohibido crear un segundo catálogo o una entidad paralela de producto turístico.

**B) Visitor Intelligence CV8** para Journey / Behavior / Conversion / Marketing Intelligence y medición de
venta directa y venta asistida, reutilizando la instrumentación ya implementada. No se denomina CRM.

## Confirmaciones

No se editó Commerce ni CV8. No se abrió PR, no se fusionó, no se publicó y no se desplegó.
No se crearon componentes, rutas, plantillas ni sistemas paralelos. Sólo lecturas y verificación en preview.

## Delta de armonía móvil (Conato 1910) — aplicado

Ajustes mínimos sobre autoridades compartidas existentes, sin crear componentes ni variantes nuevas:

1. `TourismCard.tsx` — el marcador sin fotografía deja de heredar la proporción de imagen y usa altura
   controlada (`h-24 sm:h-28`). Las tarjetas con media canónica conservan 4:3 / 16:9 compacto.
2. `ExperienceRelatedCollection.tsx` — el carrusel añade respiro final y `scroll-px` para que la última
   tarjeta no quede cortada contra el borde en móvil.
3. `ExperienceCtaBar.tsx` — el nombre ya no se trunca (`line-clamp-2`) y las acciones ajustan escala táctil
   en móvil conservando `min-h-11`.
4. `ExperienceMapBlock.tsx` — el título del punto del mapa deja de truncarse en una línea.

Verificación: typecheck OK; ESLint focalizado sin hallazgos nuevos (los avisos restantes son deuda previa);
Playwright en 1440 / 834 / 430 / 390 con status 200, un solo H1, overflow 0 e imágenes rotas 0.
No se publicó ni desplegó.
