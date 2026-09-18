# Arreglar el trabajo por secciones en el constructor (empezando por Inicio)

## Qué está pasando hoy

1. **No puedes recorrer la página en el iPad.** El lienzo del constructor se dibuja dentro de un marco aislado; en Safari el gesto de deslizar se queda atrapado en ese marco y la página no avanza, por eso sólo ves la portada y lo que está debajo del hero queda inalcanzable.
2. **Arrastrar y soltar sí existe, pero no donde lo estás intentando.** En Inicio toda la plantilla es una sola pieza aprobada con 12 secciones internas. El arrastre está disponible en el panel “Estructura”, no sobre el lienzo, así que al intentar mover directamente sobre la página no ocurre nada.
3. **Alux no se puede mover.** En Inicio, portada, Alux, categorías y Mi Viaje están fijados en la plantilla aprobada; sólo destinos, rutas, pueblos mágicos, experiencias, hospedaje, eventos, qué hacer y mapa admiten reordenamiento.

## Qué voy a hacer

### 1. Recorrer la página completa (todas las plantillas)
Hacer que el deslizamiento, la rueda del ratón y el trackpad muevan el lienzo del constructor aunque el contenido esté en el marco aislado. Resultado: puedes bajar hasta el pie de página en iPad, móvil y escritorio.

### 2. Arrastrar y soltar sobre el propio lienzo
Cada sección de la plantilla mostrará, al seleccionarla, su nombre, su número y un tirador para arrastrarla, más los botones Subir/Bajar para uso táctil. Funcionará igual en Inicio, Destino, Lugar y los listados, usando el mismo registro de secciones que ya existe (sin plantillas paralelas ni componentes nuevos).

### 3. Liberar Alux y las secciones que hoy están fijas en Inicio
Alux pasa a ser una sección movible dentro del orden de Inicio, conservando su diseño, su contenido y su comportamiento actual. La portada sigue siendo la primera sección y Mi Viaje el cierre, salvo que autorices lo contrario.

## Lo que se preserva

Diseño, tipografía, espaciados y marca de todas las plantillas; el contenido viene del CMS; encabezado, pie, migas, mapas, Alux y Mi Viaje quedan intactos; los cambios se guardan como borrador y nada se publica sin tu acción explícita.

## Detalle técnico

- `CanvasViewport` (VisualStudio.tsx): reenviar `wheel` y `touchmove` del documento del iframe al contenedor `data-eb-canvas-scrollport`, respetando la escala.
- Overlay de secciones compuestas en el lienzo: marcar cada sección con `data-eb-section` en las superficies Premium (Home G4, Destino G4, Lugar Q2D, Listado G5) y montar los controles de selección/arrastre contra `COMPOSITE_SECTION_REGISTRY`, reutilizando `orderedCompositeSections`/`nextCompositeOrder`.
- `home-premium-config.ts` + `HomePremiumSurface.tsx`: incluir `alux` en el orden reordenable (fail-closed, sin duplicados) sin alterar su render.
- Verificación: `prettier`, `bunx tsgo --noEmit`, `bun test scripts/omxds` y revisión visual 1440 / 834 / 430 / 390 del constructor y de la Home pública.
