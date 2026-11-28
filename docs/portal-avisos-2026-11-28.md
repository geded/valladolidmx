# Portal empresarial: ubicaciones y avisos claros

## Alcance autorizado
Autorización del Founder del 28 de noviembre de 2026: conectar edición de ubicaciones y revisar los mensajes incomprensibles que recibe el empresario al trabajar con su empresa. Corrección y extensión localizada del Portal existente, no rediseño.

## Implementado
- «Editar» carga la ubicación existente; «Guardar cambios» reutiliza `updateBusinessLocation`, y «Cancelar» conserva el registro.
- El formulario no borra lo escrito si falla el guardado. Límites existentes visibles/prevenidos en los campos; errores de longitud explican dónde corregir.
- Vocabulario compartido `src/lib/portal/error-messages.ts`: reconoce validación, acceso, sesión, conexión, duplicados y límites del plan; no imprime errores desconocidos de proveedores.
- Avisos conectados en contactos/ubicaciones/horarios/redes, ficha, catálogo, galería, invitaciones, propiedad, cotizaciones, reseñas, reportes, pagos, ventas, WhatsApp y herramientas de calendario/tienda/hotel. Mensajes especializados aprobados de reservas conservados.
- Requisitos de publicación expresados sin «Media», «FAQs», «SEO» o «Founder» como instrucciones al empresario.
- Estado de empresa del selector e invitaciones en español. No se cambian valores almacenados.

## Autoridad e invariantes
Familia: Portal empresarial sobre Workspace Engine. Pantalla afectada: `/portal/presencia`, formulario y tarjetas de la ubicación actual de `business_locations`. No tiene preset/preview del Experience Builder porque es una pantalla operativa autenticada, no una plantilla pública.

No se modificaron plantillas Premium, constructor, composición pública, fotos, marca, navegación, permisos, funciones de guardado, tablas, migraciones, reservas, pagos, cron ni configuración de despliegue. La edición envía solo campos editables: nunca reemplaza vínculo territorial ni identifica otra empresa.

## Verificación
- Sesión autorizada del solicitante: Zazil Tunich en `/portal/presencia`.
- «Editar» precarga todos los campos. Envío de referencias de 241 caracteres produjo el error real del servidor; se mostró explicación en español y se conservaron los campos, sin escribir datos inválidos.
- Guardado con los mismos valores existentes → aviso «Ubicación actualizada» → consulta y reapertura confirmaron nombre/dirección/CP/coordenadas idénticos. No se alteró contenido real; el guardado normal dejó su auditoría.
- Vista completa del Portal antes/después a 1440, 834, 430 y 390 px, sin desbordes. Cambio autorizado: botones de edición/guardado y avisos. Header, navegación y contenido existente permanecen.
- Aperturas autenticadas: ficha, galería, catálogo, reportes, invitaciones, propiedad, reservas de mesa y WhatsApp; cero errores JavaScript.
- 20 pruebas PASS: edición de ubicación (2), reservas de mesa (9), calendario de noches (9). ESLint localizado comprobado; formato original restaurado en herramientas de reservas/calendario para evitar cambios colaterales.
- Compilación automática: OK. Inventario regenerado; Governance Integrity: PASS.
- Control global de autorizaciones: NO PASS; denuncia manifiestos históricos y ausencia de manifiestos exactos para este delta. No se modificaron evidencias reconciliadas.

## Pendientes y demostración
No se certifica iPhone físico ni se publica automáticamente. El control global requiere reconciliación autorizada independiente; no constituye un PASS del Preservation Gate por sí solo.

Demostración con datos existentes: Portal → Presencia → Ubicaciones → Editar → modificar un campo → Guardar cambios. No hay nuevo tipo de entidad ni datos demo sembrados. Las capturas temporales se guardaron en `/tmp/browser/portal-avisos/`.

Reversión: retirar la conexión de edición y avisos del delta; sin reversión de esquema ni cambios de contenido. La decisión técnica vive en los módulos existentes del Portal; no se creó engine, registro, proveedor ni persistencia paralela. No se añadió regla a AGENTS.md porque el archivo agotó su presupuesto protegido.