# Espera Concierge clara y atractiva para el viajero

## Objetivo
Después de enviar **Mi Viaje**, el viajero debe entender inmediatamente que su solicitud fue recibida, qué está ocurriendo y dónde encontrará la propuesta económica, manteniendo interés sin inventar plazos, precios ni avances.

## Scope Gate
Cambiar únicamente las superficies del viajero:
- **Mi Viaje → Concierge**, después del envío.
- **Mis expedientes Concierge**, listado y acceso al detalle.
- **Detalle del expediente del viajero**, incluida la espera y la propuesta recibida.

Archivos previstos:
- `src/routes/_authenticated/cuenta/mi-viaje.tsx`
- `src/routes/_authenticated/cuenta/concierge.tsx`
- `src/routes/_authenticated/cuenta/concierge.$caseId.tsx`
- `src/components/concierge/CaseFileView.tsx`
- pruebas dirigidas y `roadmap.md`

## Propuesta
1. **Confirmación persistente en Mi Viaje**
   - Sustituir el aviso débil por un estado destacado: “Tu viaje ya está con el Concierge”.
   - Explicar que el equipo revisa las experiencias y solicita disponibilidad o cotización cuando corresponda.
   - Mostrar un acceso claro a **Ver seguimiento**.
   - Aclarar que el viajero recibirá un aviso cuando su propuesta esté lista, sin prometer una fecha.

2. **Expedientes fáciles de encontrar y abrir**
   - Convertir cada expediente en un acceso completo, no sólo texto informativo.
   - Reemplazar códigos visibles como `new` y `travel_plan` por estados y orígenes comprensibles.
   - Dar prioridad al nombre del viaje, su estado actual y la última actualización; dejar el identificador sólo como referencia secundaria.

3. **Progreso basado exclusivamente en datos reales**
   - Mostrar una secuencia breve: **Recibido → En revisión → Preparando propuesta → Propuesta lista**.
   - Derivar cada etapa de los estados, solicitudes, cotizaciones y propuestas ya existentes.
   - No marcar una etapa como concluida si los datos no la acreditan.
   - Para el caso actual, mostrar “Recibido” y “Esperando revisión del equipo Concierge”.

4. **Espera con valor, sin contenido inventado**
   - Mostrar las experiencias que el viajero envió y un resumen de lo que se está considerando.
   - Ofrecer la acción existente para enviar una nota adicional al Concierge.
   - Explicar el siguiente paso: cuando llegue la propuesta podrá revisar qué incluye, importe, vigencia y decidir si confirma o rechaza.
   - Evitar promociones, recomendaciones o tiempos ficticios para “mantener interés”.

5. **Propuesta económica con mayor jerarquía**
   - Cuando exista una propuesta enviada, elevarla al inicio del expediente con importe, vigencia, experiencias incluidas y acciones existentes.
   - Conservar exactamente las reglas actuales de aceptación, rechazo, órdenes y pago.

6. **Avisos existentes**
   - Conservar el contrato oficial: al enviarse una propuesta, el viajero recibe aviso dentro de la cuenta, correo y notificación push cuando esté disponible.
   - La pantalla explicará ese comportamiento; no se crearán canales ni automatizaciones nuevas.

## Preservation Gate
Se preservan sin cambios:
- La única puerta `promotePlanToCase` y el expediente existente.
- Datos, estados, permisos, privacidad y reglas de visibilidad.
- Asignación interna, prioridades, tiempos operativos y herramientas del Concierge.
- Cotizaciones empresariales, propuestas, aceptación/rechazo, órdenes y pagos.
- Alux, mapas, navegación, header, footer, marca, plantillas Premium y resto de Mi Viaje.
- Sin backend nuevo, migraciones, datos demo, publicación ni despliegue.

## Validación
- Caso real del viajero con seis elementos: envío confirmado, etapa correcta, expediente visible y acceso funcional.
- Estado sin propuesta y estado con propuesta enviada.
- Vista del viajero sin datos internos; vista del Concierge sin regresiones.
- Revisión completa en 1440, 834, 430 y 390 px; un H1, sin desbordes ni errores.
- Typecheck, contratos dirigidos y prueba del flujo Mi Viaje → expediente → propuesta.
