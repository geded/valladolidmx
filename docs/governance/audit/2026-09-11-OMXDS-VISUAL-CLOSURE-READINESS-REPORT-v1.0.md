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

## Lista mínima de correcciones antes del cierre formal

1. Ajustar el nav territorial para eliminar la lectura duplicada del destino (#A).
2. Declarar en la documentación el criterio de presencia/ausencia del dock de Alux por superficie (#B).
3. Cargar portadas reales para los 17 registros publicados sin media (Data Readiness).

Ninguna de las tres es bloqueante de código. Las dos primeras son deltas mínimos sobre autoridad existente;
la tercera es contenido.

## Recomendación

**GO condicionado.** La capa visual pública OMXDS puede declararse cerrada una vez aplicadas #A y #B y
registrada la carga de portadas como tarea de contenido en curso. No se detectaron BLOQUEANTES de código,
plantillas paralelas, cards duplicadas, mapas duplicados, doble Alux ni overflow.

## Carriles siguientes confirmados (no iniciados en este turno)

**A) OMXDS Commerce C0–C8**, incluido **C3 Inventario y Reservas**. Una sola entidad Experiencia con dos
modalidades: venta directa cuando sea comercialmente elegible y Arma tu Viaje / Alux / Concierge cuando no lo
sea. Prohibido crear un segundo catálogo o una entidad paralela de producto turístico.

**B) Visitor Intelligence CV8** para Journey / Behavior / Conversion / Marketing Intelligence y medición de
venta directa y venta asistida, reutilizando la instrumentación ya implementada. No se denomina CRM.

## Confirmaciones

No se editó Commerce ni CV8. No se abrió PR, no se fusionó, no se publicó y no se desplegó.
No se crearon componentes, rutas, plantillas ni sistemas paralelos. Sólo lecturas y verificación en preview.
