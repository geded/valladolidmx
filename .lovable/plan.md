# Central de Operaciones Concierge (1,000 viajes simultáneos)

## Problema
Hoy `/concierge` carga hasta 100 expedientes, calcula todo en el navegador y sólo distingue etapas comerciales (cotización → propuesta). No responde las preguntas de operación diaria: quién ya pagó, quién tiene propuesta enviada sin respuesta, quién pidió cambios, quién viaja esta semana y quién ya está en el destino pidiendo ajustes de itinerario. Con 1,000 viajes activos esa pantalla se vuelve inoperable.

## Propuesta: dos ejes, no uno
El expediente ya tiene un eje comercial. Le agregamos el eje de **ciclo de vida del viaje**, derivado de datos que ya existen (reservación pagada y fechas del viaje). Nada de estados, tablas ni folios nuevos.

| Fase | Se deriva de | Qué necesita el concierge |
|---|---|---|
| En venta | Sin reservación pagada | Cotizar, proponer, dar seguimiento |
| Por pagar | Propuesta aceptada, reservación sin pago | Cobrar antes de que venza |
| Pagado · por viajar | Pago confirmado, viaje aún no inicia | Documentos, recordatorios, preparación |
| Viaja pronto (≤7 días) | Pago confirmado, inicio dentro de 7 días | Confirmaciones finales con empresas |
| En destino | Hoy cae entre inicio y fin del viaje | Asistencia en sitio y ajustes de itinerario |
| Regresó | Viaje terminado | Cierre, reseña, memoria de viaje |
| Requiere ajuste | Propuesta rechazada/vencida, o cambio pedido en viaje | Rehacer y reenviar |
| Cerrado | Perdido o archivado | Sin acción |

## Cómo se ve la pantalla
1. **Tablero superior**: seis contadores de operación — Sin asignar · Por pagar · Propuestas sin respuesta · Viaja esta semana · En destino hoy · Vencidos de SLA. Cada uno es un filtro con un clic.
2. **Bandejas laterales** con contador propio, agrupadas en *Venta*, *Pago*, *Viaje* y *Cierre*, sobre las bandejas actuales ya aprobadas (no se eliminan).
3. **Lista paginada** (50 por página, orden por SLA/fecha de viaje/última actividad) con búsqueda por folio, número de expediente, nombre del viajero o destino.
4. **Tarjeta de expediente** con: referencia, fase de viaje, etapa comercial, responsable, monto y estado de pago, fechas del viaje, cuenta regresiva ("sale en 3 días", "día 2 de 5 en destino") y la acción siguiente concreta.
5. **Filtros** por responsable, prioridad, SLA, fase, rango de fechas de viaje y estado de pago; la selección se recuerda al refrescar, igual que el destino de trabajo del CMS.

## Cómo se vuelve rápido con 1,000 expedientes
- Los conteos y el filtrado pasan al servidor: una sola lectura agregada devuelve los contadores de cada bandeja y una página de resultados ya enriquecida (cotizaciones, última propuesta, reservación, fechas del viaje, responsable). Hoy eso se arma en el navegador con 200 expedientes como techo.
- El listado deja de traer todo: pide sólo la página visible.
- La fase de viaje se calcula en la consulta, en hora de Mérida, así el orden y los contadores son consistentes para todo el equipo.

## Alcance técnico
**Autorizado**
- Nueva lectura de sólo lectura `listConciergeOperations` en `src/lib/concierge/concierge.functions.ts`: filtros, orden, paginación y contadores por bandeja, respetando el rol (`concierge_case_list_for_role` sigue siendo la fuente de permisos). Une `concierge_quotes`, `concierge_proposals`, `concierge_assignments`, `concierge_orders` y `travel_plans` (fechas) por expediente.
- Extender `src/lib/concierge/case-stage.ts` con `TripPhase` derivada y ampliar `CONCIERGE_INBOXES` con las bandejas de pago y viaje, conservando las existentes.
- Rehacer la pantalla `/concierge` sobre esas bandejas: tablero, paginación, búsqueda, filtros persistidos y tarjeta enriquecida. Se preservan asignar/reasignar/liberar y los filtros actuales.
- Contrato de pruebas ampliando `scripts/concierge-inbox-stages.contract.test.ts` con las fases de viaje y los contadores.

**No autorizado**
- No se crean tablas, estados, folios, ni un segundo modelo de expediente, propuesta u orden.
- No se toca el detalle del expediente, el Estudio de Propuesta, Mi Viaje, Alux, el Portal Empresarial, pagos, roles ni RLS.
- No se expone identidad ni contacto del viajero a empresas.
- No se publica ni despliega.

## Preservation Gate
Quedan intactos el detalle del expediente, el compositor de propuesta, el Portal Empresarial, Mi Viaje, Alux, pagos, permisos, header, footer, navegación pública y plantillas Premium. Validación visual en 1440, 834, 430 y 390 px; `tsgo`, pruebas de contrato y `git diff --check` limpios. Cualquier diferencia fuera de `/concierge` detiene la entrega.

## Nota
La fase "En destino" depende de que el viaje tenga fechas. Los expedientes sin fechas se muestran en una bandeja "Sin fechas de viaje" para que el equipo las capture, en lugar de desaparecer del tablero.
