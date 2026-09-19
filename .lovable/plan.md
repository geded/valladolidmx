# Corregir imágenes y valores de secciones en el constructor

## Alcance autorizado
Corrección localizada del Experience Builder para que la plantilla aprobada se vea completa y el diálogo de cada sección muestre los mismos valores que ya renderiza la vista.

## Cambios
1. Ajustar el alto visible del lienzo con una medición estable del contenido real, manteniendo la altura del dispositivo como mínimo y evitando el ciclo de vibración anterior.
2. Mantener intactos el encuadre, proporción y `object-cover` de la plantilla Premium pública; sólo retirar el recorte artificial causado por el marco del constructor.
3. Completar en memoria las filas parciales del inspector con los valores aprobados del contrato antes de mostrarlas. Los valores guardados por el CMS siempre tendrán prioridad.
4. Al editar un valor completado, guardar la fila resultante mediante el autoguardado existente; no modificar ni publicar datos automáticamente al abrir el diálogo.
5. Añadir pruebas de regresión para altura del lienzo, filas parciales y selección de la sección Destinos.

## Preservación
- Sin cambios en la ruta pública, diseño, orden, encabezado, pie, Alux, Mi Viaje, mapas ni navegación.
- Sin nuevas plantillas, componentes paralelos, fixtures productivos, migraciones o publicación.
- La configuración CMS existente continúa siendo la autoridad y prevalece sobre cualquier valor por defecto.

## Validación
- Typecheck y pruebas específicas del constructor.
- Comparación del constructor con la Home pública en 1440, 834, 430 y 390 px.
- Verificar Destinos y una segunda plantilla compuesta para confirmar que no hay recortes, vibración ni valores vacíos.
