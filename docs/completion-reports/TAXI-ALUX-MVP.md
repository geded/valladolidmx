# Taxi Alux · MVP · Completion Report

Fecha: 2026-11-25 · Carril A Producto · Estado: implementado y probado en preview; publicación pendiente.

## Alcance entregado

- `/taxi`: servicio activable, cotización del servidor, disponibilidad real, solicitud con cuenta obligatoria y efectivo al conductor.
- `/registro-taxista/$token`: formulario privado creado por administración; datos personales, contacto, inglés/otros idiomas, sindicato, licencia, seguro y vehículo.
- `/cms/taxi-alux`: interruptor, tarifas, enlaces de invitación, revisión/aprobación/rechazo, conductores y viajes activos/realizados/cancelados.
- `/cuenta/taxi`: historial, seguimiento, cancelación permitida, conductor e importe.
- `/taxista`: Workspace móvil, disponibilidad, aceptación, ubicación, llegada, inicio, terminación y registro de efectivo.
- Instalación PWA y activación de push reutilizan la infraestructura existente. Los correos usan la plantilla transaccional `taxi-ride-status`.

## Preservación

No se sustituyeron plantillas Premium, fichas, navegación territorial, Alux, Mi Viaje, pagos ni reservaciones. Se reutilizaron PublicShell, Workspace Engine, mapas, PWA, notificaciones y correo. El servicio quedó desactivado; no hay cobro en línea ni conductores reales precargados.

## Verificación

- 8/8 pruebas de reglas: apagado inicial, cuenta obligatoria, disponibilidad, efectivo, orden de estados, cancelación y aprobación con inglés/datos completos.
- Route Inventory: 290 rutas cubiertas.
- Typecheck sin errores; compilación automática OK.
- Recorrido real con tres cuentas temporales: administrador crea enlace; taxista envía formulario; administrador aprueba; taxista se hace disponible; viajero cotiza $125 por 2.7 km/9 min y solicita; taxista acepta, marca llegada, inicia y termina; efectivo registrado; viajero y administración muestran «Viaje realizado».
- Revisión visual en escritorio y 390 px. Los mapas mostraron el fallback compartido cuando el SDK no estuvo disponible en el entorno de prueba.
- Al finalizar: servicio apagado y taxista temporal no disponible.

## Demo Pack · DATOS TEMPORALES

- Folio: `TAXI-8C9BB957`.
- Taxista: «Taxista Temporal Taxi Alux», Nissan Versa blanco, placas `TMP-001`.
- Viajero/ruta: «Viajero Temporal Taxi Alux», Hotel Temporal Centro → Cenote Temporal de Prueba.
- Importe: $125 MXN, efectivo marcado como pagado.
- Consulta: `/cms/taxi-alux` → Viajes → Realizados; también `/cuenta/taxi` con la cuenta temporal mientras exista.
- Las cuentas de prueba son administradas por el entorno y no se entregan como credenciales permanentes. El registro queda como evidencia temporal y no representa un taxi real.
- No eliminar estos datos hasta que el Founder escriba literalmente: «Demo validada. Puedes eliminar los datos temporales.»

## Pendientes de validación externa

Publicar; probar instalación física, permisos de ubicación, push y recepción de correo en celulares; invitar y revisar conductores reales; validar tarifas y operación del piloto. No se afirma validación de correo/push físico ni disponibilidad del SDK de mapas en producción.
