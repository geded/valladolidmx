# Reservaciones y pagos visibles para el concierge

## Qué encontré en el sistema actual (para no duplicar trabajo)

- La reservación del viajero ya existe con folio propio (`VMX-…`), importe, moneda, destino, fechas del viaje, líneas de la reservación y bitácora de eventos. Es la misma pieza que usa el checkout y "Mi Viaje".
- El **pago en efectivo ya está implementado**: al confirmar, la reservación queda pagada, se guarda el método (`efectivo`), la fecha y hora del pago, quién lo registró y una nota opcional, y se escribe el evento "pago recibido" en la bitácora.
- El **pago en línea ya tiene su arquitectura aprobada** (capa neutral de proveedor + eventos normalizados: iniciado, exitoso, fallido, reembolsado). Hoy está apagada. Cuando se encienda, escribirá en los mismos campos (método, referencia del proveedor, fecha de pago) y en la misma bitácora.
- **Lo que falta no es el motor de pagos: es la pantalla.** El concierge no ve ninguna reservación ni ningún pago. El expediente no muestra folio, importe, método ni fecha de pago; la central de operaciones sólo deriva "pagado / por pagar" sin detalle.
- Los permisos ya permiten que concierge, lead y administración lean reservaciones, líneas y bitácora. No hace falta tabla nueva, estado nuevo, folio nuevo ni migración.

Por eso este trabajo es sólo de lectura y presentación: se construye una vez y sirve igual para efectivo y para reservaciones en línea.

## Qué se construye

### 1. Nueva sección "Reservaciones" dentro de la Central de Operaciones (`/concierge/reservaciones`)

Lista paginada (50 por página) con búsqueda por folio, nombre del viajero o destino, y filtros por:

- **Estado de la reservación**: borrador · por pagar · pagada · cumplida · cancelada · reembolsada.
- **Forma de pago**: efectivo · en línea (tarjeta) · sin pago aún.
- **Rango de fechas** (fecha de pago o fecha de creación) y destino.

Cada renglón muestra: folio, viajero, destino, título del viaje, importe y moneda, estado, **forma de pago**, fecha y hora del pago en hora de Mérida, fechas del viaje y expediente vinculado.

Arriba, cuatro totales del periodo filtrado: **cobrado en efectivo**, **cobrado en línea**, **pendiente de cobro** y **número de reservaciones**. Así el concierge sabe de un vistazo qué entró y por dónde.

### 2. Detalle de la reservación

Al abrir un folio: líneas contratadas (qué, cantidad, precio, empresa), subtotal, descuento, impuestos y total; datos de contacto del viajero; y la **bitácora de pago** completa — creada, pago iniciado, pago recibido (con método, nota de quién lo cobró y referencia del proveedor cuando sea en línea), cancelación o reembolso.

### 3. Bloque de pago dentro del expediente

En `/concierge/expedientes/{id}` se agrega un bloque "Reservación y pago": folio, importe, estado, forma de pago, fecha de cobro y enlace al detalle. Si el expediente tiene propuesta aceptada sin pago, muestra el aviso de cobro pendiente. Nada más del expediente cambia.

### 4. Preparado para reservaciones en línea

La forma de pago se lee del dato que ya guarda el sistema, no de una lista fija: efectivo se muestra como "Efectivo", cualquier proveedor en línea como "En línea · {proveedor}" con su referencia. Cuando se active el cobro con tarjeta, esta pantalla lo muestra sin cambios adicionales. Las reservaciones de prueba antiguas (`demo`) se etiquetan como "Prueba" para no ensuciar los totales reales.

## Alcance técnico

**Autorizado**

- Nueva lectura `listConciergeReservations` y detalle `getConciergeReservation` en `src/lib/concierge/orders.functions.ts` (o módulo hermano de sólo lectura), con filtros, orden, paginación y totales calculados en el servidor sobre `concierge_orders`, `concierge_order_items` y `concierge_order_events`. Los permisos vigentes ya restringen la lectura a concierge/lead/administración.
- Nueva ruta `src/routes/_authenticated/concierge/reservaciones.tsx` y detalle por folio, sobre los componentes y tokens ya aprobados de la Central de Operaciones.
- Entrada a "Reservaciones" en la navegación del área de concierge.
- Bloque de reservación y pago en el detalle del expediente.
- Ampliar `scripts/concierge-inbox-stages.contract.test.ts` (o contrato hermano) con el etiquetado de formas de pago y el cálculo de totales.

**No autorizado**

- No se crean tablas, estados, folios ni un segundo modelo de reservación o pago.
- No se activa ni modifica el cobro en línea, ni la capa de proveedor, ni el pago en efectivo existente.
- No se tocan Mi Viaje, Alux, Portal Empresarial, checkout del viajero, roles ni permisos.
- No se expone identidad ni contacto del viajero a empresas.
- No se publica ni despliega.

## Preservation Gate

Quedan intactos el expediente, el Estudio de Propuesta, el checkout, Mi Viaje, Alux, header, footer, navegación pública y plantillas Premium. Validación visual en 1440, 834, 430 y 390 px; `tsgo`, pruebas de contrato y `git diff --check` limpios. Cualquier diferencia fuera de `/concierge` detiene la entrega.
