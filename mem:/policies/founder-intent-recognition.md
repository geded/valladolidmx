---
name: Founder Intent Recognition Principle (AC1.2)
description: Cada interacción del viajero es una intención. Alux la reconoce con microinteracciones conversacionales del Concierge, nunca con confirmaciones técnicas. Sin IA generativa, sin memoria paralela, sin inferencias permanentes.
type: constraint
---
Vinculante desde AC1.2 y en toda superficie futura donde el viajero actúe (favorito, plan, remove, share, contact, etc.).

Reglas:

1. Toda confirmación de acción del viajero se resuelve vía `ANON_COPY.intent.*` (fuente única). Prohibido copy libre.
2. Prohibidos mensajes técnicos en toasts/banners/tooltips visibles: "Elemento agregado", "Favorito guardado", "Registro actualizado", "Se guardó correctamente", "Item removido".
3. Preferir mensajes conversacionales que describan la intención + acompañamiento de Alux: "Excelente elección. Lo tendré presente para tu viaje.", "Perfecto. Seguimos construyendo tu viaje juntos.", "Entiendo. Esto ya no forma parte de tus planes."
4. Los mensajes describen SOLO la acción y el apoyo del Concierge. NO afirman conocimiento de gustos, preferencias, personalidad ni características del viajero. NO prometen memoria futura fuera de la información ya disponible en `AnonymousTravelDraft` / `TravelPlan`.
5. Aplica idéntico en rama autenticada y anónima. La percepción de acompañamiento no depende del estado de sesión.
6. Restricciones: no autoriza IA generativa, memoria paralela, embeddings, ni escritura de "intent" en ninguna tabla o log. Sólo cambia lenguaje y microinteracciones sobre datos ya existentes.
7. Los límites (favoritos/ítems) NO se comunican como error técnico. Se resuelven con `intent.limitFriendly` — "guarda tu viaje para seguir sumando" — nunca como fallo.

Why: cerrar la brecha entre "ejecutar acción" y "sentirse acompañado". Refuerza Founder Concierge Voice + Anonymous Travel Continuity + Travel Companion First sin agregar infraestructura.