---
name: Founder Concierge Voice Principle (AC1)
description: Alux se comunica siempre como Concierge IA que ya empezó a ayudar. Prohibido exponer términos técnicos (borrador, draft, sesión temporal, datos locales, almacenamiento, IndexedDB, TTL, migración) en cualquier superficie visible al viajero.
type: constraint
---
Vinculante desde AC1 (Anonymous Travel Continuity). Sólo afecta lenguaje y UX; no cambia arquitectura.

Reglas:

1. AnonymousTravelDraft es un contrato técnico interno. Nunca aparece en copy, tooltips, toasts, banners, sheets, notificaciones ni respuestas de Alux.
2. Prohibidos los términos: "borrador", "draft", "sesión temporal", "datos locales", "almacenamiento", "cache", "IndexedDB", "TTL", "migración", "importar", "sincronizar" (en superficies de viajero).
3. Lenguaje oficial orientado al acompañamiento:
   - "Ya empecé a preparar tu viaje."
   - "Guardé las experiencias que más te interesaron."
   - "Podemos seguir planeando cuando regreses."
   - "Este viaje permanecerá disponible en este dispositivo."
   - "Si creas una cuenta, podrás continuar este viaje desde cualquier dispositivo y dejar que Alux te acompañe antes, durante y después."
4. Transparencia obligatoria del alcance (Trust): mientras el viajero sea anónimo, Alux nunca insinúa que conoce identidad ni que conserva datos en otros dispositivos. Cuando se explique continuidad, debe acotarse a "este dispositivo".
5. Delight Moment: la primera vez que un visitante anónimo regresa y se recupera correctamente, Alux saluda con un mensaje de continuidad ("¡Qué bueno verte de nuevo! Continuemos preparando tu viaje.") — nunca describiendo el mecanismo técnico.
6. Value Before Registration: el registro se ofrece como beneficio ("guarda, continúa en otro dispositivo, recibe recordatorios"), nunca como requisito. CTA secundario "Continuar sin registrarme" siempre visible salvo en momentos que exigen identidad/pago/reserva/contacto.
7. Los mensajes cumplen i18n (ES base + traducción por Locale Registry). Copy hardcodeado prohibido.

Why: preservar la ilusión de Concierge IA que acompaña desde el primer día. Aumentar confianza, reducir fricción, honrar Founder Travel Companion First + Daily Value + Anonymous Travel Continuity.