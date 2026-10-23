# Armonía de plantillas · Preflight del primer lote

## Alcance aprobado
Sólo presentación compacta por familia, conservando secciones y funciones; primera muestra en recomendaciones de ficha hotel/restaurante, con aceptación antes de extender. Sin publicación, datos, permisos ni sustitución de plantillas.

## Evidencia observada
- Ficha real: `/oriente-maya/valladolid/hoteles/hotel-sutuk`, H1 «Hotel Sutuk».
- Capturas y registro del recorrido de todas las secciones públicas en 1440/834/430/390, con textos, enlaces, medios y alturas guardados en `/tmp/browser/harmony-first/before-*.json`; capturas de recomendaciones y cabecera en el mismo directorio.
- Las recomendaciones ya usan densidad compacta, ancho máximo 240px e imagen 16:9 mediante `ExperienceRelatedCollection` y `TourismCard`. No se debe introducir un cambio artificial para repetir geometría ya existente.
- Constructor autenticado con la cuenta del solicitante: «Hotel Premium» abre `/cms/experience-builder?mode=visual&page=__tpl_business__`.
- El lienzo muestra bloques individuales «Empresa · Badges de encabezado», «Empresa · Descripción», «Empresa · Galería», «Empresa · Información», «Empresa · Productos», «Empresa · Promociones» y «Empresa · Contacto», con contenido demo. No presenta la sección de recomendaciones de la ficha pública.
- Seleccionar `hotel-sutuk` actualiza el valor del selector pero el lienzo observado continúa con «Empresa demo · Valladolid.mx» y productos demo. No se guardó ni publicó contenido.

## Causa delimitada por código
`composition-renderer.tsx` soporta tanto `vmx.surface.business` como bloques individuales `vmx.business.*`; la composición abierta pinta estos últimos. El provider del registro de preview recibe sólo `business`, no los datos `related` que aporta la ruta pública. Tener una referencia a `BusinessSurface` en el registro no acredita que la composición vigente lo esté utilizando ni que la recomendación tenga paridad.

## Gates independientes
- **Scope Gate:** PASS para investigación de sólo lectura y documentación; ningún archivo de presentación, contrato, ruta, dato o permiso modificado.
- **Preservation Gate:** BLOQUEADO para implementar el primer lote. La comparación constructor/público no comparte la plantilla completa observada; no puede certificarse preservación de recomendaciones inexistentes en el lienzo.
- Compilación automática previa: último registro «build OK». No se ejecutaron pruebas ni gates globales de implementación porque no hay delta funcional; no se declara cierre técnico ni visual.

## Detención y siguiente decisión
Conforme a la política 19.47 y al plan aprobado, detener los cambios visuales de esta familia y reportar la divergencia. Reconciliar la plantilla vigente del constructor con la autoridad pública requiere un alcance correctivo separado, sin cambiar el diseño público, sin reemplazar datos CMS por demos y sin publicar automáticamente. No aplicar armonización general mientras esta dependencia esté pendiente. Los demás lotes esperan la primera muestra aceptada, según la secuencia aprobada.