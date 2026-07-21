# 13 · OMXDS Commerce, Experiences & Settlement Blueprint

**Estado:** Proposed  
**Versión:** 1.0  
**Fecha:** 2026-07-21  
**Owner documental:** Founder  
**Dominios primarios:** D06 · marketplace-commerce; D07 · provider-operations  
**Gate operativo:** Gate B2 cerrado  
**Alcance de esta versión:** Diseño vinculable; no implementación ni activación

---

# 1. Behavioral Change Statement

## Comportamiento actual

El anfitrión puede crear productos y la plataforma ya contiene piezas parciales de venta, órdenes, Stripe, comisiones y reportes. Sin embargo, publicación editorial, elegibilidad comercial, configuración de comisión, disponibilidad, cobro y liquidación no forman todavía un flujo único gobernado por Administración.

En el diseño existente, una empresa puede llegar a habilitar venta directa y proponer o modificar condiciones que deberían permanecer bajo autoridad central. El panel calcula importes brutos, comisión y neto estimado, pero no acredita por sí mismo una obligación liquidable, una transferencia realizada o una conciliación financiera.

## Comportamiento objetivo

El anfitrión crea y mantiene la experiencia, solicita la modalidad comercial deseada y opera su disponibilidad. Administración verifica el producto, decide si puede publicarse y decide por separado si puede venderse en línea. Valladolid.mx cobra al viajero mediante la pasarela central autorizada, congela las condiciones económicas de cada orden, controla ajustes y reembolsos, y liquida a cada empresa con trazabilidad completa.

## Cambio observable

Una experiencia pasa de ser una ficha editable por su anfitrión a convertirse, sólo cuando Administración lo autoriza, en inventario comercial gobernado por Valladolid.mx. Ningún proveedor puede autoautorizarse, elegir unilateralmente la comisión ni considerar pagado un saldo sin conciliación y liquidación registradas.

---

# 2. Decisión Founder capturada

Este Blueprint incorpora como dirección de producto:

1. Debe existir un panel general de Experiencias dentro de Administración.
2. Los anfitriones pueden dar de alta tours y experiencias.
3. Administración aprueba de forma independiente:
   - si el producto puede publicarse;
   - si puede agregarse a Arma tu Viaje;
   - si puede solicitar cotización;
   - si puede venderse en línea.
4. Las ventas en línea se cobran mediante la pasarela central de Valladolid.mx, no mediante una pasarela individual del empresario.
5. Administración controla comisiones, órdenes, conciliación y liquidaciones.
6. Cada empresa dispone de su propia sección de ventas, comisiones, saldos y pagos.
7. Esta definición no abre Gate B2 ni autoriza producción, cobros o pagos reales.

---

# 3. Objetivo de negocio

Construir el sistema comercial confiable que convierta oferta turística verificada en reservas y ventas controladas, con transparencia para viajeros y empresas y con trazabilidad suficiente para proteger a Valladolid.mx.

## 3.1 Hipótesis

Si Valladolid.mx separa visibilidad, planeación, cotización y venta; centraliza la autorización comercial; administra inventario real; y ofrece estados de cuenta comprensibles, entonces podrá aumentar conversión y derrama local sin degradar confianza ni perder control financiero.

## 3.2 North Star

**Valor de experiencias cumplidas y conciliadas que beneficia al ecosistema local.**

No se usará GMV bruto aislado como North Star. Una venta cancelada, disputada, no cumplida o incorrectamente liquidada no representa valor completo.

## 3.3 Métricas principales

- GMV autorizado, cobrado, reembolsado y cumplido.
- Net Revenue de plataforma.
- Take rate efectivo.
- Conversión por modalidad comercial.
- Tasa de autorización comercial.
- Tasa de sobreventa.
- Tasa de reembolso y contracargo.
- Tiempo medio de conciliación.
- Tiempo medio de liquidación.
- Saldo pendiente, retenido, disponible y pagado.
- Diferencias de conciliación abiertas.
- Experiencias con inventario sano.
- Cumplimiento de SLA de soporte.

---

# 4. Alcance

## 4.1 Incluido

