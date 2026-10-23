# Fotos del destino estilo Airbnb (plantilla única de destinos)

Aplica a Valladolid y a todos los destinos, porque comparten la misma plantilla.

## Lo que se ve hoy (tus capturas)
1. La portada es un carrusel dentro de una tarjeta: la foto no ocupa el ancho ni manda arriba.
2. Las fotos están repartidas en tres sitios (portada, "Descubre" y galería), y en móvil quedan sueltas: una grande y una chica con hueco a un lado.
3. Al subir no hay forma de elegir qué parte de la foto se ve (centrar/acomodar), así que se cortan cabezas o fachadas.
4. Extra: en Inicio la tarjeta "Valladolid" muestra una imagen rota (cuadrito "?").

## Propuesta (cambio solo de fotos; textos, Alux, Mi Viaje, mapa, cercanos, menú y pie quedan igual)
1. **Portada tipo Airbnb**
   - Escritorio/tableta: mosaico de 5 — foto grande a la izquierda + 4 chicas a la derecha, esquinas redondeadas, botón "Ver todas las fotos (12)".
   - Móvil: foto a todo el ancho, deslizable con el dedo, contador "1/12" en la esquina; el título y botones debajo como hoy.
2. **Una sola galería**: todas las fotos del destino se ven juntas en una ventana completa al tocar "Ver todas las fotos" (con flechas y deslizar). "Descubre" queda con su texto y una sola foto, sin la tira suelta.
3. **Acomodar la foto al subir**: en la ventana de subida, tocar sobre la foto para marcar el punto que siempre debe verse (ej. la torre de la iglesia), con vista previa de cómo se verá en móvil y en escritorio. También se podrá reajustar después en fotos ya subidas, sin volver a subirlas.
4. **Arreglar la tarjeta rota de Valladolid en Inicio** para que use la portada acreditada.

## Qué no cambia
Fotos originales, compresión automática, declaración de derechos, orden de secciones, colores, tipografía, header, footer, breadcrumb, Alux y Mi Viaje.

## Antes de aplicar
Te mostraré una maqueta (escritorio y móvil) para tu visto bueno; solo después la aplico al sitio. Revisión en 1440, 834, 430 y 390.

## Detalles técnicos
- Autoridad: `DestinationPremiumSurface` (HeroEditorial/HeroCinematografico, Descubre, Galería); se evoluciona el componente aprobado, sin crear versiones paralelas. Constructor, vista previa y ruta pública siguen usando el mismo render.
- Punto de enfoque guardado como `focal_x/focal_y` (0–1) en la metadata existente del medio (sin tabla nueva); se aplica con `object-position` vía `EditorialMediaFrame`, compartido por todas las superficies.
- Editor de enfoque añadido al diálogo de encuadre compartido (Single Image Upload System), así sirve también para empresas y zonas.
- Diagnóstico de la tarjeta de Inicio en el adaptador de destinos de Home.
