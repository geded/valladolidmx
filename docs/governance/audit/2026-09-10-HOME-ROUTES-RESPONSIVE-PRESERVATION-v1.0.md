# Home · corrección responsive de rutas

## Hallazgo observado

En el preview Lovable, las dos acciones de cada tarjeta de rutas se montaban en anchos intermedios y la cuadrícula estiraba las tarjetas, dejando espacio vacío innecesario.

## Corrección acotada

- El carrusel conserva una tarjeta amplia en móvil, dos tarjetas legibles en tableta y tres columnas en escritorio.
- Las acciones se apilan mientras no exista ancho suficiente y vuelven a dos columnas en escritorio amplio.
- Las tarjetas conservan su altura natural y el texto de los botones puede ocupar dos líneas sin superposición.

## Invariantes preservadas

- Mismas rutas, imágenes, textos, enlaces y orden.
- Mismas acciones “Mostrar en el mapa” y “Personalizar con Alux”.
- Mismo lenguaje visual ya aprobado; no se introduce una plantilla ni funcionalidad nueva.
- Sin publicación ni despliegue.