- Administración general de experiencias y tours.
- Alta y mantenimiento de productos por anfitriones.
- Aprobación editorial separada de autorización comercial.
- Modalidades informativa, Arma tu Viaje, cotización y venta en línea.
- Calendario, horarios, cupos, cierres y bloqueos.
- Comisión administrada centralmente.
- Checkout central de Valladolid.mx.
- Órdenes y libro financiero por orden.
- Reembolsos, cancelaciones, no-show, disputas y ajustes.
- Conciliación con pasarela.
- Liquidaciones y pagos a empresas.
- Estado de cuenta empresarial.
- Roles, permisos, auditoría y controles.
- Métricas y eventos.
- Migración incremental de capacidades existentes.
- Paquetes de implementación para Lovable.
- Gates para piloto y producción.

## 4.2 Fuera de alcance en v1

- Hoteles con channel manager.
- Boletaje con mapa de asientos tipo cine.
- Paquetes dinámicos multiempresa.
- Divisas múltiples dentro de una misma orden.
- Split payments automáticos hacia cuentas de proveedores.
- Crédito al viajero.
- Wallet o saldo de viajero.
- Programa de lealtad financiero.
- Contabilidad fiscal completa.
- Sustitución de un ERP o sistema contable.
- Activación inmediata de Stripe live.
- Contacto o incorporación automática de empresas.

---

# 5. Principios vinculantes propuestos

## 5.1 Autoridad comercial central

Sólo Administración puede autorizar venta en línea, suspenderla, definir comisión y aprobar condiciones de liquidación.

## 5.2 Publicar no equivale a vender

La aprobación editorial habilita visibilidad. La autorización comercial habilita transacción. Son estados, permisos y auditorías independientes.

## 5.3 La empresa propone; Administración decide

El anfitrión propone precio, disponibilidad, políticas y modalidad. No puede aprobar sus propios términos comerciales.

## 5.4 Snapshot económico inmutable

Toda orden conserva precio, impuestos, descuentos, comisión, costos, neto, moneda y políticas aplicables al momento de confirmación. Cambios posteriores no reescriben órdenes históricas.

## 5.5 Libro financiero antes que dashboard

Los paneles derivan de movimientos financieros registrados. Ningún KPI calculado en pantalla sustituye al ledger.

## 5.6 Conciliado no significa liquidado

Un cobro confirmado por la pasarela puede estar conciliado y todavía permanecer retenido, sujeto a cumplimiento, ventana de reembolso o revisión.

## 5.7 No borrar historia financiera

Órdenes, movimientos, ajustes, reembolsos y liquidaciones no se eliminan. Se corrigen mediante movimientos compensatorios auditables.

## 5.8 Menor privilegio

Contenido, comercio, soporte y finanzas se separan por permisos. Quien edita una experiencia no obtiene automáticamente capacidad de autorizar ventas o pagos.

## 5.9 Idempotencia

Webhooks, reservas, reembolsos y liquidaciones deberán tolerar reintentos sin duplicar cargos, cupos o movimientos.

## 5.10 Confianza visible

El viajero conoce precio final, políticas y responsable operativo antes de pagar. La empresa conoce cómo se calculó cada comisión y liquidación.

---

# 6. Actores y responsabilidades

| Actor | Responsabilidad |
|---|---|
| Viajero | Seleccionar fecha, horario, participantes, aceptar políticas y pagar |
| Anfitrión / Empresa | Crear producto, mantener contenido, precio propuesto, inventario y operación |
| Revisor editorial | Verificar calidad, exactitud, seguridad y publicación |
| Analista comercial | Evaluar elegibilidad, comisión, políticas y modalidad |
| Operaciones | Supervisar reservas, cumplimiento, incidencias y no-show |
| Finanzas | Conciliar cobros, aprobar ajustes, crear liquidaciones y registrar pagos |
| Soporte | Gestionar casos sin alterar movimientos financieros |
| Admin | Configurar y supervisar dentro de permisos asignados |
| Super Admin | Administrar reglas globales y accesos sensibles |
| Sistema | Bloquear cupo, registrar eventos, calcular snapshots y preservar auditoría |

---

# 7. Modalidades comerciales

Cada producto puede tener una o varias capacidades autorizadas, sin asumir que una implica las demás.

