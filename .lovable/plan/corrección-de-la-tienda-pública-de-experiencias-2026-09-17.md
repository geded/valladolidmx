# Corrección de la tienda pública de Experiencias

## Objetivo
Convertir `/experiencias` en una tienda real de tours, fácil de explorar y de filtrar, tomando de Airbnb únicamente su claridad funcional, sin copiar su identidad y sin alterar la marca Premium de Valladolid.mx.

## Scope Gate
El cambio queda limitado a la superficie pública de Experiencias:

- Buscador de la tienda.
- Navegación por categorías.
- Filtros de exploración.
- Tarjetas de experiencias.
- Relación lista–mapa.
- Adaptación para escritorio, tableta y móvil.

No se modificarán CMS, inventario, pagos, folios, reservaciones, comisiones, datos reales, ficha individual, header, footer, otras plantillas ni Alux.

## Preservation Gate
Permanecen invariantes:

- Buscador canónico del Home como base visual y de interacción.
- Iconos bordados oficiales, renderizados únicamente por el componente canónico y sin cambiar imagen, color ni proporción.
- Alux exactamente como está hoy: mismo lugar, mismo personaje, mismos colores y mismo comportamiento. No se rediseña ni se mueve.
- Tipografía, paleta, botones, radios y lenguaje visual Premium Valladolid Colonial.
- Datos, fotografías, precios, categorías, ubicaciones y permisos provenientes del CMS.
- Mi Viaje y la autorización real de “Reserva en línea”.
- Breadcrumb, navegación, header, footer y responsive aprobados.

## Implementación propuesta

### 1. Buscador principal
- Reutilizar exactamente la píldora de búsqueda del Home.
- Mantener sus criterios de Destino y Categoría.
- Extender esa misma pieza, sólo para Experiencias, con Fecha y Viajeros.
- En móvil, una píldora compacta que abre los cuatro criterios, sin convertirse en un formulario alto.
- La fecha seguirá siendo opcional para permitir explorar antes de decidir.

### 2. Categorías
- Sustituir la fila improvisada actual por la autoridad de navegación por categorías ya aprobada.
- Mantener intactos los iconos bordados y su tamaño acreditado.
- Tarjetas compactas, simétricas y desplazables en móvil.
- “Todas” con tratamiento neutral de selección, sin crear un icono paralelo.

### 3. Filtros profesionales, compactos e intuitivos
Éste es el corazón de la corrección.

- Una sola barra de filtros, delgada y siempre accesible al desplazarse, nunca un bloque alto que empuje los resultados.
- Criterios rápidos visibles en una línea: destino, tipo de experiencia, duración y precio; en móvil sólo los dos más útiles más el botón de filtros.
- Cada criterio abre un panel breve con sus opciones y el número de experiencias de cada una, para que el visitante sepa antes de elegir.
- Un botón “Todos los filtros” con el total de criterios activos, que abre un panel lateral en escritorio e inferior en móvil.
- El panel completo cierra con “Mostrar N experiencias”, de modo que el resultado sea evidente antes de volver a la lista.
- Los criterios elegidos se muestran como etiquetas quitables, con “Limpiar” siempre disponible.
- Un criterio sin opciones reales no se muestra: nada de filtros vacíos ni decorativos.
- Los filtros no duplican lo ya elegido en el buscador ni en las categorías: un solo control por criterio.
- Al cambiar un filtro se actualizan en el acto los resultados, el conteo y el mapa.

### 4. Resultados tipo tienda de tours
- Prioridad a fotografía, nombre, destino, duración, valoración y precio por persona.
- Se mantiene el corazón de Mi Viaje y la etiqueta “Reserva en línea” sólo cuando esté autorizada.
- Sin cajas decorativas ni texto redundante; misma tipografía y colores de Valladolid.mx.

### 5. Lista y mapa sincronizados
- En escritorio: resultados desplazables a la izquierda y mapa territorial persistente a la derecha, con el patrón ya usado en los listados Premium.
- El mapa muestra todas las experiencias filtradas con coordenadas reales.
- Al enfocar una tarjeta se destaca su marcador; al elegir un marcador se identifica su tarjeta.
- En tableta y móvil: lista como vista principal y botón persistente “Ver mapa”, con regreso claro a la lista.
- Las experiencias sin coordenadas siguen visibles en la lista, con aviso honesto de que no aparecen en el mapa.

## Validación antes de sustituir la versión actual
1. Crear una sola maqueta de revisión con componentes y datos reales, no estilos inventados.
2. Compararla con el Home, los listados Premium y la tienda actual completa.
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
