# CRM del concierge en dos secciones · alcance

## Qué se construye

El panel del concierge queda con **dos secciones CRM** dentro del mismo Workspace Concierge que ya existe:

1. **CRM Arma tu viaje** — es lo que ya funciona (expedientes de viajeros con cuenta que enviaron su plan). Solo cambia el nombre en el menú. Su lógica, etapas, propuestas y reservaciones no se tocan.
2. **CRM Prospectos** — la sección nueva. Aquí entra gente **sin cuenta** que dejó intención de compra y aceptó compartir su WhatsApp o correo.

Las dos se conectan: si un prospecto crea su cuenta, se vincula con su ficha y pasa al CRM Arma tu viaje con su historial, sin duplicarse.

## Qué aparece en Prospectos

Entra una persona **solo si** cumple las dos condiciones:

- No tiene cuenta (o está navegando sin iniciar sesión).
- Dejó su WhatsApp o correo **y** aceptó que un concierge le escriba.

Quien navega sin dejar contacto sigue siendo solo una cifra agregada en el monitor, sin datos personales.

## Cuándo lo ofrece Alux

Alux **ofrece** dejar el contacto, nunca lo exige:

- Una sola vez por conversación.
- Después de haber entregado algo útil (una recomendación concreta o un borrador de itinerario), no al abrir.
- Nunca como condición para seguir ayudando: si dice que no, Alux continúa igual.
- También se ofrece al cerrar un «Arma tu viaje» sin cuenta.

Esto exige una excepción expresa a la regla actual de Alux («no pide datos personales»): la excepción es *ofrecer una vez, con permiso*.

## Con qué WhatsApp se les escribe

Con el número oficial de WhatsApp Business ya configurado en el proyecto. **No** con el agente de WhatsApp del administrador (ese solo habla contigo) y **no** con el servicio de Railway de Zazil.

Mientras no esté confirmado ese número oficial, la fase de escribir a los viajeros no se inicia.

## Quién los ve y cómo se reparten

- Los ven concierges, líderes de concierge y administradores. Nadie más, y nunca el público.
- Sin reparto automático al inicio: la ficha queda en la pila común y un concierge la toma para sí, igual que hoy en los expedientes. El administrador puede reasignar.

## Embudo de cada prospecto

Nuevo → Contactado → Propuesta enviada → Reservó → Por viajar → Viajó → Posventa.
Fuera del tablero: No interesado y Perdido, con motivo.

«Reservó» solo se marca con pago confirmado, nunca se infiere.

## Cómo te enteras

- Aviso al administrador por cada prospecto nuevo (correo, con el mismo sistema de avisos que ya existe), y contador en la bandeja.
- Sin mensajes automáticos a los viajeros.

## Cómo se guarda

Una tabla nueva `public.concierge_prospects`, única fuente de verdad para contactos sin cuenta. Guarda: contacto, consentimiento con fecha, canal, etapa, responsable, notas, próxima fecha de seguimiento, destino/fechas/personas de interés, referencia de la conversación con Alux y, al registrarse, la cuenta vinculada.

Acceso solo autenticado con los roles del equipo; sin lectura pública.

## Fuera de alcance por ahora

Mensajería automática a clientes, campañas, cobros, cualquier cruce con los clientes de Zazil, y cualquier cambio a plantillas, Alux más allá de la oferta de contacto, o a los expedientes actuales.

## Orden de trabajo

- **Fase 1:** tabla y permisos, oferta de contacto en Alux y «Arma tu viaje», y bandeja CRM Prospectos con lista, filtros, responsable y notas.
- **Fase 2:** tablero del embudo, unión sin duplicados al registrarse y vínculo con ventas confirmadas.
- **Fase 3:** escribir a los viajeros, solo con el canal oficial confirmado y autorización expresa.

## Controles

Cada fase: Scope Gate y Preservation Gate, pruebas, revisión visual en 390/834/1440 y comparación antes/después del panel actual. Nada se publica sin tu visto bueno.