| Modalidad | Visibilidad pública | Arma tu Viaje | Precio vinculante | Checkout |
|---|---:|---:|---:|---:|
| Informativa | Sí | Opcional | No | No |
| Planeación | Sí | Sí | No necesariamente | No |
| Cotización | Sí | Sí | Propuesto | No |
| Venta en línea | Sí | Sí | Sí | Sí |

## 7.1 Regla

La modalidad efectiva es la intersección entre:

- lo solicitado por la empresa;
- lo permitido por su contrato;
- lo autorizado para el producto;
- la salud de inventario;
- la vigencia de políticas;
- el estado operativo de pagos;
- cualquier suspensión administrativa.

---

# 8. Estados del producto

## 8.1 Estado editorial

- draft
- submitted
- in_review
- changes_requested
- approved
- published
- suspended
- archived

## 8.2 Estado comercial

- not_requested
- requested
- in_review
- changes_requested
- approved
- suspended
- rejected
- revoked

## 8.3 Estado de venta efectiva

Derivado, no editable manualmente:

- unavailable
- planning_only
- quote_only
- sellable
- temporarily_closed

## 8.4 Condición obligatoria

Un producto sólo es sellable cuando:

- editorial_status = published;
- commercial_status = approved;
- la empresa está verificada y activa;
- existe autorización vigente;
- existe precio válido;
- existe inventario disponible;
- las políticas están vigentes;
- la pasarela está operativa;
- no existe suspensión aplicable.

---

# 9. Flujo de alta y aprobación

1. El anfitrión crea el producto en borrador.
2. Completa ficha, seguridad, ubicación, duración, inclusiones, exclusiones, restricciones y políticas.
3. Define modalidad solicitada.
4. Si solicita venta, propone precio, horarios, cupos, anticipación y cancelación.
5. Envía a revisión editorial.
6. El revisor aprueba o solicita cambios.
7. Si solicita venta, abre revisión comercial independiente.
8. Administración valida empresa, producto, capacidad operativa, políticas y datos de pago.
9. Administración define comisión y condiciones.
10. La empresa acepta la oferta comercial vigente.
11. Administración autoriza o rechaza.
12. El sistema calcula elegibilidad efectiva.
13. Una suspensión comercial puede cerrar checkout sin retirar la ficha pública ni Arma tu Viaje.
14. Toda decisión registra actor, fecha, motivo y evidencia.

---

# 10. Panel Admin de Experiencias

Ruta recomendada: **/cms/experiencias**

## 10.1 Bandeja principal

Columnas mínimas:

- producto;
- empresa;
- categoría;
- destino;
- estado editorial;
- estado comercial;
- modalidad efectiva;
- precio desde;
- próximos horarios;
- salud de inventario;
- ventas 30 días;
- incidencias;
- última actualización;
- responsable;
- acciones.

## 10.2 Filtros

- búsqueda;
- empresa;
- categoría;
- destino;
- estado editorial;
- estado comercial;
- modalidad;
- inventario;
- incidencias;
- fecha de envío;
- responsable;
- elegibilidad de venta.

## 10.3 Vista de detalle

Pestañas:

1. Resumen.
2. Contenido.
3. Operación.
4. Calendario e inventario.
5. Comercial.
6. Políticas.
7. Ventas.
8. Incidencias.
9. Auditoría.

## 10.4 Acciones controladas

- aprobar o devolver contenido;
- aprobar, rechazar, suspender o revocar venta;
- definir comisión;
- establecer vigencia;
- revisar precio;
- pausar horario;
- bloquear inventario;
- abrir incidencia;
- consultar órdenes;
- consultar ledger relacionado.

No se permitirá cambiar una comisión histórica desde esta pantalla.

---

# 11. Portal Empresarial

## 11.1 Catálogo

El anfitrión puede:

- crear y editar borradores;
- duplicar producto;
- proponer modalidad;
- enviar a revisión;
- responder observaciones;
- mantener contenido aprobado mediante revisión;
- ver estado y motivos.

No puede:

- autoaprobar publicación;
- autoautorizar venta;
- definir comisión efectiva;
- alterar órdenes;
- registrar pagos como realizados;
- desbloquear una suspensión.

## 11.2 Ventas

Ruta propuesta: **/portal/ventas**

Incluye:

