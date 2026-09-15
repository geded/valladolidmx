# Armonización de la ficha Premium de rutas

## Diagnóstico

La ficha `/rutas/{slug}` ya usa su autoridad aprobada `RoutePremiumSurface`, pero su presentación proviene en parte de piezas visuales del Home. Por eso se percibe distinta de las fichas Premium de hotel y restaurante, cuya autoridad común es `BusinessSurface` con los bloques OMXDS de entidad.

Este trabajo se clasifica como **armonización visual localizada**. No sustituye la plantilla de rutas, no convierte una ruta en negocio y no crea otra superficie.

## Alcance autorizado propuesto

Actualizar la autoridad existente de rutas para adoptar el mismo lenguaje visual Premium de las fichas de hotel y restaurante:

1. **Portada de entidad Premium**
   - Reutilizar `PremiumHero` en su variante `entity`, manteniendo el título, resumen, portada y origen publicados en el CMS.
   - La fotografía irá primero en móvil y a la derecha en escritorio, igual que las demás fichas Premium.
   - Integrar duración, ritmo, dificultad y número de paradas como datos compactos dentro de la portada.

2. **Acciones de la ficha**
   - Colocar `Agregar a Mi Viaje` en la zona de acciones inmediatamente posterior a la portada.
   - Incorporar la acción compartida de compartir si ya está disponible en el sistema.
   - Eliminar el texto técnico sobre la referencia privada; no cambia el comportamiento ni los datos guardados.

3. **Alux y navegación interna**
   - Mover la barra contextual de Alux debajo de la portada, como en hotel y restaurante, conservando exactamente su tarea y señales de ruta.
   - Añadir navegación interna compacta hacia Mapa, Itinerario y Galería únicamente cuando cada sección exista.

4. **Mapa, itinerario y galería**
   - Mantener el mapa oficial, pines, nombres, trazo vial, kilómetros, tiempo y “Cómo llegar”.
   - Presentar el resumen del mapa con la misma jerarquía, borde, radio, sombra y espaciado de las fichas Premium.
   - Hacer las paradas más editoriales y compactas, sin cambiar orden, enlaces, días, duración ni contenido CMS.
   - Reutilizar el mosaico oficial de galería cuando existan fotografías; sin fotografías, no se inventa contenido.

## Archivos autorizados

- `src/components/routes-premium/RoutePremiumSurface.tsx`
- `src/components/routes-premium/RouteMapSection.tsx`

Sólo si resulta indispensable para reutilizar una pieza existente sin duplicarla:

- un componente compartido ya aprobado de `src/components/premium/` o `src/components/share/`, sin cambiar sus otros consumidores.

## Invariantes de preservación

Permanecen sin cambios:

- `RoutePremiumSurface` como única autoridad de la familia y `/rutas/{slug}` como ruta pública;
- fuente CMS, contrato, paradas, coordenadas y cálculo vial;
- hero/contenido real, breadcrumb territorial, header, footer y SEO/JSON-LD;
- Alux, Mi Viaje, mapa y enlaces a las fichas de cada parada;
- orden funcional mapa → itinerario → galería;
- portada, destinos, hoteles, restaurantes y demás plantillas;
- cero migraciones, datos nuevos, fixtures o publicación.

## Controles

- **Scope Gate:** sólo los dos componentes de la ficha de rutas; ninguna modificación a hoteles o restaurantes.
- **Preservation Gate:** comparación completa antes/después de `/rutas/pueblos-coloniales` y `/rutas/ruta-sukin`.
- Validación visual en 1440, 834, 430 y 390 px.
- Verificar portada, breadcrumbs, Alux, Mi Viaje, mapa, nombres de pines, trazo vial, días, paradas, galería, header y footer.
- Typecheck, pruebas de mapas y smoke de las rutas.
- No publicar sin autorización posterior.

## Resultado esperado

La ficha seguirá siendo inequívocamente una ruta del Oriente Maya, pero compartirá con hoteles y restaurantes la misma composición Premium de entidad, jerarquía tipográfica, proporciones, acciones, navegación interna y tratamiento editorial.
