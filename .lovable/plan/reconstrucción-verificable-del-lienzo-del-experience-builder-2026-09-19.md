# Reconstrucción verificable del lienzo del Experience Builder

## Alcance autorizado

**Tipo:** corrección estructural del lienzo existente, no rediseño de plantillas.

Las capturas nuevas confirman que el lienzo actual no es una representación confiable: Destinos omite elementos, Experiencias queda inconclusa, la composición y escala tipográfica no coinciden con la web, y los controles editoriales participan dentro del documento. Se detiene la expansión a las 21 plantillas hasta demostrar paridad real con Home.

## Scope Gate

Se autoriza evolucionar el `CanvasViewport` y sus controles dentro del Experience Builder único. No se crea otro constructor, otra plantilla Home ni otro renderer. No se toca la Home pública, CMS, datos, rutas, pagos, reservas, permisos ni publicación.

## Reconstrucción — una historia a la vez

### Historia 1 · Documento visual fiel

1. **Línea base comprobable**
   - Medir en tiempo real constructor, vista previa y web pública: ancho lógico, ancho pintado, escala, alto total y límites de cada sección.
   - Registrar la cantidad e identidad de Destinos y Experiencias recibidos por cada superficie.
   - No corregir con recortes ni escalas hasta localizar la divergencia exacta.

2. **Una sola autoridad de contenido y render**
   - El lienzo usa el mismo árbol resuelto, corpus CMS, renderer y estilos que la vista previa y la ruta pública.
   - Las ediciones del borrador complementan filas reales por identificador estable; nunca sustituyen una colección completa ni inventan contenido.
   - Un estado de carga no puede presentarse como plantilla terminada: el lienzo espera la autoridad o muestra un estado editorial explícito.

3. **Lienzo con tamaño lógico real**
   - La plantilla mantiene exactamente el ancho seleccionado (390, 430, 768, 834, 1024, 1280 o 1440).
   - A 100%, tipografía, saltos de línea, rejillas y alturas coinciden con la web. Si el área no alcanza, se usa desplazamiento horizontal o el modo de área amplia; los paneles no cambian el ancho lógico.
   - La reducción visual, cuando el editor la elija, transforma únicamente una envolvente externa y nunca cambia layout, puntos de corte ni alto del documento.
   - El alto se obtiene del contenido completo; se elimina el alto fijo del dispositivo y el scroll interno anidado que corta Experiencias.

4. **Controles fuera del documento**
   - Selección, contornos, tiradores y destinos de arrastre se dibujan en una capa editorial exterior sincronizada con los rectángulos de las secciones.
   - Se retiran del documento los botones inyectados y `contain:paint`/`isolation:isolate`; ninguna regla editorial puede cambiar pintura, tamaño o flujo de la plantilla.
   - Arrastre táctil, autoscroll, inspector, deshacer/rehacer y estado seleccionado permanecen en el Workspace existente.

5. **Prueba de aceptación de Home antes de extender**
   - Destinos muestra Valladolid principal y Ek Balam, Espita e Izamal secundarios, exactamente como la Home en línea.
   - Experiencias muestra la colección y final completo, sin huecos, recortes ni superposición.
   - Títulos, saltos, tamaños de texto, imágenes, secciones posteriores, header y footer coinciden.
   - Edición, ocultar, reordenar, guardar, recargar y vista previa conservan el resultado.

### Historias posteriores · por familia

Sólo después de la aceptación humana de Home se replica el mecanismo común, una familia por vez: Destino; seis listados; seis variantes de Lugar; seis fichas Premium; Landing. Cada familia exige comparación propia y no se declara terminada por pruebas sintéticas.

## Preservation Gate

Permanecen invariantes las plantillas Premium, `HomePremiumSurface`, marca y OMXDS, contenido y medios CMS, breadcrumb, mapas, Alux, Mi Viaje, navegación, SEO, analítica, rutas públicas y publicación manual. No se crean componentes V2/New, fixtures ni superficies paralelas.

## Validación obligatoria de la Historia 1

- Comparación visual completa constructor / vista previa / público en 1440, 1280, 1024, 834, 430 y 390.
- Evidencia de conteos, rectángulos, alturas, saltos tipográficos y ausencia de overflow para todas las secciones de Home.
- Prueba real en iPad/Safari además de Chromium.
- Typecheck, pruebas dirigidas, build, smoke, auditoría de no regresión, rollback documentado y Completion Report.
- **El PASS técnico no equivale a paridad visual. La historia queda abierta hasta aceptación humana del Founder.**
- No se publica nada.
