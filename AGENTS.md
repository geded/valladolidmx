# Valladolid.mx · Reglas vinculantes para agentes

Estas reglas aplican a Codex, Lovable y a cualquier agente que modifique este repositorio.
La autoridad completa es `docs/blueprint/19.47-PREMIUM-TEMPLATE-PRESERVATION-AND-EVOLUTION-POLICY-v1.0.md`.

## Jerarquía obligatoria

Antes de proponer o modificar una superficie, respetar en este orden:

1. CANON y configuración de marca vigente en el CMS.
2. Plantilla Premium aprobada de la familia.
3. Componentes compartidos y sistema visual OMXDS.
4. Contenido, enlaces, medios y visibilidad guardados en CMS/Experience Builder.
5. Patrones de usabilidad de referentes turísticos; nunca su identidad visual.

## Preservación

- Approved place compositions register their existing block through the shared runtime library and retain normal node traversal and editorial wrappers. Why: a declared renderer cannot display an unregistered saved node; preset replacement would lose editorial state.
- Place Studio previews hydrate the existing PlacePremiumSurface through the Preview Registry and the public DTO adapter, retaining node copy and order. Why: real entity preview must not replace saved compositions or create another visual authority.
- Destination identity links reuse the institutional badge renderer through optional internal navigation overrides; planner and region links retain the origin destination through validated search context. Why: preserve one badge authority and existing territorial return navigation without parallel routes.
- Destination presentation adjustments stay inside DestinationPremiumSurface; narrative media uses EditorialMediaFrame with a fixed aspect ratio independent of description length. Why: keep builder/public authority shared and prevent text growth from distorting photos.
- Destination route and nearby cards keep their entity-specific links inside the existing surface; compact destination rails do not alter the regional catalog branch. Why: harmonize presentation without changing territorial discovery or introducing another renderer.

- Una plantilla aprobada es una autoridad, no un punto de partida descartable.
- “Corregir”, “mejorar”, “conectar”, “agregar” o “continuar” no autorizan rediseño.
- Modificar el componente aprobado; no crear superficies `V2`, `New`, paralelas o fallbacks visuales.
- Constructor, preview y ruta pública deben resolver la misma autoridad de render por familia.
- No reemplazar configuración CMS válida con fixtures, presets, demos o contenido codificado.
- No importar ramas históricas completas. Recuperar sólo el cambio mínimo acreditado.
- Preservar diseño, orden, responsive, marca, breadcrumb, mapas, Alux, Mi Viaje, header y footer salvo autorización explícita que nombre el elemento.

## Protocolo previo a cambios

1. Identificar familia, ruta pública, preview, preset, contrato, renderer y fuente CMS.
2. Comparar la plantilla completa con su autoridad aprobada en desktop, tablet y móvil.
3. Clasificar la solicitud: corrección, mejora, extensión o rediseño.
4. Declarar archivos autorizados y superficies que deben permanecer invariantes.
5. Implementar el delta mínimo sobre la autoridad existente.
6. Ejecutar gates completos y regresión visual de la plantilla entera y superficies compartidas.

Un rediseño exige autorización Founder explícita, maqueta previa y aceptación visual humana. Si el alcance es ambiguo o un cambio colateral altera otra sección, detenerse y reportar.

## Dos gates independientes

Una autorización de archivo no acredita preservación del producto. Todo cambio debe superar ambos controles:

1. **Scope Gate:** acredita que la operación y los archivos fueron autorizados.
2. **Preservation Gate:** acredita que la autoridad aprobada y sus invariantes visuales, funcionales y editoriales no sufrieron regresiones fuera del delta autorizado.

Un PASS del Scope Gate nunca sustituye al Preservation Gate. Si no existe evidencia comparable de la plantilla completa, el cambio visual queda bloqueado.

## Referentes de experiencia

