# Optimización pública de imágenes · 2026-10-22

## Delta autorizado
Entrega de variantes existentes mediante `resolveMediaSource`, conectadas aditivamente a los contratos y renderers vigentes. Listados territoriales, Home/smart blocks, destinos/vecinos, rutas, experiencias, eventos, lugares, productos relacionados y logotipos conservan sus URLs originales y medios seleccionados. No se cambió el editor, datos, permisos, subidas, mapas, Alux, Mi Viaje ni publicación.

## Autoridad y alcance
Se preservaron las superficies Premium existentes y sus contratos compartidos; no hay renderers alternativos. El interruptor global existente controla la entrega; sin variantes listas se conserva el original. No se regeneraron fotos ni se alteraron binarios originales.

## Evidencia
- 15 pruebas de contratos de variantes/subida y 50 pruebas de acreditación/reemplazo seguro/conexión pública de lugares: PASS.
- Construcción automática: último registro `build OK`, 04:23:32 UTC.
- 36 recorridos de nueve rutas en 1440/834/430/390: cero errores de página, cero desbordamientos; cero peticiones de fotos originales detectadas en esta muestra después de los cambios finales.
- Rutas: `/`, `/hoteles`, `/restaurantes`, `/oriente-maya/valladolid`, `/rutas`, `/rutas/ruta-sukin`, `/experiencias`, `/producto/cena-romantica-en-cenote`, `/oriente-maya/valladolid/hoteles/hotel-sutuk`.
- Recorrido adicional `/eventos`, `/experiencias`, Hotel Sutuk: 4/4/11 imágenes derivadas, cero imágenes completadas rotas, cero errores y cero respuestas fallidas de variantes.
- Capturas completas por tramos y comparaciones antes/después en `/tmp/browser/optimize-all/`. Encabezado, fotos, orden, navegación, mapas y pie permanecen en la misma autoridad visual.

## Subida existente
Empresas, productos, destinos, zonas, galería del portal, biblioteca y selector compartido llaman al proceso existente en segundo plano. Rutas y eventos usan `EntityEditor` → `MediaIdField` → `MediaPickerDialog`; no requieren ni se añadió un segundo proceso. Fotos pequeñas o derivaciones fallidas conservan el original. Esta entrega no repite una subida autenticada real ni certifica todos los registros individualmente.

## Límites y preservación
Scope Gate: delta limitado a transporte y contratos de imágenes, más pruebas/documentación. Comparación visual sin rediseño; hay variaciones de altura entre capturas en mapas/elementos que terminan de cargar, también variables entre recorridos finales. No se declara una comparación pixel-perfect ni aceptación humana de todas las plantillas. Las vistas autenticadas del constructor no fueron comparadas en este cierre. No se declara velocidad universal ni cobertura exhaustiva de todas las URLs: los resultados corresponden a las rutas concretas anteriores. Zonas tienen subida compartida; no se creó un listado de fotos que no existía.

## Rollback
Desactivar el mismo `media_pipeline_enabled` revierte la entrega a originales sin modificar medios ni selección editorial. No se publicó el proyecto.
