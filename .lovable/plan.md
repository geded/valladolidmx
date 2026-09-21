# Control fijo para mover secciones en móvil

## Alcance
Corrección localizada del lienzo del Experience Builder. La página pública, la plantilla Home Premium, el contenido CMS, sus textos, imágenes y orden actual permanecen sin cambios.

## Cambio
- Mantener visible el control de puntos de la sección mientras cualquier parte de esa sección esté en pantalla, aunque su inicio ya haya quedado arriba al desplazarse.
- Conservar el gesto táctil actual: mantener y arrastrar para reordenar; tocar para seleccionar y editar.
- Mostrar el control sólo en secciones declaradas como reordenables, sin habilitar movimiento falso en secciones protegidas.
- Evitar que el control salga del borde visible o se superponga con el final de una sección corta.

## Validación
- Probar desplazamiento, selección y reordenamiento táctil en la Home móvil.
- Confirmar que el control permanece visible dentro de cada sección movible durante todo su recorrido.
- Ejecutar el contrato dirigido del constructor y revisar que la página pública no cambió.
- La validación visual final en Safari/iPad permanece sujeta a confirmación humana; no se publicará automáticamente.
