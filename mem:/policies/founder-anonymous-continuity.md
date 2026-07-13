---
name: Founder Anonymous Travel Continuity Principle
description: Los visitantes anónimos reciben valor y construyen viaje parcial sin registro. Local-first (IndexedDB), sin cuenta anónima ni escrituras por interacción; el registro se solicita sólo cuando aporta beneficio evidente.
type: constraint
---
Reglas vinculantes (Iniciativa "Anonymous Travel Continuity"):

- Alux nunca pide antes de dar. Prohibido gating de registro en la 1ª interacción de favorito o "agregar al viaje".
- Local-first obligatorio: `AnonymousTravelDraft` vive en IndexedDB (borrador estructurado) + localStorage sólo para metadatos pequeños. Cero fila en DB por visitante, cero escritura de red por clic, cero Realtime para anónimos.
- Registro progresivo únicamente en momentos de valor: guardar permanentemente, abrir en otro dispositivo, compartir, cotizar/reservar, recordatorios, envío por correo/WhatsApp, o al alcanzar límites.
- Copy obligatorio orientado a beneficio (nunca a castigo). CTA secundario "Continuar sin registrarme" siempre visible salvo en acciones que requieran identidad/pago/reserva/contacto.
- El Travel Plan sigue siendo la única fuente canónica tras el registro. El borrador anónimo NUNCA es una segunda fuente de verdad; se migra determinísticamente y se borra tras confirmar la migración.
- Prohibido: fingerprinting, permisos de navegador para esta iniciativa, datos sensibles/pago/ubicación precisa en el borrador, conversaciones completas de Concierge.
- Límites duros: máx favoritos anónimos, máx ítems de borrador, tamaño máx de payload, TTL, deduplicación, sanitización.
- Guardrails de contrato: no rompe contratos congelados de CV6/CV7 ni el Travel Plan Contract v1.0. Toda evolución es aditiva y versionada (`AnonymousTravelDraft.version` semver).

Why: reducir fricción, aumentar conversión y respetar Founder Travel Companion First + Daily Value + Product Vision Rule sin degradar rendimiento con 1,000+ anónimos simultáneos.