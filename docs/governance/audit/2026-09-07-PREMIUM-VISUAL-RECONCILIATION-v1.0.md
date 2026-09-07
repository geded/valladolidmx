# Reconciliación visual Premium integral

Fecha: 2026-09-07  
Rama: `reconciliation/premium-visual-authority-20260907`  
Estado: implementación y controles automáticos completos; revisión visual remota pendiente

## Autoridad y alcance

La reconciliación usa como autoridad las plantillas Premium aprobadas y la política
`19.47-PREMIUM-TEMPLATE-PRESERVATION-AND-EVOLUTION-POLICY-v1.0`. No crea una
segunda plantilla ni importa una rama histórica completa. Los datos publicados del
CMS siguen siendo la única fuente de contenido; no se ejecutan escrituras, migraciones,
cambios de permisos, pagos, reservaciones ni despliegues.

## Matriz de superficies

| Superficie | Ruta pública | Autoridad de render | Resultado contractual |
| --- | --- | --- | --- |
| Home Premium | `/` | `HomePremiumSurface` | PASS |
| Oriente Maya | `/oriente-maya` | `RegionDestinationsPremiumSurface` | PASS |
| Destino | `/oriente-maya/{destino}` | `DestinationPremiumSurface` | PASS |
| Hoteles | `/hoteles` y ruta territorial | `ListingPremiumSurfaceFromDTO` → `TerritorialListingReviewSurface` | PASS |
| Restaurantes | `/restaurantes` y ruta territorial | misma autoridad de listado Premium | PASS |
| Casas de vacaciones | `/casas-de-vacaciones` y ruta territorial | misma autoridad de listado Premium | PASS |
| Experiencias y tours | rutas de producto y territoriales | `ExperiencePremiumSurface` | PASS |
| Eventos | listado y `/eventos/{slug}` | listado Premium + `EventPremiumSurface` | PASS |
| Lugares | listado y ficha territorial | listado Premium + `PlacePremiumSurface` | PASS |
| Qué hacer | `/que-hacer` | listado Premium con overrides editoriales | PASS |
| Hotel, restaurante y casa vacacional | ficha territorial de empresa | `BusinessSurface` + adaptador de familia Premium | PASS contractual; visual remoto pendiente |
| Marca CMS | `/cms/marca` | configuración `brand.identity` protegida por servidor | PASS |

## Defectos reconciliados

- La ficha Premium dejó de componer dos colecciones genéricas heredadas. Usa una sola
  continuidad contextual compacta, de máximo cuatro elementos, bajo el título
  “Explora cerca de…”.
- Las tarjetas compactas sin imagen usan un fallback editorial de relación 16:9 y altura
  acotada; no aparecen marcos gigantes vacíos.
- El CTA de la ficha Premium se integra al flujo de la página y deja de cubrir contenido
  en iPad y móvil.
- La página de Marca nunca desapareció ni perdió datos. Se recuperó su enlace en el
  registro de navegación del CMS y se conserva la autorización efectiva de
  `super_admin/admin` en las funciones de servidor.

## Controles ejecutados

| Control | Resultado |
| --- | --- |
| TypeScript `--noEmit` | PASS |
| Lint baseline (sin deuda nueva) | PASS |
| Build de producción | PASS |
| Contratos verticales y Premium de negocio | PASS · 16/16 |
| Autoridad, rutas, listados, lugares y runtime Premium | PASS · 98/98 |
| Inventario de rutas | PASS · 249 rutas |
| Revisión 390/834/1440 | PENDIENTE · el navegador seguro bloquea `localhost`; no se declara PASS sin evidencia |
| Governance completo | PASS · inventarios sincronizados, PCA-2026-071 y revisiones acreditadas |

## Condición de merge

No se fusiona a `main` mientras la revisión visual remota y Governance no estén en PASS.
La rama temporal se conserva después del proceso y no se publica ni despliega el sitio.
