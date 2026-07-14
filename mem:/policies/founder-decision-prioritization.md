---
name: Founder Decision Prioritization Principle
description: CV8.7+ · Visitor Intelligence prioriza recomendaciones para dirigir la operación del destino con explicabilidad total.
type: constraint
---
Visitor Intelligence Center no se limita a descubrir oportunidades — las prioriza para ayudar al Founder y al equipo operativo a decidir dónde invertir primero tiempo, recursos y atención para maximizar impacto sobre el Journey del Oriente Maya.

Regla de Priorización (obligatoria):
La prioridad NUNCA depende únicamente de la confianza aprendida. Toda recomendación priorizada considera simultáneamente:
- confianza aprendida (CV8.6 · learned_confidence por familia con `MIN_FAMILY_SIGNAL`);
- impacto esperado (magnitud del delta observado);
- urgencia (severidad — critical/attention/opportunity/informative);
- alcance sobre el Journey (etapa afectada y amplificación aguas abajo);
- población potencial beneficiada (tamaño de la muestra);
- beneficio para el ecosistema (KPI catalog · tier + transición).

Regla de Explicabilidad (obligatoria):
Cada recomendación priorizada declara explícitamente:
- score final ∈ [0,1];
- factores utilizados y su contribución numérica;
- evidencia (delta, sample size, ventana);
- nivel de confianza aprendida (o `insufficient_data`);
- impacto esperado;
- motivo textual de la prioridad ("por qué #1", "por qué #2"…).

Arquitectura vinculante:
- Fuente única: función pura `prioritizeOpportunities(opps, validation)` en `src/lib/visitor-intel/prioritization.ts`.
- Derivación total desde snapshots CV8.5 (`OpportunitySnapshot`) + CV8.6 (`RecommendationValidationSnapshot`). Sin persistencia, sin snapshots, sin tablas nuevas, sin modelos paralelos.
- Recomputable en cualquier momento desde el historial append-only.
- Prohibidos pesos ocultos: los weights viven en constantes exportadas y auditables.
- Prohibido priorizar por métricas de vanidad (pageviews/sesiones/bounce).

Objetivo prescriptivo: la plataforma debe responder diariamente
¿Qué deberíamos hacer hoy? · ¿Qué acción tendrá el mayor impacto? ·
¿Qué oportunidad estamos dejando pasar? · ¿Qué resultado esperamos si actuamos ahora?