---
name: Founder Continuity Recognition Principle
description: Cuando un viajero regresa a Alux, la experiencia centra el mensaje en la CONTINUIDAD del viaje — no en la recuperación técnica de datos. Persistencia es medio; continuidad es percepción.
type: constraint
---
Vinculante desde AC1.3 (Delight Moment de Continuidad). Sólo afecta UX/copy.

Reglas:

1. Al detectar un viajero que regresa (anónimo o autenticado), el PRIMER mensaje visible se centra en la continuidad del viaje. Prohibido enunciar recuperación, restauración, sesión recuperada, borrador recuperado, datos cargados o sincronización.
2. Bank oficial de saludos de continuidad (rotación libre, i18n desde `ANON_COPY.continuity.greetings`):
   - "¡Qué gusto volver a verte! Sigamos preparando tu viaje."
   - "Tu viaje te estaba esperando."
   - "Continuemos desde donde lo dejamos."
   - "Todavía tenemos un gran viaje por delante."
3. Después del saludo, Alux puede mostrar de forma natural (en este orden de prioridad, ocultando los que no aporten valor):
   - siguiente paso recomendado,
   - misión diaria de la etapa,
   - últimos elementos incorporados al viaje,
   - próximas decisiones importantes.
4. Sin gating: el saludo de continuidad NUNCA solicita registro, permisos ni identidad como condición para continuar. Sigue vigente el Founder Concierge Voice Principle: cero terminología técnica.
5. Sin arquitectura nueva: la política se implementa sobre `useAnonymousTrip`, `deriveDecisionCenter`, `getDailyMission` y el Travel Plan existentes. Prohibido crear estados, tablas o modelos paralelos de "sesión recuperada".
6. Reversibilidad: el viajero siempre puede iniciar un viaje nuevo desde el propio saludo (CTA secundario), sin fricción.

Why: preservar la ilusión de Concierge IA que acompaña siempre. La persistencia local es infraestructura; la continuidad emocional es el producto.