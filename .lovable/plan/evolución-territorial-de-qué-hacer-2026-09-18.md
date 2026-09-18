# Evolución territorial de “Qué hacer”

## Objetivo aprobado

Convertir la plantilla Premium existente de “Qué hacer” en una guía útil para descubrir el Oriente Maya durante el viaje, mediante carriles horizontales compactos y navegables:

1. **Destinos a descubrir** en la vista regional.
2. **Zonas por descubrir** cuando se entra desde un destino.
3. **Eventos que no te puedes perder**.
4. **Experiencias para vivir el territorio**.
5. **Lugares y sitios de interés preferidos**.

Airbnb se toma sólo como referencia de claridad, densidad y navegación horizontal. Se conserva la identidad visual de Valladolid.mx y Oriente Maya de Yucatán.

## Alcance territorial

- **Vista regional:** `/que-hacer` muestra todo el Oriente Maya y un filtro por destino que actualiza todos los carriles.
- **Vista de destino:** `/oriente-maya/{destino}/que-hacer` usa la misma autoridad y sustituye “Destinos a descubrir” por “Zonas por descubrir”; el filtro principal cambia a zonas del destino.
- Destinos y zonas se obtienen de los datos territoriales publicados. No se inventan zonas ni se crean fixtures.
- Un carril sin candidatos válidos se oculta; nunca se rellena con contenido de prueba.

## Administración en CMS

La configuración vivirá en el **Experience Builder**, no en una pantalla paralela. La composición de “Qué hacer” permitirá:

- ordenar y mostrar/ocultar los carriles;
- editar título y texto breve de cada carril;
- definir cantidad máxima de tarjetas;
- seleccionar el orden orgánico permitido por el bloque oficial;
- previsualizar la misma composición regional o de destino antes de publicar.

Se evolucionará el bloque oficial `vmx.experience.related-collection` y su fuente territorial existente; constructor, preview y ruta pública usarán el mismo contrato y renderer.

## Visibilidad y selección

Cada carril combinará, en este orden:

1. destacado programado vigente y pertinente a la superficie;
2. contenido con contrato de visibilidad vigente cuando le corresponda por reparto;
3. selección editorial válida;
4. contenido orgánico publicado, completo y territorialmente coherente.

Reglas preservadas:

- máximo 1 contenido contratado por cada 4 tarjetas, ocupando la primera posición de su bloque cuando le toque;
- máximo una aparición por empresa en cada carril y dos en toda la página;
- rotación diaria estable y deuda de exposición según el plan contratado;
- indicación discreta **“Recomendado”**, fuera de la fotografía;
- si no existe contenido contratado elegible, el espacio lo ocupa contenido orgánico;
- impresiones y clics siguen alimentando el tablero de Visibilidad y el resumen de la empresa.

## Implementación sobre autoridades existentes

- Reutilizar las lecturas públicas CMS actuales de destinos, eventos, experiencias y lugares.
- Reutilizar exclusivamente `TourismCard` en variante compacta y el carrusel oficial de `vmx.experience.related-collection`.
- Evolucionar `TerritorialListingReviewSurface` para que la familia `que-hacer` componga carriles, sin crear una superficie `V2`, `New` o paralela.
- Aplicar un único estado territorial a todos los carriles: destino en alcance regional y zona en alcance de destino.
- Mantener navegación completa desde cada tarjeta hacia su ficha canónica, corazón sobre la fotografía y sin decisiones prematuras de reserva o Mi Viaje dentro de la tarjeta.
- Mantener el mapa como acompañante territorial, mostrando únicamente los resultados visibles que tengan coordenadas acreditadas.
- Conservar el contexto seleccionado para Alux y la continuidad del viaje.

## Scope Gate

Superficies autorizadas:

- `/que-hacer`;
- `/oriente-maya/{destino}/que-hacer`;
- configuración y preview de esa misma plantilla en Experience Builder;
- contratos, adaptadores y pruebas estrictamente necesarios para hidratar sus carriles y filtros.

No se modificarán Home, otros listados Premium, fichas, header, footer, navegación global, reservas, pagos, contratos comerciales, datos reales ni reglas generales de visibilidad. No se publicará.

## Preservation Gate

Validar la plantilla completa en 1440, 834, 430 y 390 px:

- breadcrumb, encabezado, búsqueda, selector de destino o zona;
- orden, desplazamiento horizontal y navegación de todos los carriles;
- portadas CMS reales, fallback aprobado y ausencia de URLs firmadas vencidas;
- “Recomendado” fuera de fotografías y proporción comercial correcta;
- mapa, Alux, Mi Viaje, header y footer;
- paridad entre Experience Builder, preview y rutas públicas;
- ausencia de cambios visuales o funcionales en Home y demás listados Premium.

Ejecutar pruebas contractuales afectadas, suite relevante, typecheck, formato, `git diff --check`, Route Inventory y controles de gobernanza disponibles. Presentar comparación visual antes/después para aceptación humana.
