# Declaración de derechos en la subida de destinos

## Alcance y autoridad

Corrección localizada autorizada por el Founder: el editor declara fotografías propias o permiso y atribución durante la subida; fotos reales completas no esperan aprobación administrativa.

Familia afectada: formulario CMS de destinos, portada y galería. Ruta de edición: `/cms/destinos/:destinationId/editar`. Lectura pública comprobada: `/oriente-maya/valladolid`. Fuente: `media_assets` y `destination_media`; filtro público existente: `isAccreditedDestinationMedia`. No se modificaron renderer público, contrato de plantilla, preset ni preview del Experience Builder.

## Implementación

- Formulario reutilizable sobre SinglePanel/GalleryPanel, activado en destinos. No certifica todavía otros módulos.
- Propiedad/permiso, autor, procedencia, licencia, ALT y confirmación explícita. Selección de naturaleza documental/IA/conceptual; la naturaleza de resultados generados por Alux queda bloqueada como IA.
- Resultados de búsqueda con distintos autores/licencias solicitan declaración por foto, no heredan el crédito del primer resultado.
- Servidor autenticado comprueba rol editorial, destino existente, carpeta del destino, tamaño y SHA-256 del archivo almacenado. Ignora estados/revisores recibidos del cliente y registra actor, fecha y auditoría.
- Fotografía documental completa se registra acreditada y publicada; IA/conceptual permanece borrador sin reemplazar portada ni asociarse como fotografía pública.
- Encuadre, evaluación/ampliación y derivación WebP siguen en su flujo existente. Originales existentes, datos editoriales, revisión administrativa de otros medios, mapas, Alux y Mi Viaje no se modificaron.

## Verificación y límites

- 7 pruebas nuevas de reglas, 16 pruebas de subida/atribución/protección existentes y 15 pruebas de fotos ligeras: PASS, usando Bun o Vitest según la suite.
- Última señal automática de compilación: build OK.
- Sesión del Founder: selección de una foto existente, encuadre, bloqueo de confirmación incompleta, habilitación con permiso completo y cancelación sin registrar nuevas fotos. Formulario comprobado a 1440/834/430/390, sin desborde interno.
- Valladolid público a esos cuatro tamaños: 31 imágenes y sin desborde horizontal. Comparación del primer viewport a 390: idéntica en estado visitante; capturas de otros tamaños muestran diferencias por controles de sesión/carga. No constituye una regresión visual completa de toda la plantilla.
- **Pendiente:** subida nueva con una cuenta editor, lectura pública posterior y comprobación de las variantes de ese nuevo archivo. No se ejecutó para evitar duplicar/modificar fotos reales del destino. No se certifica aún ese recorrido ni Preservation Gate completo de todas las superficies.
- No se cambiaron esquemas, políticas RLS, datos existentes, publicaciones ni permisos generales. No se ejecutó IA pagada.

## Reversibilidad

Retirar la activación de declaración en DestinationMediaPanels y devolver el registro de destinos a su comportamiento anterior revierte el delta de código. No borrar ni alterar originales o acreditaciones históricas. La reversión vuelve a dejar fotos nuevas sin acreditación automática; el filtro público debe conservarse.

## Estado

Scope Gate: delta limitado a subida de destinos, componentes compartidos opt-in, validador, pruebas y documentación; metadata de la ruta CMS completada sin cambiar contenido público. Preservation Gate completo y publicación automática end-to-end: pendientes. No publicado en este turno.