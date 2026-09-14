# Reparar asignación y flujo de cotización del expediente

## Alcance autorizado
- Corregir el botón **Asignarme** para mostrar éxito o una explicación clara del rechazo y refrescar inmediatamente el expediente.
- Conectar en cada solicitud vinculada a una empresa el control oficial **Solicitar cotización**, usando la operación existente y evitando solicitudes duplicadas.
- Mostrar con claridad el siguiente paso: la empresa captura monto, condiciones y vigencia en su Portal; cuando responde, el Concierge puede componer y enviar la propuesta al viajero.
- Mantener visibles las cotizaciones recibidas y el compositor oficial de propuestas ya existente.

## Preservación
- Sin cambiar datos existentes, roles, permisos, estados, tablas ni operaciones oficiales.
- Sin permitir que un perfil editorial se convierta en Concierge por seleccionar un modo visual.
- Sin alterar Mi Viaje, Alux, pagos, plantillas Premium, navegación pública, header o footer.
- Sin publicar ni desplegar.

## Implementación técnica
- Ajustar `CaseFileView` para usar la invalidación de datos del expediente, estados de carga y avisos legibles en asignación y cotización.
- Consumir `requestConciergeQuote` desde las solicitudes que ya incluyen una empresa válida.
- Ocultar la acción cuando ya exista una cotización activa para la misma solicitud y mostrar su estado actual.
- Añadir pruebas dirigidas del flujo y validar con una sesión realmente autorizada como Concierge/Admin.

## Validación
- Confirmar en la base que la asignación crea una asignación activa con el usuario autenticado correcto.
- Confirmar que una identidad alternativa enviada por el navegador no puede adjudicarse permisos.
- Confirmar solicitud de cotización → Portal Empresa → cotización recibida → borrador → envío al viajero, hasta donde permitan los perfiles de prueba disponibles.
- Revisar 1440, 834, 430 y 390 px, tipos, pruebas dirigidas y ausencia de errores visibles.