- órdenes;
- fecha y horario de servicio;
- participantes;
- estado de pago;
- estado de reserva;
- importe bruto;
- descuentos;
- comisión;
- ajustes;
- neto estimado;
- neto liquidable;
- estado de liquidación;
- incidencias.

## 11.3 Pagos y liquidaciones

Ruta propuesta: **/portal/pagos**

Incluye:

- saldo pendiente;
- saldo retenido;
- saldo disponible;
- saldo en liquidación;
- saldo pagado;
- próximas liquidaciones;
- historial de lotes;
- comprobantes;
- referencias;
- ajustes y motivos;
- exportación de estado de cuenta.

La interfaz deberá distinguir claramente estimado, disponible y pagado.

---

# 12. Inventario turístico

## 12.1 Entidades

- schedule_template: patrón recurrente.
- departure: salida concreta con fecha y hora.
- inventory_pool: cupo compartido.
- inventory_adjustment: cambio auditado.
- reservation_hold: bloqueo temporal.
- blackout: cierre de venta.
- booking: reserva confirmada.

## 12.2 Reglas

- El cupo nunca se deriva sólo de un número mostrado en UI.
- Toda compra crea un hold con expiración antes del cobro.
- El hold confirmado se convierte en booking.
- El hold expirado libera cupo de forma idempotente.
- Los cambios manuales de cupo requieren motivo.
- Los cierres se aplican por producto, salida, empresa o contingencia.
- La disponibilidad se valida nuevamente en servidor antes de crear checkout.
- La sobreventa debe ser medible y tratada como incidente crítico.

## 12.3 Configuración mínima

- zona horaria del destino;
- días y horarios;
- duración;
- capacidad total;
- capacidad reservable;
- mínimo y máximo de participantes;
- anticipación mínima;
- horizonte de venta;
- cutoff;
- reglas infantiles;
- idiomas;
- punto de encuentro;
- recursos compartidos cuando aplique.

---

# 13. Precio, comisión y contrato

## 13.1 Precio

La empresa propone precio. Administración puede:

- aprobarlo;
- solicitar cambio;
- fijar vigencia;
- autorizar variantes;
- autorizar promociones;
- suspender ventas por inconsistencia.

## 13.2 Jerarquía de comisión

Precedencia recomendada:

1. Excepción contractual por producto.
2. Acuerdo comercial por empresa.
3. Programa comercial vigente.
4. Regla por categoría.
5. Regla global.

La primera regla aplicable genera la comisión efectiva.

## 13.3 Snapshot por orden

Cada orden conserva:

- gross_amount;
- discount_amount;
- tax_amount;
- payment_fee_amount;
- platform_commission_rate;
- platform_commission_amount;
- provider_net_amount;
- currency;
- rule_source;
- commercial_agreement_version;
- cancellation_policy_version;
- refund_policy_version.

La empresa nunca escribe estos campos efectivos desde el cliente.

---

# 14. Checkout central

## 14.1 Flujo

1. Selección de salida y participantes.
2. Validación de inventario.
3. Cálculo de precio en servidor.
4. Creación de hold.
5. Creación de orden pendiente.
6. Creación de sesión en pasarela central.
7. Pago.
8. Webhook firmado.
9. Confirmación idempotente de pago.
10. Conversión del hold en reserva.
11. Emisión de confirmación.
12. Registro de movimientos financieros.
13. Liberación segura si expira o falla.

## 14.2 Reglas

- El navegador no confirma pagos.
- El redirect de éxito no sustituye al webhook.
- La pasarela central es la única fuente externa de verdad del cobro.
- El monto enviado a pasarela proviene del cálculo servidor.
- Cada intento usa clave de idempotencia.
- Se evita almacenar datos sensibles de tarjeta.
- La orden conserva provider_payment_id y provider_event_id.

---

# 15. Órdenes y reservas

Los estados de orden, pago, reserva, cumplimiento y liquidación son dimensiones separadas.

## 15.1 Orden

- draft
- awaiting_payment
- confirmed
- cancelled
- closed

## 15.2 Pago

- unpaid
- processing
- paid
- partially_refunded
- refunded
- failed
- disputed
- chargeback

## 15.3 Reserva

- pending
- confirmed
- modified
- cancelled
- no_show
- fulfilled

## 15.4 Liquidación

