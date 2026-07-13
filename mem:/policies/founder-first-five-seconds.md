---
name: Founder First Five Seconds Principle
description: Los primeros cinco segundos tras regresar a Alux deben responder sin búsqueda tres preguntas — dónde nos quedamos, qué es lo más importante ahora, cuál es el siguiente paso recomendado.
type: constraint
---
Vinculante desde AC1.3. Sólo afecta UX/jerarquía de superficies.

Reglas:

1. La superficie de continuidad (Delight Moment) responde arriba del fold, sin scroll y sin interacción, a las TRES preguntas oficiales:
   - ¿Dónde nos quedamos? — resumen breve del viaje en curso (destino/etapa, últimos elementos incorporados).
   - ¿Qué es lo más importante ahora? — prioridad derivada de Decision Center / Daily Mission según etapa.
   - ¿Cuál es el siguiente paso recomendado? — un único CTA primario, explícito, accionable.
2. Jerarquía obligatoria arriba del fold: Saludo de continuidad → Dónde nos quedamos → Lo más importante ahora → Siguiente paso. Sin banners promocionales, sin permisos, sin registro entre ellos.
3. Un solo CTA primario. Máximo un CTA secundario ("Empezar uno nuevo" o "Continuar sin registrarme"). Prohibida saturación de botones.
4. Fuentes autorizadas (reutilización estricta): `useAnonymousTrip`, `TravelPlan`, `getDailyMission`, `deriveDecisionCenter`. Prohibido inventar métricas, inferencias o rankings nuevos.
5. Auto-Hide: si no existen datos suficientes para responder a ninguna de las tres preguntas, la superficie no se muestra — jamás se rellena con contenido genérico.
6. Explainable: cada respuesta declara internamente su `source` para trazabilidad (favorites | plan_items | decision_center | daily_mission). Sin fuente, no se muestra.

Why: la percepción de acompañamiento se decide en los primeros cinco segundos. Si Alux obliga a buscar, dejó de acompañar.