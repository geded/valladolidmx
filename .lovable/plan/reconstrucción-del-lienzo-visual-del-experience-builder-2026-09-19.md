# Reconstrucción del lienzo visual del Experience Builder

## Diagnóstico confirmado

El renderer y el contenido CMS sí entregan la Home completa. Las capturas verificadas muestran Valladolid, Ek Balam, Espita e Izamal y la colección completa de Experiencias.

El defecto está en el espacio de trabajo del constructor: los paneles laterales reducen demasiado el área disponible y el ajuste automático comprime un lienzo lógico de 1024 px hasta volverlo ilegible. El ajuste anterior evitó el recorte, pero no produjo una experiencia editable tipo Wix.

## Scope Gate

Modificar únicamente el shell visual y la interacción del Experience Builder necesarios para que el lienzo sea fiel, legible y editable:

- Distribución del área de trabajo, paneles y escenario central.
- Zoom del lienzo y ajuste a pantalla.
- Posición externa de selección, arrastre y controles de sección.
- Medición de altura y desplazamiento del escenario.
- Comportamiento específico en desktop, tablet y móvil del editor.

No modificar la plantilla pública, contenido CMS, contratos, renderer canónico, datos, rutas públicas, pagos, reservas, permisos, SEO ni publicación.

## Reconstrucción

1. **Escenario independiente**
   - Separar el ancho del lienzo del ancho restante entre paneles.
   - Mantener siempre el documento interno en el ancho lógico seleccionado: 390, 430, 768, 1024, 1280 o 1440 px.
   - Dar al escenario su propio desplazamiento horizontal y vertical cuando el lienzo no quepa de manera útil.

2. **Paneles adaptativos tipo Wix**
   - En tablet, mostrar un solo panel lateral a la vez y permitir cerrarlo sin perder selección ni estado.
   - En desktop, conservar los paneles, pero impedir que reduzcan el lienzo por debajo de un umbral legible.
   - En móvil, usar panel superpuesto sin alterar la geometría de la plantilla.

3. **Zoom controlado**
   - Sustituir el ajuste automático ilimitado por niveles útiles y explícitos.
   - “Ajustar” calculará un zoom con límite mínimo legible; si no cabe, habrá desplazamiento horizontal en lugar de seguir encogiendo.
   - El zoom afectará sólo la presentación exterior, nunca breakpoints, tipografía, contenido o distribución interna.

4. **Controles fuera de la plantilla**
   - Mantener selección, handles y acciones en una capa editorial independiente.
   - Recalcular su posición desde las medidas reales del iframe y el zoom.
   - Evitar que tapen títulos, tarjetas o finales de sección.

5. **Altura y continuidad**
   - Conservar altura dinámica basada en el contenido real.
   - Eliminar cualquier dependencia restante de alturas fijas del documento o scroll vertical anidado.
   - Verificar que cada sección termine antes de comenzar la siguiente.

## Preservation Gate

Deben permanecer idénticos:

- `HomePremiumSurface` y las demás plantillas Premium.
- Orden, contenido, imágenes, marca, tipografía y responsive públicos.
- Valladolid principal y Ek Balam, Espita e Izamal secundarios.
- Experiencias completas y sus valores CMS.
- Header, footer, breadcrumb, mapas, Alux, Mi Viaje, navegación, analítica y SEO.
- Autoridad compartida entre constructor, preview y ruta pública.
- Publicación exclusivamente manual.

## Validación obligatoria

- Comparar visualmente constructor, preview y ruta pública con el mismo contenido.
- Revisar 1440, 1280, 1024, 834, 430 y 390 px.
- Comprobar Home completa, no sólo Destinos y Experiencias.
- Confirmar texto legible, secciones completas, imágenes proporcionales y controles sin superposición.
- Ejecutar pruebas técnicas y regresión, pero no declararlas equivalentes a paridad visual.
- Presentar evidencia antes/después para aceptación humana antes de extender la solución a las 21 plantillas.

## Criterio de aceptación

La reconstrucción sólo se considera aprobada cuando el Founder confirma visualmente que la Home dentro del constructor coincide con la versión pública y puede seleccionarse, editarse, moverse u ocultarse sin recortes, compresión excesiva, pérdida de contenido ni alteración de la plantilla.