- not_eligible
- pending
- held
- available
- batched
- paid
- reversed

No se comprimirá todo en un único status, porque ésa es la receta clásica para fabricar reportes que sonríen mientras la caja arde.

---

# 16. Libro financiero

## 16.1 Entidades

- financial_accounts
- ledger_entries
- payment_transactions
- refunds
- disputes
- adjustments
- settlement_batches
- settlement_items
- provider_payments
- reconciliation_runs
- reconciliation_exceptions

## 16.2 Movimientos mínimos

- cobro bruto;
- descuento financiado por plataforma;
- descuento financiado por proveedor;
- comisión;
- costo de pasarela;
- impuesto aplicable;
- retención;
- neto del proveedor;
- reembolso;
- contracargo;
- ajuste;
- pago al proveedor;
- reversa.

## 16.3 Reglas

- Cada movimiento tiene referencia de origen.
- Débitos y créditos deben cuadrar.
- Los movimientos confirmados son append-only.
- Una corrección crea contramovimiento.
- El dashboard se calcula desde el ledger o una proyección verificable.
- Toda moneda se almacena en unidad menor entera.
- Cada lote tiene total, moneda, beneficiario, periodo, estado y evidencia.

---

# 17. Conciliación

## 17.1 Entradas

- eventos de pasarela;
- balance transactions;
- órdenes;
- payment_transactions;
- refunds;
- disputes;
- ledger;
- transferencias a proveedores.

## 17.2 Resultado

Cada cobro debe clasificarse como:

- reconciled;
- pending;
- mismatch;
- orphan_provider_transaction;
- orphan_internal_transaction;
- duplicate;
- requires_review.

## 17.3 Operación

- corrida diaria automatizable;
- tablero de excepciones;
- asignación de responsable;
- motivo y resolución;
- cierre auditable;
- prohibición de liquidar movimientos con diferencias abiertas, salvo excepción autorizada.

---

# 18. Liquidaciones a empresas

## 18.1 Elegibilidad

Una venta se vuelve liquidable cuando:

- pago conciliado;
- reserva cumplida o condición contractual satisfecha;
- ventana de cancelación vencida;
- no existe disputa activa;
- no existe retención;
- datos del beneficiario están verificados;
- ledger cuadra.

## 18.2 Lote de liquidación

Debe incluir:

- empresa;
- periodo;
- órdenes incluidas;
- bruto;
- comisiones;
- reembolsos;
- ajustes;
- retenciones;
- neto;
- fecha propuesta;
- aprobador;
- fecha de pago;
- referencia bancaria;
- comprobante;
- estado.

## 18.3 Doble control

La creación y aprobación final de un lote sensible no deben recaer obligatoriamente en la misma persona. La política de doble control se activa antes de producción.

## 18.4 Estados

- draft
- under_review
- approved
- processing
- paid
- failed
- cancelled
- reversed

---

# 19. Cancelaciones, reembolsos y disputas

## 19.1 Motor de políticas

La política aplicable se versiona y queda congelada en la orden. Debe contemplar:

- cancelación por viajero;
- cancelación por proveedor;
- clima o fuerza mayor;
- no-show del viajero;
- incumplimiento del proveedor;
- reprogramación;
- reembolso parcial;
- cortesía o crédito futuro, si se autoriza después.

## 19.2 Reembolsos

- requieren motivo;
- calculan impacto en comisión y neto;
- se ejecutan en servidor;
- registran identificador de pasarela;
- generan movimientos compensatorios;
- actualizan conciliación;
- notifican a viajero y empresa;
- no eliminan la orden.

## 19.3 Disputas

- abren caso;
- congelan saldo relacionado;
- conservan evidencia;
- registran fecha límite;
- permiten resultado ganado o perdido;
- reflejan fee y reversa;
- afectan el estado de cuenta.

---

# 20. Panel Admin General de Ventas

Ruta recomendada: **/cms/comercio**

## 20.1 Resumen ejecutivo

- GMV cobrado;
- GMV cumplido;
- comisión devengada;
- neto a proveedores;
- reembolsos;
- contracargos;
- saldo retenido;
- saldo por liquidar;
- liquidaciones pagadas;
- diferencias de conciliación;
- conversión;
- ticket promedio.

## 20.2 Módulos

