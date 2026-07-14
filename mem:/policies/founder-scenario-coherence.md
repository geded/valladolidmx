---
name: Founder Scenario Coherence Principle
description: CV8.S.2+ · El Motor de Eventos genera historias de viaje coherentes (causales, territoriales, temporales) — nunca eventos aislados ni distribuciones planas. Cada T1..T9 declara qué lo habilitó.
type: constraint
---
**Founder Scenario Coherence Principle** (vinculante, CV8.S.2+).

Toda ejecución del Simulation Pack debe representar personas planeando, explorando y viviendo un viaje — no una colección de eventos estadísticos. La calidad se mide por la coherencia de las historias generadas.

## Regla de Causalidad

Cada evento T1..T9 declara:
- **prerequisite** — evento/condición previa que lo habilitó (transición previa, señal de intención, decisión Alux/Concierge, etc.);
- **influencer** — capacidad del sistema que intervino;
- **gap_ms** — tiempo transcurrido desde el evento anterior del mismo sujeto;
- **scenario_probability** — probabilidad del escenario aplicada al evaluar la transición.

Prohibido emitir transiciones sin poder responder las cuatro.

## Regla Territorial

- Destino principal del escenario = concentración dominante (Valladolid en `oriente-maya-90d`).
- Distribución nunca uniforme; excursiones ponderadas por perfil (Chichén Itzá, Ek Balam, Izamal, Río Lagartos, Las Coloradas, Espita).
- Rutas por perfil + duración de viaje; cero visitantes que "aparecen" en un destino sin haber pasado por el nodo base o por una arista válida del grafo territorial.

## Regla de Realismo Temporal

- Eventos distribuidos durante el periodo configurado respetando horas del día, días de la semana, weekends, temporada, duración de sesión, regresos posteriores y ventanas mínimas/máximas razonables entre transiciones canónicas.
- Prohibido `Math.random`, `Date.now` fuera del PRNG sembrado; toda ventana temporal se muestrea del PRNG del escenario.

## Journey completo

Cada visitante simulado debe recorrer un Journey coherente: puede completar T1..T9, o abandonar en cualquier etapa y regresar más tarde. Prohibido "saltar" transiciones (todo salto pasa por la cadena canónica).

**How to apply:** rechazar cualquier evento generado por el motor que no incluya envelope de causalidad (`prerequisite`, `influencer`, `gap_ms`, `scenario_probability`), o que no pueda explicarse como parte de la historia de viaje de un sujeto identificado (`subject_id`).