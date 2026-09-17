# Corrección de la tienda pública de Experiencias

## Objetivo
Convertir `/experiencias` en una tienda real de tours fácil de explorar, tomando de Airbnb únicamente su claridad funcional, sin copiar su identidad y sin alterar la marca Premium de Valladolid.mx.

## Scope Gate
El cambio queda limitado a la superficie pública de Experiencias:

- Buscador de la tienda.
- Navegación por categorías.
- Filtros de exploración.
- Tarjetas de experiencias.
- Relación lista–mapa.
- Adaptación para escritorio, tableta y móvil.

No se modificarán CMS, inventario, pagos, folios, reservaciones, comisiones, datos reales, ficha individual, header, footer ni otras plantillas.

## Preservation Gate
Permanecen invariantes:

- Buscador canónico del Home como base visual y de interacción.
- Iconos bordados oficiales, renderizados únicamente por el componente canónico y sin cambiar imagen, color ni proporción.
- Imagen, nombre y colores oficiales de Alux.
- Tipografía, paleta, botones, radios y lenguaje visual Premium Valladolid Colonial.
- Datos, fotografías, precios, categorías, ubicaciones y permisos provenientes del CMS.
- Mi Viaje y la autorización real de “Reserva en línea”.
- Breadcrumb, navegación, header, footer y responsive aprobados.

## Implementación propuesta

### 1. Buscador principal
- Reutilizar exactamente la píldora de búsqueda del Home.
- Mantener sus segmentos de Destino y Categoría.
- Extender esa misma pieza, sólo para Experiencias, con Fecha y Viajeros.
- En móvil mostrar una píldora compacta que abre los cuatro criterios, sin convertirla en un formulario alto.
- La fecha seguirá siendo opcional para permitir explorar antes de decidir.

### 2. Categorías
- Sustituir la fila improvisada actual por la autoridad `CategoryNavGrid`.
- Mantener intactos los iconos bordados y su tamaño acreditado.
- Usar tarjetas compactas, simétricas y desplazables en móvil.
- “Todas” tendrá un tratamiento neutral de selección, sin crear un icono paralelo.

### 3. Resultados tipo tienda de tours
- Dar prioridad a fotografía, nombre, destino, duración, valoración y precio por persona.
- Mantener el corazón de Mi Viaje y la etiqueta “Reserva en línea” sólo cuando esté autorizada.
- Evitar cajas decorativas y texto redundante; conservar la tipografía y colores de Valladolid.mx.
- Mantener filtros rápidos y “Todos los filtros” con los datos reales disponibles.

### 4. Lista y mapa sincronizados
- En escritorio: resultados desplazables a la izquierda y mapa territorial persistente a la derecha, usando el patrón existente de listados Premium.
- El mapa mostrará todas las experiencias filtradas que tengan coordenadas reales.
- Al enfocar una tarjeta se destacará su marcador; al elegir un marcador se identificará la tarjeta correspondiente.
- En tableta y móvil: lista como vista principal y botón persistente “Ver mapa”; el mapa ocupará la vista al abrirse y permitirá volver a la lista.
- Las experiencias sin coordenadas seguirán visibles en la lista, con aviso honesto de que no aparecen en el mapa.

### 5. Alux
- Conservar exactamente su barra, personaje y colores oficiales.
- Mantener la pregunta sobre si viaja solo, en pareja, familia o amigos.
- Guardar destino, categoría, fecha, viajeros y preferencias para continuidad con Mi Viaje y el Concierge humano.

## Validación antes de sustituir la versión actual
1. Crear una sola maqueta de revisión usando componentes y datos reales, no tres estilos inventados.
2. Compararla con Home, listados Premium y la tienda actual completa.
3. Revisar búsqueda, filtros, tarjetas y mapa en 1440, 834, 430 y 390 px.
4. Verificar que no cambien iconos, Alux, header, footer, breadcrumbs ni otras plantillas.
5. Presentar la maqueta para aprobación visual del Founder.
6. Sólo después de esa aprobación, aplicar el mismo renderer a `/experiencias` y retirar la maqueta temporal.

## Controles técnicos
- Typecheck y pruebas contractuales de Experiencias.
- Cobertura de Route Inventory.
- Revisión de errores de consola y solicitudes fallidas.
- Comparativa visual completa en los cuatro tamaños.
- Sin publicación ni activación de tarjeta.
