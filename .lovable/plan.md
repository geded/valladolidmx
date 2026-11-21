# CRM Alux de Valladolid.mx · réplica mejorada del CRM de Zazil Tunich

## La idea

Se copia la forma de trabajar del **CRM Alux de Zazil Tunich**: prospectos, embudo, pase a asesor, comandos desde el teléfono y avisos. Se adapta a un destino completo, el Oriente Maya, y se mejora donde Zazil se queda corto.

Alux funciona como **agente de ventas**, no como chat. Conoce todo el catálogo publicado, ayuda primero, pide datos poco a poco y lleva a cada persona a uno de dos cierres:

- **Venta directa:** compra en ese momento algo que ya tiene precio y pago en línea.
- **Viaje armado:** se registra como viajero y un concierge humano le arma el viaje (CRM Arma tu viaje).

## 1. Lo que se replica igual que en Zazil

**Etapas del prospecto.** Se pueden cambiar a mano, como en Zazil.

| Zazil | Valladolid.mx | Grupo |
|---|---|---|
| Nuevo | Nuevo | Prospectos |
| Contactado | Contactado | Prospectos |
| Preventa enviada | Propuesta enviada | Prospectos |
| Compró | Reservó (con pago confirmado) | Cerradas |
| Por visitar | Por viajar | Cerradas |
| Visitó | Viajó | Cerradas |
| Posventa hecha | Posventa hecha | Cerradas |
| No interesado / Perdido | No interesado / Perdido | Perdidos |

**Tablero calculado:** Por atender → En conversación → Propuesta activa → Seguimiento agendado → Cerradas. Muestra los prospectos de los últimos 60 días.

**Entrada sin duplicados:** se busca primero por teléfono o correo y luego por la conversación. Si la persona ya existe, se actualiza su ficha. El nombre de WhatsApp solo se usa si no hay uno mejor.

**Avance automático**
- Al mandar una propuesta del concierge, pasa a «Propuesta enviada».
- Al abrir el WhatsApp desde el CRM o contestar desde el teléfono, pasa de «Nuevo» a «Contactado».
- Cuando un pago queda confirmado, pasa sola a «Reservó». Si hay duda sobre a quién pertenece el pago, no adivina: deja una nota para revisarlo.
- Si una propuesta vence o se cancela, regresa a «Contactado». Nunca pasa sola a «Perdido».

**Pase a asesor:** la conversación queda «pendiente» hasta que un concierge la toma. Se guardan quién la tomó, cuándo y la marca «Intervino asesor».

**Comandos del concierge desde su WhatsApp:** `#alux` (Alux retoma), `#apagar` (Alux se calla), `#cotizar`, `#enlace` (manda el enlace de pago), `#nota` y `#agenda <fecha>`. Alux borra el comando del chat para que el cliente no lo vea.

**Avisos:** campanita en la app, notificación al celular y correo.
- Plática nueva.
- El cliente pide un asesor.
- El cliente dice que nadie lo ha contactado (urgente).
- El cliente responde mientras lo atiende el equipo.
- Una respuesta se atoró o la línea se desconectó.
- Un enlace de pago está por vencer.
- Un pase lleva más de 15 minutos sin tomar: aviso extra por tu agente de WhatsApp. Ese aviso no lleva nombre ni teléfono del cliente.

## 2. Lo que se mejora frente a Zazil

1. **Venta con estrategia de territorio.** Alux recomienda con distancias, rutas, horarios y resúmenes de reseñas de todo el Oriente Maya, no de un solo negocio.
2. **Escalera de datos.** Alux pide un dato a la vez y siempre después de dar algo útil: primero fechas y personas, luego el contacto con permiso, y al final la cuenta. Nunca condiciona la ayuda.
3. **Temperatura del prospecto** (frío, tibio o caliente), para que el concierge sepa a quién atender primero.
4. **Regreso al registro** (Zazil no lo tiene). Por WhatsApp, Alux manda «Crea tu cuenta y tu concierge te arma el viaje» con un enlace ligado al prospecto. Al registrarse, la persona pasa sola al **CRM Arma tu viaje** con todo su historial.
5. **Un perdido que vuelve a escribir regresa a Prospectos.** En Zazil esto no está garantizado; aquí sí.
6. **No se pierden mensajes.** Cada mensaje entrante se guarda antes de procesarse y se reintenta si algo falla.
7. **Canal intercambiable.** El CRM no depende del proveedor de WhatsApp. Hoy puede usar el mismo servidor de Zazil y mañana pasarse al WhatsApp oficial sin rehacer nada.
8. **Comisiones.** Si un concierge cerró la venta, queda ligada a las comisiones por venta directa que ya existen.