1. Órdenes.
2. Reservas.
3. Cobros.
4. Reembolsos.
5. Disputas.
6. Conciliación.
7. Liquidaciones.
8. Empresas.
9. Reglas de comisión.
10. Auditoría.

## 20.3 Drill-down obligatorio

Todo KPI financiero debe permitir llegar a:

métrica → empresa → lote → orden → movimiento → evento externo.

---

# 21. Roles y permisos

Permisos propuestos:

- experiences.read
- experiences.edit
- editorial.review
- editorial.approve
- commerce.request
- commerce.review
- commerce.approve
- commerce.suspend
- commission.read
- commission.manage
- orders.read
- bookings.operate
- refunds.request
- refunds.approve
- reconciliation.read
- reconciliation.resolve
- settlements.create
- settlements.approve
- settlements.mark_paid
- financial_exports.read
- audit.read

## 21.1 Separación mínima

- Un business_member sólo accede a su empresa.
- Un editor no administra comisión.
- Soporte no marca liquidaciones como pagadas.
- Finanzas no altera contenido editorial.
- Ninguna acción sensible depende sólo de ocultar un botón.
- RLS y autorización de servidor son obligatorias.

---

# 22. Auditoría y seguridad

Toda acción sensible registra:

- actor;
- rol;
- empresa afectada;
- entidad;
- valor anterior;
- valor nuevo;
- motivo;
- timestamp;
- request_id;
- fuente;
- IP o metadata permitida;
- aprobación relacionada.

Controles:

- verificación de firma de webhook;
- rotación de secretos;
- idempotencia;
- rate limits;
- alertas por duplicidad;
- exportaciones controladas;
- protección de PII;
- logs sin datos de tarjeta;
- respaldo y recuperación;
- feature flags;
- kill switch de checkout.

---

# 23. Eventos y analítica

Eventos mínimos:

- experience_created
- experience_submitted
- editorial_approved
- commerce_requested
- commerce_approved
- commerce_rejected
- commerce_suspended
- availability_checked
- inventory_hold_created
- inventory_hold_expired
- checkout_started
- payment_succeeded
- payment_failed
- booking_confirmed
- booking_fulfilled
- refund_requested
- refund_completed
- dispute_opened
- reconciliation_exception_opened
- settlement_created
- settlement_approved
- provider_payment_recorded

Los eventos analíticos no sustituyen eventos financieros ni auditoría.

---

# 24. Modelo de datos propuesto

## 24.1 Extensiones

- products: conservar identidad editorial; retirar autoridad autónoma de venta.
- businesses: agregar estado comercial y verificación financiera.
- orders: conservar como agregado comercial, separar dimensiones de estado.
- order_items: snapshot por producto, salida y participantes.

## 24.2 Nuevas tablas candidatas

- product_commercial_applications
- product_commercial_authorizations
- commercial_agreements
- commission_rules
- schedule_templates
- departures
- inventory_pools
- inventory_adjustments
- reservation_holds
- bookings
- financial_accounts
- ledger_entries
- payment_transactions
- refunds
- disputes
- settlement_batches
- settlement_items
- provider_payments
- reconciliation_runs
- reconciliation_exceptions

Los nombres son candidatos de arquitectura. Lovable debe validar colisiones y reutilización antes de crear migraciones.

---

# 25. Migración de las capacidades actuales

## 25.1 Reutilizar

- catálogo de empresa;
- flujo editorial;
- productos existentes;
- órdenes existentes;
- integración y webhook de Stripe;
- payment_events;
- reportes de ventas brutas, comisión y neto;
- rutas actuales del portal;
- controles de autenticación y roles.

## 25.2 Corregir

- eliminar del proveedor la capacidad de activar venta efectiva;
- eliminar del proveedor la edición de comisión efectiva;
- separar publicación y autorización comercial;
- sustituir neto estimado por estados financieros explícitos;
- introducir inventario transaccional;
- introducir ledger, conciliación y liquidación;
- mover decisiones financieras a funciones de servidor;
- endurecer permisos y RLS.

## 25.3 Compatibilidad

- direct_sale_enabled existente se trata como dato legado, no como autorización.
- Ningún producto legado se vuelve sellable automáticamente.
- Los productos migrados empiezan en commercial_status = not_requested o requieren revisión explícita.
- Órdenes históricas se preservan y se marcan con versión de modelo legado.
- No se reescriben migraciones publicadas.

