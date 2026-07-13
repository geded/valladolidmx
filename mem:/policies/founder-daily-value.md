---
name: Founder Daily Value Principle
description: Cada etapa del Journey debe ofrecer una razón clara para volver a abrir Alux hoy. Una misión principal por etapa, respondida antes de que el viajero la formule. Vinculante para toda épica CV6+.
type: constraint
---
Principio Founder vinculante (2026-07-13). Reglas:

1. Cada etapa oficial del Journey declara UNA misión diaria principal, expresada en una frase corta y accionable. Fuente única: `src/lib/traveler/journey-stage.ts` (`getDailyMission(stage)`).
2. La misión diaria debe responder la pregunta implícita: "¿Para qué abro Alux hoy?" antes de que el viajero la formule.
3. Prohibido saturar el home del viajero con múltiples llamados. Una misión principal visible; capacidades secundarias auto-ocultas si no aportan valor en el contexto actual (Founder Experience First).
4. La misión diaria debe ser derivada (nunca persistida como nuevo modelo). Se calcula a partir de Travel Plan + LiveDay + Passport + Context Engine.
5. Toda nueva funcionalidad debe responder por escrito: "¿Qué motivo tendrá el viajero para volver a abrir Alux mañana?". Sin respuesta clara, no se implementa.
6. Ejemplos canónicos (referencia, no exhaustivos): Inspiración → "Descubre un nuevo destino"; Exploración → "Encuentra experiencias que te gustarán"; Planeación → "Completa tu itinerario"; Pre-viaje → "Revisa lo que falta antes de salir"; En destino → "Esto es lo más importante para hoy"; Post-viaje → "Conserva tus recuerdos y prepara el siguiente viaje".

Why: transformar Alux en compañero diario del viaje; medir éxito por continuidad de uso, no sólo por conversión.