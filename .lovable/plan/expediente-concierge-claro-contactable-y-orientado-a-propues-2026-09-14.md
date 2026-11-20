# Expediente Concierge claro, contactable y orientado a propuesta

## Objetivo
Convertir el detalle actual en una herramienta de trabajo clara sin crear otro expediente ni alterar el flujo oficial: el viajero entrega contacto verificable antes de enviar; el Concierge revisa el viaje, solicita cotizaciones puntuales a empresas y compone la propuesta económica final.

## Scope Gate
**Autorizado**
- Mostrar la referencia existente como `Expediente CCD06712`, sin crear un folio nuevo.
- Exigir antes de “Enviar al Concierge”: nombre, correo de la cuenta y móvil.
- Pedir una casilla explícita que autorice contacto por WhatsApp en ese móvil.
- Mostrar esos datos únicamente al equipo Concierge autorizado dentro del expediente.
- Reordenar la información del detalle para distinguir: cliente, viaje solicitado, cotizaciones empresariales y propuesta final del Concierge.
- Hacer más completo y legible el compositor de propuesta existente.

**No autorizado**
- No crear otra superficie, otro modelo de viaje ni otra vía de creación de expedientes.
- No compartir identidad, teléfono, correo o WhatsApp con empresas.
- No permitir que las empresas creen o envíen la propuesta final.
- No cambiar pagos, órdenes, roles, asignaciones, plantillas Premium, navegación pública, Alux, header o footer.
- No publicar ni desplegar.

## Implementación
1. **Prevalidación antes del envío**
   - Reutilizar el perfil personal existente para nombre, correo y móvil.
   - Añadir al perfil del viajero el consentimiento explícito para WhatsApp, con fecha de aceptación.
   - En Mi Viaje, bloquear “Enviar al Concierge” hasta completar los tres datos y aceptar la casilla.
   - Permitir completar nombre y móvil en el mismo paso; el correo se toma de la cuenta y se muestra como no editable.
   - Validar formato y límites tanto en pantalla como en servidor.

2. **Contacto protegido dentro del expediente**
   - Ampliar la composición oficial `concierge_case_file_v1` para resolver por referencia nombre, correo, móvil, idioma y consentimiento.
   - Entregar teléfono/correo sólo cuando quien consulta sea Concierge, Concierge Lead, Admin o Super Admin con acceso al expediente.
   - Mantener el Portal Empresarial sin identidad ni contacto del viajero.

3. **Jerarquía operativa del detalle**
   - Encabezado: `Expediente CCD06712`, estado, fecha, prioridad y resumen en lenguaje claro.
   - Bloque “Cliente y contacto”: nombre, correo, móvil y acciones accesibles de correo, llamada y WhatsApp sólo cuando exista autorización.
   - Bloque “Qué solicita el viajero”: datos del plan, fechas, personas, notas, preferencias y servicios, sin claves internas.
   - Cada servicio indicará claramente si requiere cotización empresarial, si está esperando respuesta o si ya puede incluirse en la propuesta.

4. **Cotización empresarial vs. propuesta Concierge**
   - Explicar dentro del flujo que la empresa responde únicamente precio, vigencia, notas y condiciones de su servicio.
   - Mantener las cotizaciones recibidas agrupadas por servicio y empresa.
   - Mejorar el compositor oficial para que el Concierge seleccione cotizaciones recibidas, redacte resumen, condiciones y vigencia, vea el total y cree el borrador.
   - El botón de envío final seguirá siendo exclusivo del Concierge y usará las operaciones oficiales existentes.

5. **Controles y evidencia**
   - Añadir contratos dirigidos para obligatoriedad de contacto, privacidad empresarial, referencia legible y autoría de la propuesta.
   - Verificar envío incompleto/completo, lectura interna, Portal Empresarial sin PII, solicitud de cotización, borrador y envío de propuesta.
   - Ejecutar typecheck, pruebas dirigidas, diff check y revisión visual completa en 1440, 834, 430 y 390 px.

## Preservation Gate
Se preservan la única puerta `promotePlanToCase`, el Customer Case File oficial, el Portal Empresarial, las operaciones `concierge_quote_*` y `concierge_proposal_*`, permisos vigentes, Mi Viaje, Alux, pagos y toda superficie pública. Cualquier diferencia fuera de los bloques autorizados detiene la entrega.