## 3. Conexión de WhatsApp

Zazil usa **Evolution API en Railway**: un teléfono vinculado por QR, no la versión oficial de Meta. Para Valladolid.mx hay dos caminos:

- **Igual que Zazil:** una línea nueva para Valladolid.mx en ese mismo servidor, con su propio número, su propio nombre (`vmx-…`) y su propia clave. Los datos quedan separados de Zazil. Es rápido, pero Meta puede bloquear el número porque no es la vía oficial.
- **WhatsApp oficial de Meta:** sin riesgo de bloqueo. Requiere aprobación de Meta, y fuera de las 24 horas después del último mensaje del cliente solo se le puede escribir con plantillas aprobadas.

El CRM se construye igual en los dos casos. Solo cambia la pieza que conecta.

## 4. Qué se vende directo y qué pasa al concierge

- **Directo:** experiencias y eventos con precio publicado y cobro en línea activo. Alux manda la ficha y el enlace de pago que ya usa la plataforma.
- **Al concierge:** paquetes, combinaciones de hotel con tours, precios especiales, bodas, grupos y cualquier cosa sin precio publicado.

## 5. Lo que se conserva

El CRM Arma tu viaje y sus expedientes, las propuestas y los cobros actuales, Mi Viaje, las plantillas públicas y tu agente personal de WhatsApp. Los clientes de Zazil no se mezclan.

## 6. Fases

1. **CRM Prospectos en el panel del concierge:** ficha, etapas, tablero, responsable, notas, agenda y avisos. Alux en la web ofrece dejar el contacto con permiso.
2. **WhatsApp:** Alux contesta, crea prospectos, hace el pase a asesor y entiende los comandos `#`. Requiere elegir el camino de conexión.
3. **Cierre automático:** «Reservó» con pago confirmado, regreso de propuestas vencidas, enlace de registro ligado y paso al CRM Arma tu viaje.
4. **Venta directa por WhatsApp y seguimiento:** enlace de pago con `#enlace`, recordatorios y posventa.

Cada fase se aprueba por separado. Nada se publica sin tu visto bueno.

---

## Detalles técnicos

- **Tablas (Fase 1):** `concierge_prospects`, modelada sobre `alux_leads` con los mismos campos, más `temperature`, `destination_slug`, `linked_user_id` y `travel_plan_id`. `concierge_prospect_sales`, modelada sobre `alux_lead_sales`. El estado de pase a asesor se agrega a las conversaciones de Alux existentes; no se crea una tabla de conversaciones paralela. Avisos sobre `notifications` y el push existente (`push-dispatch.server.ts`). Las etapas son texto, con la etapa cerrada marcada por trigger, igual que `alux_leads_closed_stamp`.
- **Reglas en la base:** conciliación de venta (pago `partial`/`paid`, búsqueda única y diagnóstico cuando hay ambigüedad), regreso de propuestas vencidas por cron de un minuto (máximo 100 por corrida) y reapertura de perdidos.
- **WhatsApp (Fase 2):** puerto de canal `src/lib/crm/channel/*` con dos adaptadores: Evolution (`EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, token del webhook comparado en tiempo constante) y Meta oficial (conector del gateway). Receptor en `/api/public/whatsapp/webhook`, con bandeja duradera idempotente por id de mensaje y un candado para mandar una sola respuesta a la vez por plática.
- **Alux:** se reutilizan `converse-retrieval.server.ts` y `canonical-catalog.server.ts`. La regla «no pidas datos personales» se cambia por «ofrece el contacto una vez, con permiso». El modelo nunca recibe teléfono ni correo.
- **Permisos:** RLS solo para concierge, líder y admin; el servidor usa rol de servicio solo después de verificar a quién llama.
- **Controles:** Scope y Preservation Gate, pruebas de cada regla (sin duplicados, «Reservó» solo con pago, propuesta vencida regresa a «Contactado», el perdido se reabre, el registro liga sin duplicar), QA 390/834/1440 e inventario de gobernanza.
