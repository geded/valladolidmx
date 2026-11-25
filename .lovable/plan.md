# Reservar mesa · Sistema de reservaciones para restaurantes (tipo OpenTable)

Funciones al nivel de OpenTable, con la identidad visual de Valladolid.mx (sin copiar su marca ni diseño). Se construye por etapas, una a la vez, con prueba en Copalli y aprobación entre etapas.

## Qué se respeta
- La plantilla actual del restaurante, la carta y los pedidos de Copalli no cambian. Solo aparece un bloque nuevo «Reservar mesa» cuando el administrador lo activa.
- Mismo Portal de la empresa (instalable en el teléfono), mismo calendario tipo Airbnb para días cerrados, mismo Alux, mismo Mi Viaje.
- Todo arranca gratis; el cobro queda apagado.

## Etapa 1 · Reservar y atender (ahora)
1. **Administración:** dos botones por restaurante en «Ventas en línea»: «Reservar mesa» (prender/apagar) y «Cobro del servicio» (apagado para todos).
2. **Configuración del restaurante (Portal):**
   - Horarios de reservación por día (ej. 8:00–22:00, cada 30 min).
   - Mesas sencillas: cuántas mesas de cuántas personas (ej. 6 mesas de 4, 2 de 2). Sin plano todavía.
   - Duración por mesa, máximo de personas por reserva, anticipación mínima.
   - Confirmación inmediata o «por confirmar».
   - Días cerrados en el calendario tipo Airbnb ya existente.
3. **En la ficha pública:** elegir fecha, personas y horario libre; nombre, teléfono, ocasión y nota (alergias). Sin cuenta obligatoria para reservar; se invita a registrarse para verla en Mi Viaje.
4. **Agenda del día en el Portal (pensada para celular):** lista por hora con estados Reservada → Llegó → Sentada → Terminada / No vino / Cancelada; agregar reservación por teléfono o sin cita; cambiar hora/personas.
5. **Avisos:** al restaurante por notificación en el teléfono, WhatsApp (línea propia de Valladolid.mx) y correo; al cliente confirmación y recordatorio por correo y WhatsApp. Si un canal falla, llegan los otros.
6. **Alux:** puede ofrecer y apartar una mesa en la plática con los mismos horarios libres.
7. **Mi Viaje:** la reservación entra al itinerario si la persona tiene cuenta.
8. **Conteo de valor:** se registra cuántas personas trajo la plataforma, aunque sea gratis.
9. **Prueba:** Copalli con datos de prueba marcados como temporales.

## Etapa 2 · Control del salón
- Zonas (Salón, Terraza…) y plano de mesas arrastrable con el dedo; opción de foto del salón para que Alux proponga mesas.
- Mesas que se pueden juntar para grupos.
- Lista de espera para quienes llegan sin reservar.
- Ficha del comensal: visitas, alergias, ocasiones.
- Reportes: ocupación, no-shows, horas pico.

## Etapa 3 · Cobro y confianza
- Prender el cobro por restaurante: por persona que llegó desde la plataforma/Alux (nunca por su propio botón o QR) o mensualidad; montos editables por el administrador.
- Depósito opcional en fechas especiales con el pago en línea existente.
- Reseñas solo de quien sí asistió.

## Detalles técnicos
- Tablas nuevas: ajustes de reservación por empresa, mesas, reservaciones y eventos de estado; RLS por equipo de la empresa, administración con rol; las lecturas públicas solo exponen horarios libres, nunca datos de otros comensales.
- Disponibilidad calculada en una sola función de base de datos usada por ficha, Alux y Portal (misma respuesta en todo canal); bloqueos con `commerce_blackouts`.
- Activación en `business_online_sales` (nuevo modo `mesas`) vía el RPC de administración existente; cobro en `platform_settings`.
- Avisos sobre la infraestructura de notificaciones existente (push, correo) y el canal WhatsApp `vmx-*`; se verifica si las llaves de push están configuradas.
- Reglas nuevas registradas en `src/lib/commerce/AGENTS.md`; pruebas de disponibilidad, cupo y permisos.
- Verificación en 1440/834/430/390 px de la ficha de Copalli completa, sin cambios colaterales.
