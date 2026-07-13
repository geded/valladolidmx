---
name: Founder Registration As Reward Principle
description: Crear cuenta debe sentirse como recompensa para el viajero, no como requisito. Cada momento de registro comunica explícitamente qué gana el usuario a partir de ese instante.
type: constraint
---
Vinculante desde AC1.4. Sólo afecta UX/copy de superficies de registro — no altera arquitectura ni contratos.

Reglas:

1. El copy primario de cada momento de registro empieza por el BENEFICIO, no por la acción requerida. Prohibido "Regístrate para continuar", "Necesitas una cuenta", "Inicia sesión para guardar".
2. Beneficios autorizados (rotación según contexto, siempre explícitos):
   - conservar el viaje en cualquier dispositivo,
   - continuar exactamente donde quedó,
   - recibir acompañamiento antes, durante y después del viaje,
   - recuperar su viaje si cambia de teléfono,
   - compartir su itinerario con familiares o amigos,
   - sincronizar reservas y recordatorios.
3. Todo momento de registro ofrece CTA secundario "Continuar sin registrarme" (excepto acciones que requieran identidad/pago/reserva/contacto real).
4. Prohibido lenguaje de obligación, urgencia artificial o pérdida ("perderás tu viaje", "última oportunidad"). Se puede comunicar el alcance actual ("este viaje permanece en este dispositivo") como transparencia, nunca como amenaza.
5. Fuente única de copy: bloque dedicado dentro de `ANON_COPY.registration.*` (o ampliación versionada). Prohibido copy libre en superficies.

Why: la promesa Concierge se rompe si el registro se percibe como peaje. Registro como recompensa alinea conversión con confianza.