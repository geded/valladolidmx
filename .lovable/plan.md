## Diagnóstico del micrositio `/oriente-maya/valladolid`

Revisé la ruta (`src/routes/oriente-maya/$destino.index.tsx`), la superficie oficial (`DestinationSurface`) y la documentación vigente (`15.11-NAVIGATION-BLUEPRINT-v1.0`, `15.10.H-03-EPICA-1-I3a-DESTINATION-SURFACE-CLOSURE`, `16.09-U-VISUAL-V1-DESTINATION-PARITY`, `mem://policies/founder-discovery-standard`). El micrositio SÍ está compuesto con la Plantilla Madre oficial (Hero + Badges + Subnav + Section + InfoGrid + RelatedCollection), pero los 4 síntomas que describes son reales y tienen causa distinta:

### 1. "No aparecen negocios" — es un problema de **datos**, no de código
El bloque `vmx.experience.related-collection` lee `getDestinationRelated({slug:"valladolid"})`. Hoy devuelve 0 hoteles / 0 restaurantes / 0 experiencias publicados asociados al destino Valladolid, por eso muestra el `emptyMessage`. El código funciona; falta contenido publicado con `destination_slug = valladolid` en Lovable Cloud.

### 2. "No veo los mapas" — **V4.2 aún no está ejecutada**
V4.1 sólo creó el bloque `vmx.experience.map` y su preview. El micrositio de destino todavía **no monta** el bloque. Está en la planificación V4.2 aprobada.

### 3. "No hay galería tipo Airbnb" — **capacidad nueva**, no existe
La `DestinationSurface` no compone hoy un bloque de galería. La biblioteca oficial tiene `experience-gallery` (I1.c, L4) pero nunca se cableó en la Plantilla Madre de destino. Es alcance nuevo.

### 4. "Imagen sin puntas redondeadas / poco profesional"
El Hero de destino usa `variant` estándar del `experience-hero`. Necesita ajuste de contenedor + radios DSL (`rounded-2xl`, `shadow-elevated`) y grid tipo Airbnb (1 imagen grande + 4 chicas above-the-fold).

---

## Propuesta: V4.2 · Destino Airbnb-Style (una entrega, foco Valladolid)

Alcance quirúrgico sobre la **Plantilla Madre `DestinationSurface`** — sin motores paralelos, sin duplicar bloques, respetando Founder Discovery Standard y Compatibilidad Evolutiva.

### A. Galería Airbnb-style above-the-fold (NUEVO en destino)
- Reusar el bloque oficial `vmx.experience.gallery` (ya existe, L4) con nueva `variant: "airbnb-grid"` (1 hero + 4 tiles + "Ver todas las fotos"). Sin crear bloque nuevo — evolución por variant, conforme H-03.
- Adaptador `destinationToGalleryDTO` en `destination-to-blocks.ts` leyendo `db.media[]` (o mock/placeholder si vacío).
- Radios DSL: `rounded-2xl` + `shadow-soft`, gap 8px, esquinas redondeadas siempre visibles.
- Reemplaza al Hero actual como primer bloque above-the-fold (el Hero pasa a modo compacto para título/tagline/badges).

### B. Mapa territorial (V4.2 del Founder Discovery Map Principle)
- Montar `ExperienceMapBlock` con `variant: "multi"` en la sección "Ubicación" del micrositio.
- Adaptador `destinationToMapDTO`: centro = `db.latitude/longitude`, puntos = `related.hoteles + restaurantes + experiencias` que tengan geocode (vía `businessToMapPoint`).
- Ancla `#ubicacion` añadida al subnav.
- Fallback vacío elegante si no hay puntos aún.

### C. Datos demo Valladolid (Demo Pack)
Migración `seed` con contenido demo marcado (`is_demo=true`) para que el micrositio no aparezca vacío:
- 3 hoteles, 3 restaurantes, 2 experiencias, 1 evento, todos con lat/lng, cover, tagline.
- Cumple Demo Pack Policy vigente. Retención hasta autorización explícita del Founder.

### D. Polish visual Hero de destino
- Aplicar radios DSL y sombras `shadow-elevated`.
- Contenedor con `max-w-7xl` y padding responsive.
- Alineación tipográfica igual a Airbnb Experiences (título grande, meta chips debajo).

### Fuera de alcance (queda para después)
- Cluster/`list-sync` del mapa (V4.3).
- Reviews block, wishlist, calendario en vivo.
- Galería con lightbox modal completo (esta entrega usa navegación a `/oriente-maya/valladolid/galeria` como stub o a la propia galería expandida).

---

## Detalles técnicos

- **Archivos a crear**: `experience-gallery/variants/airbnb-grid.tsx` (variante interna, mismo bloque), `adapters/destination-to-blocks.ts` (extender con `toGalleryDTO`+`toMapDTO`), 1 migración seed.
- **Archivos a editar**: `DestinationSurface.tsx` (agregar Gallery arriba, Map en `#ubicacion`), `experience-hero` variant compacto, `subnav` DTO con nuevo ancla.
- **Sin cambios en contratos** de bloques existentes → Compatibilidad Evolutiva OK.
- **Typecheck + build + smoke** obligatorios en la entrega.
- **Completion Report** V4.2 con matriz de reutilización y comparativa antes/después.

---

## Preguntas para el Founder antes de iniciar

1. ¿Autorizas la variante `airbnb-grid` en `vmx.experience.gallery` (evolución, no bloque nuevo)?
2. ¿Autorizas seed demo de negocios para Valladolid (Demo Pack retenido hasta tu OK)?
3. ¿Ejecutamos V4.2 como una sola entrega (A+B+C+D) o prefieres separar el mapa (B) del rediseño visual (A+D)?
