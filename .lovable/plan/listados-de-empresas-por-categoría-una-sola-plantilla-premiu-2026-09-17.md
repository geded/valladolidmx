# Listados de empresas por categoría: una sola plantilla Premium

## Diagnóstico confirmado

Hoy conviven dos formatos distintos para listar empresas:

- Las empresas de Hoteles, Restaurantes, Experiencias y Casas de vacaciones entran a la plantilla Premium aprobada.
- Las empresas de Cenotes, Artesanías, Transporte, Cultura, Naturaleza y Servicios turísticos caen a una plantilla anterior, con hero, filtros, tarjetas y mapa diferentes.

La causa es que sólo esas cuatro categorías tienen asignada una familia de listado en el CMS; las ocho restantes están sin asignar y el sistema degrada su presentación en silencio.

Además falta una pieza de navegación: no existe un listado regional por categoría para todo el Oriente Maya. Hoy sólo se puede ver una categoría dentro de un destino.

## Scope Gate

**Cambio autorizado:**

1. Que todos los listados de empresas por categoría usen la plantilla Premium aprobada, sin importar la categoría.
2. Crear el listado regional de una categoría en todo el Oriente Maya, con filtro por destino.
3. Que el listado de una categoría dentro de un destino filtre por zonas de ese destino.

**Superficies editables:** listado de empresas por categoría y destino, nuevo listado regional por categoría, plantilla territorial Premium existente (sólo para admitir categorías genéricas y el filtro de zona), taxonomía de categorías en el CMS, pruebas y evidencia visual.

**Fuera de alcance:** perfiles de empresa, fichas de producto, Home, menús, pagos, reservaciones, contenido editorial y publicación.

## Implementación

### 1. Una sola plantilla para todas las categorías

- Permitir que la plantilla territorial Premium acepte cualquier categoría empresarial publicada, sin exigir pertenencia a una familia cerrada.
- Retirar el camino visual anterior y su vista rápida; las tarjetas abrirán el perfil empresarial completo, igual que en Hoteles.
- Conservar el nombre, textos, fotografías, ubicación y enlaces propios de cada categoría; nunca reutilizar contenido de otra.
- Dejar el encabezado, la búsqueda y los filtros con el lenguaje de la categoría activa, no con el de hospedaje.

### 2. Listado regional por categoría

- Nueva página pública de una categoría en todo el Oriente Maya, con la misma plantilla Premium.
- Filtro por destino construido con los destinos reales que tienen empresas publicadas en esa categoría.
- Breadcrumb, título, descripción y datos para buscadores propios del alcance regional.
- Enlace de ida y vuelta entre el listado regional y el listado del destino.

### 3. Filtro por zonas dentro del destino

- En el listado de una categoría dentro de un destino, el primer filtro pasa a ser la zona del destino, tomada de las zonas ya registradas en el CMS.
- Si una categoría no tiene zonas registradas, el filtro no se muestra; no se inventan zonas.

### 4. Taxonomía

- Completar en el CMS la clasificación de las categorías publicadas que hoy están sin asignar, para que su listado herede el comportamiento correcto y no dependa de excepciones en código.

## Preservación obligatoria

- Marca, tipografía, colores, iconos oficiales y plantilla Premium aprobada.
- Header, footer, selector territorial, breadcrumb y navegación canónica.
- Alux, Mi Viaje, favoritos, mapa y ubicación.
- Datos, medios, taxonomía y visibilidad administrados en el CMS.
- Formato vigente de Hoteles, Restaurantes, Experiencias, Casas de vacaciones, Eventos, Lugares y Qué hacer.
- Direcciones web existentes y su posicionamiento.

## Validación

- Comparar el listado de empresas de Hoteles contra Cenotes, Artesanías y Transporte: mismo formato, contenido propio.
- Probar el listado regional filtrando por varios destinos y el listado de destino filtrando por zonas.
- Revisar la plantilla completa en 1440, 834, 430 y 390 px, con un solo título principal y sin desbordamientos.
- Ejecutar pruebas de contrato, comprobación de tipos, inventario de rutas y controles de gobernanza aplicables.
- Sin publicación hasta autorización expresa.
