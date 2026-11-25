# Armonización de fotografías de ValladolidMX

## Resultado
Unificar la presentación de las fotos en Inicio, región, destinos, listados y fichas de hoteles, restaurantes, casas, experiencias, productos, eventos, lugares y rutas. Conservar la identidad y las composiciones aprobadas: armonizar no significa convertir todas las páginas en una misma plantilla.

## Alcance visual
- **Tarjetas comunes: 4:3.** Una proporción estable, independiente del largo del texto, para elementos equivalentes. Igual medida dentro de una misma fila.
- **Portadas editoriales: 16:9** donde corresponda a la maqueta aprobada. Las portadas principales y galerías compuestas conservan su composición oficial; no se recortan todas indiscriminadamente.
- **Franjas: 21:9** donde corresponda al uso aprobado de Pueblos Mágicos; comprobar legibilidad en celular antes de aplicar.
- Las miniaturas laterales, logotipos, mapas y documentos mantienen sus formatos específicos. No deformar fotos, ocultar información ni cortar sujetos importantes.
- Conservar fuentes, colores, jerarquía y espaciado de marca. Esta entrega no cambia tipografía global ni rediseña las páginas.

## Aplicación por familias
1. **Inicio:** completar destinos, experiencias, rutas, Pueblos Mágicos y «¿Qué hacer hoy?», y revisar las miniaturas ya corregidas de hoteles/restaurantes. Mantener portada principal, orden y selección editorial.
2. **Región, destinos y listados:** comparar las tarjetas actuales con la medida aprobada; corregir sólo las diferencias. Conservar carruseles, filtros, paginación y visibilidad comercial.
3. **Fichas:** armonizar sus tarjetas relacionadas y fotos editoriales equivalentes, sin sustituir sus galerías principales ni alterar reservas, pedidos, carta o pagos.
4. **Constructor y vista previa:** comprobar que los ajustes se reflejan mediante las mismas autoridades públicas, sin crear otro editor ni otro diseño.

Cada lote se compara completo antes y después; si aparece una diferencia fuera del alcance, se retira ese delta. Las familias que ya cumplen no se modifican.

## Qué permanece igual
Contenido y fotografías del CMS, enlaces, marca, secciones y su orden, encabezado, pie, breadcrumb, mapas, Alux, Mi Viaje, pedidos, reservas, precios, permisos y velocidad de carga. No cambiar datos reales, migraciones, secretos, tareas automáticas ni publicar automáticamente.

## Verificación y entrega
- Comparaciones completas en computadora de 1440 px, tablet de 834 px y celulares de 430 y 390 px; capturas por secciones para revisar toda la página.
- Revisar fotos cargadas, recortes, textos, desbordes y navegación real; probar filtros y galería deslizable en los listados afectados.
- Verificar público, constructor con sesión y vista previa. Si falta acceso o evidencia, señalarlo sin certificar esa parte.
- Ejecutar pruebas relevantes, lint localizado, controles de autorización, preservación, inventario de rutas y gobernanza; revisar la compilación automática.
- Entregar rutas exactas, comparación antes/después y estado por familia: corregida, ya consistente o bloqueada. No declarar toda la plataforma terminada mientras queden familias sin comprobar.
- La comprobación física de Safari/iPhone queda separada de las pruebas de navegador móvil.

## Detalles técnicos
- Reutilizar `HomePremiumSurface`, `TourismCard`, `RegionDestinationsPremiumSurface`, `DestinationPremiumSurface` y las autoridades de ficha documentadas en la política 19.47.
- Inventariar por lote ruta, preset, contrato, renderer, preview, fuente CMS y consumidores antes de editar; declarar archivos exactos y límites negativos en la autorización del lote.
- Usar el sistema visual y los marcos de medios existentes; no añadir un motor, renderer paralelo ni reglas CSS globales que cambien todas las imágenes.
- Conservar `resolveMediaSource`, carga diferida, créditos y galerías. Cambiar la geometría del marco, no los archivos originales ni sus URLs.
- No actualizar evidencias históricas desactualizadas para forzar un PASS; documentar el bloqueo y solicitar la autorización específica si se necesita reconciliación.

**Estado actual:** sólo las miniaturas de hoteles/restaurantes de Inicio se habían ajustado; esta ampliación aún no está implementada.