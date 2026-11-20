# Compactación de fichas existentes · Preflight

## Alcance autorizado
Hoteles, restaurantes, casas de vacaciones, lugares/sitios de interés y eventos: reducir espacios en blanco y armonizar presentación, sin cambiar plantillas, orden, contenido ni funciones. No incluye reconstruir el constructor, modificar datos ni publicar.

## Autoridades y comparación
- Hoteles/restaurantes/casas: ruta territorial → `BusinessSurfaceContractBoundary` → `BusinessSurface`, con datos y recomendaciones públicos. El constructor ofrece las tres familias pero abre `__tpl_business__` con bloques individuales `vmx.business.*` y contenido de «Empresa demo · Valladolid.mx».
- Eventos: `/eventos/$slug` → `EventPremiumSurface`, datos y recomendaciones publicados. El constructor abre `__tpl_event__` con «Kit · Hero», insignias, galería, texto, tabla, ubicación, contacto y preguntas frecuentes; no representa esa misma autoridad pública.
- Lugares: ruta territorial → `PlacePremiumSurface`. Existe dispatch compartido en CompositionRenderer, pero al abrir «Lugar Premium · Cenote» (`__tpl_place__`) el lienzo observado sólo mostró encabezado y pie, sin ficha. No acredita paridad funcional de la composición vigente.
- Sesión del solicitante autorizada; sólo navegación y lectura, ningún guardado ni publicación. Evidencia en `/tmp/browser/compact-fiches/parity.txt` y capturas por familia en ese directorio.
- Listados públicos consultados identificaron Calzada de los Frailes, Cenotes Suytun/Zací y Convento San Bernardino; eventos incluyen Valladolid en la Historia. La consulta acredita enlaces visibles, no certifica todas las fichas ni procedencia de los datos.

## Delta de presentación candidato, todavía no aplicado
Revisar acumulación de márgenes `mt-10`/`sm:mt-16` y relleno editorial interno; mantener fotos, áreas táctiles y reservas de espacio para Alux. Las recomendaciones de negocios y lugares ya usan tarjetas compactas 190–240 px y fotos 16:9; no hacer cambios artificiales para reproducir lo existente. No modificar globalmente ExperienceSection ni TourismCard.

## Gates
- Scope: PASS para preflight y documentación; ninguna plantilla ni dato modificado.
- Preservation: BLOQUEADO para implementación: negocios y eventos usan composiciones distintas en el constructor; lugares carece de evidencia comparable en el lienzo observado.
- No se ejecutaron pruebas, lint ni gates de implementación porque no existe delta de aplicación. No se declara validación completa de 1440/834/430/390 ni cierre visual.

## Pendiente
Autorización delimitada para reconectar las composiciones existentes del constructor con sus autoridades públicas, sin reconstruir diseño ni sustituir datos CMS. Después, comparación completa por familia y compactación localizada. No ampliar implícitamente el alcance actual para corregir esa dependencia.

## Revalidación · 2026-10-23 04:40 UTC
- Founder autoriza la conexión y compactación, pero prohíbe modificar la forma y estructura de las plantillas. Solicita tamaños tipográficos coherentes y legibilidad compacta en celulares, con Airbnb como referente de proporción, no reemplazo de identidad.
- Corrección del diagnóstico anterior: esperando la carga del selector y seleccionando `hotel-sutuk`, el lienzo SÍ muestra «Hotel Sutuk». No se acredita un fallo de transferencia al iframe: `createPortal` conserva el contexto React. La observación previa de demo tras seleccionar no era evidencia suficiente de fallo de lectura.
- La divergencia estructural editorial permanece: el árbol guardado muestra `vmx.business.*`, con galería/información/productos separados, en lugar de la composición pública completa `BusinessSurface`. La selección real no introduce las recomendaciones públicas ni cambia esa autoridad.
- Evidencia nueva: `/tmp/browser/compact-connection/check_connection.py`, captura `selected.png`; sesión del solicitante, sin guardar ni publicar. No hay cambios en superficies, fuentes o datos CMS.
- Se descarta montar una ficha completa alternativa sólo en preview: ocultaría la diferencia de estructura editable y podría perder selección, visibilidad y reordenamiento de nodos guardados. Tampoco se autoriza reemplazar automáticamente el árbol por un preset.
- Scope de investigación PASS. Preservation de compactación sigue bloqueado hasta una reconciliación editorial que preserve los controles y datos de cada composición, no sólo su apariencia pública.