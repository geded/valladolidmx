# G8-R1-E · Personalización Segura de Alux IA — Completion Report v1.0

Estado: **CERRADA Y ACREDITADA** · Gate: `bun run validate:r1:e` → PASS (33/33)
Base: cierre acreditado de G8-R1-D-R1. Sin publicación, sin cambios de estado, sin migraciones.

## 1. Mapa de fuentes reutilizadas (Fase 0 · Preflight)

| Necesidad | Fuente reutilizada | Nueva |
|---|---|---|
| Perfil, intereses, presupuesto, idioma, accesibilidad | `traveler_profiles` + `getAluxTravelerLens` | no |
| Fechas, destino base, etapa | `travel_plans` + `journey-stage.ts` | no |
| Composición del viaje | Tarjeta existente `WelcomeOnboardingModal` | no (se extrae vocabulario) |
| Continuidad anónima | `AnonymousTravelDraft` (IndexedDB) | no |
| Catálogo | `canonical-catalog.server.ts` (R1-D) | no |
| Contexto | `buildAluxUnifiedContext` | extendido |
| Autoridad de grupo | `src/lib/traveler/party-composition.ts` | sí (capa pura) |
| Señales consentidas | `src/lib/alux/behavior-signals.ts` | sí (capa pura) |
| Priorización | `src/lib/alux/personalization.ts` | sí (capa pura) |

**Cero migraciones. Cero tablas. Cero perfil, motor, contexto o historial paralelo.**

## 2. Algoritmo determinista (Fase 4)

1. **Restricciones duras** (excluyen): `hard.published`, `hard.canonical`, `hard.territory`, `hard.dates`, `hard.accessibility`, `hard.party.minors`, `hard.party.capacity`.
2. **Puntuación** `ALUX_WEIGHTS`: intereses 40 · presupuesto 25 · cercanía 20 (sólo con consentimiento) · guardados 18 · composición del viaje 15 · intención de navegación · etapa · diversidad · calidad editorial.
3. **Razón humana obligatoria** por sugerencia, derivada sólo de datos reales.
4. **Patrocinio**: nunca desplaza la mejor coincidencia y se declara (`sponsored` + `disclosure`).
5. Misma entrada ⇒ misma salida (test de determinismo).

## 3. Privacidad y consentimiento (Fase 3)

- Lista cerrada de señales: `entity_viewed`, `destination_navigated`, `category_explored`, `saved`, `plan_added`, `plan_removed`, `suggestion_accepted`, `suggestion_rejected`.
- Finalidad declarada obligatoria; TTL 30 días; opt-out total; sin PII, roles, tokens, ubicación sin consentimiento ni inferencias sensibles.
- Sin consentimiento de ubicación, las coordenadas se descartan en el contexto y la distancia no influye.
- Las señales nunca sustituyen preferencias expresas (peso menor que perfil declarado).

## 4. Fase 6 · Contexto de Home y Eventos

`scope: "entity" | "destination" | "region" | "none"`. Home entrega alcance **regional Oriente Maya** sin fingir destino ni entidad; contexto insuficiente real sigue fallando de forma segura (`none` ⇒ Alux no sugiere).

## 5. Addendum Founder · Tarjeta de composición del viaje

Tarjeta existente **reutilizada, no duplicada**: `WelcomeOnboardingModal` ahora importa `PARTY_OPTIONS` de la autoridad compartida. Precedencia: Mi Viaje → perfil → continuidad anónima. Acreditado por pruebas que la selección altera priorización/razones y sobrevive al registro sin duplicarse. Estado previo PARCIAL → **COMPLETA**.

## 6. Matriz de escenarios (33 pruebas)

20 escenarios Founder (anónimo, navegación local, perfil incompleto, pareja premium, familia con menores, grupo, accesibilidad, presupuesto, sin/con ubicación, Mi Viaje vacío/con cenotes, durante y después del viaje, sugerencia aceptada/rechazada, draft, sin horario, fuera de territorio, perfil sin coincidencias) + eventos fuera de fechas + privacidad/opt-out/TTL/PII + patrocinio + determinismo + alcance de contexto + 5 del Addendum.

## 7. Diff

- `src/lib/traveler/party-composition.ts` (nuevo)
- `src/lib/alux/behavior-signals.ts` (nuevo)
- `src/lib/alux/personalization.ts` (nuevo)
- `src/lib/alux/unified-context.ts` (`party`, `scope`, suficiencia regional)
- `src/components/traveler/WelcomeOnboardingModal.tsx` (reutiliza la autoridad)
- `src/components/layout/AluxFloatingTrigger.tsx` (rerank explicable sobre el catálogo)
- `scripts/omxds/r1-e/alux-personalization.contract.test.ts` (nuevo gate)
- `package.json` (`test:r1:e`, `validate:r1:e`)

## 8. Deuda declarada

- Persistencia de señales de comportamiento: hoy sólo capa pura en memoria/local; requiere autorización Founder para cualquier tabla.
- Casa de vacaciones permanece fail-closed.
- Distancia depende de coordenadas por candidato: acreditada en el motor, cobertura de datos aún parcial.

## 9. STOP CONDITION

`omxds_visual_v1_contracts_enabled=false` · cero publicación · cero cambio de estado · cero redirects · cero sitemap · **R1-F no iniciado**.
