# Calendario visual de disponibilidad para reservaciones

## Objetivo
Reemplazar el listado actual de fechas por un calendario mensual claro en móvil y escritorio. El visitante elegirá primero un día disponible, después un horario y finalmente el número de personas, sin cambiar el motor de reservas existente.

## Scope Gate
- Modificar únicamente el diálogo abierto por **Reservar en línea** en la ficha pública del producto.
- Usar el calendario oficial Shadcn ya instalado.
- Mostrar en verde sólo los días con disponibilidad real.
- Indicar dentro de cada día cuántos lugares quedan, sumando los horarios abiertos de ese día.
- Al elegir un día, mostrar únicamente sus horarios y el cupo de cada uno.
- Si existe un solo horario para ese día, dejarlo seleccionado automáticamente; si hay varios, pedir al visitante que elija.
- Conservar el selector de personas limitado por el cupo del horario seleccionado.

## Preservation Gate
Permanecen sin cambios:
- La ficha Premium, galería, marca, botones, Alux y Mi Viaje.
- Los datos y horarios administrados desde CMS.
- Las reglas de inventario, apartados temporales, folios ERL, autenticación y pago.
- El texto y comportamiento de **Reservar en línea** fuera del diálogo.
- Los demás tipos de producto y cualquier superficie administrativa.

## Experiencia resultante
1. El visitante abre **Reservar en línea**.
2. Ve un mes con los días disponibles destacados en verde y el número de lugares libres.
3. Selecciona un día.
4. Ve los horarios reales de ese día; el único horario queda marcado por defecto cuando corresponda.
5. Elige personas y continúa al mismo proceso de confirmación y pago existente.

En móvil, el calendario ocupará el ancho disponible sin listas horizontales ni desbordamiento. Los horarios aparecerán debajo, con controles táctiles adecuados.

## Controles
- Pruebas de agrupación por día, suma de cupos y preselección del horario único.
- Flujo completo de la experiencia sembrada hasta la pantalla de pago, sin crear una reserva definitiva.
- Revisión visual en 1440, 834, 430 y 390 px.
- Typecheck, prueba contractual de comercio, consola y solicitudes fallidas.
- Sin publicación al dominio.