# Plan · Optimización automática de imágenes al subir

## Alcance autorizado
Corregir exclusivamente los flujos existentes de carga de imágenes para reducir peso web. No cambiar plantillas, composición visual, contenido, navegación, medios ya publicados, datos reales ni activar Commerce/Visitor Intelligence.

## Hallazgo
- Destinos, zonas, empresas y productos dentro del CMS ya usan el optimizador compartido antes de subir.
- La galería empresarial del Portal y el panel avanzado de productos todavía envían el archivo original pesado.
- La Biblioteca de Medios conserva deliberadamente el original inmutable, como exige H3·A4; hoy no debe recortarse ni reemplazarse por una copia comprimida.
- El pipeline de variantes WebP/AVIF existe, pero su activación global sigue gobernada por fases y no se activará de forma encubierta.

## Implementación
1. Fortalecer el optimizador compartido existente:
   - validar formato y peso;
   - limitar dimensiones según uso (portada, galería, logo);
   - generar WebP/JPEG con calidad web;
   - conservar transparencia cuando corresponda;
   - devolver dimensiones y reducción obtenida;
   - no aumentar el peso si el archivo ya está optimizado.
2. Conectar el mismo optimizador a los flujos faltantes del Portal y productos, antes de solicitar la subida.
3. Registrar en `media_assets` el tipo, peso, ancho y alto reales del archivo optimizado.
4. Mantener la Biblioteca central bajo el principio de original inmutable. No sustituir ni recomprimir destructivamente el original; dejarla preparada para que el pipeline aprobado genere derivados.
5. Mostrar mensajes claros durante la carga y rechazar imágenes inválidas o demasiado pesadas antes de enviarlas.

## Preservación
- Sin cambios visuales en Home, destinos, listados, fichas ni Experience Builder.
- Sin nuevas plantillas, componentes paralelos, buckets, tablas, migraciones, RLS, secretos, cron, publicación o despliegue.
- Sin alterar imágenes existentes ni sus asociaciones CMS.
- Marca y sistema OMXDS permanecen intactos.

## Verificación
- Pruebas unitarias del optimizador: reducción, dimensiones máximas, formato, transparencia y archivo ya optimizado.
- Typecheck, ESLint focalizado y pruebas existentes relacionadas.
- Prueba funcional de subida en Portal/CMS con una imagen grande, confirmando peso y dimensiones finales.
- Revisión de regresión del selector/biblioteca y de las vistas previas existentes.
