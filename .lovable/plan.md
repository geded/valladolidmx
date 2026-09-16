# Alux asistente de alta de fichas en el CMS

Objetivo: que al crear o editar una ficha (lugar, sitio de interés, hotel, restaurante, evento, producto, ruta), el editor escriba el nombre, el destino y la zona, y Alux proponga el contenido completo de la ficha y fotografías candidatas. El editor aprueba, corrige o descarta. Nada se guarda ni se publica solo.

Se construye como delta mínimo sobre lo que ya existe: los editores actuales, el selector de medios gobernado, el optimizador de imágenes, Alux IA de ampliación y el asistente de textos alternativos. Sin plantillas nuevas, sin editores paralelos, sin publicar.

## Parte 1 · Alux propone el contenido de la ficha

En la cabecera del editor aparece un acceso "Completar con Alux". Al pulsarlo, Alux toma lo que ya está capturado (nombre, destino, zona, tipo de ficha) y devuelve una propuesta campo por campo:

- Nombre oficial, descripción corta y descripción larga en tono editorial de la marca.
- Categoría y tipo sugeridos dentro de los catálogos existentes (nunca inventa uno nuevo).
- Horarios, teléfono, sitio web y redes cuando la fuente los indique.
- Coordenadas aproximadas para el mapa, que el editor confirma arrastrando el pin.
- Título y descripción para buscadores.

Cada dato llega con su origen visible y un control de tres opciones: aceptar, corregir o dejar vacío. Los campos que Alux no pueda acreditar quedan vacíos con la nota "sin fuente"; nunca se rellenan por aproximación. Nada se escribe en la ficha hasta que el editor pulsa Guardar, como hoy.

Fuente: Google, como pediste. La ficha de Google (Places) es la mejor fuente para nombre oficial, dirección, teléfono, sitio web, horarios y coordenadas exactas del lugar. Una salvedad comprobada: la clave de Google que hoy usa la plataforma sólo está habilitada para mapas, geocodificación y rutas; la búsqueda de lugares está bloqueada. Para activarla hace falta habilitar Places en la cuenta de Google de Valladolid.mx y guardar esa clave en el proyecto. Es un trámite de minutos y el consumo se factura por consulta a esa misma cuenta.

Mientras no esté habilitada, el asistente redacta las descripciones a partir del nombre, destino y zona, y deja vacíos teléfono, horarios y coordenadas en vez de suponerlos.

## Parte 2 · Alux propone fotografías

Desde el mismo editor, en portada y galería, un acceso "Buscar fotos con Alux" usa los datos de la ficha para traer candidatas.

Sólo se buscan en acervos de licencia libre verificable (Wikimedia Commons y Openverse). Cada resultado muestra autor, licencia y enlace a la fuente, y el editor marca cuáles usar. No se descargan fotos de buscadores, redes ni portales de viajes: no son de uso libre y exponen legalmente a la plataforma.

Al elegir una foto, entra por el mismo camino gobernado que hoy:

1. Se optimiza automáticamente al seleccionarla, con el techo de peso y medidas ya definidos.
2. Si queda por debajo del tamaño recomendado del uso, se ofrece ampliarla con Alux IA, como ya ocurre al subir desde el equipo.
3. Se guarda el original inmutable con su autoría y licencia, y se generan las variantes.
4. Alux propone el texto alternativo, que el editor aprueba.

Fotografía propia sigue siendo la vía preferente; esta búsqueda es apoyo para fichas sin material.

## Qué se preserva

Plantillas Premium, marca, navegación territorial, breadcrumbs, permisos, flujo editorial, biblioteca de medios, optimizador y pipeline de imágenes quedan intactos. Los únicos cambios visibles son los dos accesos dentro de los editores del CMS y las pantallas de revisión de propuestas. Sólo editores y administradores; el Portal Empresarial no lo ve.

## Detalle técnico

1. `src/lib/cms/alux-autofill.functions.ts` (nuevo, server-only)
   - `aluxDraftEntity({ entityKind, name, destinationSlug, zoneSlug? })`: verifica `is_editor_or_admin`, resuelve el catálogo vigente de categorías/tipos, consulta el buscador si la clave está configurada, y llama al gateway con salida estructurada `{ fields: [{key, value, confidence, sourceUrl|null}] }`. Prohíbe valores fuera de catálogo y exige `sourceUrl` para datos de contacto y horarios.
   - `aluxFindPhotos({ query, destination, entityKind })`: consulta Wikimedia Commons y Openverse, normaliza `{ url, width, height, author, license, sourceUrl }`, filtra licencias no comerciales y tamaños insuficientes.
2. `src/components/cms/AluxAutofillDialog.tsx` (nuevo): revisión campo por campo con aceptar/corregir/omitir; devuelve un parche al formulario del editor sin tocar su estado guardado.
3. `src/components/cms/AluxPhotoFinderDialog.tsx` (nuevo): resultados con licencia y autor, selección múltiple, y entrega al flujo actual reutilizando `optimizeForRole`/`evaluateRoleFit` de `src/lib/cms/image-upload.ts`, `aluxUpscaleImage` y la subida firmada de `MediaPickerDialog`. Autoría y licencia se persisten en `media_assets.metadata`.
4. Conexión mínima en los editores existentes (`PlaceEditor`, `BusinessEditor`, `EventEditor`, `ProductEditor`, `EditorialRouteEditor`) y en los paneles de medios ya presentes: un botón por superficie, sin reestructurar los formularios.
5. Secreto `WEB_SEARCH_API_KEY` sólo si se aprueba la búsqueda en vivo; sin él, la función responde con propuesta sin fuentes y la interfaz lo advierte.
6. Validación: `bunx tsgo --noEmit`, pruebas contractuales existentes, `git diff --check`, recorrido con sesión administrativa en 1440 / 834 / 430 / 390 px sobre un lugar, un restaurante y un evento. Sin publicar.
