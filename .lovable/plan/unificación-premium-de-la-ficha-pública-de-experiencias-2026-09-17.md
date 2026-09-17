# Unificación Premium de la ficha pública de Experiencias

## Objetivo
Corregir la ficha pública de cada experiencia para que pertenezca al mismo sistema Premium aprobado de hoteles y restaurantes, conservando el contenido propio de tours y habilitando una ubicación real administrable desde el CMS.

No se creará otra plantilla. La corrección se hará sobre `ExperiencePremiumSurface` y los bloques oficiales existentes.

## Diagnóstico confirmado
- La ficha actual de Experiencias usa una composición propia para encabezado, galería, precio, ubicación y relacionados.
- Hoteles y restaurantes usan la plantilla madre y los bloques oficiales del Experience Builder.
- Por eso actualmente parecen sistemas diferentes.
- La ubicación de una experiencia no se captura: siempre toma la ubicación principal del negocio.
- “Agregar a Mi Viaje” existe, pero no tiene la misma jerarquía visual que en hoteles.
- “Reservar en línea” sólo puede aparecer cuando la venta, el precio, la disponibilidad y el cupo están realmente autorizados; no se simulará una compra.

## Scope Gate
El cambio queda limitado a:

1. Ficha pública de producto cuando la familia sea Experiencia o Tour.
2. Adaptadores y contratos necesarios para alimentar los bloques Premium oficiales con datos de producto.
3. Captura de punto de encuentro de la experiencia en el editor existente del CMS.
4. Lecturas públicas y preview para resolver ubicación por herencia o excepción.
5. Validaciones de publicación y pruebas contractuales de Experiencias.

No se modificarán las plantillas de hoteles, restaurantes, casas de vacaciones, eventos, lugares, Home ni la tienda `/experiencias`.

## Preservation Gate
Permanecen invariantes:

- Header, footer, breadcrumb territorial y selector de idioma.
- Alux, su ilustración, colores, posición y comportamiento.
- Mi Viaje y su acción canónica.
- Iconos bordados y activos de marca.
- Tipografía, paleta y componentes Premium Valladolid Colonial.
- Datos, medios, reseñas, políticas y precios provenientes del CMS.
- Regla fail-closed de venta: “Reservar en línea” sólo con autorización comercial, precio y cupo reales.
- Folios ERL/AVL, inventario, reservaciones, pagos, comisiones y Concierge.

## Implementación

### 1. Una sola gramática visual Premium
Evolucionar `ExperiencePremiumSurface` para reutilizar los mismos bloques oficiales de hoteles y restaurantes:

- Hero Premium con fotografía acreditada y estado digno cuando falte portada.
- Galería oficial en mosaico.
- Subnavegación compacta con sólo las secciones existentes.
- Tarjeta de decisión con precio, valoración, Guardar, Compartir, Agregar a Mi Viaje y, cuando corresponda, Reservar en línea.
- Barra inferior móvil coordinada con Alux para evitar superposiciones.
- Reseñas oficiales de la experiencia.
- Mapa y acciones de ubicación mediante el bloque oficial.
- Colección oficial de experiencias relacionadas.

Se conservarán los bloques propios que sí distinguen una experiencia: relato, incluye/no incluye, itinerario, requisitos, idiomas, accesibilidad, políticas y preguntas frecuentes.

### 2. Punto de encuentro CMS-first: herencia más excepción
Mantener una sola fuente de verdad geográfica:

- Por defecto, la experiencia hereda la ubicación principal del negocio.
- El editor muestra claramente que la ubicación es heredada.
- El editor permite activar “Usar un punto de encuentro diferente”.
- La excepción se guarda como una ubicación secundaria del mismo negocio y el producto sólo conserva la referencia a esa ubicación.
- El punto específico admite nombre, dirección y pin arrastrable.
- Se puede volver a la ubicación heredada sin borrar la ubicación principal del negocio.
- La ficha, la tienda, el mapa y Alux consumen siempre la ubicación efectiva: excepción si existe; en otro caso, ubicación principal del negocio.

Las experiencias publicadas actuales siguen funcionando por herencia; no se copiarán ni alterarán datos reales automáticamente.

### 3. Publicación y venta honestas
- La publicación exige una ubicación efectiva válida: propia o heredada.
- La administración comercial mostrará un aviso si falta ubicación efectiva.
- “Agregar a Mi Viaje” usa el control canónico y permanece disponible cuando la entidad sea elegible.
- “Reservar en línea” sólo se muestra cuando `resolveExperienceCommerce` confirme autorización, precio y capacidad reales.
- Sin venta habilitada se conserva una explicación honesta y la alternativa configurada; no se inventa checkout.

### 4. Paridad CMS, preview y público
El editor, la vista previa y las rutas públicas usarán el mismo resolutor de ubicación efectiva y el mismo renderer de Experiencias. Se revisarán tanto la ruta legacy `/producto/:slug` como la canónica territorial.

## Archivos y superficies autorizadas
- `ExperiencePremiumSurface` y su modelo/adaptador.
- Ruta pública de producto únicamente para familias Experiencia/Tour.
- Bloques oficiales sólo para habilitar su fuente `product`, sin cambiar su apariencia para consumidores existentes.
- Editor de producto/experiencia y un panel reutilizable de punto de encuentro.
- Funciones CMS y lecturas públicas de ubicación efectiva.
- Migración aditiva para la referencia opcional de ubicación.
- Pruebas y evidencia de gobernanza relacionadas con Experiencias.

## Validación obligatoria
1. Baseline antes del cambio de una experiencia con medios y otra sin medios.
2. Comparativa completa contra hotel y restaurante, sin modificar esas plantillas.
3. Revisión de `/producto/:slug` y ruta territorial en 1440, 834, 430 y 390 px.
4. CMS: herencia, excepción, cambio de pin, regreso a herencia y persistencia tras refrescar.
5. Mapa, reseñas, relacionados, Guardar, Compartir, Mi Viaje y Alux sin superposición.
6. Reserva visible sólo para una experiencia realmente autorizada; ausencia honesta en las demás.
7. Typecheck, pruebas contractuales, Route Inventory, Governance Integrity, consola y solicitudes fallidas.
8. Scope Gate y Preservation Gate en PASS antes de considerar la corrección terminada.

## Fuera de alcance
- Activar tarjeta o credenciales de pago.
- Autorizar venta en línea a experiencias reales.
- Cambiar precios, cupos, comisiones, reseñas, fotografías o ubicaciones reales.
- Rediseñar hoteles, restaurantes o cualquier otra familia.
- Publicar al dominio.