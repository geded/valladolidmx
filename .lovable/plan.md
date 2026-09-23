# Cabecera profesional para la Biblioteca multimedia

## Objetivo
Ordenar la parte superior de **Media** para trabajar grandes volúmenes de imágenes con una jerarquía clara inspirada en la usabilidad de Airbnb, sin copiar su identidad visual y sin quitar ninguna función existente.

## Scope Gate
El cambio se limita a la cabecera y controles superiores de `/cms/media`:

- Título, descripción y cantidad total de imágenes.
- Buscador.
- Filtros de alcance, estado y uso.
- Acciones “Subir imágenes IA” y “Lote IA”.
- Adaptación de esa zona en escritorio, iPad y celular.

No se cambiarán la tabla, la ficha de edición, datos, estados, permisos, aprobaciones, carga de archivos ni superficies públicas.

## Preservation Gate
Se mantienen intactos:

- Las 60 imágenes y cualquier contenido real del CMS.
- Todos los filtros y sus valores actuales.
- Búsqueda, paginación, subida y procesamiento por lote.
- Ficha completa, edición, derechos, revisión y aprobación.
- Menú lateral, Workspace, roles y seguridad.
- Tokens y lenguaje visual Valladolid Colonial/OMXDS.

## Implementación

1. Crear una cabecera compacta con el título y un indicador visible del total de imágenes.
2. Colocar las acciones principales juntas y con prioridad clara: subir imágenes como acción principal y lote como secundaria.
3. Convertir búsqueda y filtros en una barra de trabajo ordenada:
   - buscador amplio;
   - grupo “Biblioteca” para todas/mías;
   - grupo “Estado”;
   - grupo “Uso”.
4. Mantener los controles como segmentos compactos, con selección clara y sin filas desordenadas.
5. En iPad y celular, permitir que los grupos bajen de línea de forma limpia sin recortar botones ni crear desplazamiento horizontal.

## Validación

- Comparar antes/después en 1440, 834, 430 y 390 px.
- Confirmar que ningún control desaparezca y que todos sigan funcionando.
- Verificar búsqueda, filtros, subida, lote IA, tabla y apertura de ficha.
- Revisar consola, solicitudes fallidas y desbordamiento horizontal.
- Sin publicación.
