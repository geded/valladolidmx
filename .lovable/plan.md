# Cierre verificable del canvas tipo Wix

## Decisión
No migrar a otra plataforma ni usar otra IA. El problema no es una limitación de Lovable ni de las plantillas Premium: está concentrado en la envolvente editorial del Experience Builder.

La captura `IMG_0852.png` acredita dos fallas del canvas:

1. El menú público podía abrirse dentro del editor y cubrir la plantilla con una capa gris y un panel blanco.
2. Al cambiar vista o cargar imágenes, el canvas podía mostrarse antes de terminar de sincronizar estilos, altura y posiciones de secciones.

## Scope Gate
Modificar exclusivamente la infraestructura visual de `VisualStudio` necesaria para:

- Mantener inertes los botones públicos dentro del canvas, conservando carruseles y desplazamiento.
- Sincronizar estilos del documento sin borrarlos y reconstruirlos durante el uso.
- Medir nuevamente altura y secciones cuando cambian vista, fuentes o imágenes.
- Mostrar la plantilla sólo cuando la vista seleccionada esté estable.
- Mantener alineados plantilla, contornos y controles durante zoom, scroll y cambio de vista.

No modificar plantillas Premium, contenido CMS, renderer público, header, footer, Alux, Mi Viaje, SEO, rutas, datos, permisos, pagos ni publicación.

## Implementación

1. **Aislamiento editorial**
   - Los enlaces y botones públicos seleccionan su sección, pero no abren menús, diálogos ni cambian estados dentro del lienzo.
   - Los carruseles y el desplazamiento táctil permanecen operativos.

2. **Estilos estables**
   - Sustituir la eliminación y reclonado completo de estilos por una sincronización que no deje al documento momentáneamente sin diseño.
   - Mantener las mismas fuentes y tokens de la página real.

3. **Barrera de vista lista**
   - Al cambiar entre 390, 430, 768, 1024, 1280 y 1440, ocultar la vista incompleta durante la medición.
   - Mostrarla sólo después de cargar estilos, fuentes, imágenes y calcular altura/secciones del ancho seleccionado.

4. **Geometría única**
   - Asociar cada medición al ancho lógico que la produjo y descartar mediciones antiguas.
   - Recalcular imágenes añadidas posteriormente.
   - Proyectar contornos y asas sólo con coordenadas de la vista actual.

5. **Prueba piloto Home**
   - Comparar lado a lado constructor, Vista previa y página pública con el mismo contenido.
   - Verificar expresamente Destinos, Experiencias, Hoteles, Eventos y todas las secciones posteriores.
   - Probar scroll prolongado, carruseles, selección, edición, arrastre, deshacer y cambio rápido de vistas.

## Criterio de aceptación

- Cero menú o diálogo público abierto dentro del canvas.
- Cero capas grises, costuras, secciones partidas o controles sobre contenido incorrecto.
- Igual distribución de textos, imágenes y columnas que la página real en 1440, 1280, 1024, 834, 430 y 390.
- Una sola autoridad de desplazamiento; sin atorarse en iPhone/iPad.
- El resultado no se declarará terminado por pruebas técnicas: requiere comparación visual y aceptación humana del Founder.
- No se extenderá a las otras 20 plantillas hasta aprobar Home.
- No se publicará automáticamente.