---

# 26. Plan de implementación para Lovable

## C0 · Freeze comercial peligroso

- Deshabilitar autoservicio de activación de venta.
- Hacer sólo lectura la comisión efectiva para proveedores.
- Añadir feature flag commerce_v1_enabled = false.
- Confirmar que Stripe live permanece cerrado.
- Completion Report obligatorio.

## C1 · Autoridad comercial

- Estados editoriales y comerciales separados.
- Solicitud del anfitrión.
- Revisión y decisión Admin.
- Auditoría.
- Pruebas de permisos.
- Sin checkout nuevo.

## C2 · Panel Admin de Experiencias

- Bandeja, filtros, detalle y acciones.
- Reutilizar catálogo y revisión existentes.
- Salud de producto e inventario.
- Sin ventas reales.

## C3 · Calendario e inventario

- Salidas, cupos, holds, expiración y blackouts.
- Pruebas de concurrencia.
- Protección contra sobreventa.
- Sin cobro live.

## C4 · Motor económico y checkout test

- Comisión central.
- Snapshot de orden.
- Checkout en modo test.
- Webhook idempotente.
- Reserva confirmada.
- Feature flag por producto.

## C5 · Ledger, reembolsos y conciliación

- Movimientos financieros.
- Reembolso test.
- Tablero de excepciones.
- Cuadre reproducible.
- Ninguna liquidación real.

## C6 · Liquidaciones y Portal Empresarial

- Saldos.
- Lotes.
- Aprobación.
- Registro manual controlado de transferencia.
- Estado de cuenta.
- Comprobantes.

## C7 · Piloto cerrado Gate B2

- Máximo cinco empresas autorizadas.
- Productos seleccionados.
- Modo de pago definido.
- Runbooks.
- Soporte.
- Prueba end-to-end.
- Aprobación Founder separada.

## C8 · Activación gradual

- Cohorte y productos allowlisted.
- Límites de importe.
- Monitoreo.
- Kill switch.
- Revisión diaria.
- Expansión sólo con evidencia.

---

# 27. Criterios de aceptación

## 27.1 Producto

- Una empresa puede crear una experiencia y solicitar modalidad.
- No puede aprobarse ni autoautorizarse.
- Administración puede aprobar visibilidad sin venta.
- Administración puede suspender checkout sin retirar Arma tu Viaje.
- Toda decisión conserva motivo y auditoría.

## 27.2 Inventario

- Dos compras simultáneas no exceden cupo.
- Un checkout abandonado libera hold.
- Un pago confirmado conserva cupo.
- Un evento duplicado no duplica reserva.

## 27.3 Finanzas

- Cada orden pagada produce snapshot y ledger balanceado.
- Comisión histórica no cambia al modificar reglas futuras.
- Reembolso genera contramovimientos.
- Conciliación detecta huérfanos y duplicados.
- Liquidación incluye únicamente saldos elegibles.
- El estado de cuenta empresarial cuadra con el ledger.

## 27.4 Seguridad

- RLS impide lectura cruzada entre empresas.
- Cliente no escribe campos financieros efectivos.
- Webhook sin firma válida es rechazado.
- Acciones sensibles requieren permisos de servidor.
- Exportaciones y cambios quedan auditados.

## 27.5 Experiencia

- El viajero ve precio final y política antes de pagar.
- La empresa distingue estimado, retenido, disponible y pagado.
- Administración puede explicar cualquier cifra desde su origen.

---

# 28. Gates de activación

## Gate B2.0 · Diseño

Requiere:

- aprobación Founder del Blueprint;
- decisiones abiertas asignadas;
- roadmap y plan actualizados.

## Gate B2.1 · Construcción segura

Autoriza desarrollo con:

- feature flags OFF;
- Stripe test;
- cero cobros reales;
- cero liquidaciones reales.

## Gate B2.2 · Piloto comercial

Requiere:

- definición jurídica y fiscal;
- contratos;
- políticas públicas;
- conciliación probada;
- runbooks;
- responsables;
- productos allowlisted;
- aprobación Founder explícita.

## Gate B2.3 · Producción limitada

