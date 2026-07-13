---
name: Founder Journey First Principle
description: La etapa del viaje es el contexto primario de la experiencia. Toda funcionalidad del Carril A debe responder primero "¿en qué etapa del Journey está el viajero?" y sólo después decidir qué mostrar, priorizar, permitir, recomendar y proponer. Vinculante desde CV6.O1.
type: constraint
---
Principio Founder vinculante (2026-07-13). Reglas:

1. La etapa del Journey (`TravelStage`) es el contexto primario. Toda funcionalidad Carril A debe resolver primero la etapa y sólo después decidir información visible, acciones priorizadas, permisos solicitados, recomendaciones ofrecidas, CTAs presentados y misión diaria asignada.
2. Prohibida cualquier funcionalidad cuya visibilidad dependa únicamente de reglas técnicas, feature flags o disponibilidad de servicios ignorando la etapa real del viajero.
3. **Daily Mission Consistency**: la misión diaria de la etapa activa es la prioridad principal de la sesión. Ninguna otra capacidad puede competir visualmente con ella sin justificación explícita en el Blueprint correspondiente.
4. **Restricción de evolución (contrato v1.0.0 CV6.O1 congelado)**: toda épica futura (CV6.O2/O3/O4 y posteriores) reutiliza EXCLUSIVAMENTE `TravelStage`, `deriveTravelStage()`, `getDailyMission()` y `stageAllowsPermission()` desde `src/lib/traveler/journey-stage.ts`. Prohibido crear nuevos motores de etapas, estados del Journey o lógica paralela.
5. Toda evolución es aditiva: se amplían misiones/etapas mediante extensiones documentadas del contrato, nunca sustituciones.
6. El Journey NO se adapta a las limitaciones de una funcionalidad; la funcionalidad se adapta al Journey.

Why: preservar experiencia simple, enfocada y consistente durante todo el ciclo del viaje; evitar divergencias de experiencia conforme la plataforma crece.