# Corrección definitiva del constructor en 1024, 1280 y 1440

## Alcance autorizado

**Tipo:** corrección localizada del Experience Builder.

Se corregirá únicamente la representación y edición de la Home en los tres tamaños amplios. La Home pública, sus datos, orden, textos, imágenes, navegación, móviles y tablet de 768 permanecerán sin cambios.

## Causa que se aislará

El constructor mezcla tres responsabilidades dentro del mismo marco: tamaño lógico de la plantilla, reducción visual para caber en el panel y controles de selección/arrastre. En vistas amplias, esa combinación puede cambiar cómo Safari/iPad compone imágenes, calcula alturas y recibe los clics, aunque los cuatro destinos y cinco experiencias sí estén presentes.

## Implementación

1. **Establecer una comparación confiable**
   - Ocultar la guía inicial durante la prueba.
   - Capturar Home pública y constructor en 1024, 1280 y 1440.
   - Comparar límites reales de Destinos, Experiencias y las secciones inmediatamente anterior y posterior.

2. **Separar plantilla y controles editoriales**
   - Mantener la plantilla Premium dentro de un marco con el ancho lógico exacto.
   - Mover tiradores, selección y zonas de arrastre a una capa editorial independiente para que no alteren altura, recorte ni pintura de las secciones.
   - Eliminar reglas especiales de recorte que cambien cómo se ve Destinos.

3. **Corregir la reducción de vistas amplias**
   - Aplicar una sola estrategia de ajuste al marco completo, sin modificar el ancho interno que activa los puntos de corte Premium.
   - Evitar la combinación de escala, altura fija y desplazamiento interno que provoca diferencias en Safari/iPad.
   - Conservar sin cambios 390, 430 y 768.

4. **Restaurar edición y movimiento**
   - Verificar que al tocar Destinos o Experiencias se carguen sus valores.
   - Verificar arrastre arriba/abajo y desplazamiento automático en las tres vistas amplias.
   - Mantener guardado, conflicto de borrador, revisión y publicación separados.

## Validación obligatoria

- Comparación visual completa constructor/público en 1440, 1280 y 1024.
- Regresión en 834, 430 y 390.
- Destinos: Valladolid principal y Ek Balam, Espita e Izamal secundarias, sin recorte ni superposición.
- Experiencias: tarjeta principal y filas secundarias completas.
- Selección, carga de campos, arrastre, scroll, header, footer, Alux y Mi Viaje.
- Contratos OMXDS, pruebas dirigidas y verificación humana en iPad antes de declarar PASS.

## Límites de preservación

No se modifican `HomePremiumSurface`, contenido CMS, medios, rutas públicas, orden aprobado, diseño Premium, datos, migraciones ni publicación. Si la comparación demuestra una divergencia en la autoridad pública, se detendrá el cambio y se reportará antes de tocarla.
