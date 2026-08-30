# G8-R1-D · Alux IA Canónico — Completion Report v1.0

Alcance ejecutado: **R1-D1, R1-D2, R1-D3, R1-D4**. Sin publicar plantillas, sin cambiar flags, sin redirects.

## R1-D1 · Catálogo canónico

`src/lib/alux/canonical-catalog.server.ts` (nuevo, server-only).

- Reutiliza obligatoriamente `canonical-entity-resolver.ts` y `canonical-entity-binding.ts`; no crea resolutor paralelo.
- Familias incorporadas hoy: **Lugares/Atractivos (points_of_interest)**, **Productos/Experiencias/Tours (products)**, **Eventos (events)**, sumados a Empresas ya existentes.
- Fail-closed: `status = 'published'`, `deleted_at IS NULL`, familia acreditada y **ruta canónica válida**; si falta cualquiera, el candidato se descarta (no se degrada a texto).
- Zonas y Destinos quedan fuera como candidatos recomendables hasta acreditar ficha canónica propia (pendiente Founder, R1-E).
- Borradores: nunca recomendados. Verificado en datos: Valladolid expone 5 POIs publicados; los borradores no aparecen en el cargador.

## R1-D2 · Contexto unificado

`src/lib/alux/unified-context.ts` (nuevo, capa pura). **Extiende** `AluxContext`, no lo reemplaza ni crea segundo Context Engine.

Contrato: `entity{entityId, entityKind, slug, canonicalUrl, label}`, `territory`, `trip{fechas, daysUntilStart, party, stage, plan}`, `profile`, `permissions`, `coords?`, `navigation`, `reason`.

Invariantes: cero PII; `coords` **sólo** con `locationConsent === true`; `permissions` booleano (nunca roles); `reason` siempre presente; etapa derivada con `deriveTravelStage` (sin modelo nuevo).

## R1-D3 · Acciones y marca

- Sugerencias exponen `entityId`, `canonicalUrl`, `family`, `favoriteKind`, `planKind`.
- Tres acciones **distintas**: “Ver ficha canónica” (CTA existente), “Guardar” (`FavoriteButton`) y “Agregar a Mi Viaje” (`AddToTravelPlanButton`) en el dock.
- Alux **propone**, nunca muta el plan: agregar exige confirmación del viajero.
- Identidad: `Sparkles` sustituido por `AluxMark` (activo gobernado `/brand/alux/`) en chat público y tarjeta de sugerencia. Personaje full permanece en el planner.

## R1-D4 · Reconciliación de contratos

| Nombre previsto (autorización) | Contrato existente reutilizado |
| --- | --- |
| Catálogo canónico | `resolveCanonicalEntityTemplate` + `canonical-entity-binding` |
| Contexto unificado | `useAluxContext` (`AluxContext`) + `buildAluxUnifiedContext` |
| Etapa del viaje | `deriveTravelStage` (`journey-stage.ts`) |
| Mi Viaje | `getMyActivePlan` / `addPlanItem` / `alux_plan_proposals` |
| Guardar | `FavoriteButton` (`traveler_favorites`) |
| Perfil del explorador | `getAluxTravelerLens` / `traveler_profiles` |
| Marca Alux | `AluxMark` (`/brand/alux/`, SHA-256 gobernado) |

## Comprobaciones (DOM real)

Home y `/oriente-maya/valladolid` a 390/768/1440: dock único (1), footer único (1), overflow horizontal 0, activo `alux-ia-avatar-32.png` presente, sin errores de consola atribuibles a esta ola. Typecheck limpio.

Hallazgos abiertos (fuera de alcance, remediar en R1-E):
- **DEF-R1D-001**: `/oriente-maya/:destino` presenta 9 `<header>` (ruido semántico).
- Google Maps `RefererNotAllowedMapError` sólo en `localhost` (preexistente).

**STOP CONDITION activa.** No se publicó, no se cambiaron flags, no se crearon redirects.
