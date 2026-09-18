# Menú móvil corto con acceso siempre visible

## Clasificación
Corrección localizada de navegación móvil; no es un rediseño.

## Scope Gate
- Retirar únicamente el bloque “Destinos populares” del menú hamburguesa.
- Mantener el acceso a todos los destinos mediante “¿Dónde empezamos?”.
- Asegurar que “Arma tu Viaje” e “Iniciar sesión” permanezcan visibles y utilizables sin depender del desplazamiento del contenido.
- Corregir sólo `PrimaryMegaMenu.tsx` y, si la barra inferior lo requiere, `SiteHeader.tsx`.

## Preservation Gate
- Menú de escritorio intacto.
- Header, logotipo, selector de idioma, Mi Viaje, autenticación y rutas intactos.
- Sin cambios de CMS, datos, backend, plantillas Premium ni publicación.
- Se conservan las categorías principales y los enlaces Promociones, Mapa, Blog y Contacto.

## Validación
- Probar apertura, cierre, navegación y acceso a “Iniciar sesión”.
- Confirmar ausencia de desbordamiento y acciones inferiores visibles en 1440, 834, 430 y 390 px.