Airbnb, Tripadvisor y Google Travel son referencias de claridad, confianza, descubrimiento, navegación y conversión. No autorizan copiar su marca ni uniformar Valladolid.mx. La identidad final debe seguir siendo Oriente Maya de Yucatán y la marca configurada en el CMS.

## Historia Lovable

No reescribir historial publicado, no hacer force-push y no eliminar la rama de integración. Los commits enviados a la rama conectada deben quedar funcionales y trazables.

- Governance inventory: after changing governed files, regenerate `docs/governance/generated/GOVERNANCE-ARTIFACT-INVENTORY.json` with `scripts/governance/generate-artifact-inventory.mjs` in the same commit. Why: the integrity check fingerprints every governed artifact and fails on push otherwise.
- Founder revision reconciliation: OMXDS evidence gates accept a governed file while its bytes match `docs/governance/evidence/founder-revision-reconciliation-*.json`, and the dependency gate accepts the exact set in `platform-dependency-reconciliation-*.json`; refresh them only with explicit Founder authorization. Why: historical pins predate the recovered Lovable work and must stay fail-closed for any later edit.
- Offline-safe deferred widgets: floating pieces lazily loaded from `__root.tsx` use `resilientLazy` (`src/pwa/resilient-lazy.ts`), identical to `React.lazy` online but rendering nothing when their chunk cannot download. Why: offline, one uncached widget chunk replaced the whole app with the root «Sin conexión» error.
- Mi Viaje offline copy: signed-in trip reads (itinerary, concierge case file, reservations, documents) persist per account only in `src/lib/traveler/offline-trip-copy.ts` (localStorage, payment fields stripped, 45-day expiry, erased on sign-out or account change); `useAuth` falls back to the stored session read-only while offline; the service worker never caches authenticated `/_serverFn` reads. Why: travelers need their concierge itinerary without signal without leaking one account's data through shared caches.
- Branded itinerary: the shared link, its PDF and Mi Viaje's «Itinerario con marca» all render `TripItineraryDocument` over `buildItineraryModel` (`src/lib/traveler/itinerary-document.ts`); «hecho» marks persist only per device via `itinerary-progress.ts`. Why: one itinerary authority across screen and print, and progress works offline without touching reservations.
- Pull-to-refresh: public pages mount `PullToRefreshIndicator` from `__root.tsx`, reusing the Workspace `usePullToRefresh` gesture only on touch screens in the installed app or embedded preview, and refresh by invalidating queries and the router instead of reloading. Why: browsers already offer the native gesture elsewhere, and a soft refresh preserves scroll, filters and Mi Viaje.
- Media variants: every official upload path calls `deriveVariantsInBackground` (`src/lib/media/derive-on-upload-browser.ts`) after registering the original; it writes WebP 400/800/1200 (`browser-canvas` engine) via `derived-variants.functions.ts`, never touches the original and never blocks the upload. Why: sharp cannot run in the Worker; the `scripts/media-pipeline/derive.mjs` batch remains the fallback for missed or failed photos.
- Photo loading wait: `EditorialMediaFrame` alone shows the cream wait background (faint brand symbol only for `context="hero"`) and reveals each photo once after its first load; server HTML never hides photos. Why: one shared authority instead of per-template loaders, without delaying first paint.
- Public consumers forward optional asset bundles through existing DTOs to `resolveMediaSource`, preserving original URLs, media eligibility, credits and all template geometry. Why: optimization is an additive transport change, not a redesign or editorial replacement.
- Public variant reads go through `src/lib/media/variant-bundles.server.ts` and are gated by `media_pipeline_enabled` (pilot slugs only outside production). Why: the visitor-facing switch stays a single, reversible flag.
- Alux review summaries show Google's official Places `reviewSummary` verbatim (heading, disclosure, about/report/reviews links) through `src/lib/alux/review-summary*`; only the Google place id and last match attempt are stored on businesses/points_of_interest/events, and the text never reaches the Alux model. Why: Google terms forbid caching or rewriting summaries; one bounded public entry keyed by published entity refs keeps cost predictable.
- Upload-time rights declarations reuse the shared media panels and media-rights validator; destination registration validates editorial identity, destination scope and stored-byte checksum before recording documentary accreditation and its audit event. Why: editors can publish declared real photos without weakening unrelated administrative transitions or public AI protections.
- Visitor monitor reads: server code reads `visitor_intel.events` only through `readVisitorIntelEvents` (`src/lib/visitor-intel/event-reads.server.ts`), backed by service-role-only RPCs that page 1,000 rows at a time; writes use `visitor_intel_ingest_event` or `visitor_intel_append_decision_event`; simulation runs are created, filled, closed, listed and wiped only through the service-role `visitor_intel_*_simulation_*` RPCs, and the append-only trigger lets the wipe RPC delete only that run's simulated rows. Why: the schema is not exposed to the Data API and unpaged reads silently capped totals at 1,000.
- Visitor monitor precision: every browser emitter (`page-signals`, `session-signals`, Alux `signal-emitter`) publishes to `visitor_intel` only when `isMeasurableVisit()` (`src/lib/visitor-intel/measurement-gate.ts`) passes: official published host, no `navigator.webdriver`, no declared bot user agent; Alux local memory keeps working. Why: preview, QA and robot traffic inflated visitor counts without schema changes.
- New-traveler admin email: `TravelerSignupNotifier` (mounted in `__root.tsx`) calls `registerTravelerSignup` once per device after sign-in; the server decides newness (traveler role, account under 72 h) and sends `traveler-signup-admin` with a per-user idempotency key. Why: one fail-safe trigger for every sign-up method without touching auth triggers.
- Intelligence copy: admin statistics and Alux screens translate journey stages, steps, metrics, site sections, factors and segment values through `src/lib/visitor-intel/plain-language.ts`; contract ids and calculations stay technical. Why: one Spanish vocabulary for non-technical staff without breaking stored decisions or tests.
- WhatsApp owner agent: Alux conversation starts are queued by a trigger on `alux_public_sessions` and the per-minute hook `/api/public/hooks/whatsapp-agent` (via `cron_hooks_invoke_long`) polls the agent, answers owner questions from published content only (`src/lib/whatsapp-agent/*`) and sends one digest per run. Why: the WhatsApp Agent API is poll-only and allows 12 sends/min; notices carry no visitor PII.
- CRM Prospectos: account-less Alux contacts live only in `concierge_prospects` (one per phone, via service-role `crm_capture_prospect`); `decideContactOffer` gates the consent card (max two per session); the model never sees phone or email. Why: one source of truth with consented contact.
- CRM WhatsApp: Evolution API only via `src/lib/crm/channel/*` (refuses non-`vmx-*` lines); deliveries hit `crm_whatsapp_inbox` before processing; chats reuse `alux_public_sessions/messages`. Why: Zazil shares the server; lose no message; one chat model.
- CRM closure: prospects join CRM Arma tu viaje only by redeeming a hashed link at `/continuar/$token` (`src/lib/crm/closure*.ts`), reusing the active trip and case RPC; pay links only for direct-sale experiences. Why: consented, account-backed handoff.
- CMS form drafts: CMS editors back up unsaved input and scroll position per device only through `useLocalFormDraft` (`src/lib/cms/use-local-form-draft.ts` over `local-draft.ts`) and register it in `src/pwa/unsaved-work.ts`, which defers the automatic PWA reload; same-account identity reloads in `useAuth` never toggle loading. Why: leaving the app to copy data used to unmount or reload the editor and wipe what was typed.
- CRM presales: a «Preventa» is a `purpose='pay'` row of `crm_prospect_invites` (folio, quantity, frozen total, TTL); redemption creates the order through the existing direct-sale checkout, expiry is derived from `expires_at` and reconciled by the hourly CRM hook. Why: no parallel presale or payment model.
