# Alux, agente de ventas del Oriente Maya · web + WhatsApp + CRM

## La idea en una frase

Alux deja de ser «un chat que contesta». Pasa a ser un **agente de ventas consultivo**. Conoce todo el territorio por el catálogo publicado. Ayuda primero, pide datos poco a poco y lleva a cada persona a uno de dos cierres:

- **Venta directa:** compra en ese momento algo que ya tiene precio y pago en línea, en la web o por WhatsApp.
- **Viaje armado:** se registra como viajero y un concierge humano le arma su viaje (CRM Arma tu viaje).

## Cómo vende Alux: 5 pasos

```text
1 Descubre   ->  2 Recomienda   ->  3 Califica   ->  4 Pide contacto  ->  5 Cierra
(qué busca)     (datos reales)     (fechas,        (WhatsApp/correo,   (paga ahora o
                                    personas,       con permiso)        se registra para
                                    presupuesto)                        su concierge)
```

Reglas de estrategia:

- **Primero da valor y luego pide.** Cada dato se pide después de entregar algo útil: una recomendación, una distancia, una ruta o un borrador del día.
- **Pide una sola cosa a la vez**, con un motivo claro. Por ejemplo: «¿Cuántos son? Así te digo qué hotel les queda mejor».
- **Nunca condiciona la ayuda.** Si la persona no quiere dar un dato, Alux sigue ayudando igual.
- **Solo usa información publicada:** precios, horarios, distancias y disponibilidad del catálogo. Si algo no está confirmado, lo dice y ofrece al concierge.
- **Siempre propone el siguiente paso:** «¿Lo agrego a tu viaje?», «¿Te paso el enlace para reservar?» o «¿Quieres que un concierge te arme los 3 días?».

## Escalera de datos

| Nivel | Qué sabe Alux | Dónde vive |
|---|---|---|
| 0 · Anónimo | intereses, destinos vistos | sólo en su dispositivo + cifras sin nombre |
| 1 · Viaje | fechas, personas, tipo de viaje, presupuesto aproximado | su conversación, sin datos personales |
| 2 · Contacto | WhatsApp o correo + permiso | **CRM Prospectos** |
| 3 · Viajero | cuenta creada | **CRM Arma tu viaje** (con todo su historial) |

Temperatura del prospecto, para que el concierge sepa a quién atender primero:
- **Frío:** solo explora.
- **Tibio:** dio fechas o personas.
- **Caliente:** dio fechas, personas e interés concreto, o pidió precio o reservar.

## Trato distinto para quien ya es prospecto

Cuando Alux reconoce a un prospecto (en la web o por WhatsApp):

- Retoma lo que ya habló: «La vez pasada viste cenotes para 4 personas en marzo…».
- No vuelve a pedir lo que ya sabe.
- Su meta cambia de «conseguir contacto» a **avanzar una etapa**: propuesta, pago o registro.
- Avisa al concierge cuando el prospecto se calienta o pide hablar con una persona.

## Atención por WhatsApp

1. **Entradas:** el botón «Sigue por WhatsApp» dentro de Alux, los enlaces o códigos QR en fichas y destinos, y cualquier persona que escriba al número.
2. **Alux contesta por WhatsApp** con el mismo conocimiento y las mismas reglas que en la web. Quien escribe primero queda como prospecto, con su número y el permiso de que le contesten.
3. **Pase a un humano:** desde CRM Prospectos el concierge «toma la conversación». Alux se pausa y solo sugiere respuestas. El concierge puede devolvérsela a Alux.
4. **Regreso al registro:** cuando ya hay viaje en puerta, Alux manda un enlace del tipo «Crea tu cuenta y tu concierge te arma el viaje». El enlace viene ligado a ese prospecto. Al registrarse, la persona pasa sola al CRM Arma tu viaje, sin duplicarse.
5. **Reglas de WhatsApp de Meta:** durante las 24 h después de que la persona escribe, se le contesta libre. Pasado ese tiempo, solo con mensajes de plantilla aprobados por Meta, que tardan hasta 48 h en aprobarse. Si escribe «BAJA», no se le vuelve a escribir.

