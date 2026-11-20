# Comparativa visual · Ficha de Experiencia vs. Ficha de Hotel/Restaurante
Fecha: 2026-09-17 · Estado: diagnóstico + propuesta. **No se modificó ninguna plantilla.**

Referencias comparadas (datos reales del CMS, entorno interno):
- Experiencia: `/producto/nado-en-cenote` → `ExperiencePremiumSurface`
- Hotel: `/oriente-maya/valladolid/hoteles/hotel-casa-tia-micha` → `BusinessSurface` (bloques oficiales del Experience Builder)

## 1. Diferencias observadas

| Elemento | Hotel / Restaurante (`BusinessSurface`) | Experiencia (`ExperiencePremiumSurface`) |
|---|---|---|
| Hero | `experience-hero` oficial, media a sangre 42/58, eyebrow, distintivos institucionales | Rejilla propia 1.05fr/1fr; si no hay portada el lado visual queda vacío |
| Barra de acciones | Compartir · Guardar · Agregar a Mi Viaje, agrupadas bajo el hero | Sólo "Agregar a Mi Viaje" en línea con el texto; sin Guardar ni Compartir |
| Galería | `experience-gallery` (mosaico 1+3) | Carrusel propio de 6 piezas, sin mosaico |
| Bloque de precio/decisión | Tarjeta de precio + acciones + nota honesta ("Tarifa orientativa…") | Línea de texto "Desde …" sin tarjeta, sin ancla de decisión |
| Subnavegación | `experience-subnav` (Resumen · Galería · Servicios · Reseñas · Ubicación) | No existe |
| Barra fija de acción | `experience-cta-bar` persistente | No existe |
| Reseñas | `experience-reviews` con valoración y opiniones | Sólo número de valoración en el encabezado |
| Ubicación | `BusinessLocationBlock` con mapa real | Tarjeta de texto + enlace "Cómo llegar" (sin mapa) |
| Relacionados | `experience-related-collection` | `PremiumCompactRow` propio |

## 2. Causa de "no puedo comprar en línea"

No es un defecto de la plantilla: hoy **ninguna** experiencia del CMS tiene la venta en línea acreditada
(`conversion_mode` distinto de `reservar_en_linea`, sin venta directa autorizada, sin precio de venta ni cupo).
`resolveExperienceCommerce` es fail-closed y muestra el aviso honesto en lugar de un botón que no podría cobrar.
"Agregar a Mi Viaje" sí está presente y operativo.

Además, la experiencia revisada no tiene fotos publicadas, lo que acentúa la diferencia visual frente al hotel.

## 3. Propuesta de ajuste (requiere autorización explícita del Founder)

Delta mínimo sobre la autoridad existente, sin crear superficies nuevas ni tocar el hotel/restaurante:

1. Que la ficha de Experiencia consuma los mismos bloques oficiales ya aprobados:
   `experience-hero`, `experience-subnav`, `experience-gallery`, `experience-reviews`,
   `BusinessLocationBlock`, `experience-cta-bar` y `experience-related-collection`.
2. Conservar íntegros los bloques propios que sí aportan valor turístico: relato, incluye/no incluye,
   itinerario, requisitos/idiomas/accesibilidad, políticas y preguntas.
3. Añadir la tarjeta de decisión (precio, valoración, Guardar, Compartir, Agregar a Mi Viaje y,
   sólo cuando esté acreditada, Reservar en línea), con la misma nota honesta del hotel.
4. Mantener sin cambio: Alux, iconos bordados, breadcrumb territorial, tipografía, paleta,
   datos CMS y la regla fail-closed de venta en línea.

### Invariantes que deben permanecer
Hotel, restaurante, casas de vacaciones, lugares, eventos, header, footer, Home, tienda `/experiencias`,
Alux y Mi Viaje: sin cambio alguno.

### Validación comprometida si se autoriza
Comparativa antes/después de la ficha completa en 1440, 834, 430 y 390 px, typecheck,
pruebas contractuales de Experiencias y revisión de consola/red.
