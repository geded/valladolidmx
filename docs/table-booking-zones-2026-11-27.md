# Reserva de mesas: hora y zonas · 2026-11-27

## Alcance y autoridad

Corrección autorizada: restaurar el selector de hora, excluir horas pasadas para hoy y sustituir los botones de horas por las zonas guardadas por el restaurante.

- Familia: empresa/restaurante Premium, autoridad `BusinessSurface`.
- Ruta comprobada: `/restaurante/copalli-cafe`, enlace corto a la ficha canónica existente.
- Widget único: `TableBookingWidget`, integrado en `BusinessSurface`; el Preview Registry mantiene su proveedor de negocio existente.
- Datos: `restaurant_booking_settings`, `floor_plan`, `restaurant_reservations` y los apartados existentes; no se introduce otra fuente de disponibilidad.
- Delta: widget, reglas puras, pruebas, documentación y migración aditiva de los RPC existentes. Tipos/journal/snapshot generados por la herramienta.
- Invariantes no editados: header/footer, identidad, portada, fotos, breadcrumb, carta, mapas, Alux, Mi Viaje, navegación, precios, activación comercial y contenido CMS.

## Resultado

Fecha y hora comparten una fila móvil; el selector utiliza solo horas libres futuras aprobadas por el servidor. El reloj local se revisa periódicamente y al volver a la ventana. La hora deja de repetirse debajo.

Las zonas se leen del plano, mantienen su orden y se deshabilitan si no hay mesa para el grupo a la hora elegida. «Cualquiera» permite reservar sin preferencia. Elegir un botón crea el apartado existente de cinco minutos y abre los datos de contacto. Cambiar fecha, hora o personas libera ese apartado.

Los overloads aditivos de los RPC mantienen las firmas anteriores. El apartado de zona conserva `table_id`; la reserva revalida una mesa real de esa zona bajo el bloqueo existente y guarda su asignación. La disponibilidad respeta asignaciones físicas y reservas sin asignar; el sistema anterior por grupos sigue vigente donde no existe plano. La asignación del equipo también comprueba apartados activos.

Copalli tiene `floor_plan=[]`: aparece únicamente «Cualquiera». No se inventaron Adentro/Terraza ni se modificó la configuración del restaurante.

## Evidencia y controles

- 14/14 pruebas de `commerce-table-booking.test.ts` y `commerce-table-floor.test.ts`: horas pasadas/actuales excluidas, futuras conservadas y zonas disponibles únicamente.
- ESLint localizado: PASS. `git diff --check`: PASS. Compilación automática: OK.
- Governance Integrity: PASS (915 avisos históricos). Route Inventory: bloqueado por dos rutas previas ajenas al delta (`api/public/signed.$.ts`, `taxi_.seguimiento.$token.tsx`); no se alteró su inventario ni sus permisos.
- Playwright, 1440/834/430/390: selector real → cambio de hora → Cualquiera → apartado confirmado → formulario → cambio de fecha que libera el apartado. Sin errores de página ni desbordamiento.
- Capturas anteriores/nuevas de la reserva inspeccionadas, incluida fecha/hora lado a lado en 390.
- Datos ajenos a la reserva, identidad/galería/resumen/servicios/visita/carta conservan texto y fuentes de fotos en la muestra. La comparación completa no es PASS: mapa y recomendaciones diferidas cargaron en momentos diferentes. No se modificaron esos componentes ni se compensó mediante rediseño.
- Prueba transaccional de zonas preparada: insertó solo una copia de prueba, pero no pudo cambiar al rol visitante por permisos de la conexión. La desconexión revirtió la transacción; comprobado cero empresas temporales restantes. No se ampliaron permisos para sortearlo.
- No se creó una reservación real, no se enviaron avisos y no se publicó.

## Puertas y pendientes

- Scope del delta solicitado: acreditado por la instrucción del Founder; no se autorizó ni realizó un rediseño de ficha.
- Preservation Gate integral: pendiente, no sustituido por pruebas/lint/compilación. Constructor autenticado, mapa real, recomendaciones totalmente cargadas, aceptación humana y Safari físico no certificados.
- Reserva real de zona: pendiente de un plano configurado y un entorno de prueba con permisos apropiados. El flujo real comprobado fue sin preferencia, no una zona simulada.

## Reversibilidad

El frontend previo conserva compatibilidad con los RPC de tres/cuatro/diez argumentos. La columna de los apartados y los nuevos overloads son aditivos. Cualquier reversión de datos/esquema exige otra migración autorizada; no se altera una migración aplicada ni se borran reservas.