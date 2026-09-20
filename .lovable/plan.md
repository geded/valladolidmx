# Reconstrucción del lienzo del Experience Builder

## Objetivo
Convertir el lienzo actual en un espacio de trabajo estable tipo Wix: mostrar la plantilla Premium real, recorrerla fluidamente, seleccionar cada sección y reordenarla sin recortes, saltos, superposiciones ni cambios en la página pública.

La captura `IMG_2672.png` queda como evidencia del fallo actual: ancho recortado, controles sobre el contenido y desplazamiento bloqueado/competido.

## Diagnóstico confirmado
- El renderer, los datos CMS y la plantilla pública sí comparten la autoridad aprobada; no se creará otro renderer.
- El problema está en el shell del editor: el iframe cambia continuamente de altura mientras se desplaza, el escalado y el contenedor redondean medidas por separado, y existen tres mecanismos de arrastre distintos.
- Los controles de edición se reparten dentro y fuera del iframe, por lo que pierden alineación al escalar.
- La barra superior ocupa demasiada altura en tablet y el inspector inferior cubre el lienzo.
- Las seis vistas deben conservar un ancho lógico propio; el tamaño de la pantalla del editor no debe alterar los breakpoints internos de la plantilla.

## Qué faltó en los intentos anteriores
Antes se trató “tipo Wix” como un problema de apariencia y se parchearon escala, altura y paneles sobre el mismo mecanismo defectuoso. Nunca se construyó lo que hace utilizable un constructor: un solo desplazamiento estable, una sola geometría, controles totalmente fuera de la plantilla, selección precisa y un único sistema de arrastrar y soltar válido también en pantalla táctil. Esta reconstrucción sustituye esos mecanismos, no los vuelve a parchear.

## Regla de trabajo en cualquier zoom
- El zoom sólo cambia el tamaño con el que se presenta la plantilla; no altera su contenido, su ancho lógico ni sus medidas internas.
- Seleccionar, editar, mover y reordenar deben funcionar en todos los niveles de zoom y en las seis vistas.
- Los objetivos táctiles de edición mantienen un tamaño cómodo aunque la plantilla se vea reducida.
- Si una operación concreta no puede realizarse con precisión en el equipo actual, el lienzo lo dice con un aviso claro y una alternativa (acercar, usar el panel Estructura o continuar en computadora). Nunca se comporta de forma errática ni silenciosa.
- Meta explícita: un editor humano debe poder trabajar las plantillas por su cuenta, sin pedir cambios al agente.

## Scope Gate
### Autorizado
- Reconstruir únicamente el shell del lienzo y sus interacciones dentro del Experience Builder.
- Extraer del archivo actual módulos internos para viewport, ajuste/zoom, capa de selección y arrastre.
- Unificar selección, desplazamiento y arrastrar/soltar.
- Ajustar la distribución de controles y paneles del Studio para no cubrir la plantilla.
- Añadir pruebas funcionales y visuales del constructor.

### Fuera de alcance
- Plantillas Premium, `HomePremiumSurface` y demás superficies públicas.
- Contenido, medios, orden aprobado y datos del CMS.
- Header, footer, breadcrumb, mapas, Alux, Mi Viaje, SEO, navegación y analítica.
- Rutas públicas, permisos, pagos, reservaciones, migraciones o publicación.
- Nuevos motores, renderers, plantillas V2/New o superficies paralelas.

## Implementación
1. **Un solo escenario desplazable**
   - Mantener el iframe same-origin con el ancho lógico exacto de 390, 430, 768/834, 1024, 1280 o 1440.
   - Hacer que el escenario exterior sea el único desplazamiento vertical y horizontal.
   - Medir la altura del documento con una sola fuente estable y actualizaciones agrupadas; eliminar la competencia entre observadores y medidas durante el scroll.

2. **Ajuste y zoom consistentes**
   - Calcular “Ajustar” desde el área real disponible y una única geometría compartida por marco, iframe y controles.
   - Mantener el documento interno sin alterar tipografía, rejillas ni breakpoints.
   - Conservar zoom manual y restablecer el borde inicial al cambiar de vista, sin mínimos que vuelvan a recortar el lienzo.

3. **Capa externa de edición**
   - Sacar del documento de la plantilla todos los bordes, botones y asas de edición.
   - Proyectar las coordenadas reales de cada `[data-eb-section]` sobre una sola capa exterior.
   - Seleccionar una sección tocando el contenido o su contorno, sin interceptar el scroll normal.

4. **Un solo arrastrar y soltar**
   - Usar un único sistema para Estructura y lienzo, con soporte de mouse, teclado y táctil/iPad.
   - Mostrar posición de destino, auto-scroll cerca de los bordes y confirmar el cambio una sola vez.
   - Mantener el mismo orden en lienzo, panel y borrador guardado; conservar deshacer/rehacer.

5. **Espacio de trabajo usable**
   - Compactar la barra del Studio y agrupar acciones secundarias sin eliminar capacidades.
   - En tablet/móvil, abrir Estructura e Inspector como paneles temporales que no cubran permanentemente el contenido.
   - Mantener selección, vista, zoom y posición al abrir/cerrar herramientas cuando sea posible.

6. **Aplicación gobernada a las plantillas**
   - Validar primero Home como plantilla piloto, porque contiene todos los patrones difíciles: rejillas, carriles, eventos, mapa, Alux y Mi Viaje.
   - Tras aceptación humana de Home, comprobar las otras 20 plantillas usando el mismo shell, sin cambios de diseño por familia.
   - Si una plantilla no declara secciones editables en su contrato vigente, marcarla como bloqueada/fail-closed; no inventar secciones ni un renderer alternativo.

## Preservation Gate y validación
- Comparar constructor, vista previa compartida y ruta pública con el mismo árbol, datos, renderer y estilos.
- Validar 1440, 1280, 1024, 834, 430 y 390 px.
- Comprobar en cada vista: ancho lógico exacto, tipografía/distribución iguales, todas las secciones consecutivas, cero contenido recortado, un solo desplazamiento, selección alineada y arrastre estable.
- En Home comprobar expresamente Valladolid, Ek Balam, Espita e Izamal, Experiencias completa y todas las secciones posteriores.
- Probar cambio rápido de vistas, zoom, scroll prolongado, selección, reordenamiento, deshacer/rehacer, inspector y guardado.
- Ejecutar contratos dirigidos, typecheck, build, smoke, Route Inventory y Governance Integrity.
- Presentar comparación antes/después. El resultado no se declarará terminado ni se extenderá a las 21 plantillas hasta la aceptación visual humana.
- No publicar automáticamente.