Autoriza cobros únicamente dentro de límites documentados.

## Gate B2.4 · Escala

Requiere evidencia del piloto y aprobación separada.

Este documento no abre ninguno de los Gates B2.

---

# 29. Decisiones abiertas obligatorias

Antes de Gate B2.2 deben resolverse:

1. Entidad legal que celebra la transacción.
2. Merchant of Record o modelo equivalente aplicable.
3. Quién factura al viajero y por qué conceptos.
4. Quién factura comisión o servicio a la empresa.
5. Tratamiento de IVA, retenciones y CFDI.
6. Titular de la cuenta receptora.
7. Periodicidad de liquidación.
8. Reserva o retención preventiva.
9. Responsable económico de cancelación y contracargo.
10. Política de reembolsos.
11. Evidencia de cumplimiento de la experiencia.
12. Datos bancarios y verificación del beneficiario.
13. Contrato con empresas.
14. Aviso de privacidad y términos.
15. Procedimiento de fraude y AML/KYC aplicable.
16. Límites de aprobación y doble control.
17. Costos de pasarela: absorbidos, trasladados o compartidos.

Estas decisiones requieren asesoría jurídica, fiscal y contable competente en México. El Blueprint define el sistema; no inventa una licencia financiera con un párrafo elegante.

---

# 30. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Autoautorización comercial | Permiso Admin y estado independiente |
| Comisión manipulable | Motor servidor y snapshot |
| Sobreventa | Holds, concurrencia y pools |
| Duplicidad por webhook | Idempotencia |
| Dashboard sin respaldo | Ledger append-only |
| Liquidar antes de tiempo | Reglas de elegibilidad |
| Disputa sin reserva | Retenciones y gestión de casos |
| Cruce de datos empresariales | RLS y scopes |
| Activación accidental live | Flags, allowlist y Gate B2 |
| Confusión fiscal | Decisiones previas y validación profesional |
| Doble pago a empresa | Lotes idempotentes y referencias únicas |
| Borrar historia | Contramovimientos y auditoría |

---

# 31. Entregables posteriores a aprobación

1. ADR de autoridad comercial y ledger.
2. PRD Admin Experiencias.
3. PRD Portal Empresarial de Ventas y Pagos.
4. PRD Inventario y Reservas.
5. PRD Checkout y Pagos.
6. PRD Conciliación, Liquidaciones y Reembolsos.
7. Matriz RLS y permisos.
8. Modelo de datos y migraciones aditivas.
9. Plan Lovable por C0–C8.
10. Runbooks operativos.
11. Plan de pruebas financieras.
12. Completion Report por etapa.

---

# 32. Condición de aprobación

La aprobación documental de este Blueprint:

- confirma el modelo central de comercio;
- autoriza preparar ADR, PRD y plan de implementación;
- no autoriza contactar empresas;
- no autoriza habilitar productos;
- no autoriza Stripe live;
- no autoriza cobrar viajeros;
- no autoriza liquidar empresas;
- no sustituye revisión jurídica, fiscal o contable;
- no abre Gate B2.

---

# 33. Solicitud de decisión Founder

Para elevar este documento de Proposed a Approved se requiere una declaración explícita que confirme:

- autoridad exclusiva de Administración para venta y comisión;
- checkout central de Valladolid.mx;
- separación editorial/comercial;
- panel Admin de Experiencias;
- panel empresarial de ventas y pagos;
- implementación por etapas con flags OFF;
- Gate B2 cerrado hasta nueva autorización.

---

# 34. Trazabilidad

Fuentes principales revisadas:

- CANON de Valladolid.mx.
- OMXDS Foundation.
- Capability Inventory V1.
- Programa Fundadores Gate B Readiness Pack.
- Marketplace Monetization Strategy.
- Payment Lifecycle Backlog.
- Catálogo empresarial existente.
- Portal de ventas en línea existente.
- Panel Admin de venta directa existente.
- Funciones administrativas de pagos.
- Órdenes, payment_events y webhook existentes.

Hallazgo de cierre:

La plataforma no parte de cero. Parte de una base parcial que debe ser gobernada, endurecida y completada. El objetivo no es duplicar checkout o paneles, sino convertir piezas dispersas en un sistema comercial explicable, conciliable y operable.