## Qué se vende directo por WhatsApp

- **Sí:** experiencias, eventos y productos que ya tienen precio publicado y cobro en línea activo. Alux manda la ficha y el enlace de pago que ya usa la plataforma.
- **No (pasa al concierge):** paquetes, combinaciones de hotel con tours, precios especiales y cualquier cosa sin precio publicado.
- «Reservó» solo se marca cuando el pago está confirmado. Nunca se adivina.

## Cuándo entra el concierge humano

- Pide hablar con una persona, un paquete o un precio especial.
- Se vuelve «caliente».
- Tiene una queja o un problema con una reserva.
- Alux no tiene la información publicada para contestar.

Aviso al equipo: correo por cada prospecto nuevo o caliente y contador en la bandeja. Tu agente personal de WhatsApp solo recibe cifras, sin nombres ni teléfonos (su regla actual no cambia).

## Lo que se conserva

El CRM Arma tu viaje y sus expedientes, las plantillas públicas, Mi Viaje, el catálogo, los cobros actuales y el agente de WhatsApp del Founder. Los clientes de Zazil no se mezclan.

## Fases

- **Fase 1 · Alux vendedor en la web + CRM Prospectos.** Reglas de venta consultiva, escalera de datos, oferta de contacto con permiso, temperatura, bandeja con responsable, notas y próxima fecha de seguimiento, y aviso por correo.
- **Fase 2 · WhatsApp oficial.** Conectar el número de WhatsApp Business. Alux atiende y crea prospectos, y el concierge toma o devuelve la conversación. Requiere tu número y la aprobación de Meta.
- **Fase 3 · Regreso al registro y embudo.** Enlace de registro ligado al prospecto, paso automático al CRM Arma tu viaje y tablero del embudo: Nuevo → Contactado → Propuesta enviada → Reservó → Por viajar → Viajó → Posventa.
- **Fase 4 · Venta y seguimiento por WhatsApp.** Enlace de pago de productos vendibles y plantillas aprobadas por Meta (propuesta lista, recordatorio de pago, antes del viaje, posventa).

Cada fase se aprueba por separado. Nada se publica sin tu visto bueno.

## Lo que necesito de ti

- El número que atenderá por WhatsApp. No debe estar ya conectado al servicio de Railway de Zazil.
- Qué puede vender Alux directo.
- El horario en que hay concierges humanos, para que Alux diga «te contacta hoy» o «mañana a primera hora».

---

## Detalles técnicos

- **Conocimiento:** se reutiliza la búsqueda actual en el catálogo publicado (`converse-retrieval.server.ts`, `canonical-catalog.server.ts`) y el contrato de `converse.functions.ts`. Se añade un modo «venta consultiva» con reglas por nivel de la escalera. La regla 9 («no pidas datos personales») se sustituye por «ofrece una vez dejar contacto, con permiso». El modelo nunca recibe teléfono ni correo, solo un id de prospecto y el contexto del viaje.
- **Datos:** `public.concierge_prospects` (contacto, consentimiento con fecha, canal, etapa, temperatura, responsable, notas, seguimiento, contexto del viaje y `user_id` vinculado al registrarse). Va con RLS por roles concierge/admin.
- **WhatsApp (Fase 2):** conector oficial WhatsApp Business por el gateway de Lovable. Receptor firmado en `POST /api/public/whatsapp/webhook` con bandeja duradera `whatsapp_webhook_events` (idempotente por delivery id), mensajes entrantes y salientes con estados de entrega, deduplicación por id de mensaje, recuperación de pendientes y bandera de «tomado por humano» por conversación.
- **Registro ligado:** enlace de un solo uso que guarda el id del prospecto. Al crear la cuenta se vincula a `user_id` y se crea o une el expediente de Arma tu viaje.
- **Venta:** se reutiliza el sistema de pagos y órdenes existente (`src/lib/payments/*`, `concierge/orders.functions.ts`). Solo productos con precio y cobro activo.
- **Controles:** Scope y Preservation Gate, pruebas de reglas (una vez por conversación, nunca bloquear, reservó solo con pago, no duplicar al registrarse), QA 390/834/1440 e inventario de gobernanza.
