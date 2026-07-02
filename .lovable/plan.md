Habilitar en el CMS Studio la creación, edición y galería múltiple de **Destinos**. Después replicamos el mismo patrón en Empresas y Productos como historias separadas.

## Alcance de esta historia (solo Destinos)

1. Botón **"Nuevo destino"** en `/cms/destinos` y enlace **Editar** por fila.
2. Formulario completo con: nombre, slug, región (selector), frase corta, descripción, coordenadas, colores del hero, highlights.
3. **Imagen destacada** (hero) — subir/reemplazar/quitar.
4. **Galería múltiple** — subir varias imágenes, reordenar drag & drop, borrar.
5. Flujo editorial existente: borrador → revisión → aprobado → publicado.

## Quién puede editar

- `super_admin`, `admin` y **editor de contenido** (`is_editor_or_admin` ya cubre estos roles vía política RLS existente).
- Los dueños de empresa no aplican a Destinos (son entidad territorial, no de negocio); su acceso llegará en la historia de Empresas.

## Detalles técnicos

### Base de datos (una migración)

- Nueva tabla `public.destination_media` (mismo patrón que `business_media`): `destination_id`, `media_asset_id`, `role` ('gallery'|'hero'), `sort_order`. GRANTs + RLS (`is_editor_or_admin` para escritura, público para lectura de destinos publicados).
- Políticas nuevas en `storage.objects` sobre el bucket **`destinations`** (ya existe, privado): SELECT público (para que las imágenes se vean en la web) y INSERT/UPDATE/DELETE para `is_editor_or_admin`.
- Ampliar la whitelist `EDITABLE_COLUMNS.destinations` en `src/lib/cms/writes.functions.ts` para incluir: `tagline`, `hero_palette`, `highlights`, `hero_media_id`, `latitude`, `longitude`.

### Server functions nuevas (`src/lib/cms/destinations-media.functions.ts`)

Todas con `requireSupabaseAuth` + `assertEditorial`:

- `listTourismRegionsForSelect()` — combo de regiones (id + nombre).
- `signDestinationImageUpload({ destinationId, filename, contentType })` — devuelve URL firmada de subida al bucket `destinations`.
- `registerDestinationMedia({ destinationId, storagePath, role, alt, mime, size, width, height })` — crea `media_assets` + fila `destination_media`. Si `role='hero'`, además hace UPDATE de `destinations.hero_media_id`.
- `reorderDestinationGallery({ destinationId, orderedIds })` — reasigna `sort_order`.
- `removeDestinationMedia({ destinationMediaId })` — borra la fila y opcionalmente el asset huérfano.

### UI (frontend)

- `src/components/cms/DestinationEditor.tsx` — envuelve `EntityEditor` con el `select` de región + panel de imagen destacada + panel de galería (grid con miniaturas, reordenar por botones arriba/abajo/eliminar, input de subida múltiple).
- `src/components/cms/ImageUploader.tsx` — componente reutilizable: subida directa al bucket vía URL firmada, muestra progreso, valida tamaño/tipo.
- Ampliar `EditorField` con tipo `"select"` (opciones estáticas) para el hero_palette.
- `src/lib/cms/editor-fields.ts` → añadir `DESTINATION_FIELDS`.
- Rutas nuevas:
  - `src/routes/_authenticated/cms/destinos.nueva.tsx`
  - `src/routes/_authenticated/cms/destinos.$id.editar.tsx`
- `src/routes/_authenticated/cms/destinos.tsx` → añadir `headerActions` con enlace "Nuevo destino" y columna con enlace "Editar".

## Fuera de alcance (historias separadas)

- Empresas y Productos con el mismo tratamiento.
- Componente reutilizable de galería con drag & drop nativo (aquí uso subir/borrar/reordenar por botones, más simple y accesible).
- Recorte y optimización server-side de imágenes.
- Editor rich text para `description` (por ahora textarea plano).

## Verificación

1. Aprobar migración → typecheck automático.
2. Como admin: crear destino de prueba, subir hero, subir 3 imágenes, reordenar, borrar una, publicar.
3. Verificar en la Home que el destino aparece con su hero.
4. Como usuario anónimo: intentar escribir en `destinations` vía Data API debe fallar.
