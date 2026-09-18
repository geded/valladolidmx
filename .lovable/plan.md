# Menú de escritorio compacto e híbrido

## Clasificación
Corrección localizada de navegación; no es un rediseño.

## Scope Gate
- Modificar únicamente `src/components/layout/PrimaryMegaMenu.tsx`.
- Mantener visibles en escritorio: Oriente Maya, Hoteles, Restaurantes y Experiencias.
- Agrupar Casas de vacaciones, ¿Qué hacer?, Eventos, Promociones, Mapa, Blog y Contacto dentro de “Más”.
- Reutilizar el dropdown existente, sus rutas y los destinos publicados; sin crear otro menú.
- Mantener la hamburguesa completa únicamente en tableta y móvil.

## Preservation Gate
- Conservar intactos logo, búsqueda, idioma, Mi Viaje, cuenta y CTA del header.
- Conservar íntegro el menú móvil recién corregido y sus acciones fijas.
- No cambiar CMS, datos, rutas, plantillas Premium, autenticación ni publicación.
- Mantener navegación por teclado, cierre con Escape y comportamiento hover/clic del dropdown.

## Validación
- Comparar el header completo en 1440, 834, 430 y 390 px.
- Confirmar que en 1440 no hay choques ni desbordamiento y que “Más” contiene todas las opciones agrupadas.
- Confirmar que 834/430/390 conservan hamburguesa, “Arma tu Viaje” e “Iniciar sesión”.
- Ejecutar formato, typecheck y revisión de diferencias.
