# Paridad del constructor para todas las plantillas aprobadas

Objetivo: que las 21 plantillas aprobadas se vean y editen en el constructor igual que en la web pública, corrigiendo las dos causas ya identificadas (contenido incompleto y geometría del lienzo) sin rediseñar ninguna plantilla.

## Qué se corrige

1. **El borrador complementa, nunca reemplaza**
   El contenido real del CMS es la base; las ediciones guardadas se aplican encima, campo por campo. Si el borrador tiene dos destinos y el CMS cuatro, se muestran cuatro con las dos ediciones aplicadas. Misma regla para experiencias, lugares, hoteles, restaurantes, rutas y fichas.

2. **El lienzo deja de imponer altura y ancho artificiales**
   El alto del lienzo se mide del contenido real en vez de fijarlo al alto del dispositivo elegido, y el ancho lógico deja de depender del espacio que queda entre el panel lateral y el inspector (con ambos abiertos, una vista de 1024 se comprimía hasta parecer móvil). Se garantiza el ancho de la vista elegida y, si no cabe, se desplaza horizontalmente.

3. **Se retira el recorte de emergencia**
   El aislamiento/recorte que se añadió para tapar el desbordamiento se elimina una vez corregida la geometría, porque ocultaba el síntoma y cortaba contenido.

4. **Los controles de edición salen de la plantilla**
   Selección, contornos y arrastre se dibujan en una capa superior, no dentro del documento de la plantilla, para que no alteren su maquetación.

## Alcance de plantillas

Se aplica al motor común del constructor, por lo que cubre las 21 plantillas aprobadas: Inicio, Destino, los seis listados turísticos, las seis variantes de Lugar, las seis fichas Premium y la Landing. No se modifica ninguna plantilla pública ni su diseño.

## Lo que se preserva

Plantillas Premium, marca y tokens, encabezado y pie, breadcrumb, mapas, Alux, Mi Viaje, contenido y medios del CMS, rutas públicas, reservas, pagos, permisos y publicación. No se crean plantillas paralelas ni versiones nuevas.

## Detalle técnico

- `src/components/experience-builder/VisualStudio.tsx`: `HomeCanvas` (ancho garantizado + escala cosmética independiente del chrome), `CanvasViewport` (alto por `ResizeObserver` sobre el nodo montado), retiro de `isolation:isolate`/`contain:paint` en `[data-eb-section]`, capa de overlay para handles.
- Resolución de contenido: el borrador se fusiona sobre el corpus real por índice/id en la misma ruta que usa la web pública (`mergeHomeRealContent` y equivalentes por familia), sin sustituir colecciones.
- `scripts/omxds/i4/editorial-builder-g3.integration.test.ts`: se actualizan las aserciones al nuevo contrato del shell.

## Verificación antes de declarar PASS

Comparación visual constructor vs. vista previa vs. público en 1440, 1280, 1024, 834, 430 y 390, con al menos una plantilla por familia, y aceptación visual humana. Sin publicar nada.
