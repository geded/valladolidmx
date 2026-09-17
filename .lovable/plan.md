# Unificación global de fichas empresariales Premium

## Objetivo
Eliminar de todas las rutas públicas de empresa el formato editorial antiguo. Cada hotel, restaurante, casa de vacaciones, cenote y demás empresa publicada usará la única ficha `BusinessSurface` aprobada. Las landings promocionales `/l/<slug>` seguirán separadas e intactas.

## Diagnóstico confirmado
- La ruta territorial de empresa aún permite renderizar una composición `biz-<empresa>` o la plantilla antigua `__tpl_business__` en lugar de la ficha oficial.
- En los datos actuales sólo existe una composición publicada de ese tipo: `biz-zazil-tunich`.
- Esa bifurcación explica el cambio de apariencia. La landing SEO no es la causa y no debe eliminarse.

## Scope Gate
1. Corregir la ruta pública territorial de empresa para que siempre renderice `BusinessSurface` con su familia y contenido CMS.
2. Conservar únicamente los textos editables compatibles del bloque oficial `vmx.business.premium` cuando existan.
3. Alinear la vista previa del CMS con esa misma autoridad.
4. Añadir una comprobación que impida reintroducir composiciones editoriales antiguas en perfiles empresariales.

No se modificarán datos, fotografías, productos, ubicaciones, navegación, Experience Builder ni landings `/l/<slug>`.

## Preservation Gate
Permanecen invariantes:
- Plantillas Premium aprobadas de hotel, restaurante y casa de vacaciones.
- Header, footer, breadcrumb, idioma, Alux y Mi Viaje.
- Contenido, medios, logo, ubicación, reseñas, promociones y productos del CMS.
- SEO canónico de los perfiles y SEO independiente de las landings promocionales.
- Reglas de elegibilidad Premium y comportamiento fail-closed.

## Implementación mínima
- Retirar de la ruta empresarial el render alternativo de `CompositionRenderer`.
- Mantener `BusinessSurfaceContractBoundary` y `BusinessSurface` como única salida visual.
- Mantener la lectura de composición sólo para textos compatibles del bloque Premium; ignorar estructuras antiguas en el perfil.
- No borrar `biz-zazil-tunich`: quedará preservada como dato histórico, pero dejará de sustituir el perfil público.

## Validación
- Comparar una ficha de cada familia disponible y Zazil Tunich en 1440, 834, 430 y 390 px.
- Verificar perfil público, preview CMS, breadcrumb, galería, mapa, reseñas, Alux, Mi Viaje, logo y enlaces.
- Confirmar que `/l/<slug>` continúa independiente.
- Ejecutar typecheck, prueba contractual, Route Inventory, Governance Integrity y revisión de errores del navegador.
- No publicar al dominio.
