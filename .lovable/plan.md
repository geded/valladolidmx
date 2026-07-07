
# Plantilla · Destino editable en Studio

Objetivo: que `__tpl_destination__` se edite en Studio igual que la Home (arrastrar bloques, cambiar textos/imágenes/botones, ocultar, reordenar), manteniendo el render dinámico por destino (Valladolid, Izamal, Espita, futuros) sin duplicar plantillas ni perder capacidades actuales.

Regla base: **una sola plantilla compartida**. El diseño se edita una vez en Studio; el contenido de cada destino se sigue editando en CMS → Destinos.

---

## Estado actual (diagnóstico)

- `src/lib/experience-builder/adapters/destination-to-blocks.ts` arma en código: Hero, Badges, Galería, Mapa, Features, Discovery Navigator, Related, CTA.
- El bloque público es un único **resolver** `vmx.surface.destination` que consume esos bloques a partir del slug del destino.
- Studio no expone campos porque la plantilla no tiene composición guardada en `page_compositions`; sólo tiene el resolver.
- Contenido por destino ya vive en `destinations`, `destination_media`, `destination_zones`, `business_categories`, `businesses`, `points_of_interest`.

---

## Enfoque

Reemplazar la receta en código por una **composición real** en `page_compositions` cuyos bloques usen **variables dinámicas** (`{{destination.*}}`) para leer el contenido de cada destino en tiempo de render.

Se aprovecha lo que ya existe: `page_compositions`, biblioteca oficial de bloques H-03, `dynamic-variables.ts`, Studio Visual/Profesional, `TourismListingSurface`.

No se crea infraestructura nueva (respeta *Infrastructure Freeze* y *Single Studio Principle*).

---

## Alcance por olas (una a la vez, con validación visual del Founder entre cada una)

### Ola D1 — Contrato de variables de destino
- Definir el catálogo oficial de tokens: `{{destination.name}}`, `{{destination.tagline}}`, `{{destination.description}}`, `{{destination.hero_image}}`, `{{destination.gallery[]}}`, `{{destination.badges[]}}`, `{{destination.location}}`, `{{destination.categories[]}}`, `{{destination.featured_businesses[]}}`, `{{destination.map_center}}`, etc.
- Extender `dynamic-variables.ts` con el resolver de contexto "destino activo".
- Documentar en blueprint como parte de N-Destino.
- Sin cambios visuales todavía.

### Ola D2 — Composición semilla en `page_compositions`
- Crear la composición oficial `__tpl_destination__` en `page_compositions` con bloques oficiales H-03:
  - `vmx.experience.hero` (variant colonial, usa `{{destination.hero_image}}` y `{{destination.name}}`)
  - `vmx.experience.institutional-badges` (usa `{{destination.badges}}`)
  - `vmx.experience.gallery` (usa `{{destination.gallery}}`)
  - `vmx.experience.section` (descripción, `{{destination.description}}`)
  - `vmx.experience.features` (highlights)
  - `vmx.experience.discovery-navigator` (mapa + facets, ya migrado)
  - `vmx.experience.related-collection` (POIs / empresas destacadas)
  - `vmx.experience.cta` (planificador / Alux)
- Reproducir 1:1 la ficha actual de Valladolid como línea base visual.
- Migration incluye seed con la composición inicial.

### Ola D3 — Render dinámico por slug
- Cambiar el resolver de la ruta `/oriente-maya/:destino` para:
  1. Cargar composición `__tpl_destination__`.
  2. Cargar datos del destino por slug.
  3. Resolver variables dinámicas contra esos datos.
  4. Renderizar con los bloques oficiales (mismo runtime que Home).
- Fallback: si la composición no existe, sigue el resolver actual (rollback seguro).
- Retirar `destination-to-blocks.ts` sólo al validar D4.

### Ola D4 — Validación visual comparativa
- Comparar antes/después en Valladolid, Izamal, Espita (mobile 440px + desktop).
- Verificar que Discovery Navigator, mapa interactivo, "Ver detalles", "Cómo llegar" y "Compartir" siguen funcionando dentro del micrositio (sin salir).
- Verificar SEO (title, description, og:image por destino).
- Verificar breadcrumbs y navegación canónica del Navigation Blueprint v1.0.
- Cero regresiones = requisito.

### Ola D5 — Studio habilitado + retiro del resolver legacy
- Confirmar en Studio Visual: editar textos, cambiar bloques, ocultar, reordenar, agregar nuevos bloques oficiales.
- Publicar cambios → aplican a los tres destinos automáticamente.
- Retirar `destination-to-blocks.ts` y el bloque resolver `vmx.surface.destination` (o dejarlo como fallback deprecado por 1 versión).
- Completion Report + Demo Pack: URLs de los tres destinos, capturas antes/después, matriz de reutilización, ficha de madurez.

---

## Fuera de alcance

- Editar contenido específico de cada destino desde Studio (sigue en CMS → Destinos, por diseño).
- Plantillas independientes por destino.
- Editor de categorías, mapas o empresas dentro de Studio (esos son bloques oficiales, no formularios de datos).
- Cambios al Navigation Blueprint o al Discovery Standard.

---

## Detalles técnicos (referencia interna)

- Tabla: `page_compositions` (sin nuevas columnas).
- Nuevo tipo de contexto en `dynamic-variables.ts`: `destination`.
- Resolver de datos: reutiliza los queries actuales de `destination-to-blocks.ts` como `loadDestinationContext(slug)`.
- Server fn: `getDestinationComposition(slug)` — ensambla composición + contexto y devuelve al loader de la ruta.
- Migration SQL: seed de la composición `__tpl_destination__` con bloques y bindings dinámicos.
- Rollback: feature flag `use_editable_destination_template` (default true en D3, permite volver al resolver en un click si aparece regresión).

---

## Riesgos y mitigaciones

- **Regresión visual**: mitigada por D2 recreando 1:1 antes de retirar el código legacy y comparativa obligatoria en D4.
- **Rendimiento**: la composición añade una query, se mitiga con `ensureQueryData` en el loader y caché por slug.
- **Studio saturado**: sólo se exponen bloques oficiales H-03 ya migrados a DSL colonial; nada de bloques experimentales.
- **Cambios en Discovery Navigator**: se conserva como bloque oficial ya funcional — no se rediseña en esta épica.

---

## Duración estimada
5 olas cortas, una PR por ola, con validación visual del Founder entre cada una. Cada ola termina con typecheck + build + smoke + comparativa + demo funcional visible.
