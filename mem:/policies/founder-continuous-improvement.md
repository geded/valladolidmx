---
name: Founder Continuous Improvement Principle
description: CV8.6+ · Visitor Intelligence aprende continuamente si sus recomendaciones produjeron mejora real.
type: constraint
---
Visitor Intelligence Center no se limita a emitir recomendaciones — aprende continuamente si las acciones recomendadas produjeron una mejora real. Toda recomendación debe poder responder: ¿Fue aplicada? ¿Qué cambió después? ¿Qué KPI mejoró? ¿Qué transición del Journey avanzó? ¿Qué evidencia demuestra el resultado?

Regla de Validación (ciclo de vida obligatorio):
detected → accepted → implemented → observed → validated | discarded.

Trazabilidad completa obligatoria: Hallazgo → Recomendación → Acción → Resultado → Aprendizaje.

Regla de Aprendizaje:
- La confianza de futuras recomendaciones sólo puede ajustarse a partir de resultados observados y registrados como eventos append-only.
- Prohibido introducir reglas manuales ocultas, heurísticas no explicables o pesos hardcodeados que sustituyan la evidencia.
- Confianza por familia = validadas / (validadas + descartadas), sólo cuando la muestra ≥ MIN_FAMILY_SIGNAL.

Arquitectura vinculante:
- Reutilizar exclusivamente `visitor_intel.events` (CV8.1) mediante el kind `recommendation.lifecycle`.
- Estado del ciclo recomputado siempre desde el historial (Founder Journey State). Prohibido persistir snapshots o tablas paralelas.
- Cada evento declara: recommendation_id, metric_id, transition, severity original, status alcanzado, actor y evidencia (para observed/validated/discarded).

Objetivo prescriptivo: cada recomendación implementada fortalece el conocimiento colectivo y mejora la calidad de las recomendaciones futuras del ecosistema Oriente Maya.