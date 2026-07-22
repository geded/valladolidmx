# 07 · BLUEPRINT DEPENDENCY MAP

**Estado:** Approved

**Versión:** 0.8

**Última actualización:** 2026-07-21

**Owner:** Founder (documental) · Núcleo de Gobernanza (mantenimiento)

## 1. Propósito

Mapa canónico y reproducible de relaciones verificadas entre los 470 documentos registrados en `06` y sus artefactos asociados de implementación, migración y prueba. Una ausencia significa `Not established`; nunca se rellena mediante inferencia silenciosa.

## 2. Base congelada y alcance

Esta versión deriva exclusivamente de `06 v0.10 Approved`. Conserva los 470 nodos documentales (incluidos los 11 documentos Baseline V0 `18.06`–`18.16` incorporados por Adjudicación Integral Controlada Opción A del 2026-07-22 y los 12 documentos RV0.1/RV0.2 `19.01`–`19.12`), y convierte únicamente asociaciones validadas de `06` en aristas. La evidencia autocontenida no se presenta como una prueba externa independiente.

El dataset legible por máquina se publica junto a este documento en `docs/governance/generated/07-BLUEPRINT-DEPENDENCY-MAP.json`; este Markdown resume el contrato y contiene el inventario completo de artefactos y aristas.

## 3. Contrato

### 3.1 Nodos

- `DOC:<path>`: documento canónico de `06`, con estado y dominio heredados.
- `ART:<path>`: ruta, componente, módulo, función, migración, prueba o activo resoluble asociado.

### 3.2 Aristas

- `supersedes`: relación documental aprobada.
- `implements`: el artefacto implementa la capacidad descrita por el documento.
- `requires`: el documento requiere la migración vinculada.
- `demonstrates`: una prueba o evidencia externa demuestra el documento o su entrega.

Toda arista registra origen, destino, relación, evidencia, fila fuente y fecha. Las autorreferencias documentales y las asociaciones no acreditadas se excluyen.

## 4. Cobertura

- Nodos documentales: **470**.
- Nodos de artefacto únicos: **546**.
- Nodos totales: **1016**.
- Aristas verificadas: **1119**.
- Aristas inválidas: **0**.

| Relación | Aristas |
|---|---:|
| `demonstrates` | 45 |
| `implements` | 1053 |
| `requires` | 18 |
| `supersedes` | 3 |

## 4.1 Cadenas críticas

| Cadena | Documentos | Aristas verificadas | Tratamiento |
|---|---:|---:|---|
| CANON → 15.10.5a–5d → PWA | 21 | 91 | Representada por nodos documentales y aristas verificadas hacia componentes/rutas; la secuencia de autorización no se infiere cuando no existe asociación explícita. |
| H-03 → bloques → DSL | 27 | 69 | Representada por documentos H-03 y artefactos Experience Builder asociados; dependencias no acreditadas permanecen ausentes. |
| SEO.A1/A2/A3 → rutas | 14 | 33 | Representada mediante aristas `implements` desde rutas y módulos SEO validados. |
| CV1…CV8 → tablas/servicios | 55 | 136 | Representada mediante implementación, migraciones y pruebas validadas disponibles; las tablas no acreditadas en 06 no se presumen. |

Las cadenas están representadas sin fabricar dependencias. Los huecos explícitos son deuda de evidencia de los documentos fuente, no fallas estructurales del mapa.

## 5. Nodos de artefacto

Los 470 nodos documentales se heredan íntegramente de `06`; aquí se enumeran los artefactos únicos adicionales.

| ID | Tipo | Ruta |
|---|---|---|
| `ART:[`13.A-MIGRATIONS-CONVENTIONS-v1.0.md`](../blueprint/13.A-MIGRATIONS-CONVENTIONS-v1.0.md)` | `artifact` | `[`13.A-MIGRATIONS-CONVENTIONS-v1.0.md`](../blueprint/13.A-MIGRATIONS-CONVENTIONS-v1.0.md)` |
| `ART:[`18.H3-A4-M1-MIGRATION-VALIDATION-REPORT-v1.1.md`](../blueprint/18.H3-A4-M1-MIGRATION-VALIDATION-REPORT-v1.1.md)` | `artifact` | `[`18.H3-A4-M1-MIGRATION-VALIDATION-REPORT-v1.1.md`](../blueprint/18.H3-A4-M1-MIGRATION-VALIDATION-REPORT-v1.1.md)` |
| `ART:public/logo.png` | `public_asset` | `public/logo.png` |
| `ART:public/og/default-1200x630.jpg` | `public_asset` | `public/og/default-1200x630.jpg` |
| `ART:public/push-sw.js` | `public_asset` | `public/push-sw.js` |
| `ART:public/pwa-skipwaiting.js` | `public_asset` | `public/pwa-skipwaiting.js` |
| `ART:scripts/alux-spatial.test.ts` | `test` | `scripts/alux-spatial.test.ts` |
| `ART:scripts/assert-no-v2-imports.sh` | `test` | `scripts/assert-no-v2-imports.sh` |
| `ART:scripts/assert-resolve-media-alt.sh` | `test` | `scripts/assert-resolve-media-alt.sh` |
| `ART:scripts/experience-map-defaults.test.ts` | `test` | `scripts/experience-map-defaults.test.ts` |
| `ART:scripts/hours-status.test.ts` | `test` | `scripts/hours-status.test.ts` |
| `ART:scripts/kit-blocks-smoke.tsx` | `test` | `scripts/kit-blocks-smoke.tsx` |
| `ART:scripts/live-recap.test.ts` | `test` | `scripts/live-recap.test.ts` |
| `ART:scripts/media-benchmark/` | `test` | `scripts/media-benchmark/` |
| `ART:scripts/media-benchmark/README.md` | `test` | `scripts/media-benchmark/README.md` |
| `ART:scripts/media-benchmark/run-local.mjs` | `test` | `scripts/media-benchmark/run-local.mjs` |
| `ART:scripts/media-benchmark/run.ts` | `test` | `scripts/media-benchmark/run.ts` |
| `ART:scripts/media-benchmark/samples/` | `test` | `scripts/media-benchmark/samples/` |
| `ART:scripts/media-renewal-hmac.test.mjs` | `test` | `scripts/media-renewal-hmac.test.mjs` |
| `ART:scripts/media-shadow-m23-bench.mjs` | `test` | `scripts/media-shadow-m23-bench.mjs` |
| `ART:scripts/on-trip-concierge.test.ts` | `test` | `scripts/on-trip-concierge.test.ts` |
| `ART:scripts/shadow-evaluator.test.ts` | `test` | `scripts/shadow-evaluator.test.ts` |
| `ART:scripts/shadow-preloader.test.ts` | `test` | `scripts/shadow-preloader.test.ts` |
| `ART:scripts/sign-cache.test.ts` | `test` | `scripts/sign-cache.test.ts` |
| `ART:scripts/surface-composer-smoke.tsx` | `test` | `scripts/surface-composer-smoke.tsx` |
| `ART:scripts/traffic-status.test.ts` | `test` | `scripts/traffic-status.test.ts` |
| `ART:scripts/visitor-intel-decision-operations.test.ts` | `test` | `scripts/visitor-intel-decision-operations.test.ts` |
| `ART:scripts/visitor-intel-decisions.test.ts` | `test` | `scripts/visitor-intel-decisions.test.ts` |
| `ART:scripts/visitor-intel-ingest.test.ts` | `test` | `scripts/visitor-intel-ingest.test.ts` |
| `ART:scripts/visitor-intel-projection.test.ts` | `test` | `scripts/visitor-intel-projection.test.ts` |
| `ART:scripts/visitor-intel-simulation.test.ts` | `test` | `scripts/visitor-intel-simulation.test.ts` |
| `ART:src/assets` | `artifact` | `src/assets` |
| `ART:src/assets/` | `artifact` | `src/assets/` |
| `ART:src/assets/brand/hero` | `artifact` | `src/assets/brand/hero` |
| `ART:src/assets/brand/hero/bg01.webp` | `artifact` | `src/assets/brand/hero/bg01.webp` |
| `ART:src/assets/brand/hero/bg02.webp` | `artifact` | `src/assets/brand/hero/bg02.webp` |
| `ART:src/assets/brand/logo.png` | `artifact` | `src/assets/brand/logo.png` |
| `ART:src/components` | `artifact` | `src/components` |
| `ART:src/components/` | `component` | `src/components/` |
| `ART:src/components/admin/` | `component` | `src/components/admin/` |
| `ART:src/components/admin/AdminHub.tsx` | `component` | `src/components/admin/AdminHub.tsx` |
| `ART:src/components/admin/cockpit-blocks.tsx` | `component` | `src/components/admin/cockpit-blocks.tsx` |
| `ART:src/components/admin/ZoneScopesDialog.tsx` | `component` | `src/components/admin/ZoneScopesDialog.tsx` |
| `ART:src/components/brand/BrandLogo.tsx` | `component` | `src/components/brand/BrandLogo.tsx` |
| `ART:src/components/cards/` | `component` | `src/components/cards/` |
| `ART:src/components/cards/CategoriaCard.tsx` | `component` | `src/components/cards/CategoriaCard.tsx` |
| `ART:src/components/cards/DestinoCard.tsx` | `component` | `src/components/cards/DestinoCard.tsx` |
| `ART:src/components/cards/EmpresaCard.tsx` | `component` | `src/components/cards/EmpresaCard.tsx` |
| `ART:src/components/cards/ResenaCard.tsx` | `component` | `src/components/cards/ResenaCard.tsx` |
| `ART:src/components/cards/RutaCard.tsx` | `component` | `src/components/cards/RutaCard.tsx` |
| `ART:src/components/cms/` | `component` | `src/components/cms/` |
| `ART:src/components/cms/CmsEntityPage.tsx` | `component` | `src/components/cms/CmsEntityPage.tsx` |
| `ART:src/components/cms/EntityEditor.tsx` | `component` | `src/components/cms/EntityEditor.tsx` |
| `ART:src/components/cms/EntityListView.tsx` | `component` | `src/components/cms/EntityListView.tsx` |
| `ART:src/components/cms/ReviewModerator.tsx` | `component` | `src/components/cms/ReviewModerator.tsx` |
| `ART:src/components/commerce/` | `component` | `src/components/commerce/` |
| `ART:src/components/commerce/FavoriteButton.tsx` | `component` | `src/components/commerce/FavoriteButton.tsx` |
| `ART:src/components/common/` | `component` | `src/components/common/` |
| `ART:src/components/common/PageShell.tsx` | `component` | `src/components/common/PageShell.tsx` |
| `ART:src/components/concierge/CaseFileView.tsx` | `component` | `src/components/concierge/CaseFileView.tsx` |
| `ART:src/components/concierge/RequestConciergeButton.tsx` | `component` | `src/components/concierge/RequestConciergeButton.tsx` |
| `ART:src/components/discovery/` | `component` | `src/components/discovery/` |
| `ART:src/components/discovery/DiscoveryNavigator.tsx` | `component` | `src/components/discovery/DiscoveryNavigator.tsx` |
| `ART:src/components/discovery/index.ts` | `component` | `src/components/discovery/index.ts` |
| `ART:src/components/discovery/OfflineBanner.tsx` | `component` | `src/components/discovery/OfflineBanner.tsx` |
| `ART:src/components/discovery/PublicFooter.tsx` | `component` | `src/components/discovery/PublicFooter.tsx` |
| `ART:src/components/discovery/PublicHeader.tsx` | `component` | `src/components/discovery/PublicHeader.tsx` |
| `ART:src/components/discovery/PublicShell.tsx` | `component` | `src/components/discovery/PublicShell.tsx` |
| `ART:src/components/discovery/SyncStatusBanner.tsx` | `component` | `src/components/discovery/SyncStatusBanner.tsx` |
| `ART:src/components/discovery/UpdateBanner.tsx` | `component` | `src/components/discovery/UpdateBanner.tsx` |
| `ART:src/components/experience-builder/` | `component` | `src/components/experience-builder/` |
| `ART:src/components/experience-builder/AutoInspector.tsx` | `component` | `src/components/experience-builder/AutoInspector.tsx` |
| `ART:src/components/experience-builder/blocks/` | `component` | `src/components/experience-builder/blocks/` |
| `ART:src/components/experience-builder/blocks/DiscoveryNavigatorBlock.tsx` | `component` | `src/components/experience-builder/blocks/DiscoveryNavigatorBlock.tsx` |
| `ART:src/components/experience-builder/blocks/experience-cta-bar/ExperienceCtaBar.tsx` | `component` | `src/components/experience-builder/blocks/experience-cta-bar/ExperienceCtaBar.tsx` |
| `ART:src/components/experience-builder/blocks/experience-cta-bar/ExperienceCtaBarBlock.tsx` | `component` | `src/components/experience-builder/blocks/experience-cta-bar/ExperienceCtaBarBlock.tsx` |
| `ART:src/components/experience-builder/blocks/experience-hero/ExperienceHero.tsx` | `component` | `src/components/experience-builder/blocks/experience-hero/ExperienceHero.tsx` |
| `ART:src/components/experience-builder/blocks/experience-hero/ExperienceHeroBlock.tsx` | `component` | `src/components/experience-builder/blocks/experience-hero/ExperienceHeroBlock.tsx` |
| `ART:src/components/experience-builder/blocks/experience-hero/ExperienceHeroFromProduct.tsx` | `component` | `src/components/experience-builder/blocks/experience-hero/ExperienceHeroFromProduct.tsx` |
| `ART:src/components/experience-builder/blocks/experience-institutional-badges/InstitutionalBadges.tsx` | `component` | `src/components/experience-builder/blocks/experience-institutional-badges/InstitutionalBadges.tsx` |
| `ART:src/components/experience-builder/blocks/experience-institutional-badges/InstitutionalBadgesBlock.tsx` | `component` | `src/components/experience-builder/blocks/experience-institutional-badges/InstitutionalBadgesBlock.tsx` |
| `ART:src/components/experience-builder/blocks/experience-map/ExperienceMapBlock.tsx` | `component` | `src/components/experience-builder/blocks/experience-map/ExperienceMapBlock.tsx` |
| `ART:src/components/experience-builder/blocks/experience-related-collection/ExperienceRelatedCollectionBlock.tsx` | `component` | `src/components/experience-builder/blocks/experience-related-collection/ExperienceRelatedCollectionBlock.tsx` |
| `ART:src/components/experience-builder/blocks/experience-reviews/ExperienceReviews.tsx` | `component` | `src/components/experience-builder/blocks/experience-reviews/ExperienceReviews.tsx` |
| `ART:src/components/experience-builder/blocks/experience-reviews/ExperienceReviewsBlock.tsx` | `component` | `src/components/experience-builder/blocks/experience-reviews/ExperienceReviewsBlock.tsx` |
| `ART:src/components/experience-builder/blocks/experience-subnav/ExperienceSubnav.tsx` | `component` | `src/components/experience-builder/blocks/experience-subnav/ExperienceSubnav.tsx` |
| `ART:src/components/experience-builder/blocks/experience-subnav/ExperienceSubnavBlock.tsx` | `component` | `src/components/experience-builder/blocks/experience-subnav/ExperienceSubnavBlock.tsx` |
| `ART:src/components/experience-builder/PagesPanel.tsx` | `component` | `src/components/experience-builder/PagesPanel.tsx` |
| `ART:src/components/experience-builder/SeoPreview.tsx` | `component` | `src/components/experience-builder/SeoPreview.tsx` |
| `ART:src/components/experience-builder/VariablePicker.tsx` | `component` | `src/components/experience-builder/VariablePicker.tsx` |
| `ART:src/components/experience-builder/VisualStudio.tsx` | `component` | `src/components/experience-builder/VisualStudio.tsx` |
| `ART:src/components/home/` | `component` | `src/components/home/` |
| `ART:src/components/home/ArmaTuViajeSection.tsx` | `component` | `src/components/home/ArmaTuViajeSection.tsx` |
| `ART:src/components/home/CategoriasSection.tsx` | `component` | `src/components/home/CategoriasSection.tsx` |
| `ART:src/components/home/ConsejoAluxSection.tsx` | `component` | `src/components/home/ConsejoAluxSection.tsx` |
| `ART:src/components/home/DestinosSection.tsx` | `component` | `src/components/home/DestinosSection.tsx` |
| `ART:src/components/home/EmpresasSection.tsx` | `component` | `src/components/home/EmpresasSection.tsx` |
| `ART:src/components/home/EnVivoSection.tsx` | `component` | `src/components/home/EnVivoSection.tsx` |
| `ART:src/components/home/Hero.tsx` | `component` | `src/components/home/Hero.tsx` |
| `ART:src/components/home/ResenasSection.tsx` | `component` | `src/components/home/ResenasSection.tsx` |
| `ART:src/components/home/RutasSection.tsx` | `component` | `src/components/home/RutasSection.tsx` |
| `ART:src/components/hosting/BecomeHostFlow.tsx` | `component` | `src/components/hosting/BecomeHostFlow.tsx` |
| `ART:src/components/layout/AluxFloatingTrigger.tsx` | `component` | `src/components/layout/AluxFloatingTrigger.tsx` |
| `ART:src/components/layout/BreadcrumbTerritorial.tsx` | `component` | `src/components/layout/BreadcrumbTerritorial.tsx` |
| `ART:src/components/layout/Container.tsx` | `component` | `src/components/layout/Container.tsx` |
| `ART:src/components/layout/PrimaryMegaMenu.tsx` | `component` | `src/components/layout/PrimaryMegaMenu.tsx` |
| `ART:src/components/layout/SiteFooter.tsx` | `component` | `src/components/layout/SiteFooter.tsx` |
| `ART:src/components/layout/SiteHeader.tsx` | `component` | `src/components/layout/SiteHeader.tsx` |
| `ART:src/components/layout/UserMenu.tsx` | `component` | `src/components/layout/UserMenu.tsx` |
| `ART:src/components/navigation/DestinationSwitcher.tsx` | `component` | `src/components/navigation/DestinationSwitcher.tsx` |
| `ART:src/components/navigation/NavigationSessionBridge.tsx` | `component` | `src/components/navigation/NavigationSessionBridge.tsx` |
| `ART:src/components/notifications/ActivityFeedView.tsx` | `component` | `src/components/notifications/ActivityFeedView.tsx` |
| `ART:src/components/portal/` | `component` | `src/components/portal/` |
| `ART:src/components/portal/ProductAdvancedPanel.tsx` | `component` | `src/components/portal/ProductAdvancedPanel.tsx` |
| `ART:src/components/protected-actions/` | `component` | `src/components/protected-actions/` |
| `ART:src/components/protected-actions/SignInPromptSheet.tsx` | `component` | `src/components/protected-actions/SignInPromptSheet.tsx` |
| `ART:src/components/reviews/ReviewComposer.tsx` | `component` | `src/components/reviews/ReviewComposer.tsx` |
| `ART:src/components/reviews/TrustBadge.tsx` | `component` | `src/components/reviews/TrustBadge.tsx` |
| `ART:src/components/surfaces/` | `component` | `src/components/surfaces/` |
| `ART:src/components/surfaces/AluxSurface.tsx` | `component` | `src/components/surfaces/AluxSurface.tsx` |
| `ART:src/components/surfaces/business-blocks.legacy.tsx` | `component` | `src/components/surfaces/business-blocks.legacy.tsx` |
| `ART:src/components/surfaces/business-blocks.tsx` | `component` | `src/components/surfaces/business-blocks.tsx` |
| `ART:src/components/surfaces/business/business-to-kit-vm.ts` | `component` | `src/components/surfaces/business/business-to-kit-vm.ts` |
| `ART:src/components/surfaces/BusinessSurface.tsx` | `component` | `src/components/surfaces/BusinessSurface.tsx` |
| `ART:src/components/surfaces/CategorySurface.tsx` | `component` | `src/components/surfaces/CategorySurface.tsx` |
| `ART:src/components/surfaces/DestinationSurface.tsx` | `component` | `src/components/surfaces/DestinationSurface.tsx` |
| `ART:src/components/surfaces/EventSurface.tsx` | `component` | `src/components/surfaces/EventSurface.tsx` |
| `ART:src/components/surfaces/kit/` | `component` | `src/components/surfaces/kit/` |
| `ART:src/components/surfaces/kit/Shell.tsx` | `component` | `src/components/surfaces/kit/Shell.tsx` |
| `ART:src/components/surfaces/kit/types.ts` | `component` | `src/components/surfaces/kit/types.ts` |
| `ART:src/components/surfaces/MarketplaceSurface.tsx` | `component` | `src/components/surfaces/MarketplaceSurface.tsx` |
| `ART:src/components/surfaces/product-blocks.legacy.tsx` | `component` | `src/components/surfaces/product-blocks.legacy.tsx` |
| `ART:src/components/surfaces/product-blocks.tsx` | `component` | `src/components/surfaces/product-blocks.tsx` |
| `ART:src/components/surfaces/product/product-to-kit-vm.ts` | `component` | `src/components/surfaces/product/product-to-kit-vm.ts` |
| `ART:src/components/surfaces/ProductSurface.tsx` | `component` | `src/components/surfaces/ProductSurface.tsx` |
| `ART:src/components/surfaces/RegionSurface.tsx` | `component` | `src/components/surfaces/RegionSurface.tsx` |
| `ART:src/components/surfaces/TourismListingSurface.tsx` | `component` | `src/components/surfaces/TourismListingSurface.tsx` |
| `ART:src/components/surfaces/TripPlannerSurface.tsx` | `component` | `src/components/surfaces/TripPlannerSurface.tsx` |
| `ART:src/components/traveler/AddToTravelPlanButton.tsx` | `component` | `src/components/traveler/AddToTravelPlanButton.tsx` |
| `ART:src/components/traveler/AluxSourcesFooter.tsx` | `component` | `src/components/traveler/AluxSourcesFooter.tsx` |
| `ART:src/components/traveler/AluxSuggestionCard.tsx` | `component` | `src/components/traveler/AluxSuggestionCard.tsx` |
| `ART:src/components/traveler/AluxTravelerPanel.tsx` | `component` | `src/components/traveler/AluxTravelerPanel.tsx` |
| `ART:src/components/traveler/ContinuityWelcomeSurface.tsx` | `component` | `src/components/traveler/ContinuityWelcomeSurface.tsx` |
| `ART:src/components/traveler/GuestPlanPreview.tsx` | `component` | `src/components/traveler/GuestPlanPreview.tsx` |
| `ART:src/components/traveler/LiveRecapSurface.tsx` | `component` | `src/components/traveler/LiveRecapSurface.tsx` |
| `ART:src/components/traveler/NowNextLaterSurface.tsx` | `component` | `src/components/traveler/NowNextLaterSurface.tsx` |
| `ART:src/components/traveler/OnTripConciergePriorityBanner.tsx` | `component` | `src/components/traveler/OnTripConciergePriorityBanner.tsx` |
| `ART:src/components/traveler/PermissionMoment.tsx` | `component` | `src/components/traveler/PermissionMoment.tsx` |
| `ART:src/components/traveler/StageAwareCompanionBoard.tsx` | `component` | `src/components/traveler/StageAwareCompanionBoard.tsx` |
| `ART:src/components/traveler/WelcomeOnboardingModal.tsx` | `component` | `src/components/traveler/WelcomeOnboardingModal.tsx` |
| `ART:src/components/ui/` | `component` | `src/components/ui/` |
| `ART:src/components/ui/badge.tsx` | `component` | `src/components/ui/badge.tsx` |
| `ART:src/components/ui/button.tsx` | `component` | `src/components/ui/button.tsx` |
| `ART:src/components/ui/card.tsx` | `component` | `src/components/ui/card.tsx` |
| `ART:src/components/ui/LazyToasterHost.tsx` | `component` | `src/components/ui/LazyToasterHost.tsx` |
| `ART:src/components/ui/sidebar.tsx` | `component` | `src/components/ui/sidebar.tsx` |
| `ART:src/components/ui/sonner.tsx` | `component` | `src/components/ui/sonner.tsx` |
| `ART:src/components/workspace` | `component` | `src/components/workspace` |
| `ART:src/components/workspace/` | `component` | `src/components/workspace/` |
| `ART:src/components/workspace/inspector/registry.ts` | `component` | `src/components/workspace/inspector/registry.ts` |
| `ART:src/components/workspace/WorkspaceProvider.tsx` | `component` | `src/components/workspace/WorkspaceProvider.tsx` |
| `ART:src/config/languages.ts` | `artifact` | `src/config/languages.ts` |
| `ART:src/config/regions.ts` | `artifact` | `src/config/regions.ts` |
| `ART:src/config/site.ts` | `artifact` | `src/config/site.ts` |
| `ART:src/hooks/` | `artifact` | `src/hooks/` |
| `ART:src/i18n/` | `artifact` | `src/i18n/` |
| `ART:src/i18n/context.tsx` | `artifact` | `src/i18n/context.tsx` |
| `ART:src/i18n/locales/` | `artifact` | `src/i18n/locales/` |
| `ART:src/i18n/locales/de.json` | `artifact` | `src/i18n/locales/de.json` |
| `ART:src/i18n/locales/en.json` | `artifact` | `src/i18n/locales/en.json` |
| `ART:src/i18n/locales/es.json` | `artifact` | `src/i18n/locales/es.json` |
| `ART:src/i18n/locales/fr.json` | `artifact` | `src/i18n/locales/fr.json` |
| `ART:src/i18n/locales/it.json` | `artifact` | `src/i18n/locales/it.json` |
| `ART:src/i18n/locales/pt.json` | `artifact` | `src/i18n/locales/pt.json` |
| `ART:src/integrations/lovable/index.ts` | `artifact` | `src/integrations/lovable/index.ts` |
| `ART:src/integrations/supabase/` | `artifact` | `src/integrations/supabase/` |
| `ART:src/integrations/supabase/auth-attacher.ts` | `artifact` | `src/integrations/supabase/auth-attacher.ts` |
| `ART:src/integrations/supabase/auth-middleware.ts` | `artifact` | `src/integrations/supabase/auth-middleware.ts` |
| `ART:src/integrations/supabase/client.server.ts` | `artifact` | `src/integrations/supabase/client.server.ts` |
| `ART:src/integrations/supabase/client.ts` | `artifact` | `src/integrations/supabase/client.ts` |
| `ART:src/integrations/supabase/types.ts` | `artifact` | `src/integrations/supabase/types.ts` |
| `ART:src/lib/` | `module` | `src/lib/` |
| `ART:src/lib/admin/` | `module` | `src/lib/admin/` |
| `ART:src/lib/admin/cockpit.functions.ts` | `server_fn` | `src/lib/admin/cockpit.functions.ts` |
| `ART:src/lib/admin/founder.functions.ts` | `server_fn` | `src/lib/admin/founder.functions.ts` |
| `ART:src/lib/admin/zone-scopes.functions.ts` | `server_fn` | `src/lib/admin/zone-scopes.functions.ts` |
| `ART:src/lib/ai-gateway.server.ts` | `module` | `src/lib/ai-gateway.server.ts` |
| `ART:src/lib/alux/contextual-suggest.functions.ts` | `server_fn` | `src/lib/alux/contextual-suggest.functions.ts` |
| `ART:src/lib/alux/floating-presence.ts` | `module` | `src/lib/alux/floating-presence.ts` |
| `ART:src/lib/alux/traveler-lens.functions.ts` | `server_fn` | `src/lib/alux/traveler-lens.functions.ts` |
| `ART:src/lib/business/hours-status.ts` | `module` | `src/lib/business/hours-status.ts` |
| `ART:src/lib/catalog/` | `module` | `src/lib/catalog/` |
| `ART:src/lib/catalog/business-related.functions.ts` | `server_fn` | `src/lib/catalog/business-related.functions.ts` |
| `ART:src/lib/catalog/category-related.functions.ts` | `server_fn` | `src/lib/catalog/category-related.functions.ts` |
| `ART:src/lib/catalog/product-related.functions.ts` | `server_fn` | `src/lib/catalog/product-related.functions.ts` |
| `ART:src/lib/cms.functions.ts` | `server_fn` | `src/lib/cms.functions.ts` |
| `ART:src/lib/cms/` | `module` | `src/lib/cms/` |
| `ART:src/lib/cms/editor-fields.ts` | `module` | `src/lib/cms/editor-fields.ts` |
| `ART:src/lib/cms/media-intelligence.functions.ts` | `server_fn` | `src/lib/cms/media-intelligence.functions.ts` |
| `ART:src/lib/cms/moderation.functions.ts` | `server_fn` | `src/lib/cms/moderation.functions.ts` |
| `ART:src/lib/cms/products-media.functions.ts` | `server_fn` | `src/lib/cms/products-media.functions.ts` |
| `ART:src/lib/cms/public-reads.functions.ts` | `server_fn` | `src/lib/cms/public-reads.functions.ts` |
| `ART:src/lib/cms/workflow.ts` | `module` | `src/lib/cms/workflow.ts` |
| `ART:src/lib/cms/writes.functions.ts` | `server_fn` | `src/lib/cms/writes.functions.ts` |
| `ART:src/lib/concierge/` | `module` | `src/lib/concierge/` |
| `ART:src/lib/concierge/alux.functions.ts` | `server_fn` | `src/lib/concierge/alux.functions.ts` |
| `ART:src/lib/concierge/cc.functions.ts` | `server_fn` | `src/lib/concierge/cc.functions.ts` |
| `ART:src/lib/concierge/concierge.functions.ts` | `server_fn` | `src/lib/concierge/concierge.functions.ts` |
| `ART:src/lib/concierge/orders.functions.ts` | `server_fn` | `src/lib/concierge/orders.functions.ts` |
| `ART:src/lib/context-engine/` | `module` | `src/lib/context-engine/` |
| `ART:src/lib/context-engine/events.ts` | `module` | `src/lib/context-engine/events.ts` |
| `ART:src/lib/context-engine/index.ts` | `module` | `src/lib/context-engine/index.ts` |
| `ART:src/lib/context-engine/inheritance-rules.ts` | `module` | `src/lib/context-engine/inheritance-rules.ts` |
| `ART:src/lib/context-engine/live-context.ts` | `module` | `src/lib/context-engine/live-context.ts` |
| `ART:src/lib/context-engine/previous-store.ts` | `module` | `src/lib/context-engine/previous-store.ts` |
| `ART:src/lib/context-engine/provider.tsx` | `module` | `src/lib/context-engine/provider.tsx` |
| `ART:src/lib/context-engine/resolver.ts` | `module` | `src/lib/context-engine/resolver.ts` |
| `ART:src/lib/context-engine/types.ts` | `module` | `src/lib/context-engine/types.ts` |
| `ART:src/lib/destinations/public-reads.functions.ts` | `server_fn` | `src/lib/destinations/public-reads.functions.ts` |
| `ART:src/lib/discovery/` | `module` | `src/lib/discovery/` |
| `ART:src/lib/discovery/cards-registry.ts` | `module` | `src/lib/discovery/cards-registry.ts` |
| `ART:src/lib/discovery/discovery-navigator.functions.ts` | `server_fn` | `src/lib/discovery/discovery-navigator.functions.ts` |
| `ART:src/lib/discovery/index.ts` | `module` | `src/lib/discovery/index.ts` |
| `ART:src/lib/discovery/sections-registry.ts` | `module` | `src/lib/discovery/sections-registry.ts` |
| `ART:src/lib/discovery/seo.ts` | `module` | `src/lib/discovery/seo.ts` |
| `ART:src/lib/email-templates/` | `module` | `src/lib/email-templates/` |
| `ART:src/lib/email-templates/coupon-issued.tsx` | `module` | `src/lib/email-templates/coupon-issued.tsx` |
| `ART:src/lib/email-templates/coupon-redeemed.tsx` | `module` | `src/lib/email-templates/coupon-redeemed.tsx` |
| `ART:src/lib/email-templates/coupon-review-reminder.tsx` | `module` | `src/lib/email-templates/coupon-review-reminder.tsx` |
| `ART:src/lib/email-templates/trip-post.tsx` | `module` | `src/lib/email-templates/trip-post.tsx` |
| `ART:src/lib/email-templates/trip-t14.tsx` | `module` | `src/lib/email-templates/trip-t14.tsx` |
| `ART:src/lib/email-templates/trip-t3.tsx` | `module` | `src/lib/email-templates/trip-t3.tsx` |
| `ART:src/lib/email-templates/trip-welcome.tsx` | `module` | `src/lib/email-templates/trip-welcome.tsx` |
| `ART:src/lib/email-templates/visibility-activated.tsx` | `module` | `src/lib/email-templates/visibility-activated.tsx` |
| `ART:src/lib/email-templates/visibility-expired.tsx` | `module` | `src/lib/email-templates/visibility-expired.tsx` |
| `ART:src/lib/email-templates/visibility-expiring.tsx` | `module` | `src/lib/email-templates/visibility-expiring.tsx` |
| `ART:src/lib/email-templates/visibility-rejected.tsx` | `module` | `src/lib/email-templates/visibility-rejected.tsx` |
| `ART:src/lib/email-templates/visibility-request-received.tsx` | `module` | `src/lib/email-templates/visibility-request-received.tsx` |
| `ART:src/lib/experience-builder/` | `module` | `src/lib/experience-builder/` |
| `ART:src/lib/experience-builder/adapters/business-related-to-block.ts` | `module` | `src/lib/experience-builder/adapters/business-related-to-block.ts` |
| `ART:src/lib/experience-builder/adapters/business-to-blocks.ts` | `module` | `src/lib/experience-builder/adapters/business-to-blocks.ts` |
| `ART:src/lib/experience-builder/adapters/category-related-to-block.ts` | `module` | `src/lib/experience-builder/adapters/category-related-to-block.ts` |
| `ART:src/lib/experience-builder/adapters/destination-related-to-block.ts` | `module` | `src/lib/experience-builder/adapters/destination-related-to-block.ts` |
| `ART:src/lib/experience-builder/adapters/product-related-to-block.ts` | `module` | `src/lib/experience-builder/adapters/product-related-to-block.ts` |
| `ART:src/lib/experience-builder/adapters/tourism-listing-adapters.ts` | `module` | `src/lib/experience-builder/adapters/tourism-listing-adapters.ts` |
| `ART:src/lib/experience-builder/block-contract.ts` | `module` | `src/lib/experience-builder/block-contract.ts` |
| `ART:src/lib/experience-builder/block-library.ts` | `module` | `src/lib/experience-builder/block-library.ts` |
| `ART:src/lib/experience-builder/block-registry.ts` | `module` | `src/lib/experience-builder/block-registry.ts` |
| `ART:src/lib/experience-builder/blocks/` | `module` | `src/lib/experience-builder/blocks/` |
| `ART:src/lib/experience-builder/blocks/experience-cta-bar/contract.ts` | `module` | `src/lib/experience-builder/blocks/experience-cta-bar/contract.ts` |
| `ART:src/lib/experience-builder/blocks/experience-hero/` | `module` | `src/lib/experience-builder/blocks/experience-hero/` |
| `ART:src/lib/experience-builder/blocks/experience-hero/contract.ts` | `module` | `src/lib/experience-builder/blocks/experience-hero/contract.ts` |
| `ART:src/lib/experience-builder/blocks/experience-institutional-badges/contract.ts` | `module` | `src/lib/experience-builder/blocks/experience-institutional-badges/contract.ts` |
| `ART:src/lib/experience-builder/blocks/experience-institutional-badges/institutional-badges.registry.ts` | `module` | `src/lib/experience-builder/blocks/experience-institutional-badges/institutional-badges.registry.ts` |
| `ART:src/lib/experience-builder/blocks/experience-map/` | `module` | `src/lib/experience-builder/blocks/experience-map/` |
| `ART:src/lib/experience-builder/blocks/experience-map/contract.ts` | `module` | `src/lib/experience-builder/blocks/experience-map/contract.ts` |
| `ART:src/lib/experience-builder/blocks/experience-map/defaults.ts` | `module` | `src/lib/experience-builder/blocks/experience-map/defaults.ts` |
| `ART:src/lib/experience-builder/blocks/experience-map/types.ts` | `module` | `src/lib/experience-builder/blocks/experience-map/types.ts` |
| `ART:src/lib/experience-builder/blocks/experience-related-collection/contract.ts` | `module` | `src/lib/experience-builder/blocks/experience-related-collection/contract.ts` |
| `ART:src/lib/experience-builder/blocks/experience-reviews/contract.ts` | `module` | `src/lib/experience-builder/blocks/experience-reviews/contract.ts` |
| `ART:src/lib/experience-builder/blocks/experience-subnav/contract.ts` | `module` | `src/lib/experience-builder/blocks/experience-subnav/contract.ts` |
| `ART:src/lib/experience-builder/composition-renderer.tsx` | `module` | `src/lib/experience-builder/composition-renderer.tsx` |
| `ART:src/lib/experience-builder/composition-tree.ts` | `module` | `src/lib/experience-builder/composition-tree.ts` |
| `ART:src/lib/experience-builder/dynamic-variables.ts` | `module` | `src/lib/experience-builder/dynamic-variables.ts` |
| `ART:src/lib/experience-builder/eb-redirects.functions.ts` | `server_fn` | `src/lib/experience-builder/eb-redirects.functions.ts` |
| `ART:src/lib/experience-builder/eb-route-resolver.functions.ts` | `server_fn` | `src/lib/experience-builder/eb-route-resolver.functions.ts` |
| `ART:src/lib/experience-builder/eb-sitemap.functions.ts` | `server_fn` | `src/lib/experience-builder/eb-sitemap.functions.ts` |
| `ART:src/lib/experience-builder/experience-builder.functions.ts` | `server_fn` | `src/lib/experience-builder/experience-builder.functions.ts` |
| `ART:src/lib/experience-builder/kit-blocks.tsx` | `module` | `src/lib/experience-builder/kit-blocks.tsx` |
| `ART:src/lib/experience-builder/kit-seeds.ts` | `module` | `src/lib/experience-builder/kit-seeds.ts` |
| `ART:src/lib/experience-builder/layout-engine.ts` | `module` | `src/lib/experience-builder/layout-engine.ts` |
| `ART:src/lib/experience-builder/page-kind-registry.ts` | `module` | `src/lib/experience-builder/page-kind-registry.ts` |
| `ART:src/lib/experience-builder/preview-registry.tsx` | `module` | `src/lib/experience-builder/preview-registry.tsx` |
| `ART:src/lib/experience-builder/public-reads.functions.ts` | `server_fn` | `src/lib/experience-builder/public-reads.functions.ts` |
| `ART:src/lib/experience-builder/route-inventory.ts` | `module` | `src/lib/experience-builder/route-inventory.ts` |
| `ART:src/lib/experience-builder/studio.functions.ts` | `server_fn` | `src/lib/experience-builder/studio.functions.ts` |
| `ART:src/lib/experience-builder/surface-composer.ts` | `module` | `src/lib/experience-builder/surface-composer.ts` |
| `ART:src/lib/hosting/hosting.functions.ts` | `server_fn` | `src/lib/hosting/hosting.functions.ts` |
| `ART:src/lib/maps/routes.server.ts` | `module` | `src/lib/maps/routes.server.ts` |
| `ART:src/lib/mcp/` | `module` | `src/lib/mcp/` |
| `ART:src/lib/mcp/index.ts` | `module` | `src/lib/mcp/index.ts` |
| `ART:src/lib/mcp/lib/` | `module` | `src/lib/mcp/lib/` |
| `ART:src/lib/mcp/lib/contracts.ts` | `module` | `src/lib/mcp/lib/contracts.ts` |
| `ART:src/lib/mcp/lib/rate-limit.ts` | `module` | `src/lib/mcp/lib/rate-limit.ts` |
| `ART:src/lib/mcp/lib/sanitize.ts` | `module` | `src/lib/mcp/lib/sanitize.ts` |
| `ART:src/lib/mcp/tools/` | `module` | `src/lib/mcp/tools/` |
| `ART:src/lib/media/persisted-flag.server.ts` | `module` | `src/lib/media/persisted-flag.server.ts` |
| `ART:src/lib/media/renewal-bootstrap.functions.ts` | `server_fn` | `src/lib/media/renewal-bootstrap.functions.ts` |
| `ART:src/lib/media/renewal-hmac.server.ts` | `module` | `src/lib/media/renewal-hmac.server.ts` |
| `ART:src/lib/media/renewal-processor.server.ts` | `module` | `src/lib/media/renewal-processor.server.ts` |
| `ART:src/lib/media/resolve-source.ts` | `module` | `src/lib/media/resolve-source.ts` |
| `ART:src/lib/media/shadow-evaluator.server.ts` | `module` | `src/lib/media/shadow-evaluator.server.ts` |
| `ART:src/lib/media/shadow-preloader.server.ts` | `module` | `src/lib/media/shadow-preloader.server.ts` |
| `ART:src/lib/media/sign.server.ts` | `module` | `src/lib/media/sign.server.ts` |
| `ART:src/lib/navigation/` | `module` | `src/lib/navigation/` |
| `ART:src/lib/navigation/canonical-paths.ts` | `module` | `src/lib/navigation/canonical-paths.ts` |
| `ART:src/lib/navigation/destination-switch.functions.ts` | `server_fn` | `src/lib/navigation/destination-switch.functions.ts` |
| `ART:src/lib/navigation/session-context.ts` | `module` | `src/lib/navigation/session-context.ts` |
| `ART:src/lib/notifications/` | `module` | `src/lib/notifications/` |
| `ART:src/lib/notifications/activity.functions.ts` | `server_fn` | `src/lib/notifications/activity.functions.ts` |
| `ART:src/lib/notifications/email.functions.ts` | `server_fn` | `src/lib/notifications/email.functions.ts` |
| `ART:src/lib/notifications/iac.functions.ts` | `server_fn` | `src/lib/notifications/iac.functions.ts` |
| `ART:src/lib/notifications/notifications.functions.ts` | `server_fn` | `src/lib/notifications/notifications.functions.ts` |
| `ART:src/lib/notifications/preferences.functions.ts` | `server_fn` | `src/lib/notifications/preferences.functions.ts` |
| `ART:src/lib/notifications/push.functions.ts` | `server_fn` | `src/lib/notifications/push.functions.ts` |
| `ART:src/lib/notifications/webhooks.functions.ts` | `server_fn` | `src/lib/notifications/webhooks.functions.ts` |
| `ART:src/lib/observability/observability.functions.ts` | `server_fn` | `src/lib/observability/observability.functions.ts` |
| `ART:src/lib/payments` | `module` | `src/lib/payments` |
| `ART:src/lib/payments/` | `module` | `src/lib/payments/` |
| `ART:src/lib/payments/admin.functions.ts` | `server_fn` | `src/lib/payments/admin.functions.ts` |
| `ART:src/lib/payments/payments.functions.ts` | `server_fn` | `src/lib/payments/payments.functions.ts` |
| `ART:src/lib/payments/provider.ts` | `module` | `src/lib/payments/provider.ts` |
| `ART:src/lib/payments/registry.server.ts` | `module` | `src/lib/payments/registry.server.ts` |
| `ART:src/lib/payments/stripe.server.ts` | `module` | `src/lib/payments/stripe.server.ts` |
| `ART:src/lib/portal/` | `module` | `src/lib/portal/` |
| `ART:src/lib/portal/business-card.functions.ts` | `server_fn` | `src/lib/portal/business-card.functions.ts` |
| `ART:src/lib/portal/business-catalog.functions.ts` | `server_fn` | `src/lib/portal/business-catalog.functions.ts` |
| `ART:src/lib/portal/business-media.functions.ts` | `server_fn` | `src/lib/portal/business-media.functions.ts` |
| `ART:src/lib/portal/business-presence.functions.ts` | `server_fn` | `src/lib/portal/business-presence.functions.ts` |
| `ART:src/lib/portal/invitations.functions.ts` | `server_fn` | `src/lib/portal/invitations.functions.ts` |
| `ART:src/lib/portal/ownership-transfers.functions.ts` | `server_fn` | `src/lib/portal/ownership-transfers.functions.ts` |
| `ART:src/lib/portal/portal-product-faqs.functions.ts` | `server_fn` | `src/lib/portal/portal-product-faqs.functions.ts` |
| `ART:src/lib/portal/portal-product-media.functions.ts` | `server_fn` | `src/lib/portal/portal-product-media.functions.ts` |
| `ART:src/lib/portal/portal-product-publish.functions.ts` | `server_fn` | `src/lib/portal/portal-product-publish.functions.ts` |
| `ART:src/lib/portal/portal-reads.functions.ts` | `server_fn` | `src/lib/portal/portal-reads.functions.ts` |
| `ART:src/lib/portal/publish-validators.ts` | `module` | `src/lib/portal/publish-validators.ts` |
| `ART:src/lib/protected-actions/` | `module` | `src/lib/protected-actions/` |
| `ART:src/lib/protected-actions/index.ts` | `module` | `src/lib/protected-actions/index.ts` |
| `ART:src/lib/protected-actions/observability.ts` | `module` | `src/lib/protected-actions/observability.ts` |
| `ART:src/lib/protected-actions/registry.ts` | `module` | `src/lib/protected-actions/registry.ts` |
| `ART:src/lib/protected-actions/resume-runner.tsx` | `module` | `src/lib/protected-actions/resume-runner.tsx` |
| `ART:src/lib/protected-actions/sheet-controller.ts` | `module` | `src/lib/protected-actions/sheet-controller.ts` |
| `ART:src/lib/protected-actions/types.ts` | `module` | `src/lib/protected-actions/types.ts` |
| `ART:src/lib/protected-actions/use-protected-action.tsx` | `module` | `src/lib/protected-actions/use-protected-action.tsx` |
| `ART:src/lib/related/overrides.functions.ts` | `server_fn` | `src/lib/related/overrides.functions.ts` |
| `ART:src/lib/reviews/business-response.functions.ts` | `server_fn` | `src/lib/reviews/business-response.functions.ts` |
| `ART:src/lib/reviews/composer.functions.ts` | `server_fn` | `src/lib/reviews/composer.functions.ts` |
| `ART:src/lib/toast.ts` | `module` | `src/lib/toast.ts` |
| `ART:src/lib/traveler/` | `module` | `src/lib/traveler/` |
| `ART:src/lib/traveler/alux-spatial.ts` | `module` | `src/lib/traveler/alux-spatial.ts` |
| `ART:src/lib/traveler/alux-traveler.functions.ts` | `server_fn` | `src/lib/traveler/alux-traveler.functions.ts` |
| `ART:src/lib/traveler/anonymous-draft/contract.ts` | `module` | `src/lib/traveler/anonymous-draft/contract.ts` |
| `ART:src/lib/traveler/anonymous-draft/copy.ts` | `module` | `src/lib/traveler/anonymous-draft/copy.ts` |
| `ART:src/lib/traveler/anonymous-draft/hooks.ts` | `module` | `src/lib/traveler/anonymous-draft/hooks.ts` |
| `ART:src/lib/traveler/anonymous-draft/import-contract.ts` | `module` | `src/lib/traveler/anonymous-draft/import-contract.ts` |
| `ART:src/lib/traveler/anonymous-draft/index.ts` | `module` | `src/lib/traveler/anonymous-draft/index.ts` |
| `ART:src/lib/traveler/anonymous-draft/legacy.ts` | `module` | `src/lib/traveler/anonymous-draft/legacy.ts` |
| `ART:src/lib/traveler/anonymous-draft/limits.ts` | `module` | `src/lib/traveler/anonymous-draft/limits.ts` |
| `ART:src/lib/traveler/anonymous-draft/store.ts` | `module` | `src/lib/traveler/anonymous-draft/store.ts` |
| `ART:src/lib/traveler/decision-center-destination.ts` | `module` | `src/lib/traveler/decision-center-destination.ts` |
| `ART:src/lib/traveler/decision-center.ts` | `module` | `src/lib/traveler/decision-center.ts` |
| `ART:src/lib/traveler/destination-context.functions.ts` | `server_fn` | `src/lib/traveler/destination-context.functions.ts` |
| `ART:src/lib/traveler/destination-context/contributors/` | `module` | `src/lib/traveler/destination-context/contributors/` |
| `ART:src/lib/traveler/destination-context/contributors/hours.ts` | `module` | `src/lib/traveler/destination-context/contributors/hours.ts` |
| `ART:src/lib/traveler/destination-context/contributors/traffic.ts` | `module` | `src/lib/traveler/destination-context/contributors/traffic.ts` |
| `ART:src/lib/traveler/destination-context/index.ts` | `module` | `src/lib/traveler/destination-context/index.ts` |
| `ART:src/lib/traveler/destination-context/registry.ts` | `module` | `src/lib/traveler/destination-context/registry.ts` |
| `ART:src/lib/traveler/destination-context/resolve.ts` | `module` | `src/lib/traveler/destination-context/resolve.ts` |
| `ART:src/lib/traveler/destination-context/types.ts` | `module` | `src/lib/traveler/destination-context/types.ts` |
| `ART:src/lib/traveler/journey-stage.ts` | `module` | `src/lib/traveler/journey-stage.ts` |
| `ART:src/lib/traveler/live-day.ts` | `module` | `src/lib/traveler/live-day.ts` |
| `ART:src/lib/traveler/live-recap.ts` | `module` | `src/lib/traveler/live-recap.ts` |
| `ART:src/lib/traveler/on-trip-concierge.ts` | `module` | `src/lib/traveler/on-trip-concierge.ts` |
| `ART:src/lib/traveler/stage-experience.ts` | `module` | `src/lib/traveler/stage-experience.ts` |
| `ART:src/lib/traveler/traffic-status.ts` | `module` | `src/lib/traveler/traffic-status.ts` |
| `ART:src/lib/traveler/travel-plan-optimize.functions.ts` | `server_fn` | `src/lib/traveler/travel-plan-optimize.functions.ts` |
| `ART:src/lib/traveler/travel-plans.functions.ts` | `server_fn` | `src/lib/traveler/travel-plans.functions.ts` |
| `ART:src/lib/traveler/traveler-account.functions.ts` | `server_fn` | `src/lib/traveler/traveler-account.functions.ts` |
| `ART:src/lib/traveler/traveler-favorites.functions.ts` | `server_fn` | `src/lib/traveler/traveler-favorites.functions.ts` |
| `ART:src/lib/traveler/traveler-public.functions.ts` | `server_fn` | `src/lib/traveler/traveler-public.functions.ts` |
| `ART:src/lib/traveler/trip-phase.ts` | `module` | `src/lib/traveler/trip-phase.ts` |
| `ART:src/lib/traveler/use-travel-stage.ts` | `module` | `src/lib/traveler/use-travel-stage.ts` |
| `ART:src/lib/visibility/visibility-notifications.server.ts` | `module` | `src/lib/visibility/visibility-notifications.server.ts` |
| `ART:src/lib/visitor-intel/` | `module` | `src/lib/visitor-intel/` |
| `ART:src/lib/visitor-intel/decision-metrics.ts` | `module` | `src/lib/visitor-intel/decision-metrics.ts` |
| `ART:src/lib/visitor-intel/decision-operations.ts` | `module` | `src/lib/visitor-intel/decision-operations.ts` |
| `ART:src/lib/visitor-intel/decision-projection.server.ts` | `module` | `src/lib/visitor-intel/decision-projection.server.ts` |
| `ART:src/lib/visitor-intel/decision-workspace.ts` | `module` | `src/lib/visitor-intel/decision-workspace.ts` |
| `ART:src/lib/visitor-intel/decisions.functions.ts` | `server_fn` | `src/lib/visitor-intel/decisions.functions.ts` |
| `ART:src/lib/visitor-intel/decisions.ts` | `module` | `src/lib/visitor-intel/decisions.ts` |
| `ART:src/lib/visitor-intel/events.ts` | `module` | `src/lib/visitor-intel/events.ts` |
| `ART:src/lib/visitor-intel/index.ts` | `module` | `src/lib/visitor-intel/index.ts` |
| `ART:src/lib/visitor-intel/ingest.functions.ts` | `server_fn` | `src/lib/visitor-intel/ingest.functions.ts` |
| `ART:src/lib/visitor-intel/intel-aggregate.functions.ts` | `server_fn` | `src/lib/visitor-intel/intel-aggregate.functions.ts` |
| `ART:src/lib/visitor-intel/journey.ts` | `module` | `src/lib/visitor-intel/journey.ts` |
| `ART:src/lib/visitor-intel/kpis.ts` | `module` | `src/lib/visitor-intel/kpis.ts` |
| `ART:src/lib/visitor-intel/opportunities.functions.ts` | `server_fn` | `src/lib/visitor-intel/opportunities.functions.ts` |
| `ART:src/lib/visitor-intel/prioritization.ts` | `module` | `src/lib/visitor-intel/prioritization.ts` |
| `ART:src/lib/visitor-intel/projection.functions.ts` | `server_fn` | `src/lib/visitor-intel/projection.functions.ts` |
| `ART:src/lib/visitor-intel/projection.ts` | `module` | `src/lib/visitor-intel/projection.ts` |
| `ART:src/lib/visitor-intel/recommendation-learning.ts` | `module` | `src/lib/visitor-intel/recommendation-learning.ts` |
| `ART:src/lib/visitor-intel/recommendations.functions.ts` | `server_fn` | `src/lib/visitor-intel/recommendations.functions.ts` |
| `ART:src/lib/visitor-intel/segment-prioritization.ts` | `module` | `src/lib/visitor-intel/segment-prioritization.ts` |
| `ART:src/lib/visitor-intel/segments.functions.ts` | `server_fn` | `src/lib/visitor-intel/segments.functions.ts` |
| `ART:src/lib/visitor-intel/simulation/` | `module` | `src/lib/visitor-intel/simulation/` |
| `ART:src/lib/visitor-intel/simulation/index.ts` | `module` | `src/lib/visitor-intel/simulation/index.ts` |
| `ART:src/lib/visitor-intel/simulation/persistence.functions.ts` | `server_fn` | `src/lib/visitor-intel/simulation/persistence.functions.ts` |
| `ART:src/lib/visitor-intel/simulation/scenarios/oriente-maya-90d.ts` | `module` | `src/lib/visitor-intel/simulation/scenarios/oriente-maya-90d.ts` |
| `ART:src/lib/visitor-intel/simulation/sub-motors/` | `module` | `src/lib/visitor-intel/simulation/sub-motors/` |
| `ART:src/lib/workspace/` | `module` | `src/lib/workspace/` |
| `ART:src/lib/workspace/alux-registry.ts` | `module` | `src/lib/workspace/alux-registry.ts` |
| `ART:src/lib/workspace/context-registry.ts` | `module` | `src/lib/workspace/context-registry.ts` |
| `ART:src/lib/workspace/definitions/index.ts` | `module` | `src/lib/workspace/definitions/index.ts` |
| `ART:src/lib/workspace/navigation-registry.ts` | `module` | `src/lib/workspace/navigation-registry.ts` |
| `ART:src/lib/workspace/toast-bus.ts` | `module` | `src/lib/workspace/toast-bus.ts` |
| `ART:src/lib/workspace/types.ts` | `module` | `src/lib/workspace/types.ts` |
| `ART:src/mocks/` | `artifact` | `src/mocks/` |
| `ART:src/mocks/categorias.ts` | `artifact` | `src/mocks/categorias.ts` |
| `ART:src/mocks/destinos.ts` | `artifact` | `src/mocks/destinos.ts` |
| `ART:src/mocks/empresas.ts` | `artifact` | `src/mocks/empresas.ts` |
| `ART:src/mocks/resenas.ts` | `artifact` | `src/mocks/resenas.ts` |
| `ART:src/mocks/rutas.ts` | `artifact` | `src/mocks/rutas.ts` |
| `ART:src/pwa/push.ts` | `artifact` | `src/pwa/push.ts` |
| `ART:src/pwa/register-sw.ts` | `artifact` | `src/pwa/register-sw.ts` |
| `ART:src/pwa/sync-queue.ts` | `artifact` | `src/pwa/sync-queue.ts` |
| `ART:src/pwa/sync-runner.ts` | `artifact` | `src/pwa/sync-runner.ts` |
| `ART:src/routes/` | `route` | `src/routes/` |
| `ART:src/routes/__root.tsx` | `route` | `src/routes/__root.tsx` |
| `ART:src/routes/_authenticated` | `route` | `src/routes/_authenticated` |
| `ART:src/routes/_authenticated.tsx` | `route` | `src/routes/_authenticated.tsx` |
| `ART:src/routes/_authenticated/admin/` | `route` | `src/routes/_authenticated/admin/` |
| `ART:src/routes/_authenticated/admin/anfitriones.tsx` | `route` | `src/routes/_authenticated/admin/anfitriones.tsx` |
| `ART:src/routes/_authenticated/admin/concierge.tsx` | `route` | `src/routes/_authenticated/admin/concierge.tsx` |
| `ART:src/routes/_authenticated/admin/empresas.tsx` | `route` | `src/routes/_authenticated/admin/empresas.tsx` |
| `ART:src/routes/_authenticated/admin/ia.tsx` | `route` | `src/routes/_authenticated/admin/ia.tsx` |
| `ART:src/routes/_authenticated/admin/index.tsx` | `route` | `src/routes/_authenticated/admin/index.tsx` |
| `ART:src/routes/_authenticated/admin/operaciones.tsx` | `route` | `src/routes/_authenticated/admin/operaciones.tsx` |
| `ART:src/routes/_authenticated/admin/route.tsx` | `route` | `src/routes/_authenticated/admin/route.tsx` |
| `ART:src/routes/_authenticated/admin/sistema.tsx` | `route` | `src/routes/_authenticated/admin/sistema.tsx` |
| `ART:src/routes/_authenticated/admin/sistema.usuarios.tsx` | `route` | `src/routes/_authenticated/admin/sistema.usuarios.tsx` |
| `ART:src/routes/_authenticated/admin/turistas.tsx` | `route` | `src/routes/_authenticated/admin/turistas.tsx` |
| `ART:src/routes/_authenticated/cms.tsx` | `route` | `src/routes/_authenticated/cms.tsx` |
| `ART:src/routes/_authenticated/cms/` | `route` | `src/routes/_authenticated/cms/` |
| `ART:src/routes/_authenticated/cms/categorias.$id.editar.tsx` | `route` | `src/routes/_authenticated/cms/categorias.$id.editar.tsx` |
| `ART:src/routes/_authenticated/cms/categorias.index.tsx` | `route` | `src/routes/_authenticated/cms/categorias.index.tsx` |
| `ART:src/routes/_authenticated/cms/categorias.nueva.tsx` | `route` | `src/routes/_authenticated/cms/categorias.nueva.tsx` |
| `ART:src/routes/_authenticated/cms/experience-builder.pages.tsx` | `route` | `src/routes/_authenticated/cms/experience-builder.pages.tsx` |
| `ART:src/routes/_authenticated/cms/experience-builder.tsx` | `route` | `src/routes/_authenticated/cms/experience-builder.tsx` |
| `ART:src/routes/_authenticated/cms/index.tsx` | `route` | `src/routes/_authenticated/cms/index.tsx` |
| `ART:src/routes/_authenticated/cms/media.tsx` | `route` | `src/routes/_authenticated/cms/media.tsx` |
| `ART:src/routes/_authenticated/cms/pagos.tsx` | `route` | `src/routes/_authenticated/cms/pagos.tsx` |
| `ART:src/routes/_authenticated/cms/regiones.$id.editar.tsx` | `route` | `src/routes/_authenticated/cms/regiones.$id.editar.tsx` |
| `ART:src/routes/_authenticated/cms/regiones.index.tsx` | `route` | `src/routes/_authenticated/cms/regiones.index.tsx` |
| `ART:src/routes/_authenticated/cms/regiones.nueva.tsx` | `route` | `src/routes/_authenticated/cms/regiones.nueva.tsx` |
| `ART:src/routes/_authenticated/cms/relacionados.index.tsx` | `route` | `src/routes/_authenticated/cms/relacionados.index.tsx` |
| `ART:src/routes/_authenticated/cms/reviews.$id.moderar.tsx` | `route` | `src/routes/_authenticated/cms/reviews.$id.moderar.tsx` |
| `ART:src/routes/_authenticated/cms/simulation.tsx` | `route` | `src/routes/_authenticated/cms/simulation.tsx` |
| `ART:src/routes/_authenticated/cms/visitor-intel_.decisions.tsx` | `route` | `src/routes/_authenticated/cms/visitor-intel_.decisions.tsx` |
| `ART:src/routes/_authenticated/cms/visitor-intel.tsx` | `route` | `src/routes/_authenticated/cms/visitor-intel.tsx` |
| `ART:src/routes/_authenticated/concierge` | `route` | `src/routes/_authenticated/concierge` |
| `ART:src/routes/_authenticated/concierge/expedientes.$caseId.tsx` | `route` | `src/routes/_authenticated/concierge/expedientes.$caseId.tsx` |
| `ART:src/routes/_authenticated/concierge/index.tsx` | `route` | `src/routes/_authenticated/concierge/index.tsx` |
| `ART:src/routes/_authenticated/concierge/route.tsx` | `route` | `src/routes/_authenticated/concierge/route.tsx` |
| `ART:src/routes/_authenticated/cuenta/` | `route` | `src/routes/_authenticated/cuenta/` |
| `ART:src/routes/_authenticated/cuenta/documentos.$orderId.tsx` | `route` | `src/routes/_authenticated/cuenta/documentos.$orderId.tsx` |
| `ART:src/routes/_authenticated/cuenta/favoritos.tsx` | `route` | `src/routes/_authenticated/cuenta/favoritos.tsx` |
| `ART:src/routes/_authenticated/cuenta/historial.tsx` | `route` | `src/routes/_authenticated/cuenta/historial.tsx` |
| `ART:src/routes/_authenticated/cuenta/index.tsx` | `route` | `src/routes/_authenticated/cuenta/index.tsx` |
| `ART:src/routes/_authenticated/cuenta/mi-viaje.tsx` | `route` | `src/routes/_authenticated/cuenta/mi-viaje.tsx` |
| `ART:src/routes/_authenticated/cuenta/pagos.error.tsx` | `route` | `src/routes/_authenticated/cuenta/pagos.error.tsx` |
| `ART:src/routes/_authenticated/cuenta/pagos.exito.tsx` | `route` | `src/routes/_authenticated/cuenta/pagos.exito.tsx` |
| `ART:src/routes/_authenticated/cuenta/route.tsx` | `route` | `src/routes/_authenticated/cuenta/route.tsx` |
| `ART:src/routes/_authenticated/cuenta/stage-simulator.tsx` | `route` | `src/routes/_authenticated/cuenta/stage-simulator.tsx` |
| `ART:src/routes/_authenticated/empresa.tsx` | `route` | `src/routes/_authenticated/empresa.tsx` |
| `ART:src/routes/_authenticated/mi-viaje.tsx` | `route` | `src/routes/_authenticated/mi-viaje.tsx` |
| `ART:src/routes/_authenticated/portal/` | `route` | `src/routes/_authenticated/portal/` |
| `ART:src/routes/_authenticated/portal/catalogo.tsx` | `route` | `src/routes/_authenticated/portal/catalogo.tsx` |
| `ART:src/routes/_authenticated/portal/empresas.index.tsx` | `route` | `src/routes/_authenticated/portal/empresas.index.tsx` |
| `ART:src/routes/_authenticated/portal/ficha.tsx` | `route` | `src/routes/_authenticated/portal/ficha.tsx` |
| `ART:src/routes/_authenticated/portal/galeria.tsx` | `route` | `src/routes/_authenticated/portal/galeria.tsx` |
| `ART:src/routes/_authenticated/portal/index.tsx` | `route` | `src/routes/_authenticated/portal/index.tsx` |
| `ART:src/routes/_authenticated/portal/invitaciones.$token.tsx` | `route` | `src/routes/_authenticated/portal/invitaciones.$token.tsx` |
| `ART:src/routes/_authenticated/portal/invitaciones.index.tsx` | `route` | `src/routes/_authenticated/portal/invitaciones.index.tsx` |
| `ART:src/routes/_authenticated/portal/presencia.tsx` | `route` | `src/routes/_authenticated/portal/presencia.tsx` |
| `ART:src/routes/_authenticated/portal/productos.$productId.preview.tsx` | `route` | `src/routes/_authenticated/portal/productos.$productId.preview.tsx` |
| `ART:src/routes/_authenticated/portal/propiedad.tsx` | `route` | `src/routes/_authenticated/portal/propiedad.tsx` |
| `ART:src/routes/_authenticated/portal/resenas.index.tsx` | `route` | `src/routes/_authenticated/portal/resenas.index.tsx` |
| `ART:src/routes/_authenticated/portal/route.tsx` | `route` | `src/routes/_authenticated/portal/route.tsx` |
| `ART:src/routes/[.]lovable.oauth.consent.tsx` | `route` | `src/routes/[.]lovable.oauth.consent.tsx` |
| `ART:src/routes/[.mcp]/` | `route` | `src/routes/[.mcp]/` |
| `ART:src/routes/[.well-known]/` | `route` | `src/routes/[.well-known]/` |
| `ART:src/routes/[.well-known]/oauth-protected-resource.ts` | `route` | `src/routes/[.well-known]/oauth-protected-resource.ts` |
| `ART:src/routes/api/dev/` | `route` | `src/routes/api/dev/` |
| `ART:src/routes/api/dev/media-shadow-eval.ts` | `route` | `src/routes/api/dev/media-shadow-eval.ts` |
| `ART:src/routes/api/public/` | `route` | `src/routes/api/public/` |
| `ART:src/routes/api/public/hooks/eb-process-scheduled-publish.ts` | `route` | `src/routes/api/public/hooks/eb-process-scheduled-publish.ts` |
| `ART:src/routes/api/public/hooks/media-signature-renew.ts` | `route` | `src/routes/api/public/hooks/media-signature-renew.ts` |
| `ART:src/routes/api/public/payments/$provider/webhook.ts` | `route` | `src/routes/api/public/payments/$provider/webhook.ts` |
| `ART:src/routes/arma-tu-viaje.tsx` | `route` | `src/routes/arma-tu-viaje.tsx` |
| `ART:src/routes/auth.tsx` | `route` | `src/routes/auth.tsx` |
| `ART:src/routes/blog.tsx` | `route` | `src/routes/blog.tsx` |
| `ART:src/routes/casas-de-vacaciones.tsx` | `route` | `src/routes/casas-de-vacaciones.tsx` |
| `ART:src/routes/contacto.tsx` | `route` | `src/routes/contacto.tsx` |
| `ART:src/routes/empresas.tsx` | `route` | `src/routes/empresas.tsx` |
| `ART:src/routes/eventos.$slug.tsx` | `route` | `src/routes/eventos.$slug.tsx` |
| `ART:src/routes/eventos.tsx` | `route` | `src/routes/eventos.tsx` |
| `ART:src/routes/experiencias.tsx` | `route` | `src/routes/experiencias.tsx` |
| `ART:src/routes/hoteles.tsx` | `route` | `src/routes/hoteles.tsx` |
| `ART:src/routes/index.tsx` | `route` | `src/routes/index.tsx` |
| `ART:src/routes/l.$slug.tsx` | `route` | `src/routes/l.$slug.tsx` |
| `ART:src/routes/llms[.]txt.ts` | `route` | `src/routes/llms[.]txt.ts` |
| `ART:src/routes/lovable/` | `route` | `src/routes/lovable/` |
| `ART:src/routes/lovable/business-mother-template-preview.tsx` | `route` | `src/routes/lovable/business-mother-template-preview.tsx` |
| `ART:src/routes/lovable/context-engine-preview.tsx` | `route` | `src/routes/lovable/context-engine-preview.tsx` |
| `ART:src/routes/lovable/email/auth/preview.ts` | `route` | `src/routes/lovable/email/auth/preview.ts` |
| `ART:src/routes/lovable/experience-hero-preview.tsx` | `route` | `src/routes/lovable/experience-hero-preview.tsx` |
| `ART:src/routes/lovable/experience-subnav-ctabar-preview.tsx` | `route` | `src/routes/lovable/experience-subnav-ctabar-preview.tsx` |
| `ART:src/routes/lovable/protected-actions-preview.tsx` | `route` | `src/routes/lovable/protected-actions-preview.tsx` |
| `ART:src/routes/manifest[.]webmanifest.ts` | `route` | `src/routes/manifest[.]webmanifest.ts` |
| `ART:src/routes/mapa.tsx` | `route` | `src/routes/mapa.tsx` |
| `ART:src/routes/marketplace.$.tsx` | `route` | `src/routes/marketplace.$.tsx` |
| `ART:src/routes/marketplace.tsx` | `route` | `src/routes/marketplace.tsx` |
| `ART:src/routes/mcp.ts` | `route` | `src/routes/mcp.ts` |
| `ART:src/routes/offline.tsx` | `route` | `src/routes/offline.tsx` |
| `ART:src/routes/oriente-maya/$destino.$categoria.$empresa.$producto.tsx` | `route` | `src/routes/oriente-maya/$destino.$categoria.$empresa.$producto.tsx` |
| `ART:src/routes/oriente-maya/$destino.$categoria.$empresa.index.tsx` | `route` | `src/routes/oriente-maya/$destino.$categoria.$empresa.index.tsx` |
| `ART:src/routes/oriente-maya/$destino.$categoria.index.tsx` | `route` | `src/routes/oriente-maya/$destino.$categoria.index.tsx` |
| `ART:src/routes/oriente-maya/$destino.index.tsx` | `route` | `src/routes/oriente-maya/$destino.index.tsx` |
| `ART:src/routes/oriente-maya/$destino.tsx` | `route` | `src/routes/oriente-maya/$destino.tsx` |
| `ART:src/routes/oriente-maya/index.tsx` | `route` | `src/routes/oriente-maya/index.tsx` |
| `ART:src/routes/p.$slug.tsx` | `route` | `src/routes/p.$slug.tsx` |
| `ART:src/routes/preview.$token.tsx` | `route` | `src/routes/preview.$token.tsx` |
| `ART:src/routes/preview/composition.$token.tsx` | `route` | `src/routes/preview/composition.$token.tsx` |
| `ART:src/routes/privacidad.tsx` | `route` | `src/routes/privacidad.tsx` |
| `ART:src/routes/producto.$slug.tsx` | `route` | `src/routes/producto.$slug.tsx` |
| `ART:src/routes/promociones.tsx` | `route` | `src/routes/promociones.tsx` |
| `ART:src/routes/que-hacer.tsx` | `route` | `src/routes/que-hacer.tsx` |
| `ART:src/routes/restaurantes.tsx` | `route` | `src/routes/restaurantes.tsx` |
| `ART:src/routes/robots[.]txt.ts` | `route` | `src/routes/robots[.]txt.ts` |
| `ART:src/routes/sitemap[.]xml.ts` | `route` | `src/routes/sitemap[.]xml.ts` |
| `ART:src/routes/terminos.tsx` | `route` | `src/routes/terminos.tsx` |
| `ART:src/routes/viaje-compartido.$token.tsx` | `route` | `src/routes/viaje-compartido.$token.tsx` |
| `ART:src/routes/viajero.$handle.tsx` | `route` | `src/routes/viajero.$handle.tsx` |
| `ART:src/routeTree.gen.ts` | `artifact` | `src/routeTree.gen.ts` |
| `ART:src/start.ts` | `artifact` | `src/start.ts` |
| `ART:src/styles.css` | `artifact` | `src/styles.css` |
| `ART:src/types/auth.ts` | `artifact` | `src/types/auth.ts` |
| `ART:src/types/territory.ts` | `artifact` | `src/types/territory.ts` |
| `ART:supabase/migrations/` | `migration` | `supabase/migrations/` |
| `ART:supabase/migrations/20260701041232_b9fbeade-1c9c-44b2-87c5-a0e627e8629b.sql` | `migration` | `supabase/migrations/20260701041232_b9fbeade-1c9c-44b2-87c5-a0e627e8629b.sql` |
| `ART:supabase/migrations/20260703172956_0b9a9687-6638-462e-bdb1-18b9f4dc1a91.sql` | `migration` | `supabase/migrations/20260703172956_0b9a9687-6638-462e-bdb1-18b9f4dc1a91.sql` |
| `ART:supabase/migrations/20260704203449_9bd4ac4c-f949-4daa-90f4-0a0ad9f1f6a7.sql` | `migration` | `supabase/migrations/20260704203449_9bd4ac4c-f949-4daa-90f4-0a0ad9f1f6a7.sql` |
| `ART:supabase/migrations/20260720000200_7b6db1f9-2f0b-4bcf-9e82-3f57f9eac901.sql` | `migration` | `supabase/migrations/20260720000200_7b6db1f9-2f0b-4bcf-9e82-3f57f9eac901.sql` |

## 6. Aristas verificadas

| ID | Origen | Relación | Destino | Evidencia | Verificado |
|---|---|---|---|---|---|
| `E0001` | `ART:src/components/cards/` | `implements` | `DOC:docs/blueprint/12D-AUDIT-v1.0.md` | docs/blueprint/12D-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0002` | `ART:src/components/common/` | `implements` | `DOC:docs/blueprint/12D-AUDIT-v1.0.md` | docs/blueprint/12D-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0003` | `ART:src/components/home/` | `implements` | `DOC:docs/blueprint/12D-AUDIT-v1.0.md` | docs/blueprint/12D-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0004` | `ART:src/components/ui/` | `implements` | `DOC:docs/blueprint/12D-AUDIT-v1.0.md` | docs/blueprint/12D-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0005` | `ART:src/components/ui/sidebar.tsx` | `implements` | `DOC:docs/blueprint/12D-AUDIT-v1.0.md` | docs/blueprint/12D-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0006` | `ART:src/config/languages.ts` | `implements` | `DOC:docs/blueprint/12D-AUDIT-v1.0.md` | docs/blueprint/12D-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0007` | `ART:src/config/regions.ts` | `implements` | `DOC:docs/blueprint/12D-AUDIT-v1.0.md` | docs/blueprint/12D-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0008` | `ART:src/config/site.ts` | `implements` | `DOC:docs/blueprint/12D-AUDIT-v1.0.md` | docs/blueprint/12D-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0009` | `ART:src/i18n/locales/` | `implements` | `DOC:docs/blueprint/12D-AUDIT-v1.0.md` | docs/blueprint/12D-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0010` | `ART:src/mocks/` | `implements` | `DOC:docs/blueprint/12D-AUDIT-v1.0.md` | docs/blueprint/12D-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0011` | `ART:src/styles.css` | `implements` | `DOC:docs/blueprint/12D-AUDIT-v1.0.md` | docs/blueprint/12D-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0012` | `ART:src/styles.css` | `implements` | `DOC:docs/blueprint/12D-COMPLIANCE-REPORT-v1.0.md` | docs/blueprint/12D-COMPLIANCE-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0013` | `ART:src/integrations/lovable/index.ts` | `implements` | `DOC:docs/blueprint/13.A-GATE-A-Infrastructure-Report-v1.0.md` | docs/blueprint/13.A-GATE-A-Infrastructure-Report-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0014` | `ART:src/integrations/supabase/auth-attacher.ts` | `implements` | `DOC:docs/blueprint/13.A-GATE-A-Infrastructure-Report-v1.0.md` | docs/blueprint/13.A-GATE-A-Infrastructure-Report-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0015` | `ART:src/integrations/supabase/auth-middleware.ts` | `implements` | `DOC:docs/blueprint/13.A-GATE-A-Infrastructure-Report-v1.0.md` | docs/blueprint/13.A-GATE-A-Infrastructure-Report-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0016` | `ART:src/integrations/supabase/client.server.ts` | `implements` | `DOC:docs/blueprint/13.A-GATE-A-Infrastructure-Report-v1.0.md` | docs/blueprint/13.A-GATE-A-Infrastructure-Report-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0017` | `ART:src/integrations/supabase/client.ts` | `implements` | `DOC:docs/blueprint/13.A-GATE-A-Infrastructure-Report-v1.0.md` | docs/blueprint/13.A-GATE-A-Infrastructure-Report-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0018` | `ART:src/integrations/supabase/types.ts` | `implements` | `DOC:docs/blueprint/13.A-GATE-A-Infrastructure-Report-v1.0.md` | docs/blueprint/13.A-GATE-A-Infrastructure-Report-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0019` | `ART:src/start.ts` | `implements` | `DOC:docs/blueprint/13.A-GATE-A-Infrastructure-Report-v1.0.md` | docs/blueprint/13.A-GATE-A-Infrastructure-Report-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0020` | `DOC:docs/blueprint/13.A-GATE-A-Infrastructure-Report-v1.0.md` | `requires` | `ART:[`13.A-MIGRATIONS-CONVENTIONS-v1.0.md`](../blueprint/13.A-MIGRATIONS-CONVENTIONS-v1.0.md)` | docs/blueprint/13.A-GATE-A-Infrastructure-Report-v1.0.md § migración vinculada validada | 2026-07-21 |
| `E0021` | `DOC:docs/blueprint/13.A-GATE-A-Infrastructure-Report-v1.0.md` | `requires` | `ART:supabase/migrations/` | docs/blueprint/13.A-GATE-A-Infrastructure-Report-v1.0.md § migración vinculada validada | 2026-07-21 |
| `E0022` | `ART:src/mocks/destinos.ts` | `implements` | `DOC:docs/blueprint/13.B-GATE-B-Domain-Model-Report-v1.0.md` | docs/blueprint/13.B-GATE-B-Domain-Model-Report-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0023` | `ART:src/lib/cms.functions.ts` | `implements` | `DOC:docs/blueprint/13.D-GATE-D-CMS-Governance-Report-v1.0.md` | docs/blueprint/13.D-GATE-D-CMS-Governance-Report-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0024` | `ART:src/components/ui/` | `implements` | `DOC:docs/blueprint/14.0-PREPARATION-REPORT-v1.0.md` | docs/blueprint/14.0-PREPARATION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0025` | `ART:src/lib/cms.functions.ts` | `implements` | `DOC:docs/blueprint/14.0-PREPARATION-REPORT-v1.0.md` | docs/blueprint/14.0-PREPARATION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0026` | `ART:src/mocks/categorias.ts` | `implements` | `DOC:docs/blueprint/14.0-PREPARATION-REPORT-v1.0.md` | docs/blueprint/14.0-PREPARATION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0027` | `ART:src/mocks/destinos.ts` | `implements` | `DOC:docs/blueprint/14.0-PREPARATION-REPORT-v1.0.md` | docs/blueprint/14.0-PREPARATION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0028` | `ART:src/mocks/empresas.ts` | `implements` | `DOC:docs/blueprint/14.0-PREPARATION-REPORT-v1.0.md` | docs/blueprint/14.0-PREPARATION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0029` | `ART:src/mocks/rutas.ts` | `implements` | `DOC:docs/blueprint/14.0-PREPARATION-REPORT-v1.0.md` | docs/blueprint/14.0-PREPARATION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0030` | `ART:src/mocks/resenas.ts` | `implements` | `DOC:docs/blueprint/14.0-PREPARATION-REPORT-v1.0.md` | docs/blueprint/14.0-PREPARATION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0031` | `ART:src/styles.css` | `implements` | `DOC:docs/blueprint/14.0-PREPARATION-REPORT-v1.0.md` | docs/blueprint/14.0-PREPARATION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0032` | `ART:src/components/brand/BrandLogo.tsx` | `implements` | `DOC:docs/blueprint/14.10-WAVE-1-CMS-STUDIO-PLAN-v1.0.md` | docs/blueprint/14.10-WAVE-1-CMS-STUDIO-PLAN-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0033` | `ART:src/components/cms/` | `implements` | `DOC:docs/blueprint/14.10-WAVE-1-CMS-STUDIO-PLAN-v1.0.md` | docs/blueprint/14.10-WAVE-1-CMS-STUDIO-PLAN-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0034` | `ART:src/components/common/PageShell.tsx` | `implements` | `DOC:docs/blueprint/14.10-WAVE-1-CMS-STUDIO-PLAN-v1.0.md` | docs/blueprint/14.10-WAVE-1-CMS-STUDIO-PLAN-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0035` | `ART:src/components/layout/Container.tsx` | `implements` | `DOC:docs/blueprint/14.10-WAVE-1-CMS-STUDIO-PLAN-v1.0.md` | docs/blueprint/14.10-WAVE-1-CMS-STUDIO-PLAN-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0036` | `ART:src/i18n/locales/` | `implements` | `DOC:docs/blueprint/14.10-WAVE-1-CMS-STUDIO-PLAN-v1.0.md` | docs/blueprint/14.10-WAVE-1-CMS-STUDIO-PLAN-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0037` | `ART:src/integrations/supabase/` | `implements` | `DOC:docs/blueprint/14.10-WAVE-1-CMS-STUDIO-PLAN-v1.0.md` | docs/blueprint/14.10-WAVE-1-CMS-STUDIO-PLAN-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0038` | `ART:src/integrations/supabase/auth-attacher.ts` | `implements` | `DOC:docs/blueprint/14.10-WAVE-1-CMS-STUDIO-PLAN-v1.0.md` | docs/blueprint/14.10-WAVE-1-CMS-STUDIO-PLAN-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0039` | `ART:src/integrations/supabase/auth-middleware.ts` | `implements` | `DOC:docs/blueprint/14.10-WAVE-1-CMS-STUDIO-PLAN-v1.0.md` | docs/blueprint/14.10-WAVE-1-CMS-STUDIO-PLAN-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0040` | `ART:src/integrations/supabase/client.server.ts` | `implements` | `DOC:docs/blueprint/14.10-WAVE-1-CMS-STUDIO-PLAN-v1.0.md` | docs/blueprint/14.10-WAVE-1-CMS-STUDIO-PLAN-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0041` | `ART:src/integrations/supabase/client.ts` | `implements` | `DOC:docs/blueprint/14.10-WAVE-1-CMS-STUDIO-PLAN-v1.0.md` | docs/blueprint/14.10-WAVE-1-CMS-STUDIO-PLAN-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0042` | `ART:src/lib/` | `implements` | `DOC:docs/blueprint/14.10-WAVE-1-CMS-STUDIO-PLAN-v1.0.md` | docs/blueprint/14.10-WAVE-1-CMS-STUDIO-PLAN-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0043` | `ART:src/lib/cms.functions.ts` | `implements` | `DOC:docs/blueprint/14.10-WAVE-1-CMS-STUDIO-PLAN-v1.0.md` | docs/blueprint/14.10-WAVE-1-CMS-STUDIO-PLAN-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0044` | `ART:src/lib/cms/` | `implements` | `DOC:docs/blueprint/14.10-WAVE-1-CMS-STUDIO-PLAN-v1.0.md` | docs/blueprint/14.10-WAVE-1-CMS-STUDIO-PLAN-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0045` | `ART:src/routeTree.gen.ts` | `implements` | `DOC:docs/blueprint/14.10-WAVE-1-CMS-STUDIO-PLAN-v1.0.md` | docs/blueprint/14.10-WAVE-1-CMS-STUDIO-PLAN-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0046` | `ART:src/routes/_authenticated.tsx` | `implements` | `DOC:docs/blueprint/14.10-WAVE-1-CMS-STUDIO-PLAN-v1.0.md` | docs/blueprint/14.10-WAVE-1-CMS-STUDIO-PLAN-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0047` | `ART:src/routes/_authenticated/cms.tsx` | `implements` | `DOC:docs/blueprint/14.10-WAVE-1-CMS-STUDIO-PLAN-v1.0.md` | docs/blueprint/14.10-WAVE-1-CMS-STUDIO-PLAN-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0048` | `ART:src/routes/_authenticated/cms/index.tsx` | `implements` | `DOC:docs/blueprint/14.10-WAVE-1-CMS-STUDIO-PLAN-v1.0.md` | docs/blueprint/14.10-WAVE-1-CMS-STUDIO-PLAN-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0049` | `ART:src/routes/_authenticated/cms/media.tsx` | `implements` | `DOC:docs/blueprint/14.10-WAVE-1-CMS-STUDIO-PLAN-v1.0.md` | docs/blueprint/14.10-WAVE-1-CMS-STUDIO-PLAN-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0050` | `ART:src/start.ts` | `implements` | `DOC:docs/blueprint/14.10-WAVE-1-CMS-STUDIO-PLAN-v1.0.md` | docs/blueprint/14.10-WAVE-1-CMS-STUDIO-PLAN-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0051` | `ART:src/components/cms/CmsEntityPage.tsx` | `implements` | `DOC:docs/blueprint/14.10.3-WAVE-1-STAGE-3-PROGRESS-v1.0.md` | docs/blueprint/14.10.3-WAVE-1-STAGE-3-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0052` | `ART:src/components/cms/EntityEditor.tsx` | `implements` | `DOC:docs/blueprint/14.10.3-WAVE-1-STAGE-3-PROGRESS-v1.0.md` | docs/blueprint/14.10.3-WAVE-1-STAGE-3-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0053` | `ART:src/components/cms/EntityListView.tsx` | `implements` | `DOC:docs/blueprint/14.10.3-WAVE-1-STAGE-3-PROGRESS-v1.0.md` | docs/blueprint/14.10.3-WAVE-1-STAGE-3-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0054` | `ART:src/lib/cms/editor-fields.ts` | `implements` | `DOC:docs/blueprint/14.10.3-WAVE-1-STAGE-3-PROGRESS-v1.0.md` | docs/blueprint/14.10.3-WAVE-1-STAGE-3-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0055` | `ART:src/lib/cms/writes.functions.ts` | `implements` | `DOC:docs/blueprint/14.10.3-WAVE-1-STAGE-3-PROGRESS-v1.0.md` | docs/blueprint/14.10.3-WAVE-1-STAGE-3-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0056` | `ART:src/routeTree.gen.ts` | `implements` | `DOC:docs/blueprint/14.10.3-WAVE-1-STAGE-3-PROGRESS-v1.0.md` | docs/blueprint/14.10.3-WAVE-1-STAGE-3-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0057` | `ART:src/routes/_authenticated/cms/categorias.$id.editar.tsx` | `implements` | `DOC:docs/blueprint/14.10.3-WAVE-1-STAGE-3-PROGRESS-v1.0.md` | docs/blueprint/14.10.3-WAVE-1-STAGE-3-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0058` | `ART:src/routes/_authenticated/cms/categorias.index.tsx` | `implements` | `DOC:docs/blueprint/14.10.3-WAVE-1-STAGE-3-PROGRESS-v1.0.md` | docs/blueprint/14.10.3-WAVE-1-STAGE-3-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0059` | `ART:src/routes/_authenticated/cms/categorias.nueva.tsx` | `implements` | `DOC:docs/blueprint/14.10.3-WAVE-1-STAGE-3-PROGRESS-v1.0.md` | docs/blueprint/14.10.3-WAVE-1-STAGE-3-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0060` | `ART:src/routes/_authenticated/cms/regiones.$id.editar.tsx` | `implements` | `DOC:docs/blueprint/14.10.3-WAVE-1-STAGE-3-PROGRESS-v1.0.md` | docs/blueprint/14.10.3-WAVE-1-STAGE-3-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0061` | `ART:src/routes/_authenticated/cms/regiones.index.tsx` | `implements` | `DOC:docs/blueprint/14.10.3-WAVE-1-STAGE-3-PROGRESS-v1.0.md` | docs/blueprint/14.10.3-WAVE-1-STAGE-3-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0062` | `ART:src/routes/_authenticated/cms/regiones.nueva.tsx` | `implements` | `DOC:docs/blueprint/14.10.3-WAVE-1-STAGE-3-PROGRESS-v1.0.md` | docs/blueprint/14.10.3-WAVE-1-STAGE-3-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0063` | `ART:src/routes/index.tsx` | `implements` | `DOC:docs/blueprint/14.10.3-WAVE-1-STAGE-3-PROGRESS-v1.0.md` | docs/blueprint/14.10.3-WAVE-1-STAGE-3-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0064` | `ART:src/styles.css` | `implements` | `DOC:docs/blueprint/14.10.3-WAVE-1-STAGE-3-PROGRESS-v1.0.md` | docs/blueprint/14.10.3-WAVE-1-STAGE-3-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0065` | `ART:src/components/cms/EntityEditor.tsx` | `implements` | `DOC:docs/blueprint/14.10.4-WAVE-1-STAGE-4-PROGRESS-v1.0.md` | docs/blueprint/14.10.4-WAVE-1-STAGE-4-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0066` | `ART:src/lib/cms/writes.functions.ts` | `implements` | `DOC:docs/blueprint/14.10.4-WAVE-1-STAGE-4-PROGRESS-v1.0.md` | docs/blueprint/14.10.4-WAVE-1-STAGE-4-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0067` | `ART:src/components/cms/ReviewModerator.tsx` | `implements` | `DOC:docs/blueprint/14.10.5-WAVE-1-STAGE-5-PROGRESS-v1.0.md` | docs/blueprint/14.10.5-WAVE-1-STAGE-5-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0068` | `ART:src/lib/cms/moderation.functions.ts` | `implements` | `DOC:docs/blueprint/14.10.5-WAVE-1-STAGE-5-PROGRESS-v1.0.md` | docs/blueprint/14.10.5-WAVE-1-STAGE-5-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0069` | `ART:src/routes/_authenticated/cms/reviews.$id.moderar.tsx` | `implements` | `DOC:docs/blueprint/14.10.5-WAVE-1-STAGE-5-PROGRESS-v1.0.md` | docs/blueprint/14.10.5-WAVE-1-STAGE-5-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0070` | `ART:src/lib/cms/workflow.ts` | `implements` | `DOC:docs/blueprint/14.10.Z-WAVE-1-CLOSURE-REPORT-v1.0.md` | docs/blueprint/14.10.Z-WAVE-1-CLOSURE-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0071` | `ART:src/integrations/supabase/types.ts` | `implements` | `DOC:docs/blueprint/14.11.V-ENTITY-KIND-CONSUMERS-VERIFICATION-v1.0.md` | docs/blueprint/14.11.V-ENTITY-KIND-CONSUMERS-VERIFICATION-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0072` | `ART:src/lib/cms/` | `implements` | `DOC:docs/blueprint/14.11.V-ENTITY-KIND-CONSUMERS-VERIFICATION-v1.0.md` | docs/blueprint/14.11.V-ENTITY-KIND-CONSUMERS-VERIFICATION-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0073` | `ART:src/lib/cms/moderation.functions.ts` | `implements` | `DOC:docs/blueprint/14.11.V-ENTITY-KIND-CONSUMERS-VERIFICATION-v1.0.md` | docs/blueprint/14.11.V-ENTITY-KIND-CONSUMERS-VERIFICATION-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0074` | `ART:src/lib/cms/workflow.ts` | `implements` | `DOC:docs/blueprint/14.11.V-ENTITY-KIND-CONSUMERS-VERIFICATION-v1.0.md` | docs/blueprint/14.11.V-ENTITY-KIND-CONSUMERS-VERIFICATION-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0075` | `ART:src/lib/cms/writes.functions.ts` | `implements` | `DOC:docs/blueprint/14.11.V-ENTITY-KIND-CONSUMERS-VERIFICATION-v1.0.md` | docs/blueprint/14.11.V-ENTITY-KIND-CONSUMERS-VERIFICATION-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0076` | `ART:src/mocks/` | `implements` | `DOC:docs/blueprint/14.20-WAVE-2-CONTENT-MIGRATION-PLAN-v1.0.md` | docs/blueprint/14.20-WAVE-2-CONTENT-MIGRATION-PLAN-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0077` | `ART:src/mocks/categorias.ts` | `implements` | `DOC:docs/blueprint/14.20-WAVE-2-CONTENT-MIGRATION-PLAN-v1.0.md` | docs/blueprint/14.20-WAVE-2-CONTENT-MIGRATION-PLAN-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0078` | `ART:src/mocks/destinos.ts` | `implements` | `DOC:docs/blueprint/14.20-WAVE-2-CONTENT-MIGRATION-PLAN-v1.0.md` | docs/blueprint/14.20-WAVE-2-CONTENT-MIGRATION-PLAN-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0079` | `ART:src/mocks/empresas.ts` | `implements` | `DOC:docs/blueprint/14.20-WAVE-2-CONTENT-MIGRATION-PLAN-v1.0.md` | docs/blueprint/14.20-WAVE-2-CONTENT-MIGRATION-PLAN-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0080` | `ART:src/mocks/resenas.ts` | `implements` | `DOC:docs/blueprint/14.20-WAVE-2-CONTENT-MIGRATION-PLAN-v1.0.md` | docs/blueprint/14.20-WAVE-2-CONTENT-MIGRATION-PLAN-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0081` | `ART:src/mocks/rutas.ts` | `implements` | `DOC:docs/blueprint/14.20-WAVE-2-CONTENT-MIGRATION-PLAN-v1.0.md` | docs/blueprint/14.20-WAVE-2-CONTENT-MIGRATION-PLAN-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0082` | `ART:src/components/home/CategoriasSection.tsx` | `implements` | `DOC:docs/blueprint/14.20.1-WAVE-2-STAGE-1-PROGRESS-v1.0.md` | docs/blueprint/14.20.1-WAVE-2-STAGE-1-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0083` | `ART:src/lib/cms/public-reads.functions.ts` | `implements` | `DOC:docs/blueprint/14.20.1-WAVE-2-STAGE-1-PROGRESS-v1.0.md` | docs/blueprint/14.20.1-WAVE-2-STAGE-1-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0084` | `ART:src/mocks/categorias.ts` | `implements` | `DOC:docs/blueprint/14.20.1-WAVE-2-STAGE-1-PROGRESS-v1.0.md` | docs/blueprint/14.20.1-WAVE-2-STAGE-1-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0085` | `ART:src/routes/experiencias.tsx` | `implements` | `DOC:docs/blueprint/14.20.1-WAVE-2-STAGE-1-PROGRESS-v1.0.md` | docs/blueprint/14.20.1-WAVE-2-STAGE-1-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0086` | `ART:src/routes/hoteles.tsx` | `implements` | `DOC:docs/blueprint/14.20.1-WAVE-2-STAGE-1-PROGRESS-v1.0.md` | docs/blueprint/14.20.1-WAVE-2-STAGE-1-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0087` | `ART:src/routes/restaurantes.tsx` | `implements` | `DOC:docs/blueprint/14.20.1-WAVE-2-STAGE-1-PROGRESS-v1.0.md` | docs/blueprint/14.20.1-WAVE-2-STAGE-1-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0088` | `DOC:docs/blueprint/14.20.1-WAVE-2-STAGE-1-PROGRESS-v1.0.md` | `requires` | `ART:supabase/migrations/` | docs/blueprint/14.20.1-WAVE-2-STAGE-1-PROGRESS-v1.0.md § migración vinculada validada | 2026-07-21 |
| `E0089` | `ART:src/components/home/DestinosSection.tsx` | `implements` | `DOC:docs/blueprint/14.20.2-WAVE-2-STAGE-2-PROGRESS-v1.0.md` | docs/blueprint/14.20.2-WAVE-2-STAGE-2-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0090` | `ART:src/lib/cms/public-reads.functions.ts` | `implements` | `DOC:docs/blueprint/14.20.2-WAVE-2-STAGE-2-PROGRESS-v1.0.md` | docs/blueprint/14.20.2-WAVE-2-STAGE-2-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0091` | `ART:src/mocks/destinos.ts` | `implements` | `DOC:docs/blueprint/14.20.2-WAVE-2-STAGE-2-PROGRESS-v1.0.md` | docs/blueprint/14.20.2-WAVE-2-STAGE-2-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0092` | `ART:src/components/home/RutasSection.tsx` | `implements` | `DOC:docs/blueprint/14.20.3-WAVE-2-STAGE-3-PROGRESS-v1.0.md` | docs/blueprint/14.20.3-WAVE-2-STAGE-3-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0093` | `ART:src/lib/cms/public-reads.functions.ts` | `implements` | `DOC:docs/blueprint/14.20.3-WAVE-2-STAGE-3-PROGRESS-v1.0.md` | docs/blueprint/14.20.3-WAVE-2-STAGE-3-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0094` | `ART:src/mocks/rutas.ts` | `implements` | `DOC:docs/blueprint/14.20.3-WAVE-2-STAGE-3-PROGRESS-v1.0.md` | docs/blueprint/14.20.3-WAVE-2-STAGE-3-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0095` | `DOC:docs/blueprint/14.20.3-WAVE-2-STAGE-3-PROGRESS-v1.0.md` | `requires` | `ART:supabase/migrations/` | docs/blueprint/14.20.3-WAVE-2-STAGE-3-PROGRESS-v1.0.md § migración vinculada validada | 2026-07-21 |
| `E0096` | `ART:src/components/home/EmpresasSection.tsx` | `implements` | `DOC:docs/blueprint/14.20.4-WAVE-2-STAGE-4-PROGRESS-v1.0.md` | docs/blueprint/14.20.4-WAVE-2-STAGE-4-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0097` | `ART:src/lib/cms/public-reads.functions.ts` | `implements` | `DOC:docs/blueprint/14.20.4-WAVE-2-STAGE-4-PROGRESS-v1.0.md` | docs/blueprint/14.20.4-WAVE-2-STAGE-4-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0098` | `ART:src/mocks/empresas.ts` | `implements` | `DOC:docs/blueprint/14.20.4-WAVE-2-STAGE-4-PROGRESS-v1.0.md` | docs/blueprint/14.20.4-WAVE-2-STAGE-4-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0099` | `DOC:docs/blueprint/14.20.4-WAVE-2-STAGE-4-PROGRESS-v1.0.md` | `requires` | `ART:supabase/migrations/` | docs/blueprint/14.20.4-WAVE-2-STAGE-4-PROGRESS-v1.0.md § migración vinculada validada | 2026-07-21 |
| `E0100` | `ART:src/components/home/ResenasSection.tsx` | `implements` | `DOC:docs/blueprint/14.20.5-WAVE-2-STAGE-5-PROGRESS-v1.0.md` | docs/blueprint/14.20.5-WAVE-2-STAGE-5-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0101` | `ART:src/lib/cms/public-reads.functions.ts` | `implements` | `DOC:docs/blueprint/14.20.5-WAVE-2-STAGE-5-PROGRESS-v1.0.md` | docs/blueprint/14.20.5-WAVE-2-STAGE-5-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0102` | `ART:src/mocks/resenas.ts` | `implements` | `DOC:docs/blueprint/14.20.5-WAVE-2-STAGE-5-PROGRESS-v1.0.md` | docs/blueprint/14.20.5-WAVE-2-STAGE-5-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0103` | `ART:src/components/home/CategoriasSection.tsx` | `implements` | `DOC:docs/blueprint/14.20.Z-WAVE-2-CLOSURE-REPORT-v1.0.md` | docs/blueprint/14.20.Z-WAVE-2-CLOSURE-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0104` | `ART:src/components/home/DestinosSection.tsx` | `implements` | `DOC:docs/blueprint/14.20.Z-WAVE-2-CLOSURE-REPORT-v1.0.md` | docs/blueprint/14.20.Z-WAVE-2-CLOSURE-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0105` | `ART:src/components/home/EmpresasSection.tsx` | `implements` | `DOC:docs/blueprint/14.20.Z-WAVE-2-CLOSURE-REPORT-v1.0.md` | docs/blueprint/14.20.Z-WAVE-2-CLOSURE-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0106` | `ART:src/components/home/ResenasSection.tsx` | `implements` | `DOC:docs/blueprint/14.20.Z-WAVE-2-CLOSURE-REPORT-v1.0.md` | docs/blueprint/14.20.Z-WAVE-2-CLOSURE-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0107` | `ART:src/components/home/RutasSection.tsx` | `implements` | `DOC:docs/blueprint/14.20.Z-WAVE-2-CLOSURE-REPORT-v1.0.md` | docs/blueprint/14.20.Z-WAVE-2-CLOSURE-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0108` | `ART:src/lib/cms/public-reads.functions.ts` | `implements` | `DOC:docs/blueprint/14.20.Z-WAVE-2-CLOSURE-REPORT-v1.0.md` | docs/blueprint/14.20.Z-WAVE-2-CLOSURE-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0109` | `DOC:docs/blueprint/14.20.Z-WAVE-2-CLOSURE-REPORT-v1.0.md` | `requires` | `ART:supabase/migrations/` | docs/blueprint/14.20.Z-WAVE-2-CLOSURE-REPORT-v1.0.md § migración vinculada validada | 2026-07-21 |
| `E0110` | `ART:src/lib/portal/portal-reads.functions.ts` | `implements` | `DOC:docs/blueprint/14.30-WAVE-3-PORTAL-EMPRESARIAL-PLAN-v1.0.md` | docs/blueprint/14.30-WAVE-3-PORTAL-EMPRESARIAL-PLAN-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0111` | `ART:src/routes/_authenticated/portal/index.tsx` | `implements` | `DOC:docs/blueprint/14.30-WAVE-3-PORTAL-EMPRESARIAL-PLAN-v1.0.md` | docs/blueprint/14.30-WAVE-3-PORTAL-EMPRESARIAL-PLAN-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0112` | `ART:src/routes/_authenticated/portal/route.tsx` | `implements` | `DOC:docs/blueprint/14.30-WAVE-3-PORTAL-EMPRESARIAL-PLAN-v1.0.md` | docs/blueprint/14.30-WAVE-3-PORTAL-EMPRESARIAL-PLAN-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0113` | `ART:src/integrations/supabase/` | `implements` | `DOC:docs/blueprint/14.30.1-WAVE-3-STAGE-1-PROGRESS-v1.0.md` | docs/blueprint/14.30.1-WAVE-3-STAGE-1-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0114` | `ART:src/lib/portal/portal-reads.functions.ts` | `implements` | `DOC:docs/blueprint/14.30.1-WAVE-3-STAGE-1-PROGRESS-v1.0.md` | docs/blueprint/14.30.1-WAVE-3-STAGE-1-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0115` | `ART:src/routes/_authenticated/portal/` | `implements` | `DOC:docs/blueprint/14.30.1-WAVE-3-STAGE-1-PROGRESS-v1.0.md` | docs/blueprint/14.30.1-WAVE-3-STAGE-1-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0116` | `ART:src/routes/_authenticated/portal/index.tsx` | `implements` | `DOC:docs/blueprint/14.30.1-WAVE-3-STAGE-1-PROGRESS-v1.0.md` | docs/blueprint/14.30.1-WAVE-3-STAGE-1-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0117` | `ART:src/routes/_authenticated/portal/route.tsx` | `implements` | `DOC:docs/blueprint/14.30.1-WAVE-3-STAGE-1-PROGRESS-v1.0.md` | docs/blueprint/14.30.1-WAVE-3-STAGE-1-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0118` | `ART:src/lib/portal/invitations.functions.ts` | `implements` | `DOC:docs/blueprint/14.30.2-WAVE-3-STAGE-2-PROGRESS-v1.0.md` | docs/blueprint/14.30.2-WAVE-3-STAGE-2-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0119` | `ART:src/routes/_authenticated/portal/invitaciones.$token.tsx` | `implements` | `DOC:docs/blueprint/14.30.2-WAVE-3-STAGE-2-PROGRESS-v1.0.md` | docs/blueprint/14.30.2-WAVE-3-STAGE-2-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0120` | `ART:src/routes/_authenticated/portal/invitaciones.index.tsx` | `implements` | `DOC:docs/blueprint/14.30.2-WAVE-3-STAGE-2-PROGRESS-v1.0.md` | docs/blueprint/14.30.2-WAVE-3-STAGE-2-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0121` | `ART:src/routes/_authenticated/portal/route.tsx` | `implements` | `DOC:docs/blueprint/14.30.2-WAVE-3-STAGE-2-PROGRESS-v1.0.md` | docs/blueprint/14.30.2-WAVE-3-STAGE-2-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0122` | `ART:src/lib/portal/business-card.functions.ts` | `implements` | `DOC:docs/blueprint/14.30.3-WAVE-3-STAGE-3-PROGRESS-v1.0.md` | docs/blueprint/14.30.3-WAVE-3-STAGE-3-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0123` | `ART:src/routes/_authenticated/portal/ficha.tsx` | `implements` | `DOC:docs/blueprint/14.30.3-WAVE-3-STAGE-3-PROGRESS-v1.0.md` | docs/blueprint/14.30.3-WAVE-3-STAGE-3-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0124` | `ART:src/routes/_authenticated/portal/route.tsx` | `implements` | `DOC:docs/blueprint/14.30.3-WAVE-3-STAGE-3-PROGRESS-v1.0.md` | docs/blueprint/14.30.3-WAVE-3-STAGE-3-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0125` | `ART:src/lib/portal/business-presence.functions.ts` | `implements` | `DOC:docs/blueprint/14.30.4-WAVE-3-STAGE-4-PROGRESS-v1.0.md` | docs/blueprint/14.30.4-WAVE-3-STAGE-4-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0126` | `ART:src/routes/_authenticated/portal/presencia.tsx` | `implements` | `DOC:docs/blueprint/14.30.4-WAVE-3-STAGE-4-PROGRESS-v1.0.md` | docs/blueprint/14.30.4-WAVE-3-STAGE-4-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0127` | `ART:src/routes/_authenticated/portal/route.tsx` | `implements` | `DOC:docs/blueprint/14.30.4-WAVE-3-STAGE-4-PROGRESS-v1.0.md` | docs/blueprint/14.30.4-WAVE-3-STAGE-4-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0128` | `ART:src/lib/portal/business-media.functions.ts` | `implements` | `DOC:docs/blueprint/14.30.5-WAVE-3-STAGE-5-PROGRESS-v1.0.md` | docs/blueprint/14.30.5-WAVE-3-STAGE-5-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0129` | `ART:src/routes/_authenticated/portal/galeria.tsx` | `implements` | `DOC:docs/blueprint/14.30.5-WAVE-3-STAGE-5-PROGRESS-v1.0.md` | docs/blueprint/14.30.5-WAVE-3-STAGE-5-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0130` | `ART:src/lib/portal/business-catalog.functions.ts` | `implements` | `DOC:docs/blueprint/14.30.6-WAVE-3-STAGE-6-PROGRESS-v1.0.md` | docs/blueprint/14.30.6-WAVE-3-STAGE-6-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0131` | `ART:src/routes/_authenticated/portal/catalogo.tsx` | `implements` | `DOC:docs/blueprint/14.30.6-WAVE-3-STAGE-6-PROGRESS-v1.0.md` | docs/blueprint/14.30.6-WAVE-3-STAGE-6-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0132` | `ART:src/lib/traveler/traveler-account.functions.ts` | `implements` | `DOC:docs/blueprint/14.40.3-WAVE-4-STAGE-3-PROGRESS-v1.0.md` | docs/blueprint/14.40.3-WAVE-4-STAGE-3-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0133` | `ART:src/lib/traveler/traveler-favorites.functions.ts` | `implements` | `DOC:docs/blueprint/14.40.4-WAVE-4-STAGE-4-PROGRESS-v1.0.md` | docs/blueprint/14.40.4-WAVE-4-STAGE-4-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0134` | `ART:src/components` | `implements` | `DOC:docs/blueprint/14.40.5-WAVE-4-STAGE-5-PROGRESS-v1.0.md` | docs/blueprint/14.40.5-WAVE-4-STAGE-5-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0135` | `ART:src/lib/payments` | `implements` | `DOC:docs/blueprint/14.40.5-WAVE-4-STAGE-5-PROGRESS-v1.0.md` | docs/blueprint/14.40.5-WAVE-4-STAGE-5-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0136` | `ART:src/lib/payments/` | `implements` | `DOC:docs/blueprint/14.40.5-WAVE-4-STAGE-5-PROGRESS-v1.0.md` | docs/blueprint/14.40.5-WAVE-4-STAGE-5-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0137` | `ART:src/routes/_authenticated` | `implements` | `DOC:docs/blueprint/14.40.5-WAVE-4-STAGE-5-PROGRESS-v1.0.md` | docs/blueprint/14.40.5-WAVE-4-STAGE-5-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0138` | `ART:src/routes/_authenticated/cuenta/` | `implements` | `DOC:docs/blueprint/14.40.5-WAVE-4-STAGE-5-PROGRESS-v1.0.md` | docs/blueprint/14.40.5-WAVE-4-STAGE-5-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0139` | `ART:src/routes/api/public/payments/$provider/webhook.ts` | `implements` | `DOC:docs/blueprint/14.40.5-WAVE-4-STAGE-5-PROGRESS-v1.0.md` | docs/blueprint/14.40.5-WAVE-4-STAGE-5-PROGRESS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0140` | `ART:src/integrations/supabase/types.ts` | `implements` | `DOC:docs/blueprint/14.40.5-WAVE-4-STAGE-5-REPORT-v1.0.md` | docs/blueprint/14.40.5-WAVE-4-STAGE-5-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0141` | `ART:src/lib/payments/admin.functions.ts` | `implements` | `DOC:docs/blueprint/14.40.5-WAVE-4-STAGE-5-REPORT-v1.0.md` | docs/blueprint/14.40.5-WAVE-4-STAGE-5-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0142` | `ART:src/lib/payments/payments.functions.ts` | `implements` | `DOC:docs/blueprint/14.40.5-WAVE-4-STAGE-5-REPORT-v1.0.md` | docs/blueprint/14.40.5-WAVE-4-STAGE-5-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0143` | `ART:src/lib/payments/provider.ts` | `implements` | `DOC:docs/blueprint/14.40.5-WAVE-4-STAGE-5-REPORT-v1.0.md` | docs/blueprint/14.40.5-WAVE-4-STAGE-5-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0144` | `ART:src/lib/payments/registry.server.ts` | `implements` | `DOC:docs/blueprint/14.40.5-WAVE-4-STAGE-5-REPORT-v1.0.md` | docs/blueprint/14.40.5-WAVE-4-STAGE-5-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0145` | `ART:src/lib/payments/stripe.server.ts` | `implements` | `DOC:docs/blueprint/14.40.5-WAVE-4-STAGE-5-REPORT-v1.0.md` | docs/blueprint/14.40.5-WAVE-4-STAGE-5-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0146` | `ART:src/routes/_authenticated/cms.tsx` | `implements` | `DOC:docs/blueprint/14.40.5-WAVE-4-STAGE-5-REPORT-v1.0.md` | docs/blueprint/14.40.5-WAVE-4-STAGE-5-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0147` | `ART:src/routes/_authenticated/cms/pagos.tsx` | `implements` | `DOC:docs/blueprint/14.40.5-WAVE-4-STAGE-5-REPORT-v1.0.md` | docs/blueprint/14.40.5-WAVE-4-STAGE-5-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0148` | `ART:src/routes/_authenticated/cuenta/historial.tsx` | `implements` | `DOC:docs/blueprint/14.40.5-WAVE-4-STAGE-5-REPORT-v1.0.md` | docs/blueprint/14.40.5-WAVE-4-STAGE-5-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0149` | `ART:src/routes/_authenticated/cuenta/pagos.error.tsx` | `implements` | `DOC:docs/blueprint/14.40.5-WAVE-4-STAGE-5-REPORT-v1.0.md` | docs/blueprint/14.40.5-WAVE-4-STAGE-5-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0150` | `ART:src/routes/_authenticated/cuenta/pagos.exito.tsx` | `implements` | `DOC:docs/blueprint/14.40.5-WAVE-4-STAGE-5-REPORT-v1.0.md` | docs/blueprint/14.40.5-WAVE-4-STAGE-5-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0151` | `ART:src/routes/api/public/payments/$provider/webhook.ts` | `implements` | `DOC:docs/blueprint/14.40.5-WAVE-4-STAGE-5-REPORT-v1.0.md` | docs/blueprint/14.40.5-WAVE-4-STAGE-5-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0152` | `ART:src/lib/portal/ownership-transfers.functions.ts` | `implements` | `DOC:docs/blueprint/14.40.6-WAVE-4-STAGE-6-REPORT-v1.0.md` | docs/blueprint/14.40.6-WAVE-4-STAGE-6-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0153` | `ART:src/routes/_authenticated/portal/propiedad.tsx` | `implements` | `DOC:docs/blueprint/14.40.6-WAVE-4-STAGE-6-REPORT-v1.0.md` | docs/blueprint/14.40.6-WAVE-4-STAGE-6-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0154` | `ART:src/routes/_authenticated/portal/route.tsx` | `implements` | `DOC:docs/blueprint/14.40.6-WAVE-4-STAGE-6-REPORT-v1.0.md` | docs/blueprint/14.40.6-WAVE-4-STAGE-6-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0155` | `ART:src/lib/observability/observability.functions.ts` | `implements` | `DOC:docs/blueprint/14.40.7-WAVE-4-STAGE-7-REPORT-v1.0.md` | docs/blueprint/14.40.7-WAVE-4-STAGE-7-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0156` | `ART:src/lib/cms/workflow.ts` | `implements` | `DOC:docs/blueprint/14.40.A-EMS-PROPOSAL-v1.0.md` | docs/blueprint/14.40.A-EMS-PROPOSAL-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0157` | `ART:src/lib/cms/workflow.ts` | `implements` | `DOC:docs/blueprint/14.40.A-HOME-EXPERIENCE-BUILDER-PROPOSAL-v1.0.md` | docs/blueprint/14.40.A-HOME-EXPERIENCE-BUILDER-PROPOSAL-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0158` | `ART:src/routes/index.tsx` | `implements` | `DOC:docs/blueprint/14.40.A-HOME-EXPERIENCE-BUILDER-PROPOSAL-v1.0.md` | docs/blueprint/14.40.A-HOME-EXPERIENCE-BUILDER-PROPOSAL-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0159` | `ART:src/lib/notifications/notifications.functions.ts` | `implements` | `DOC:docs/blueprint/14.50.1-WAVE-5-STAGE-1-REPORT-v1.0.md` | docs/blueprint/14.50.1-WAVE-5-STAGE-1-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0160` | `ART:src/lib/notifications/activity.functions.ts` | `implements` | `DOC:docs/blueprint/14.50.2-WAVE-5-STAGE-2-REPORT-v1.0.md` | docs/blueprint/14.50.2-WAVE-5-STAGE-2-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0161` | `ART:src/lib/notifications/preferences.functions.ts` | `implements` | `DOC:docs/blueprint/14.50.3-WAVE-5-STAGE-3-REPORT-v1.0.md` | docs/blueprint/14.50.3-WAVE-5-STAGE-3-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0162` | `ART:src/lib/notifications/email.functions.ts` | `implements` | `DOC:docs/blueprint/14.50.4-WAVE-5-STAGE-4-REPORT-v1.0.md` | docs/blueprint/14.50.4-WAVE-5-STAGE-4-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0163` | `ART:src/lib/notifications/` | `implements` | `DOC:docs/blueprint/14.50.4-WAVE-5-STAGE-4-SCOPE-ADDENDUM-v1.0.md` | docs/blueprint/14.50.4-WAVE-5-STAGE-4-SCOPE-ADDENDUM-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0164` | `ART:src/lib/notifications/push.functions.ts` | `implements` | `DOC:docs/blueprint/14.50.5-WAVE-5-STAGE-5-REPORT-v1.0.md` | docs/blueprint/14.50.5-WAVE-5-STAGE-5-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0165` | `ART:src/lib/notifications/webhooks.functions.ts` | `implements` | `DOC:docs/blueprint/14.50.5-WAVE-5-STAGE-5-REPORT-v1.0.md` | docs/blueprint/14.50.5-WAVE-5-STAGE-5-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0166` | `ART:src/pwa/register-sw.ts` | `implements` | `DOC:docs/blueprint/14.50.5-WAVE-5-STAGE-5-SCOPE-ADDENDUM-v1.0.md` | docs/blueprint/14.50.5-WAVE-5-STAGE-5-SCOPE-ADDENDUM-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0167` | `ART:src/components/notifications/ActivityFeedView.tsx` | `implements` | `DOC:docs/blueprint/14.50.6-WAVE-5-STAGE-6-REPORT-v1.0.md` | docs/blueprint/14.50.6-WAVE-5-STAGE-6-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0168` | `ART:src/lib/notifications/iac.functions.ts` | `implements` | `DOC:docs/blueprint/14.50.6-WAVE-5-STAGE-6-REPORT-v1.0.md` | docs/blueprint/14.50.6-WAVE-5-STAGE-6-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0169` | `ART:src/lib/concierge/concierge.functions.ts` | `implements` | `DOC:docs/blueprint/14.60.1-WAVE-6-STAGE-1-REPORT-v1.0.md` | docs/blueprint/14.60.1-WAVE-6-STAGE-1-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0170` | `ART:src/components/concierge/CaseFileView.tsx` | `implements` | `DOC:docs/blueprint/14.60.2-WAVE-6-STAGE-2-REPORT-v1.0.md` | docs/blueprint/14.60.2-WAVE-6-STAGE-2-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0171` | `ART:src/components/concierge/RequestConciergeButton.tsx` | `implements` | `DOC:docs/blueprint/14.60.2-WAVE-6-STAGE-2-REPORT-v1.0.md` | docs/blueprint/14.60.2-WAVE-6-STAGE-2-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0172` | `ART:src/lib/concierge/concierge.functions.ts` | `implements` | `DOC:docs/blueprint/14.60.2-WAVE-6-STAGE-2-REPORT-v1.0.md` | docs/blueprint/14.60.2-WAVE-6-STAGE-2-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0173` | `ART:src/components/concierge/CaseFileView.tsx` | `implements` | `DOC:docs/blueprint/14.60.4-WAVE-6-STAGE-4-REPORT-v1.0.md` | docs/blueprint/14.60.4-WAVE-6-STAGE-4-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0174` | `ART:src/lib/concierge/concierge.functions.ts` | `implements` | `DOC:docs/blueprint/14.60.4-WAVE-6-STAGE-4-REPORT-v1.0.md` | docs/blueprint/14.60.4-WAVE-6-STAGE-4-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0175` | `ART:src/lib/payments/registry.server.ts` | `implements` | `DOC:docs/blueprint/14.60.4-WAVE-6-STAGE-4-REPORT-v1.0.md` | docs/blueprint/14.60.4-WAVE-6-STAGE-4-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0176` | `ART:src/lib/concierge/concierge.functions.ts` | `implements` | `DOC:docs/blueprint/14.60.5-WAVE-6-STAGE-5-REPORT-v1.0.md` | docs/blueprint/14.60.5-WAVE-6-STAGE-5-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0177` | `ART:src/lib/concierge/alux.functions.ts` | `implements` | `DOC:docs/blueprint/14.60.6-ADENDA-ALUX-CONCIERGE-ASSISTANT-v1.0.md` | docs/blueprint/14.60.6-ADENDA-ALUX-CONCIERGE-ASSISTANT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0178` | `ART:src/lib/ai-gateway.server.ts` | `implements` | `DOC:docs/blueprint/14.60.6-WAVE-6-STAGE-6-REPORT-v1.0.md` | docs/blueprint/14.60.6-WAVE-6-STAGE-6-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0179` | `ART:src/lib/concierge/alux.functions.ts` | `implements` | `DOC:docs/blueprint/14.60.6-WAVE-6-STAGE-6-REPORT-v1.0.md` | docs/blueprint/14.60.6-WAVE-6-STAGE-6-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0180` | `ART:src/i18n/` | `implements` | `DOC:docs/blueprint/14.A-PHASE-2-AUDIT-REPORT-v1.0.md` | docs/blueprint/14.A-PHASE-2-AUDIT-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0181` | `ART:src/lib/cms.functions.ts` | `implements` | `DOC:docs/blueprint/14.A-PHASE-2-AUDIT-REPORT-v1.0.md` | docs/blueprint/14.A-PHASE-2-AUDIT-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0182` | `ART:src/mocks/` | `implements` | `DOC:docs/blueprint/14.A-PHASE-2-AUDIT-REPORT-v1.0.md` | docs/blueprint/14.A-PHASE-2-AUDIT-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0183` | `ART:src/mocks/categorias.ts` | `implements` | `DOC:docs/blueprint/14.A-PHASE-2-AUDIT-REPORT-v1.0.md` | docs/blueprint/14.A-PHASE-2-AUDIT-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0184` | `ART:src/mocks/destinos.ts` | `implements` | `DOC:docs/blueprint/14.A-PHASE-2-AUDIT-REPORT-v1.0.md` | docs/blueprint/14.A-PHASE-2-AUDIT-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0185` | `ART:src/mocks/empresas.ts` | `implements` | `DOC:docs/blueprint/14.A-PHASE-2-AUDIT-REPORT-v1.0.md` | docs/blueprint/14.A-PHASE-2-AUDIT-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0186` | `ART:src/mocks/resenas.ts` | `implements` | `DOC:docs/blueprint/14.A-PHASE-2-AUDIT-REPORT-v1.0.md` | docs/blueprint/14.A-PHASE-2-AUDIT-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0187` | `ART:src/mocks/rutas.ts` | `implements` | `DOC:docs/blueprint/14.A-PHASE-2-AUDIT-REPORT-v1.0.md` | docs/blueprint/14.A-PHASE-2-AUDIT-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0188` | `ART:src/routes/_authenticated/cms/` | `implements` | `DOC:docs/blueprint/14.A-PHASE-2-AUDIT-REPORT-v1.0.md` | docs/blueprint/14.A-PHASE-2-AUDIT-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0189` | `ART:src/styles.css` | `implements` | `DOC:docs/blueprint/14.A-PHASE-2-AUDIT-REPORT-v1.0.md` | docs/blueprint/14.A-PHASE-2-AUDIT-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0190` | `ART:src/components/home/` | `implements` | `DOC:docs/blueprint/15.10-FUNCTIONAL-REBASE-AFTER-INFRASTRUCTURE-v1.0.md` | docs/blueprint/15.10-FUNCTIONAL-REBASE-AFTER-INFRASTRUCTURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0191` | `ART:src/lib/admin/founder.functions.ts` | `implements` | `DOC:docs/blueprint/15.10-REBASELINE-v1.1.md` | docs/blueprint/15.10-REBASELINE-v1.1.md § asociación de implementación validada | 2026-07-21 |
| `E0192` | `ART:src/lib/concierge/cc.functions.ts` | `implements` | `DOC:docs/blueprint/15.10-REBASELINE-v1.1.md` | docs/blueprint/15.10-REBASELINE-v1.1.md § asociación de implementación validada | 2026-07-21 |
| `E0193` | `ART:src/routes/_authenticated/empresa.tsx` | `implements` | `DOC:docs/blueprint/15.10-REBASELINE-v1.1.md` | docs/blueprint/15.10-REBASELINE-v1.1.md § asociación de implementación validada | 2026-07-21 |
| `E0194` | `ART:src/routes/_authenticated/mi-viaje.tsx` | `implements` | `DOC:docs/blueprint/15.10-REBASELINE-v1.1.md` | docs/blueprint/15.10-REBASELINE-v1.1.md § asociación de implementación validada | 2026-07-21 |
| `E0195` | `ART:src/routes/auth.tsx` | `implements` | `DOC:docs/blueprint/15.10-REBASELINE-v1.1.md` | docs/blueprint/15.10-REBASELINE-v1.1.md § asociación de implementación validada | 2026-07-21 |
| `E0196` | `ART:src/types/auth.ts` | `implements` | `DOC:docs/blueprint/15.10-REBASELINE-v1.1.md` | docs/blueprint/15.10-REBASELINE-v1.1.md § asociación de implementación validada | 2026-07-21 |
| `E0197` | `ART:src/components/home/` | `implements` | `DOC:docs/blueprint/15.10-RETURN-TO-PRODUCT-v1.0.md` | docs/blueprint/15.10-RETURN-TO-PRODUCT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0198` | `ART:src/lib/experience-builder/block-contract.ts` | `implements` | `DOC:docs/blueprint/15.10.1-WAVE-7-STAGE-1-REPORT-v1.0.md` | docs/blueprint/15.10.1-WAVE-7-STAGE-1-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0199` | `ART:src/lib/experience-builder/block-library.ts` | `implements` | `DOC:docs/blueprint/15.10.1-WAVE-7-STAGE-1-REPORT-v1.0.md` | docs/blueprint/15.10.1-WAVE-7-STAGE-1-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0200` | `ART:src/lib/experience-builder/block-registry.ts` | `implements` | `DOC:docs/blueprint/15.10.1-WAVE-7-STAGE-1-REPORT-v1.0.md` | docs/blueprint/15.10.1-WAVE-7-STAGE-1-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0201` | `ART:src/lib/experience-builder/experience-builder.functions.ts` | `implements` | `DOC:docs/blueprint/15.10.1-WAVE-7-STAGE-1-REPORT-v1.0.md` | docs/blueprint/15.10.1-WAVE-7-STAGE-1-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0202` | `ART:src/lib/experience-builder/composition-renderer.tsx` | `implements` | `DOC:docs/blueprint/15.10.2-ADENDA-EXPERIENCE-BUILDER-STUDIO-V0-v1.0.md` | docs/blueprint/15.10.2-ADENDA-EXPERIENCE-BUILDER-STUDIO-V0-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0203` | `ART:src/lib/experience-builder/composition-renderer.tsx` | `implements` | `DOC:docs/blueprint/15.10.2-WAVE-7-STAGE-2-REPORT-v1.0.md` | docs/blueprint/15.10.2-WAVE-7-STAGE-2-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0204` | `ART:src/lib/experience-builder/composition-tree.ts` | `implements` | `DOC:docs/blueprint/15.10.2-WAVE-7-STAGE-2-REPORT-v1.0.md` | docs/blueprint/15.10.2-WAVE-7-STAGE-2-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0205` | `ART:src/lib/experience-builder/layout-engine.ts` | `implements` | `DOC:docs/blueprint/15.10.2-WAVE-7-STAGE-2-REPORT-v1.0.md` | docs/blueprint/15.10.2-WAVE-7-STAGE-2-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0206` | `ART:src/routes/_authenticated/cms/experience-builder.tsx` | `implements` | `DOC:docs/blueprint/15.10.2-WAVE-7-STAGE-2-REPORT-v1.0.md` | docs/blueprint/15.10.2-WAVE-7-STAGE-2-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0207` | `DOC:docs/blueprint/15.10.2-WAVE-7-STAGE-2-REPORT-v1.0.md` | `requires` | `ART:supabase/migrations/` | docs/blueprint/15.10.2-WAVE-7-STAGE-2-REPORT-v1.0.md § migración vinculada validada | 2026-07-21 |
| `E0208` | `ART:src/components/home/` | `implements` | `DOC:docs/blueprint/15.10.3-ADENDA-PUBLIC-HOME-MIGRATION-v1.0.md` | docs/blueprint/15.10.3-ADENDA-PUBLIC-HOME-MIGRATION-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0209` | `ART:src/routes/index.tsx` | `implements` | `DOC:docs/blueprint/15.10.3-ADENDA-PUBLIC-HOME-MIGRATION-v1.0.md` | docs/blueprint/15.10.3-ADENDA-PUBLIC-HOME-MIGRATION-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0210` | `ART:src/lib/experience-builder/composition-renderer.tsx` | `implements` | `DOC:docs/blueprint/15.10.3-WAVE-7-STAGE-3-REPORT-v1.0.md` | docs/blueprint/15.10.3-WAVE-7-STAGE-3-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0211` | `ART:src/lib/experience-builder/public-reads.functions.ts` | `implements` | `DOC:docs/blueprint/15.10.3-WAVE-7-STAGE-3-REPORT-v1.0.md` | docs/blueprint/15.10.3-WAVE-7-STAGE-3-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0212` | `ART:src/lib/experience-builder/studio.functions.ts` | `implements` | `DOC:docs/blueprint/15.10.3-WAVE-7-STAGE-3-REPORT-v1.0.md` | docs/blueprint/15.10.3-WAVE-7-STAGE-3-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0213` | `ART:src/routes/_authenticated/cms/experience-builder.tsx` | `implements` | `DOC:docs/blueprint/15.10.3-WAVE-7-STAGE-3-REPORT-v1.0.md` | docs/blueprint/15.10.3-WAVE-7-STAGE-3-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0214` | `ART:src/routes/index.tsx` | `implements` | `DOC:docs/blueprint/15.10.3-WAVE-7-STAGE-3-REPORT-v1.0.md` | docs/blueprint/15.10.3-WAVE-7-STAGE-3-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0215` | `DOC:docs/blueprint/15.10.3-WAVE-7-STAGE-3-REPORT-v1.0.md` | `requires` | `ART:supabase/migrations/` | docs/blueprint/15.10.3-WAVE-7-STAGE-3-REPORT-v1.0.md § migración vinculada validada | 2026-07-21 |
| `E0216` | `ART:src/lib/admin/founder.functions.ts` | `implements` | `DOC:docs/blueprint/15.10.4-WAVE-7-STAGE-4-CLOSURE-REPORT.md` | docs/blueprint/15.10.4-WAVE-7-STAGE-4-CLOSURE-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0217` | `ART:src/lib/concierge/cc.functions.ts` | `implements` | `DOC:docs/blueprint/15.10.4-WAVE-7-STAGE-4-CLOSURE-REPORT.md` | docs/blueprint/15.10.4-WAVE-7-STAGE-4-CLOSURE-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0218` | `ART:src/types/auth.ts` | `implements` | `DOC:docs/blueprint/15.10.4-WAVE-7-STAGE-4-CLOSURE-REPORT.md` | docs/blueprint/15.10.4-WAVE-7-STAGE-4-CLOSURE-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0219` | `ART:src/routes/auth.tsx` | `implements` | `DOC:docs/blueprint/15.10.4-WAVE-7-STAGE-4-REPORT-PHASE-1.md` | docs/blueprint/15.10.4-WAVE-7-STAGE-4-REPORT-PHASE-1.md § asociación de implementación validada | 2026-07-21 |
| `E0220` | `ART:src/types/auth.ts` | `implements` | `DOC:docs/blueprint/15.10.4-WAVE-7-STAGE-4-REPORT-PHASE-1.md` | docs/blueprint/15.10.4-WAVE-7-STAGE-4-REPORT-PHASE-1.md § asociación de implementación validada | 2026-07-21 |
| `E0221` | `ART:src/components/admin/AdminHub.tsx` | `implements` | `DOC:docs/blueprint/15.10.4R-ARCHITECTURE-BASELINE-v1.0.md` | docs/blueprint/15.10.4R-ARCHITECTURE-BASELINE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0222` | `ART:src/routes/_authenticated/admin/` | `implements` | `DOC:docs/blueprint/15.10.4R-ARCHITECTURE-BASELINE-v1.0.md` | docs/blueprint/15.10.4R-ARCHITECTURE-BASELINE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0223` | `ART:src/components/admin/AdminHub.tsx` | `implements` | `DOC:docs/blueprint/15.10.4R-STEP-C-REPORT-v1.0.md` | docs/blueprint/15.10.4R-STEP-C-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0224` | `ART:src/routes/_authenticated/admin/concierge.tsx` | `implements` | `DOC:docs/blueprint/15.10.4R-STEP-C-REPORT-v1.0.md` | docs/blueprint/15.10.4R-STEP-C-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0225` | `ART:src/routes/_authenticated/admin/empresas.tsx` | `implements` | `DOC:docs/blueprint/15.10.4R-STEP-C-REPORT-v1.0.md` | docs/blueprint/15.10.4R-STEP-C-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0226` | `ART:src/routes/_authenticated/admin/ia.tsx` | `implements` | `DOC:docs/blueprint/15.10.4R-STEP-C-REPORT-v1.0.md` | docs/blueprint/15.10.4R-STEP-C-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0227` | `ART:src/routes/_authenticated/admin/operaciones.tsx` | `implements` | `DOC:docs/blueprint/15.10.4R-STEP-C-REPORT-v1.0.md` | docs/blueprint/15.10.4R-STEP-C-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0228` | `ART:src/routes/_authenticated/admin/sistema.tsx` | `implements` | `DOC:docs/blueprint/15.10.4R-STEP-C-REPORT-v1.0.md` | docs/blueprint/15.10.4R-STEP-C-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0229` | `ART:src/routes/_authenticated/admin/turistas.tsx` | `implements` | `DOC:docs/blueprint/15.10.4R-STEP-C-REPORT-v1.0.md` | docs/blueprint/15.10.4R-STEP-C-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0230` | `ART:src/routes/` | `implements` | `DOC:docs/blueprint/15.10.4R-STEP-D-REPORT-v1.0.md` | docs/blueprint/15.10.4R-STEP-D-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0231` | `ART:src/routes/_authenticated/admin/route.tsx` | `implements` | `DOC:docs/blueprint/15.10.4R-STEP-D-REPORT-v1.0.md` | docs/blueprint/15.10.4R-STEP-D-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0232` | `ART:src/components/admin/AdminHub.tsx` | `implements` | `DOC:docs/blueprint/15.10.4R-STEP-F-REPORT-v1.0.md` | docs/blueprint/15.10.4R-STEP-F-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0233` | `ART:src/routes/_authenticated/admin/` | `implements` | `DOC:docs/blueprint/15.10.4R-STEP-F-REPORT-v1.0.md` | docs/blueprint/15.10.4R-STEP-F-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0234` | `ART:src/routes/_authenticated/admin/route.tsx` | `implements` | `DOC:docs/blueprint/15.10.4R-STEP-F-REPORT-v1.0.md` | docs/blueprint/15.10.4R-STEP-F-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0235` | `ART:src/components/admin/` | `implements` | `DOC:docs/blueprint/15.10.4R-TRACEABILITY-MATRIX.md` | docs/blueprint/15.10.4R-TRACEABILITY-MATRIX.md § asociación de implementación validada | 2026-07-21 |
| `E0236` | `ART:src/i18n/` | `implements` | `DOC:docs/blueprint/15.10.4R-TRACEABILITY-MATRIX.md` | docs/blueprint/15.10.4R-TRACEABILITY-MATRIX.md § asociación de implementación validada | 2026-07-21 |
| `E0237` | `ART:src/lib/admin/` | `implements` | `DOC:docs/blueprint/15.10.4R-TRACEABILITY-MATRIX.md` | docs/blueprint/15.10.4R-TRACEABILITY-MATRIX.md § asociación de implementación validada | 2026-07-21 |
| `E0238` | `ART:src/routes/` | `implements` | `DOC:docs/blueprint/15.10.4R-TRACEABILITY-MATRIX.md` | docs/blueprint/15.10.4R-TRACEABILITY-MATRIX.md § asociación de implementación validada | 2026-07-21 |
| `E0239` | `ART:src/components/admin/AdminHub.tsx` | `implements` | `DOC:docs/blueprint/15.10.4b-OPERATIONAL-VALIDATION-REPORT-v1.0.md` | docs/blueprint/15.10.4b-OPERATIONAL-VALIDATION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0240` | `ART:src/lib/admin/founder.functions.ts` | `implements` | `DOC:docs/blueprint/15.10.4b-OPERATIONAL-VALIDATION-REPORT-v1.0.md` | docs/blueprint/15.10.4b-OPERATIONAL-VALIDATION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0241` | `ART:src/lib/cms/writes.functions.ts` | `implements` | `DOC:docs/blueprint/15.10.4b-OPERATIONAL-VALIDATION-REPORT-v1.0.md` | docs/blueprint/15.10.4b-OPERATIONAL-VALIDATION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0242` | `ART:src/lib/concierge/concierge.functions.ts` | `implements` | `DOC:docs/blueprint/15.10.4b-OPERATIONAL-VALIDATION-REPORT-v1.0.md` | docs/blueprint/15.10.4b-OPERATIONAL-VALIDATION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0243` | `ART:src/lib/notifications/activity.functions.ts` | `implements` | `DOC:docs/blueprint/15.10.4b-OPERATIONAL-VALIDATION-REPORT-v1.0.md` | docs/blueprint/15.10.4b-OPERATIONAL-VALIDATION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0244` | `ART:src/lib/observability/observability.functions.ts` | `implements` | `DOC:docs/blueprint/15.10.4b-OPERATIONAL-VALIDATION-REPORT-v1.0.md` | docs/blueprint/15.10.4b-OPERATIONAL-VALIDATION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0245` | `ART:src/lib/portal/` | `implements` | `DOC:docs/blueprint/15.10.4b-OPERATIONAL-VALIDATION-REPORT-v1.0.md` | docs/blueprint/15.10.4b-OPERATIONAL-VALIDATION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0246` | `ART:src/lib/portal/business-catalog.functions.ts` | `implements` | `DOC:docs/blueprint/15.10.4b-OPERATIONAL-VALIDATION-REPORT-v1.0.md` | docs/blueprint/15.10.4b-OPERATIONAL-VALIDATION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0247` | `ART:src/routeTree.gen.ts` | `implements` | `DOC:docs/blueprint/15.10.4b-OPERATIONAL-VALIDATION-REPORT-v1.0.md` | docs/blueprint/15.10.4b-OPERATIONAL-VALIDATION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0248` | `ART:src/start.ts` | `implements` | `DOC:docs/blueprint/15.10.4b-OPERATIONAL-VALIDATION-REPORT-v1.0.md` | docs/blueprint/15.10.4b-OPERATIONAL-VALIDATION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0249` | `ART:src/components/experience-builder/AutoInspector.tsx` | `implements` | `DOC:docs/blueprint/15.10.4b-PHASE-2-REPORT.md` | docs/blueprint/15.10.4b-PHASE-2-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0250` | `ART:src/components/experience-builder/VariablePicker.tsx` | `implements` | `DOC:docs/blueprint/15.10.4b-PHASE-2-REPORT.md` | docs/blueprint/15.10.4b-PHASE-2-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0251` | `ART:src/lib/experience-builder/composition-renderer.tsx` | `implements` | `DOC:docs/blueprint/15.10.4b-PHASE-2-REPORT.md` | docs/blueprint/15.10.4b-PHASE-2-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0252` | `ART:src/lib/experience-builder/dynamic-variables.ts` | `implements` | `DOC:docs/blueprint/15.10.4b-PHASE-2-REPORT.md` | docs/blueprint/15.10.4b-PHASE-2-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0253` | `ART:src/routes/_authenticated/cms/experience-builder.pages.tsx` | `implements` | `DOC:docs/blueprint/15.10.4b-PHASE-2-REPORT.md` | docs/blueprint/15.10.4b-PHASE-2-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0254` | `ART:src/routes/preview.$token.tsx` | `implements` | `DOC:docs/blueprint/15.10.4b-PHASE-2-REPORT.md` | docs/blueprint/15.10.4b-PHASE-2-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0255` | `ART:src/routes/l.$slug.tsx` | `implements` | `DOC:docs/blueprint/15.10.4b-PHASE-3-REPORT.md` | docs/blueprint/15.10.4b-PHASE-3-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0256` | `ART:src/routes/preview.$token.tsx` | `implements` | `DOC:docs/blueprint/15.10.4b-PHASE-3-REPORT.md` | docs/blueprint/15.10.4b-PHASE-3-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0257` | `DOC:docs/blueprint/15.10.4b-PHASE-3-REPORT.md` | `requires` | `ART:supabase/migrations/` | docs/blueprint/15.10.4b-PHASE-3-REPORT.md § migración vinculada validada | 2026-07-21 |
| `E0258` | `ART:src/i18n/context.tsx` | `implements` | `DOC:docs/blueprint/15.10.4c-ADENDA-v1.0.md` | docs/blueprint/15.10.4c-ADENDA-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0259` | `ART:src/i18n/locales/` | `implements` | `DOC:docs/blueprint/15.10.4c-ADENDA-v1.0.md` | docs/blueprint/15.10.4c-ADENDA-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0260` | `ART:src/components/admin/cockpit-blocks.tsx` | `implements` | `DOC:docs/blueprint/15.10.4c-IMPLEMENTATION-REPORT-v1.0.md` | docs/blueprint/15.10.4c-IMPLEMENTATION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0261` | `ART:src/i18n/locales/es.json` | `implements` | `DOC:docs/blueprint/15.10.4c-IMPLEMENTATION-REPORT-v1.0.md` | docs/blueprint/15.10.4c-IMPLEMENTATION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0262` | `ART:src/i18n/locales/en.json` | `implements` | `DOC:docs/blueprint/15.10.4c-IMPLEMENTATION-REPORT-v1.0.md` | docs/blueprint/15.10.4c-IMPLEMENTATION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0263` | `ART:src/i18n/locales/pt.json` | `implements` | `DOC:docs/blueprint/15.10.4c-IMPLEMENTATION-REPORT-v1.0.md` | docs/blueprint/15.10.4c-IMPLEMENTATION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0264` | `ART:src/i18n/locales/fr.json` | `implements` | `DOC:docs/blueprint/15.10.4c-IMPLEMENTATION-REPORT-v1.0.md` | docs/blueprint/15.10.4c-IMPLEMENTATION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0265` | `ART:src/i18n/locales/it.json` | `implements` | `DOC:docs/blueprint/15.10.4c-IMPLEMENTATION-REPORT-v1.0.md` | docs/blueprint/15.10.4c-IMPLEMENTATION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0266` | `ART:src/i18n/locales/de.json` | `implements` | `DOC:docs/blueprint/15.10.4c-IMPLEMENTATION-REPORT-v1.0.md` | docs/blueprint/15.10.4c-IMPLEMENTATION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0267` | `ART:src/lib/admin/cockpit.functions.ts` | `implements` | `DOC:docs/blueprint/15.10.4c-IMPLEMENTATION-REPORT-v1.0.md` | docs/blueprint/15.10.4c-IMPLEMENTATION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0268` | `ART:src/lib/experience-builder/block-library.ts` | `implements` | `DOC:docs/blueprint/15.10.4c-IMPLEMENTATION-REPORT-v1.0.md` | docs/blueprint/15.10.4c-IMPLEMENTATION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0269` | `ART:src/lib/experience-builder/composition-renderer.tsx` | `implements` | `DOC:docs/blueprint/15.10.4c-IMPLEMENTATION-REPORT-v1.0.md` | docs/blueprint/15.10.4c-IMPLEMENTATION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0270` | `ART:src/routes/_authenticated/admin/index.tsx` | `implements` | `DOC:docs/blueprint/15.10.4c-IMPLEMENTATION-REPORT-v1.0.md` | docs/blueprint/15.10.4c-IMPLEMENTATION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0271` | `ART:src/components/experience-builder/VisualStudio.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-EXPERIENCE-BUILDER-RECOVERY-PLAN-v1.0.md` | docs/blueprint/15.10.4d-EXPERIENCE-BUILDER-RECOVERY-PLAN-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0272` | `ART:src/routes/_authenticated/cms/experience-builder.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-EXPERIENCE-BUILDER-RECOVERY-PLAN-v1.0.md` | docs/blueprint/15.10.4d-EXPERIENCE-BUILDER-RECOVERY-PLAN-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0273` | `ART:src/components/experience-builder/` | `implements` | `DOC:docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.1-AUDITORIA-INTEGRAL.md` | docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.1-AUDITORIA-INTEGRAL.md § asociación de implementación validada | 2026-07-21 |
| `E0274` | `ART:src/components/surfaces/` | `implements` | `DOC:docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.1-AUDITORIA-INTEGRAL.md` | docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.1-AUDITORIA-INTEGRAL.md § asociación de implementación validada | 2026-07-21 |
| `E0275` | `ART:src/components/surfaces/kit/types.ts` | `implements` | `DOC:docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.1-AUDITORIA-INTEGRAL.md` | docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.1-AUDITORIA-INTEGRAL.md § asociación de implementación validada | 2026-07-21 |
| `E0276` | `ART:src/lib/experience-builder/` | `implements` | `DOC:docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.1-AUDITORIA-INTEGRAL.md` | docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.1-AUDITORIA-INTEGRAL.md § asociación de implementación validada | 2026-07-21 |
| `E0277` | `ART:src/routes/index.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.1-AUDITORIA-INTEGRAL.md` | docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.1-AUDITORIA-INTEGRAL.md § asociación de implementación validada | 2026-07-21 |
| `E0278` | `ART:src/routes/l.$slug.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.1-AUDITORIA-INTEGRAL.md` | docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.1-AUDITORIA-INTEGRAL.md § asociación de implementación validada | 2026-07-21 |
| `E0279` | `ART:src/routes/p.$slug.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.1-AUDITORIA-INTEGRAL.md` | docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.1-AUDITORIA-INTEGRAL.md § asociación de implementación validada | 2026-07-21 |
| `E0280` | `ART:src/routes/producto.$slug.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.1-AUDITORIA-INTEGRAL.md` | docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.1-AUDITORIA-INTEGRAL.md § asociación de implementación validada | 2026-07-21 |
| `E0281` | `ART:src/routes/api/public/hooks/eb-process-scheduled-publish.ts` | `implements` | `DOC:docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.2-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.2-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0282` | `DOC:docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.2-COMPLETION-REPORT.md` | `requires` | `ART:supabase/migrations/` | docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.2-COMPLETION-REPORT.md § migración vinculada validada | 2026-07-21 |
| `E0283` | `ART:src/integrations/supabase/types.ts` | `implements` | `DOC:docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.3-PLAN-UNIFICACION-V1-V2.md` | docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.3-PLAN-UNIFICACION-V1-V2.md § asociación de implementación validada | 2026-07-21 |
| `E0284` | `ART:src/routes/index.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.3-PLAN-UNIFICACION-V1-V2.md` | docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.3-PLAN-UNIFICACION-V1-V2.md § asociación de implementación validada | 2026-07-21 |
| `E0285` | `ART:scripts/kit-blocks-smoke.tsx` | `demonstrates` | `DOC:docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.3-PLAN-UNIFICACION-V1-V2.md` | docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.3-PLAN-UNIFICACION-V1-V2.md § prueba/evidencia externa validada | 2026-07-21 |
| `E0286` | `ART:scripts/surface-composer-smoke.tsx` | `demonstrates` | `DOC:docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.3-PLAN-UNIFICACION-V1-V2.md` | docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.3-PLAN-UNIFICACION-V1-V2.md § prueba/evidencia externa validada | 2026-07-21 |
| `E0287` | `ART:src/routes/l.$slug.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.3a-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.3a-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0288` | `ART:src/routes/preview.$token.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.3a-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.3a-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0289` | `ART:src/routes/preview/composition.$token.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.3a-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.3a-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0290` | `ART:scripts/assert-no-v2-imports.sh` | `demonstrates` | `DOC:docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.3a-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.3a-COMPLETION-REPORT.md § prueba/evidencia externa validada | 2026-07-21 |
| `E0291` | `ART:src/routes/l.$slug.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.3a.1-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.3a.1-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0292` | `ART:src/routes/preview.$token.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.3a.1-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.3a.1-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0293` | `ART:scripts/assert-no-v2-imports.sh` | `demonstrates` | `DOC:docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.3a.1-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.3a.1-COMPLETION-REPORT.md § prueba/evidencia externa validada | 2026-07-21 |
| `E0294` | `ART:scripts/assert-no-v2-imports.sh` | `demonstrates` | `DOC:docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.3b-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-INICIATIVA-3-FASE-3.3b-COMPLETION-REPORT.md § prueba/evidencia externa validada | 2026-07-21 |
| `E0295` | `ART:src/components/experience-builder/AutoInspector.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-SINGLE-STUDIO-PRINCIPLE-v1.0.md` | docs/blueprint/15.10.4d-SINGLE-STUDIO-PRINCIPLE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0296` | `ART:src/lib/workspace/definitions/index.ts` | `implements` | `DOC:docs/blueprint/15.10.4d-SINGLE-STUDIO-PRINCIPLE-v1.0.md` | docs/blueprint/15.10.4d-SINGLE-STUDIO-PRINCIPLE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0297` | `ART:src/routes/_authenticated/cms/experience-builder.pages.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-SINGLE-STUDIO-PRINCIPLE-v1.0.md` | docs/blueprint/15.10.4d-SINGLE-STUDIO-PRINCIPLE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0298` | `ART:src/routes/_authenticated/cms/experience-builder.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-SINGLE-STUDIO-PRINCIPLE-v1.0.md` | docs/blueprint/15.10.4d-SINGLE-STUDIO-PRINCIPLE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0299` | `ART:src/components/discovery/PublicShell.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-SPRINT-PLAN-v1.0.md` | docs/blueprint/15.10.4d-SPRINT-PLAN-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0300` | `ART:src/components/home/` | `implements` | `DOC:docs/blueprint/15.10.4d-SPRINT-PLAN-v1.0.md` | docs/blueprint/15.10.4d-SPRINT-PLAN-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0301` | `ART:src/components/home/Hero.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-SPRINT-PLAN-v1.0.md` | docs/blueprint/15.10.4d-SPRINT-PLAN-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0302` | `ART:src/lib/experience-builder/block-library.ts` | `implements` | `DOC:docs/blueprint/15.10.4d-SPRINT-PLAN-v1.0.md` | docs/blueprint/15.10.4d-SPRINT-PLAN-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0303` | `ART:src/routes/index.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-SPRINT-PLAN-v1.0.md` | docs/blueprint/15.10.4d-SPRINT-PLAN-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0304` | `ART:src/components/home/Hero.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-US-01-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-01-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0305` | `ART:src/lib/experience-builder/block-library.ts` | `implements` | `DOC:docs/blueprint/15.10.4d-US-01-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-01-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0306` | `ART:src/lib/experience-builder/composition-renderer.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-US-01-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-01-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0307` | `ART:src/routes/_authenticated/cms/index.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-US-01-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-01-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0308` | `ART:src/lib/experience-builder/page-kind-registry.ts` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R1-UNIFIED-MODEL-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R1-UNIFIED-MODEL-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0309` | `ART:src/components/experience-builder/PagesPanel.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R2-PAGES-PANEL-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R2-PAGES-PANEL-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0310` | `ART:src/lib/experience-builder/studio.functions.ts` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R2-PAGES-PANEL-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R2-PAGES-PANEL-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0311` | `ART:src/lib/experience-builder/eb-redirects.functions.ts` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-OLA0-MOTOR-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-OLA0-MOTOR-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0312` | `ART:src/lib/experience-builder/eb-route-resolver.functions.ts` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-OLA0-MOTOR-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-OLA0-MOTOR-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0313` | `ART:src/components/surfaces/AluxSurface.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-OLA1-SINGLETONS-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-OLA1-SINGLETONS-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0314` | `ART:src/components/surfaces/MarketplaceSurface.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-OLA1-SINGLETONS-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-OLA1-SINGLETONS-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0315` | `ART:src/components/surfaces/TripPlannerSurface.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-OLA1-SINGLETONS-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-OLA1-SINGLETONS-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0316` | `ART:src/components/surfaces/` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-OLA2-DYNAMIC-SURFACES-RECONCILIATION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-OLA2-DYNAMIC-SURFACES-RECONCILIATION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0317` | `ART:src/config/regions.ts` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-OLA2-DYNAMIC-SURFACES-RECONCILIATION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-OLA2-DYNAMIC-SURFACES-RECONCILIATION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0318` | `ART:src/components/surfaces/DestinationSurface.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-OLA2-SUBOLA-2.1-REGION-DESTINATION-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-OLA2-SUBOLA-2.1-REGION-DESTINATION-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0319` | `ART:src/components/surfaces/RegionSurface.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-OLA2-SUBOLA-2.1-REGION-DESTINATION-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-OLA2-SUBOLA-2.1-REGION-DESTINATION-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0320` | `ART:src/lib/experience-builder/block-contract.ts` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-OLA2-SUBOLA-2.1-REGION-DESTINATION-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-OLA2-SUBOLA-2.1-REGION-DESTINATION-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0321` | `ART:src/lib/experience-builder/block-library.ts` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-OLA2-SUBOLA-2.1-REGION-DESTINATION-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-OLA2-SUBOLA-2.1-REGION-DESTINATION-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0322` | `ART:src/lib/experience-builder/composition-renderer.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-OLA2-SUBOLA-2.1-REGION-DESTINATION-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-OLA2-SUBOLA-2.1-REGION-DESTINATION-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0323` | `ART:src/lib/experience-builder/page-kind-registry.ts` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-OLA2-SUBOLA-2.1-REGION-DESTINATION-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-OLA2-SUBOLA-2.1-REGION-DESTINATION-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0324` | `ART:src/routes/oriente-maya/$destino.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-OLA2-SUBOLA-2.1-REGION-DESTINATION-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-OLA2-SUBOLA-2.1-REGION-DESTINATION-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0325` | `ART:src/routes/oriente-maya/index.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-OLA2-SUBOLA-2.1-REGION-DESTINATION-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-OLA2-SUBOLA-2.1-REGION-DESTINATION-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0326` | `ART:src/lib/experience-builder/eb-sitemap.functions.ts` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-PUBLIC-SURFACES-RECONCILIATION-v1.0.md` | docs/blueprint/15.10.4d-US-R3-PUBLIC-SURFACES-RECONCILIATION-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0327` | `ART:src/routes/index.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-PUBLIC-SURFACES-RECONCILIATION-v1.0.md` | docs/blueprint/15.10.4d-US-R3-PUBLIC-SURFACES-RECONCILIATION-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0328` | `ART:src/routes/sitemap[.]xml.ts` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-PUBLIC-SURFACES-RECONCILIATION-v1.0.md` | docs/blueprint/15.10.4d-US-R3-PUBLIC-SURFACES-RECONCILIATION-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0329` | `ART:src/components/experience-builder/VisualStudio.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.2c-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.2c-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0330` | `ART:src/components/surfaces/business-blocks.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.2c-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.2c-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0331` | `ART:src/lib/experience-builder/preview-registry.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.2c-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.2c-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0332` | `ART:src/lib/experience-builder/page-kind-registry.ts` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.2c-PREVIEW-REGISTRY-GUIDE.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.2c-PREVIEW-REGISTRY-GUIDE.md § asociación de implementación validada | 2026-07-21 |
| `E0333` | `ART:src/lib/experience-builder/preview-registry.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.2c-PREVIEW-REGISTRY-GUIDE.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.2c-PREVIEW-REGISTRY-GUIDE.md § asociación de implementación validada | 2026-07-21 |
| `E0334` | `ART:src/routes/producto.$slug.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.3-PRODUCT-AUDIT.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.3-PRODUCT-AUDIT.md § asociación de implementación validada | 2026-07-21 |
| `E0335` | `ART:src/components/surfaces/ProductSurface.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.3a-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.3a-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0336` | `ART:src/components/surfaces/product-blocks.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.3a-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.3a-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0337` | `ART:src/lib/experience-builder/block-library.ts` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.3a-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.3a-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0338` | `ART:src/lib/experience-builder/composition-renderer.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.3a-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.3a-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0339` | `ART:src/lib/experience-builder/layout-engine.ts` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.3a-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.3a-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0340` | `ART:src/lib/experience-builder/page-kind-registry.ts` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.3a-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.3a-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0341` | `ART:src/lib/experience-builder/preview-registry.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.3a-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.3a-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0342` | `ART:src/routes/producto.$slug.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.3a-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.3a-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0343` | `ART:src/lib/cms/products-media.functions.ts` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.4-PORTAL-PRODUCTS-AUDIT.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.4-PORTAL-PRODUCTS-AUDIT.md § asociación de implementación validada | 2026-07-21 |
| `E0344` | `ART:src/lib/portal/business-catalog.functions.ts` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.4-PORTAL-PRODUCTS-AUDIT.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.4-PORTAL-PRODUCTS-AUDIT.md § asociación de implementación validada | 2026-07-21 |
| `E0345` | `ART:src/lib/portal/portal-product-media.functions.ts` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.4-PORTAL-PRODUCTS-AUDIT.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.4-PORTAL-PRODUCTS-AUDIT.md § asociación de implementación validada | 2026-07-21 |
| `E0346` | `ART:src/routes/_authenticated/portal/catalogo.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.4-PORTAL-PRODUCTS-AUDIT.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.4-PORTAL-PRODUCTS-AUDIT.md § asociación de implementación validada | 2026-07-21 |
| `E0347` | `ART:src/components/portal/ProductAdvancedPanel.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.4a-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.4a-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0348` | `ART:src/lib/portal/portal-product-faqs.functions.ts` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.4a-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.4a-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0349` | `ART:src/lib/portal/portal-product-media.functions.ts` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.4a-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.4a-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0350` | `ART:src/lib/portal/portal-product-publish.functions.ts` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.4a-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.4a-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0351` | `ART:src/lib/portal/publish-validators.ts` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.4a-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.4a-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0352` | `ART:src/routes/_authenticated/portal/catalogo.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.4a-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.4a-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0353` | `ART:src/routes/_authenticated/portal/productos.$productId.preview.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.4a-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.4a-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0354` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.4a-COMPLETION-REPORT.md` | `requires` | `ART:supabase/migrations/` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.4a-COMPLETION-REPORT.md § migración vinculada validada | 2026-07-21 |
| `E0355` | `ART:src/components/surfaces/business-blocks.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.5-SURFACE-KIT-FOUNDATION.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.5-SURFACE-KIT-FOUNDATION.md § asociación de implementación validada | 2026-07-21 |
| `E0356` | `ART:src/components/surfaces/kit/` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.5-SURFACE-KIT-FOUNDATION.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.5-SURFACE-KIT-FOUNDATION.md § asociación de implementación validada | 2026-07-21 |
| `E0357` | `ART:src/components/surfaces/product-blocks.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.5-SURFACE-KIT-FOUNDATION.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.5-SURFACE-KIT-FOUNDATION.md § asociación de implementación validada | 2026-07-21 |
| `E0358` | `ART:src/components/surfaces/kit/` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.5a-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.5a-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0359` | `ART:src/components/surfaces/product-blocks.legacy.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.5b-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.5b-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0360` | `ART:src/components/surfaces/product-blocks.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.5b-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.5b-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0361` | `ART:src/components/surfaces/product/product-to-kit-vm.ts` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.5b-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.5b-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0362` | `ART:src/components/surfaces/business-blocks.legacy.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.5c-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.5c-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0363` | `ART:src/components/surfaces/business-blocks.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.5c-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.5c-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0364` | `ART:src/components/surfaces/business/business-to-kit-vm.ts` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.5c-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.5c-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0365` | `ART:src/lib/experience-builder/block-library.ts` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.5d-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.5d-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0366` | `ART:src/lib/experience-builder/composition-renderer.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.5d-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.5d-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0367` | `ART:src/lib/experience-builder/kit-blocks.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.5d-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.5d-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0368` | `ART:scripts/kit-blocks-smoke.tsx` | `demonstrates` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.5d-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.5d-COMPLETION-REPORT.md § prueba/evidencia externa validada | 2026-07-21 |
| `E0369` | `ART:src/lib/experience-builder/kit-seeds.ts` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.6-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.6-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0370` | `ART:src/lib/experience-builder/surface-composer.ts` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.6-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.6-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0371` | `ART:scripts/surface-composer-smoke.tsx` | `demonstrates` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.6-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.6-COMPLETION-REPORT.md § prueba/evidencia externa validada | 2026-07-21 |
| `E0372` | `ART:src/components/experience-builder/PagesPanel.tsx` | `implements` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.6b-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.6b-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0373` | `ART:scripts/kit-blocks-smoke.tsx` | `demonstrates` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.6b-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.6b-COMPLETION-REPORT.md § prueba/evidencia externa validada | 2026-07-21 |
| `E0374` | `ART:scripts/surface-composer-smoke.tsx` | `demonstrates` | `DOC:docs/blueprint/15.10.4d-US-R3-SUBOLA-2.6b-COMPLETION-REPORT.md` | docs/blueprint/15.10.4d-US-R3-SUBOLA-2.6b-COMPLETION-REPORT.md § prueba/evidencia externa validada | 2026-07-21 |
| `E0375` | `ART:src/components/surfaces/kit/` | `implements` | `DOC:docs/blueprint/15.10.5-INICIATIVA-5-RECONCILIATION-AUDIT-v1.0.md` | docs/blueprint/15.10.5-INICIATIVA-5-RECONCILIATION-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0376` | `ART:src/styles.css` | `implements` | `DOC:docs/blueprint/15.10.5-WORKSPACE-UX-PROPOSAL-v1.0.md` | docs/blueprint/15.10.5-WORKSPACE-UX-PROPOSAL-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0377` | `ART:src/components/workspace/` | `implements` | `DOC:docs/blueprint/15.10.5a-WORKSPACE-FOUNDATIONS.md` | docs/blueprint/15.10.5a-WORKSPACE-FOUNDATIONS.md § asociación de implementación validada | 2026-07-21 |
| `E0378` | `ART:src/lib/workspace/alux-registry.ts` | `implements` | `DOC:docs/blueprint/15.10.5a-WORKSPACE-FOUNDATIONS.md` | docs/blueprint/15.10.5a-WORKSPACE-FOUNDATIONS.md § asociación de implementación validada | 2026-07-21 |
| `E0379` | `ART:src/lib/workspace/navigation-registry.ts` | `implements` | `DOC:docs/blueprint/15.10.5a-WORKSPACE-FOUNDATIONS.md` | docs/blueprint/15.10.5a-WORKSPACE-FOUNDATIONS.md § asociación de implementación validada | 2026-07-21 |
| `E0380` | `ART:src/lib/workspace/types.ts` | `implements` | `DOC:docs/blueprint/15.10.5a-WORKSPACE-FOUNDATIONS.md` | docs/blueprint/15.10.5a-WORKSPACE-FOUNDATIONS.md § asociación de implementación validada | 2026-07-21 |
| `E0381` | `ART:src/styles.css` | `implements` | `DOC:docs/blueprint/15.10.5a-WORKSPACE-FOUNDATIONS.md` | docs/blueprint/15.10.5a-WORKSPACE-FOUNDATIONS.md § asociación de implementación validada | 2026-07-21 |
| `E0382` | `ART:src/components/workspace` | `implements` | `DOC:docs/blueprint/15.10.5b-CONTEXTUAL-LAYER.md` | docs/blueprint/15.10.5b-CONTEXTUAL-LAYER.md § asociación de implementación validada | 2026-07-21 |
| `E0383` | `ART:src/components/workspace/inspector/registry.ts` | `implements` | `DOC:docs/blueprint/15.10.5b-CONTEXTUAL-LAYER.md` | docs/blueprint/15.10.5b-CONTEXTUAL-LAYER.md § asociación de implementación validada | 2026-07-21 |
| `E0384` | `ART:src/lib/workspace/context-registry.ts` | `implements` | `DOC:docs/blueprint/15.10.5b-CONTEXTUAL-LAYER.md` | docs/blueprint/15.10.5b-CONTEXTUAL-LAYER.md § asociación de implementación validada | 2026-07-21 |
| `E0385` | `ART:src/lib/workspace/toast-bus.ts` | `implements` | `DOC:docs/blueprint/15.10.5b-CONTEXTUAL-LAYER.md` | docs/blueprint/15.10.5b-CONTEXTUAL-LAYER.md § asociación de implementación validada | 2026-07-21 |
| `E0386` | `ART:src/lib/workspace/types.ts` | `implements` | `DOC:docs/blueprint/15.10.5b-CONTEXTUAL-LAYER.md` | docs/blueprint/15.10.5b-CONTEXTUAL-LAYER.md § asociación de implementación validada | 2026-07-21 |
| `E0387` | `ART:src/components/workspace/` | `implements` | `DOC:docs/blueprint/15.10.5c-WORKSPACE-MIGRATION-BLUEPRINT.md` | docs/blueprint/15.10.5c-WORKSPACE-MIGRATION-BLUEPRINT.md § asociación de implementación validada | 2026-07-21 |
| `E0388` | `ART:src/routes/_authenticated/admin/` | `implements` | `DOC:docs/blueprint/15.10.5c-WORKSPACE-MIGRATION-BLUEPRINT.md` | docs/blueprint/15.10.5c-WORKSPACE-MIGRATION-BLUEPRINT.md § asociación de implementación validada | 2026-07-21 |
| `E0389` | `ART:src/routes/_authenticated/cms/` | `implements` | `DOC:docs/blueprint/15.10.5c-WORKSPACE-MIGRATION-BLUEPRINT.md` | docs/blueprint/15.10.5c-WORKSPACE-MIGRATION-BLUEPRINT.md § asociación de implementación validada | 2026-07-21 |
| `E0390` | `ART:src/routes/_authenticated/concierge` | `implements` | `DOC:docs/blueprint/15.10.5c-WORKSPACE-MIGRATION-BLUEPRINT.md` | docs/blueprint/15.10.5c-WORKSPACE-MIGRATION-BLUEPRINT.md § asociación de implementación validada | 2026-07-21 |
| `E0391` | `ART:src/routes/_authenticated/cuenta/` | `implements` | `DOC:docs/blueprint/15.10.5c-WORKSPACE-MIGRATION-BLUEPRINT.md` | docs/blueprint/15.10.5c-WORKSPACE-MIGRATION-BLUEPRINT.md § asociación de implementación validada | 2026-07-21 |
| `E0392` | `ART:src/routes/_authenticated/portal/` | `implements` | `DOC:docs/blueprint/15.10.5c-WORKSPACE-MIGRATION-BLUEPRINT.md` | docs/blueprint/15.10.5c-WORKSPACE-MIGRATION-BLUEPRINT.md § asociación de implementación validada | 2026-07-21 |
| `E0393` | `ART:src/components/workspace/WorkspaceProvider.tsx` | `implements` | `DOC:docs/blueprint/15.10.5c.1-CUENTA-MIGRATION.md` | docs/blueprint/15.10.5c.1-CUENTA-MIGRATION.md § asociación de implementación validada | 2026-07-21 |
| `E0394` | `ART:src/lib/workspace/definitions/index.ts` | `implements` | `DOC:docs/blueprint/15.10.5c.1-CUENTA-MIGRATION.md` | docs/blueprint/15.10.5c.1-CUENTA-MIGRATION.md § asociación de implementación validada | 2026-07-21 |
| `E0395` | `ART:src/routes/_authenticated/cuenta/route.tsx` | `implements` | `DOC:docs/blueprint/15.10.5c.1-CUENTA-MIGRATION.md` | docs/blueprint/15.10.5c.1-CUENTA-MIGRATION.md § asociación de implementación validada | 2026-07-21 |
| `E0396` | `ART:src/lib/workspace/definitions/index.ts` | `implements` | `DOC:docs/blueprint/15.10.5c.2-CONCIERGE-MIGRATION.md` | docs/blueprint/15.10.5c.2-CONCIERGE-MIGRATION.md § asociación de implementación validada | 2026-07-21 |
| `E0397` | `ART:src/routes/_authenticated/concierge/expedientes.$caseId.tsx` | `implements` | `DOC:docs/blueprint/15.10.5c.2-CONCIERGE-MIGRATION.md` | docs/blueprint/15.10.5c.2-CONCIERGE-MIGRATION.md § asociación de implementación validada | 2026-07-21 |
| `E0398` | `ART:src/routes/_authenticated/concierge/index.tsx` | `implements` | `DOC:docs/blueprint/15.10.5c.2-CONCIERGE-MIGRATION.md` | docs/blueprint/15.10.5c.2-CONCIERGE-MIGRATION.md § asociación de implementación validada | 2026-07-21 |
| `E0399` | `ART:src/routes/_authenticated/concierge/route.tsx` | `implements` | `DOC:docs/blueprint/15.10.5c.2-CONCIERGE-MIGRATION.md` | docs/blueprint/15.10.5c.2-CONCIERGE-MIGRATION.md § asociación de implementación validada | 2026-07-21 |
| `E0400` | `ART:src/lib/workspace/definitions/index.ts` | `implements` | `DOC:docs/blueprint/15.10.5c.3-PORTAL-MIGRATION.md` | docs/blueprint/15.10.5c.3-PORTAL-MIGRATION.md § asociación de implementación validada | 2026-07-21 |
| `E0401` | `ART:src/routes/_authenticated/portal/route.tsx` | `implements` | `DOC:docs/blueprint/15.10.5c.3-PORTAL-MIGRATION.md` | docs/blueprint/15.10.5c.3-PORTAL-MIGRATION.md § asociación de implementación validada | 2026-07-21 |
| `E0402` | `ART:src/lib/workspace/definitions/index.ts` | `implements` | `DOC:docs/blueprint/15.10.5c.4-CMS-MIGRATION.md` | docs/blueprint/15.10.5c.4-CMS-MIGRATION.md § asociación de implementación validada | 2026-07-21 |
| `E0403` | `ART:src/routes/_authenticated/cms.tsx` | `implements` | `DOC:docs/blueprint/15.10.5c.4-CMS-MIGRATION.md` | docs/blueprint/15.10.5c.4-CMS-MIGRATION.md § asociación de implementación validada | 2026-07-21 |
| `E0404` | `ART:src/lib/workspace/definitions/index.ts` | `implements` | `DOC:docs/blueprint/15.10.5c.5-FOUNDER-MIGRATION.md` | docs/blueprint/15.10.5c.5-FOUNDER-MIGRATION.md § asociación de implementación validada | 2026-07-21 |
| `E0405` | `ART:src/routes/_authenticated/admin/route.tsx` | `implements` | `DOC:docs/blueprint/15.10.5c.5-FOUNDER-MIGRATION.md` | docs/blueprint/15.10.5c.5-FOUNDER-MIGRATION.md § asociación de implementación validada | 2026-07-21 |
| `E0406` | `ART:src/styles.css` | `implements` | `DOC:docs/blueprint/15.10.5d-DISCOVERY-COMPLETION-REPORT.md` | docs/blueprint/15.10.5d-DISCOVERY-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0407` | `ART:src/components/discovery/` | `implements` | `DOC:docs/blueprint/15.10.5d-DISCOVERY-LAYER-BLUEPRINT.md` | docs/blueprint/15.10.5d-DISCOVERY-LAYER-BLUEPRINT.md § asociación de implementación validada | 2026-07-21 |
| `E0408` | `ART:src/lib/discovery/` | `implements` | `DOC:docs/blueprint/15.10.5d-DISCOVERY-LAYER-BLUEPRINT.md` | docs/blueprint/15.10.5d-DISCOVERY-LAYER-BLUEPRINT.md § asociación de implementación validada | 2026-07-21 |
| `E0409` | `ART:src/lib/discovery/cards-registry.ts` | `implements` | `DOC:docs/blueprint/15.10.5d-DISCOVERY-LAYER-BLUEPRINT.md` | docs/blueprint/15.10.5d-DISCOVERY-LAYER-BLUEPRINT.md § asociación de implementación validada | 2026-07-21 |
| `E0410` | `ART:src/lib/discovery/seo.ts` | `implements` | `DOC:docs/blueprint/15.10.5d-DISCOVERY-LAYER-BLUEPRINT.md` | docs/blueprint/15.10.5d-DISCOVERY-LAYER-BLUEPRINT.md § asociación de implementación validada | 2026-07-21 |
| `E0411` | `ART:src/components/discovery/` | `implements` | `DOC:docs/blueprint/15.10.5d.1-PUBLIC-SHELL.md` | docs/blueprint/15.10.5d.1-PUBLIC-SHELL.md § asociación de implementación validada | 2026-07-21 |
| `E0412` | `ART:src/components/discovery/PublicFooter.tsx` | `implements` | `DOC:docs/blueprint/15.10.5d.1-PUBLIC-SHELL.md` | docs/blueprint/15.10.5d.1-PUBLIC-SHELL.md § asociación de implementación validada | 2026-07-21 |
| `E0413` | `ART:src/components/discovery/PublicHeader.tsx` | `implements` | `DOC:docs/blueprint/15.10.5d.1-PUBLIC-SHELL.md` | docs/blueprint/15.10.5d.1-PUBLIC-SHELL.md § asociación de implementación validada | 2026-07-21 |
| `E0414` | `ART:src/components/discovery/PublicShell.tsx` | `implements` | `DOC:docs/blueprint/15.10.5d.1-PUBLIC-SHELL.md` | docs/blueprint/15.10.5d.1-PUBLIC-SHELL.md § asociación de implementación validada | 2026-07-21 |
| `E0415` | `ART:src/components/discovery/index.ts` | `implements` | `DOC:docs/blueprint/15.10.5d.1-PUBLIC-SHELL.md` | docs/blueprint/15.10.5d.1-PUBLIC-SHELL.md § asociación de implementación validada | 2026-07-21 |
| `E0416` | `ART:src/lib/discovery/` | `implements` | `DOC:docs/blueprint/15.10.5d.1-PUBLIC-SHELL.md` | docs/blueprint/15.10.5d.1-PUBLIC-SHELL.md § asociación de implementación validada | 2026-07-21 |
| `E0417` | `ART:src/lib/discovery/index.ts` | `implements` | `DOC:docs/blueprint/15.10.5d.1-PUBLIC-SHELL.md` | docs/blueprint/15.10.5d.1-PUBLIC-SHELL.md § asociación de implementación validada | 2026-07-21 |
| `E0418` | `ART:src/lib/discovery/seo.ts` | `implements` | `DOC:docs/blueprint/15.10.5d.1-PUBLIC-SHELL.md` | docs/blueprint/15.10.5d.1-PUBLIC-SHELL.md § asociación de implementación validada | 2026-07-21 |
| `E0419` | `ART:src/routes/__root.tsx` | `implements` | `DOC:docs/blueprint/15.10.5d.1-PUBLIC-SHELL.md` | docs/blueprint/15.10.5d.1-PUBLIC-SHELL.md § asociación de implementación validada | 2026-07-21 |
| `E0420` | `ART:src/styles.css` | `implements` | `DOC:docs/blueprint/15.10.5d.1-PUBLIC-SHELL.md` | docs/blueprint/15.10.5d.1-PUBLIC-SHELL.md § asociación de implementación validada | 2026-07-21 |
| `E0421` | `ART:src/components/cards/CategoriaCard.tsx` | `implements` | `DOC:docs/blueprint/15.10.5d.2-CARDS-SECTIONS-REGISTRY.md` | docs/blueprint/15.10.5d.2-CARDS-SECTIONS-REGISTRY.md § asociación de implementación validada | 2026-07-21 |
| `E0422` | `ART:src/components/cards/DestinoCard.tsx` | `implements` | `DOC:docs/blueprint/15.10.5d.2-CARDS-SECTIONS-REGISTRY.md` | docs/blueprint/15.10.5d.2-CARDS-SECTIONS-REGISTRY.md § asociación de implementación validada | 2026-07-21 |
| `E0423` | `ART:src/components/cards/EmpresaCard.tsx` | `implements` | `DOC:docs/blueprint/15.10.5d.2-CARDS-SECTIONS-REGISTRY.md` | docs/blueprint/15.10.5d.2-CARDS-SECTIONS-REGISTRY.md § asociación de implementación validada | 2026-07-21 |
| `E0424` | `ART:src/components/cards/ResenaCard.tsx` | `implements` | `DOC:docs/blueprint/15.10.5d.2-CARDS-SECTIONS-REGISTRY.md` | docs/blueprint/15.10.5d.2-CARDS-SECTIONS-REGISTRY.md § asociación de implementación validada | 2026-07-21 |
| `E0425` | `ART:src/components/cards/RutaCard.tsx` | `implements` | `DOC:docs/blueprint/15.10.5d.2-CARDS-SECTIONS-REGISTRY.md` | docs/blueprint/15.10.5d.2-CARDS-SECTIONS-REGISTRY.md § asociación de implementación validada | 2026-07-21 |
| `E0426` | `ART:src/components/home/ArmaTuViajeSection.tsx` | `implements` | `DOC:docs/blueprint/15.10.5d.2-CARDS-SECTIONS-REGISTRY.md` | docs/blueprint/15.10.5d.2-CARDS-SECTIONS-REGISTRY.md § asociación de implementación validada | 2026-07-21 |
| `E0427` | `ART:src/components/home/CategoriasSection.tsx` | `implements` | `DOC:docs/blueprint/15.10.5d.2-CARDS-SECTIONS-REGISTRY.md` | docs/blueprint/15.10.5d.2-CARDS-SECTIONS-REGISTRY.md § asociación de implementación validada | 2026-07-21 |
| `E0428` | `ART:src/components/home/ConsejoAluxSection.tsx` | `implements` | `DOC:docs/blueprint/15.10.5d.2-CARDS-SECTIONS-REGISTRY.md` | docs/blueprint/15.10.5d.2-CARDS-SECTIONS-REGISTRY.md § asociación de implementación validada | 2026-07-21 |
| `E0429` | `ART:src/components/home/DestinosSection.tsx` | `implements` | `DOC:docs/blueprint/15.10.5d.2-CARDS-SECTIONS-REGISTRY.md` | docs/blueprint/15.10.5d.2-CARDS-SECTIONS-REGISTRY.md § asociación de implementación validada | 2026-07-21 |
| `E0430` | `ART:src/components/home/EmpresasSection.tsx` | `implements` | `DOC:docs/blueprint/15.10.5d.2-CARDS-SECTIONS-REGISTRY.md` | docs/blueprint/15.10.5d.2-CARDS-SECTIONS-REGISTRY.md § asociación de implementación validada | 2026-07-21 |
| `E0431` | `ART:src/components/home/EnVivoSection.tsx` | `implements` | `DOC:docs/blueprint/15.10.5d.2-CARDS-SECTIONS-REGISTRY.md` | docs/blueprint/15.10.5d.2-CARDS-SECTIONS-REGISTRY.md § asociación de implementación validada | 2026-07-21 |
| `E0432` | `ART:src/components/home/Hero.tsx` | `implements` | `DOC:docs/blueprint/15.10.5d.2-CARDS-SECTIONS-REGISTRY.md` | docs/blueprint/15.10.5d.2-CARDS-SECTIONS-REGISTRY.md § asociación de implementación validada | 2026-07-21 |
| `E0433` | `ART:src/components/home/ResenasSection.tsx` | `implements` | `DOC:docs/blueprint/15.10.5d.2-CARDS-SECTIONS-REGISTRY.md` | docs/blueprint/15.10.5d.2-CARDS-SECTIONS-REGISTRY.md § asociación de implementación validada | 2026-07-21 |
| `E0434` | `ART:src/components/home/RutasSection.tsx` | `implements` | `DOC:docs/blueprint/15.10.5d.2-CARDS-SECTIONS-REGISTRY.md` | docs/blueprint/15.10.5d.2-CARDS-SECTIONS-REGISTRY.md § asociación de implementación validada | 2026-07-21 |
| `E0435` | `ART:src/lib/discovery/cards-registry.ts` | `implements` | `DOC:docs/blueprint/15.10.5d.2-CARDS-SECTIONS-REGISTRY.md` | docs/blueprint/15.10.5d.2-CARDS-SECTIONS-REGISTRY.md § asociación de implementación validada | 2026-07-21 |
| `E0436` | `ART:src/lib/discovery/index.ts` | `implements` | `DOC:docs/blueprint/15.10.5d.2-CARDS-SECTIONS-REGISTRY.md` | docs/blueprint/15.10.5d.2-CARDS-SECTIONS-REGISTRY.md § asociación de implementación validada | 2026-07-21 |
| `E0437` | `ART:src/lib/discovery/sections-registry.ts` | `implements` | `DOC:docs/blueprint/15.10.5d.2-CARDS-SECTIONS-REGISTRY.md` | docs/blueprint/15.10.5d.2-CARDS-SECTIONS-REGISTRY.md § asociación de implementación validada | 2026-07-21 |
| `E0438` | `ART:src/pwa/register-sw.ts` | `implements` | `DOC:docs/blueprint/15.10.6-PWA-OFFLINE-INSTALLABILITY-BLUEPRINT.md` | docs/blueprint/15.10.6-PWA-OFFLINE-INSTALLABILITY-BLUEPRINT.md § asociación de implementación validada | 2026-07-21 |
| `E0439` | `ART:src/pwa/register-sw.ts` | `implements` | `DOC:docs/blueprint/15.10.6.1-SERVICE-WORKER-BASE.md` | docs/blueprint/15.10.6.1-SERVICE-WORKER-BASE.md § asociación de implementación validada | 2026-07-21 |
| `E0440` | `ART:src/components/discovery/OfflineBanner.tsx` | `implements` | `DOC:docs/blueprint/15.10.6.2-OFFLINE-FIRST.md` | docs/blueprint/15.10.6.2-OFFLINE-FIRST.md § asociación de implementación validada | 2026-07-21 |
| `E0441` | `ART:src/components/discovery/index.ts` | `implements` | `DOC:docs/blueprint/15.10.6.2-OFFLINE-FIRST.md` | docs/blueprint/15.10.6.2-OFFLINE-FIRST.md § asociación de implementación validada | 2026-07-21 |
| `E0442` | `ART:src/routes/__root.tsx` | `implements` | `DOC:docs/blueprint/15.10.6.2-OFFLINE-FIRST.md` | docs/blueprint/15.10.6.2-OFFLINE-FIRST.md § asociación de implementación validada | 2026-07-21 |
| `E0443` | `ART:src/routes/offline.tsx` | `implements` | `DOC:docs/blueprint/15.10.6.2-OFFLINE-FIRST.md` | docs/blueprint/15.10.6.2-OFFLINE-FIRST.md § asociación de implementación validada | 2026-07-21 |
| `E0447` | `ART:src/components/discovery/SyncStatusBanner.tsx` | `implements` | `DOC:docs/blueprint/15.10.6.3-SYNC-QUEUE.md` | docs/blueprint/15.10.6.3-SYNC-QUEUE.md § asociación de implementación validada | 2026-07-21 |
| `E0445` | `ART:src/components/discovery/index.ts` | `implements` | `DOC:docs/blueprint/15.10.6.3-SYNC-QUEUE.md` | docs/blueprint/15.10.6.3-SYNC-QUEUE.md § asociación de implementación validada | 2026-07-21 |
| `E0446` | `ART:src/pwa/sync-queue.ts` | `implements` | `DOC:docs/blueprint/15.10.6.3-SYNC-QUEUE.md` | docs/blueprint/15.10.6.3-SYNC-QUEUE.md § asociación de implementación validada | 2026-07-21 |
| `E0447` | `ART:src/pwa/sync-runner.ts` | `implements` | `DOC:docs/blueprint/15.10.6.3-SYNC-QUEUE.md` | docs/blueprint/15.10.6.3-SYNC-QUEUE.md § asociación de implementación validada | 2026-07-21 |
| `E0448` | `ART:src/routes/__root.tsx` | `implements` | `DOC:docs/blueprint/15.10.6.3-SYNC-QUEUE.md` | docs/blueprint/15.10.6.3-SYNC-QUEUE.md § asociación de implementación validada | 2026-07-21 |
| `E0449` | `ART:public/push-sw.js` | `implements` | `DOC:docs/blueprint/15.10.6.4-PUSH-NOTIFICATIONS.md` | docs/blueprint/15.10.6.4-PUSH-NOTIFICATIONS.md § asociación de implementación validada | 2026-07-21 |
| `E0450` | `ART:src/pwa/push.ts` | `implements` | `DOC:docs/blueprint/15.10.6.4-PUSH-NOTIFICATIONS.md` | docs/blueprint/15.10.6.4-PUSH-NOTIFICATIONS.md § asociación de implementación validada | 2026-07-21 |
| `E0451` | `ART:public/pwa-skipwaiting.js` | `implements` | `DOC:docs/blueprint/15.10.6.5-UPDATE-LIFECYCLE.md` | docs/blueprint/15.10.6.5-UPDATE-LIFECYCLE.md § asociación de implementación validada | 2026-07-21 |
| `E0452` | `ART:src/components/discovery/UpdateBanner.tsx` | `implements` | `DOC:docs/blueprint/15.10.6.5-UPDATE-LIFECYCLE.md` | docs/blueprint/15.10.6.5-UPDATE-LIFECYCLE.md § asociación de implementación validada | 2026-07-21 |
| `E0453` | `ART:src/components/discovery/index.ts` | `implements` | `DOC:docs/blueprint/15.10.6.5-UPDATE-LIFECYCLE.md` | docs/blueprint/15.10.6.5-UPDATE-LIFECYCLE.md § asociación de implementación validada | 2026-07-21 |
| `E0454` | `ART:src/pwa/register-sw.ts` | `implements` | `DOC:docs/blueprint/15.10.6.5-UPDATE-LIFECYCLE.md` | docs/blueprint/15.10.6.5-UPDATE-LIFECYCLE.md § asociación de implementación validada | 2026-07-21 |
| `E0455` | `ART:src/routes/__root.tsx` | `implements` | `DOC:docs/blueprint/15.10.6.5-UPDATE-LIFECYCLE.md` | docs/blueprint/15.10.6.5-UPDATE-LIFECYCLE.md § asociación de implementación validada | 2026-07-21 |
| `E0456` | `ART:public/push-sw.js` | `implements` | `DOC:docs/blueprint/15.10.6.6-PWA-COMPLETION-REPORT.md` | docs/blueprint/15.10.6.6-PWA-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0457` | `ART:public/pwa-skipwaiting.js` | `implements` | `DOC:docs/blueprint/15.10.6.6-PWA-COMPLETION-REPORT.md` | docs/blueprint/15.10.6.6-PWA-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0458` | `ART:src/components/discovery/OfflineBanner.tsx` | `implements` | `DOC:docs/blueprint/15.10.6.6-PWA-COMPLETION-REPORT.md` | docs/blueprint/15.10.6.6-PWA-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0459` | `ART:src/components/discovery/SyncStatusBanner.tsx` | `implements` | `DOC:docs/blueprint/15.10.6.6-PWA-COMPLETION-REPORT.md` | docs/blueprint/15.10.6.6-PWA-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0460` | `ART:src/components/discovery/UpdateBanner.tsx` | `implements` | `DOC:docs/blueprint/15.10.6.6-PWA-COMPLETION-REPORT.md` | docs/blueprint/15.10.6.6-PWA-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0461` | `ART:src/components/workspace/` | `implements` | `DOC:docs/blueprint/15.10.6.6-PWA-COMPLETION-REPORT.md` | docs/blueprint/15.10.6.6-PWA-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0462` | `ART:src/lib/observability/observability.functions.ts` | `implements` | `DOC:docs/blueprint/15.10.6.6-PWA-COMPLETION-REPORT.md` | docs/blueprint/15.10.6.6-PWA-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0463` | `ART:src/pwa/push.ts` | `implements` | `DOC:docs/blueprint/15.10.6.6-PWA-COMPLETION-REPORT.md` | docs/blueprint/15.10.6.6-PWA-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0464` | `ART:src/pwa/register-sw.ts` | `implements` | `DOC:docs/blueprint/15.10.6.6-PWA-COMPLETION-REPORT.md` | docs/blueprint/15.10.6.6-PWA-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0465` | `ART:src/pwa/sync-queue.ts` | `implements` | `DOC:docs/blueprint/15.10.6.6-PWA-COMPLETION-REPORT.md` | docs/blueprint/15.10.6.6-PWA-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0466` | `ART:src/pwa/sync-runner.ts` | `implements` | `DOC:docs/blueprint/15.10.6.6-PWA-COMPLETION-REPORT.md` | docs/blueprint/15.10.6.6-PWA-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0467` | `ART:src/routes/offline.tsx` | `implements` | `DOC:docs/blueprint/15.10.6.6-PWA-COMPLETION-REPORT.md` | docs/blueprint/15.10.6.6-PWA-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0468` | `ART:src/components/traveler/AluxSourcesFooter.tsx` | `implements` | `DOC:docs/blueprint/15.10.7-INICIATIVA-7-ARMA-TU-VIAJE-CLOSURE-v1.0.md` | docs/blueprint/15.10.7-INICIATIVA-7-ARMA-TU-VIAJE-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0469` | `ART:src/components/traveler/AluxSuggestionCard.tsx` | `implements` | `DOC:docs/blueprint/15.10.7-INICIATIVA-7-ARMA-TU-VIAJE-CLOSURE-v1.0.md` | docs/blueprint/15.10.7-INICIATIVA-7-ARMA-TU-VIAJE-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0470` | `ART:src/components/traveler/AluxTravelerPanel.tsx` | `implements` | `DOC:docs/blueprint/15.10.7-INICIATIVA-7-ARMA-TU-VIAJE-CLOSURE-v1.0.md` | docs/blueprint/15.10.7-INICIATIVA-7-ARMA-TU-VIAJE-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0471` | `ART:src/lib/traveler/` | `implements` | `DOC:docs/blueprint/15.10.7-INICIATIVA-7-ARMA-TU-VIAJE-CLOSURE-v1.0.md` | docs/blueprint/15.10.7-INICIATIVA-7-ARMA-TU-VIAJE-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0472` | `ART:src/styles.css` | `implements` | `DOC:docs/blueprint/15.10.7-INICIATIVA-7-ARMA-TU-VIAJE-CLOSURE-v1.0.md` | docs/blueprint/15.10.7-INICIATIVA-7-ARMA-TU-VIAJE-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0473` | `ART:src/components/admin/ZoneScopesDialog.tsx` | `implements` | `DOC:docs/blueprint/15.10.7.1-ZONE-SCOPES-COMPLETION-REPORT.md` | docs/blueprint/15.10.7.1-ZONE-SCOPES-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0474` | `ART:src/lib/admin/zone-scopes.functions.ts` | `implements` | `DOC:docs/blueprint/15.10.7.1-ZONE-SCOPES-COMPLETION-REPORT.md` | docs/blueprint/15.10.7.1-ZONE-SCOPES-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0475` | `ART:src/routes/_authenticated/admin/sistema.usuarios.tsx` | `implements` | `DOC:docs/blueprint/15.10.7.1-ZONE-SCOPES-COMPLETION-REPORT.md` | docs/blueprint/15.10.7.1-ZONE-SCOPES-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0476` | `ART:src/routes/_authenticated/portal/empresas.index.tsx` | `implements` | `DOC:docs/blueprint/15.10.7.2-MULTIBUSINESS-ONBOARDING-COMPLETION-REPORT.md` | docs/blueprint/15.10.7.2-MULTIBUSINESS-ONBOARDING-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0477` | `ART:src/routes/_authenticated/portal/route.tsx` | `implements` | `DOC:docs/blueprint/15.10.7.2-MULTIBUSINESS-ONBOARDING-COMPLETION-REPORT.md` | docs/blueprint/15.10.7.2-MULTIBUSINESS-ONBOARDING-COMPLETION-REPORT.md § asociación de implementación validada | 2026-07-21 |
| `E0478` | `ART:src/routes/index.tsx` | `implements` | `DOC:docs/blueprint/15.10.A-EXPERIENCE-BUILDER-VISUAL-CMS-PROPOSAL-v1.0.md` | docs/blueprint/15.10.A-EXPERIENCE-BUILDER-VISUAL-CMS-PROPOSAL-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0479` | `ART:src/components/concierge/RequestConciergeButton.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-01-EPICA-1-CLOSURE-FINAL-v1.0.md` | docs/blueprint/15.10.H-01-EPICA-1-CLOSURE-FINAL-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0480` | `ART:src/components/protected-actions/SignInPromptSheet.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-01-EPICA-1-CLOSURE-FINAL-v1.0.md` | docs/blueprint/15.10.H-01-EPICA-1-CLOSURE-FINAL-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0481` | `ART:src/components/traveler/AddToTravelPlanButton.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-01-EPICA-1-CLOSURE-FINAL-v1.0.md` | docs/blueprint/15.10.H-01-EPICA-1-CLOSURE-FINAL-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0482` | `ART:src/lib/protected-actions/types.ts` | `implements` | `DOC:docs/blueprint/15.10.H-01-EPICA-1-CLOSURE-FINAL-v1.0.md` | docs/blueprint/15.10.H-01-EPICA-1-CLOSURE-FINAL-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0483` | `ART:src/lib/protected-actions/registry.ts` | `implements` | `DOC:docs/blueprint/15.10.H-01-EPICA-1-CLOSURE-FINAL-v1.0.md` | docs/blueprint/15.10.H-01-EPICA-1-CLOSURE-FINAL-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0484` | `ART:src/lib/protected-actions/observability.ts` | `implements` | `DOC:docs/blueprint/15.10.H-01-EPICA-1-CLOSURE-FINAL-v1.0.md` | docs/blueprint/15.10.H-01-EPICA-1-CLOSURE-FINAL-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0485` | `ART:src/lib/protected-actions/resume-runner.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-01-EPICA-1-CLOSURE-FINAL-v1.0.md` | docs/blueprint/15.10.H-01-EPICA-1-CLOSURE-FINAL-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0486` | `ART:src/routes/lovable/protected-actions-preview.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-01-EPICA-1-CLOSURE-FINAL-v1.0.md` | docs/blueprint/15.10.H-01-EPICA-1-CLOSURE-FINAL-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0487` | `ART:src/components/protected-actions/` | `implements` | `DOC:docs/blueprint/15.10.H-01-EPICA-1-DFT-PROTECTED-ACTIONS-v1.0.md` | docs/blueprint/15.10.H-01-EPICA-1-DFT-PROTECTED-ACTIONS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0488` | `ART:src/lib/protected-actions/` | `implements` | `DOC:docs/blueprint/15.10.H-01-EPICA-1-DFT-PROTECTED-ACTIONS-v1.0.md` | docs/blueprint/15.10.H-01-EPICA-1-DFT-PROTECTED-ACTIONS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0489` | `ART:src/routes/__root.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-01-EPICA-1-DFT-PROTECTED-ACTIONS-v1.0.md` | docs/blueprint/15.10.H-01-EPICA-1-DFT-PROTECTED-ACTIONS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0490` | `ART:src/lib/protected-actions/index.ts` | `implements` | `DOC:docs/blueprint/15.10.H-01-EPICA-1-I1-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-01-EPICA-1-I1-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0491` | `ART:src/lib/protected-actions/observability.ts` | `implements` | `DOC:docs/blueprint/15.10.H-01-EPICA-1-I1-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-01-EPICA-1-I1-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0492` | `ART:src/lib/protected-actions/registry.ts` | `implements` | `DOC:docs/blueprint/15.10.H-01-EPICA-1-I1-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-01-EPICA-1-I1-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0493` | `ART:src/lib/protected-actions/resume-runner.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-01-EPICA-1-I1-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-01-EPICA-1-I1-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0494` | `ART:src/lib/protected-actions/types.ts` | `implements` | `DOC:docs/blueprint/15.10.H-01-EPICA-1-I1-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-01-EPICA-1-I1-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0495` | `ART:src/routes/__root.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-01-EPICA-1-I1-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-01-EPICA-1-I1-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0496` | `ART:src/components/protected-actions/SignInPromptSheet.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-01-EPICA-1-I2-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-01-EPICA-1-I2-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0497` | `ART:src/i18n/locales/es.json` | `implements` | `DOC:docs/blueprint/15.10.H-01-EPICA-1-I2-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-01-EPICA-1-I2-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0498` | `ART:src/i18n/locales/en.json` | `implements` | `DOC:docs/blueprint/15.10.H-01-EPICA-1-I2-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-01-EPICA-1-I2-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0499` | `ART:src/i18n/locales/fr.json` | `implements` | `DOC:docs/blueprint/15.10.H-01-EPICA-1-I2-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-01-EPICA-1-I2-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0500` | `ART:src/i18n/locales/de.json` | `implements` | `DOC:docs/blueprint/15.10.H-01-EPICA-1-I2-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-01-EPICA-1-I2-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0501` | `ART:src/i18n/locales/it.json` | `implements` | `DOC:docs/blueprint/15.10.H-01-EPICA-1-I2-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-01-EPICA-1-I2-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0502` | `ART:src/i18n/locales/pt.json` | `implements` | `DOC:docs/blueprint/15.10.H-01-EPICA-1-I2-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-01-EPICA-1-I2-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0503` | `ART:src/lib/protected-actions/index.ts` | `implements` | `DOC:docs/blueprint/15.10.H-01-EPICA-1-I2-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-01-EPICA-1-I2-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0504` | `ART:src/lib/protected-actions/sheet-controller.ts` | `implements` | `DOC:docs/blueprint/15.10.H-01-EPICA-1-I2-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-01-EPICA-1-I2-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0505` | `ART:src/lib/protected-actions/use-protected-action.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-01-EPICA-1-I2-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-01-EPICA-1-I2-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0506` | `ART:src/routes/__root.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-01-EPICA-1-I2-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-01-EPICA-1-I2-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0507` | `ART:src/routes/lovable/protected-actions-preview.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-01-EPICA-1-I2-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-01-EPICA-1-I2-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0508` | `ART:src/components/traveler/AddToTravelPlanButton.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-01-EPICA-1-I4-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-01-EPICA-1-I4-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0509` | `ART:src/components/concierge/RequestConciergeButton.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-01-EPICA-1-I5-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-01-EPICA-1-I5-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0510` | `ART:src/hooks/` | `implements` | `DOC:docs/blueprint/15.10.H-01-PRODUCT-HARDENING-AUDIT-v1.0.md` | docs/blueprint/15.10.H-01-PRODUCT-HARDENING-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0511` | `ART:src/integrations/supabase/` | `implements` | `DOC:docs/blueprint/15.10.H-01-PRODUCT-HARDENING-AUDIT-v1.0.md` | docs/blueprint/15.10.H-01-PRODUCT-HARDENING-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0512` | `ART:src/lib/notifications/push.functions.ts` | `implements` | `DOC:docs/blueprint/15.10.H-01-PRODUCT-HARDENING-AUDIT-v1.0.md` | docs/blueprint/15.10.H-01-PRODUCT-HARDENING-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0513` | `ART:src/lib/traveler/travel-plans.functions.ts` | `implements` | `DOC:docs/blueprint/15.10.H-01-PRODUCT-HARDENING-AUDIT-v1.0.md` | docs/blueprint/15.10.H-01-PRODUCT-HARDENING-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0514` | `ART:src/lib/traveler/traveler-account.functions.ts` | `implements` | `DOC:docs/blueprint/15.10.H-01-PRODUCT-HARDENING-AUDIT-v1.0.md` | docs/blueprint/15.10.H-01-PRODUCT-HARDENING-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0515` | `ART:src/pwa/push.ts` | `implements` | `DOC:docs/blueprint/15.10.H-01-PRODUCT-HARDENING-AUDIT-v1.0.md` | docs/blueprint/15.10.H-01-PRODUCT-HARDENING-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0516` | `ART:src/components/common/PageShell.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I1-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I1-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0517` | `ART:src/components/discovery/PublicShell.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I1-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I1-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0518` | `ART:src/components/layout/BreadcrumbTerritorial.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I1-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I1-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0519` | `ART:src/lib/context-engine/` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I1-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I1-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0520` | `ART:src/lib/context-engine/events.ts` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I1-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I1-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0521` | `ART:src/lib/context-engine/index.ts` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I1-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I1-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0522` | `ART:src/lib/context-engine/inheritance-rules.ts` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I1-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I1-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0523` | `ART:src/lib/context-engine/previous-store.ts` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I1-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I1-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0524` | `ART:src/lib/context-engine/provider.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I1-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I1-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0525` | `ART:src/lib/context-engine/resolver.ts` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I1-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I1-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0526` | `ART:src/lib/context-engine/types.ts` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I1-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I1-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0527` | `ART:src/lib/discovery/seo.ts` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I1-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I1-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0528` | `ART:src/lib/experience-builder/page-kind-registry.ts` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I1-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I1-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0529` | `ART:src/routeTree.gen.ts` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I1-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I1-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0530` | `ART:src/routes/` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I1-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I1-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0531` | `ART:src/routes/lovable/` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I1-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I1-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0532` | `ART:src/routes/lovable/context-engine-preview.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I1-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I1-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0533` | `ART:src/routes/sitemap[.]xml.ts` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I1-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I1-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0534` | `ART:src/components/discovery/PublicShell.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I2-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I2-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0535` | `ART:src/components/layout/BreadcrumbTerritorial.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I2-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I2-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0536` | `ART:src/lib/context-engine/` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I2-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I2-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0537` | `ART:src/lib/discovery/seo.ts` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I2-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I2-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0538` | `ART:src/lib/experience-builder/` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I2-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I2-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0539` | `ART:src/routes/lovable/` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I2-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I2-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0540` | `ART:src/routes/lovable/context-engine-preview.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I2-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I2-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0541` | `ART:src/routes/oriente-maya/$destino.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I2-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I2-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0542` | `ART:src/components/discovery/PublicShell.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I3-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I3-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0543` | `ART:src/components/surfaces/DestinationSurface.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I3-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I3-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0544` | `ART:src/lib/context-engine/` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I3-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I3-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0545` | `ART:src/lib/discovery/seo.ts` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I3-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I3-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0546` | `ART:src/routes/oriente-maya/$destino.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I3-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I3-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0547` | `ART:src/lib/context-engine/` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I4-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I4-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0548` | `ART:src/routes/hoteles.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I4-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I4-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0549` | `ART:src/components/surfaces/DestinationSurface.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I5-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I5-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0550` | `ART:src/lib/context-engine/` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I5-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I5-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0551` | `ART:src/routes/casas-de-vacaciones.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I5-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I5-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0552` | `ART:src/routes/experiencias.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I5-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I5-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0553` | `ART:src/routes/restaurantes.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I5-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I5-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0554` | `ART:src/lib/context-engine/inheritance-rules.ts` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I5b-CONSOLIDATION-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I5b-CONSOLIDATION-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0555` | `ART:src/lib/context-engine/provider.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I5b-CONSOLIDATION-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I5b-CONSOLIDATION-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0556` | `ART:src/components/surfaces/BusinessSurface.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I6-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I6-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0557` | `ART:src/components/surfaces/EventSurface.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I6-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I6-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0558` | `ART:src/components/surfaces/ProductSurface.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I6-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I6-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0559` | `ART:src/components/surfaces/kit/Shell.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I6-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I6-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0560` | `ART:src/lib/context-engine/inheritance-rules.ts` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I6-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I6-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0561` | `ART:src/routes/eventos.$slug.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I6-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I6-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0562` | `ART:src/routes/eventos.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I6-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I6-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0563` | `ART:src/routes/producto.$slug.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I6-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I6-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0564` | `ART:src/lib/context-engine/` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I7-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I7-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0565` | `ART:src/lib/context-engine/inheritance-rules.ts` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I7-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I7-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0566` | `ART:src/routes/arma-tu-viaje.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I7-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I7-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0567` | `ART:src/routes/blog.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I7-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I7-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0568` | `ART:src/routes/contacto.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I7-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I7-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0569` | `ART:src/routes/empresas.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I7-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I7-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0570` | `ART:src/routes/mapa.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I7-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I7-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0571` | `ART:src/routes/oriente-maya/index.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I7-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I7-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0572` | `ART:src/routes/promociones.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I7-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I7-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0573` | `ART:src/routes/que-hacer.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-1-I7-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-1-I7-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0574` | `ART:src/components/` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-2-AUDIT-MICROSITIO-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-2-AUDIT-MICROSITIO-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0575` | `ART:src/lib/experience-builder/` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-2-AUDIT-MICROSITIO-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-2-AUDIT-MICROSITIO-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0576` | `ART:src/routes/` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-2-AUDIT-MICROSITIO-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-2-AUDIT-MICROSITIO-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0577` | `ART:src/components/discovery/DiscoveryNavigator.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-2-I1-DISCOVERY-NAVIGATOR-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-2-I1-DISCOVERY-NAVIGATOR-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0578` | `ART:src/components/experience-builder/blocks/DiscoveryNavigatorBlock.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-2-I1-DISCOVERY-NAVIGATOR-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-2-I1-DISCOVERY-NAVIGATOR-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0579` | `ART:src/components/surfaces/DestinationSurface.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-2-I1-DISCOVERY-NAVIGATOR-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-2-I1-DISCOVERY-NAVIGATOR-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0580` | `ART:src/lib/discovery/discovery-navigator.functions.ts` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-2-I1-DISCOVERY-NAVIGATOR-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-2-I1-DISCOVERY-NAVIGATOR-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0581` | `ART:src/lib/experience-builder/block-library.ts` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-2-I1-DISCOVERY-NAVIGATOR-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-2-I1-DISCOVERY-NAVIGATOR-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0582` | `ART:src/lib/experience-builder/composition-renderer.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-02-EPICA-2-I1-DISCOVERY-NAVIGATOR-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-02-EPICA-2-I1-DISCOVERY-NAVIGATOR-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0583` | `ART:src/components/common/PageShell.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-02-NAVIGATION-CONTEXT-ENGINE-DFT-v1.0.md` | docs/blueprint/15.10.H-02-NAVIGATION-CONTEXT-ENGINE-DFT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0584` | `ART:src/components/discovery/PublicShell.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-02-NAVIGATION-CONTEXT-ENGINE-DFT-v1.0.md` | docs/blueprint/15.10.H-02-NAVIGATION-CONTEXT-ENGINE-DFT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0585` | `ART:src/components/layout/BreadcrumbTerritorial.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-02-NAVIGATION-CONTEXT-ENGINE-DFT-v1.0.md` | docs/blueprint/15.10.H-02-NAVIGATION-CONTEXT-ENGINE-DFT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0586` | `ART:src/components/workspace/` | `implements` | `DOC:docs/blueprint/15.10.H-02-NAVIGATION-CONTEXT-ENGINE-DFT-v1.0.md` | docs/blueprint/15.10.H-02-NAVIGATION-CONTEXT-ENGINE-DFT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0587` | `ART:src/lib/destinations/public-reads.functions.ts` | `implements` | `DOC:docs/blueprint/15.10.H-02-NAVIGATION-CONTEXT-ENGINE-DFT-v1.0.md` | docs/blueprint/15.10.H-02-NAVIGATION-CONTEXT-ENGINE-DFT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0588` | `ART:src/lib/discovery/seo.ts` | `implements` | `DOC:docs/blueprint/15.10.H-02-NAVIGATION-CONTEXT-ENGINE-DFT-v1.0.md` | docs/blueprint/15.10.H-02-NAVIGATION-CONTEXT-ENGINE-DFT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0589` | `ART:src/lib/experience-builder/page-kind-registry.ts` | `implements` | `DOC:docs/blueprint/15.10.H-02-NAVIGATION-CONTEXT-ENGINE-DFT-v1.0.md` | docs/blueprint/15.10.H-02-NAVIGATION-CONTEXT-ENGINE-DFT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0590` | `ART:src/lib/navigation/` | `implements` | `DOC:docs/blueprint/15.10.H-02-NAVIGATION-CONTEXT-ENGINE-DFT-v1.0.md` | docs/blueprint/15.10.H-02-NAVIGATION-CONTEXT-ENGINE-DFT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0591` | `ART:src/routeTree.gen.ts` | `implements` | `DOC:docs/blueprint/15.10.H-02-NAVIGATION-CONTEXT-ENGINE-DFT-v1.0.md` | docs/blueprint/15.10.H-02-NAVIGATION-CONTEXT-ENGINE-DFT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0592` | `ART:src/routes/sitemap[.]xml.ts` | `implements` | `DOC:docs/blueprint/15.10.H-02-NAVIGATION-CONTEXT-ENGINE-DFT-v1.0.md` | docs/blueprint/15.10.H-02-NAVIGATION-CONTEXT-ENGINE-DFT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0593` | `ART:src/types/territory.ts` | `implements` | `DOC:docs/blueprint/15.10.H-02-NAVIGATION-CONTEXT-ENGINE-DFT-v1.0.md` | docs/blueprint/15.10.H-02-NAVIGATION-CONTEXT-ENGINE-DFT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0594` | `ART:src/components/discovery/DiscoveryNavigator.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I1a-EXPERIENCE-HERO-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I1a-EXPERIENCE-HERO-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0595` | `ART:src/components/experience-builder/blocks/experience-hero/ExperienceHero.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I1a-EXPERIENCE-HERO-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I1a-EXPERIENCE-HERO-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0596` | `ART:src/components/experience-builder/blocks/experience-hero/ExperienceHeroBlock.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I1a-EXPERIENCE-HERO-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I1a-EXPERIENCE-HERO-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0597` | `ART:src/lib/context-engine/` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I1a-EXPERIENCE-HERO-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I1a-EXPERIENCE-HERO-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0598` | `ART:src/lib/discovery/` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I1a-EXPERIENCE-HERO-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I1a-EXPERIENCE-HERO-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0599` | `ART:src/lib/experience-builder/block-library.ts` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I1a-EXPERIENCE-HERO-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I1a-EXPERIENCE-HERO-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0600` | `ART:src/lib/experience-builder/blocks/experience-hero/contract.ts` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I1a-EXPERIENCE-HERO-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I1a-EXPERIENCE-HERO-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0601` | `ART:src/lib/experience-builder/composition-renderer.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I1a-EXPERIENCE-HERO-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I1a-EXPERIENCE-HERO-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0602` | `ART:src/routes/lovable/experience-hero-preview.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I1a-EXPERIENCE-HERO-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I1a-EXPERIENCE-HERO-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0603` | `ART:src/components/discovery/` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I1b-SUBNAV-CTABAR-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I1b-SUBNAV-CTABAR-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0604` | `ART:src/components/experience-builder/blocks/experience-cta-bar/ExperienceCtaBar.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I1b-SUBNAV-CTABAR-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I1b-SUBNAV-CTABAR-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0605` | `ART:src/components/experience-builder/blocks/experience-cta-bar/ExperienceCtaBarBlock.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I1b-SUBNAV-CTABAR-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I1b-SUBNAV-CTABAR-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0606` | `ART:src/components/experience-builder/blocks/experience-subnav/ExperienceSubnav.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I1b-SUBNAV-CTABAR-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I1b-SUBNAV-CTABAR-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0607` | `ART:src/components/experience-builder/blocks/experience-subnav/ExperienceSubnavBlock.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I1b-SUBNAV-CTABAR-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I1b-SUBNAV-CTABAR-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0608` | `ART:src/lib/context-engine/` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I1b-SUBNAV-CTABAR-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I1b-SUBNAV-CTABAR-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0609` | `ART:src/lib/discovery/` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I1b-SUBNAV-CTABAR-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I1b-SUBNAV-CTABAR-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0610` | `ART:src/lib/experience-builder/block-library.ts` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I1b-SUBNAV-CTABAR-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I1b-SUBNAV-CTABAR-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0611` | `ART:src/lib/experience-builder/blocks/experience-cta-bar/contract.ts` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I1b-SUBNAV-CTABAR-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I1b-SUBNAV-CTABAR-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0612` | `ART:src/lib/experience-builder/blocks/experience-subnav/contract.ts` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I1b-SUBNAV-CTABAR-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I1b-SUBNAV-CTABAR-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0613` | `ART:src/lib/experience-builder/composition-renderer.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I1b-SUBNAV-CTABAR-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I1b-SUBNAV-CTABAR-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0614` | `ART:src/routes/lovable/experience-subnav-ctabar-preview.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I1b-SUBNAV-CTABAR-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I1b-SUBNAV-CTABAR-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0615` | `ART:src/components/surfaces/BusinessSurface.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I1d-BUSINESS-MOTHER-TEMPLATE-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I1d-BUSINESS-MOTHER-TEMPLATE-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0616` | `ART:src/lib/experience-builder/adapters/business-to-blocks.ts` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I1d-BUSINESS-MOTHER-TEMPLATE-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I1d-BUSINESS-MOTHER-TEMPLATE-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0617` | `ART:src/routes/lovable/business-mother-template-preview.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I1d-BUSINESS-MOTHER-TEMPLATE-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I1d-BUSINESS-MOTHER-TEMPLATE-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0618` | `ART:src/components/surfaces/BusinessSurface.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I2a-EXPERIENCE-PRODUCTS-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I2a-EXPERIENCE-PRODUCTS-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0619` | `ART:src/components/experience-builder/blocks/experience-reviews/ExperienceReviews.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I2c-EXPERIENCE-REVIEWS-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I2c-EXPERIENCE-REVIEWS-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0620` | `ART:src/components/experience-builder/blocks/experience-reviews/ExperienceReviewsBlock.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I2c-EXPERIENCE-REVIEWS-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I2c-EXPERIENCE-REVIEWS-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0621` | `ART:src/lib/experience-builder/blocks/experience-reviews/contract.ts` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I2c-EXPERIENCE-REVIEWS-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I2c-EXPERIENCE-REVIEWS-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0622` | `ART:src/lib/experience-builder/adapters/destination-related-to-block.ts` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I3b-RELATED-COLLECTION-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I3b-RELATED-COLLECTION-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0623` | `ART:src/lib/experience-builder/blocks/experience-related-collection/contract.ts` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I3b-RELATED-COLLECTION-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I3b-RELATED-COLLECTION-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0624` | `ART:src/components/experience-builder/blocks/experience-institutional-badges/InstitutionalBadges.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I3c-INSTITUTIONAL-BADGES-COMPLETION-REPORT-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I3c-INSTITUTIONAL-BADGES-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0625` | `ART:src/components/experience-builder/blocks/experience-institutional-badges/InstitutionalBadgesBlock.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I3c-INSTITUTIONAL-BADGES-COMPLETION-REPORT-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I3c-INSTITUTIONAL-BADGES-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0626` | `ART:src/lib/experience-builder/block-library.ts` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I3c-INSTITUTIONAL-BADGES-COMPLETION-REPORT-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I3c-INSTITUTIONAL-BADGES-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0627` | `ART:src/lib/experience-builder/blocks/experience-institutional-badges/contract.ts` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I3c-INSTITUTIONAL-BADGES-COMPLETION-REPORT-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I3c-INSTITUTIONAL-BADGES-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0628` | `ART:src/lib/experience-builder/blocks/experience-institutional-badges/institutional-badges.registry.ts` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I3c-INSTITUTIONAL-BADGES-COMPLETION-REPORT-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I3c-INSTITUTIONAL-BADGES-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0629` | `ART:src/lib/experience-builder/composition-renderer.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I3c-INSTITUTIONAL-BADGES-COMPLETION-REPORT-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I3c-INSTITUTIONAL-BADGES-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0630` | `ART:src/styles.css` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I3d1-TOKEN-AUDIT-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I3d1-TOKEN-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0631` | `ART:src/components/layout/PrimaryMegaMenu.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I3d2-DSL-M2-TYPOGRAPHY-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I3d2-DSL-M2-TYPOGRAPHY-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0632` | `ART:src/styles.css` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I3d2-DSL-M2-TYPOGRAPHY-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I3d2-DSL-M2-TYPOGRAPHY-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0633` | `ART:src/components/ui/badge.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I3d2-DSL-MIGRATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I3d2-DSL-MIGRATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0634` | `ART:src/components/ui/button.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I3d2-DSL-MIGRATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I3d2-DSL-MIGRATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0635` | `ART:src/components/ui/card.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I3d2-DSL-MIGRATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I3d2-DSL-MIGRATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0636` | `ART:src/styles.css` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I3d2-DSL-MIGRATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I3d2-DSL-MIGRATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0637` | `ART:src/styles.css` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I3d3-DSL-M3-RADII-SHADOWS-FOCUS-CLOSURE-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I3d3-DSL-M3-RADII-SHADOWS-FOCUS-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0638` | `ART:src/components/experience-builder/blocks/` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I3d4-SEMANTIC-TONES-HARMONIZATION-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I3d4-SEMANTIC-TONES-HARMONIZATION-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0639` | `ART:src/styles.css` | `implements` | `DOC:docs/blueprint/15.10.H-03-EPICA-1-I3d4-SEMANTIC-TONES-HARMONIZATION-v1.0.md` | docs/blueprint/15.10.H-03-EPICA-1-I3d4-SEMANTIC-TONES-HARMONIZATION-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0640` | `ART:src/styles.css` | `implements` | `DOC:docs/blueprint/15.10.H-03-INSTITUTIONAL-BADGE-SPECIFICATION-v1.0.md` | docs/blueprint/15.10.H-03-INSTITUTIONAL-BADGE-SPECIFICATION-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0641` | `ART:src/components/cards/` | `implements` | `DOC:docs/blueprint/15.10.H-03-PRODUCT-UX-RECONCILIATION-REPORT-v1.0.md` | docs/blueprint/15.10.H-03-PRODUCT-UX-RECONCILIATION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0642` | `ART:src/components/experience-builder/blocks/experience-hero/ExperienceHero.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-03-U0-FOUNDER-EXPERIENCE-GAP-AUDIT-v1.0.md` | docs/blueprint/15.10.H-03-U0-FOUNDER-EXPERIENCE-GAP-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0643` | `ART:src/components/surfaces/BusinessSurface.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-03-U0-FOUNDER-EXPERIENCE-GAP-AUDIT-v1.0.md` | docs/blueprint/15.10.H-03-U0-FOUNDER-EXPERIENCE-GAP-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0644` | `ART:src/components/surfaces/DestinationSurface.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-03-U0-FOUNDER-EXPERIENCE-GAP-AUDIT-v1.0.md` | docs/blueprint/15.10.H-03-U0-FOUNDER-EXPERIENCE-GAP-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0645` | `ART:src/components/surfaces/ProductSurface.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-03-U0-FOUNDER-EXPERIENCE-GAP-AUDIT-v1.0.md` | docs/blueprint/15.10.H-03-U0-FOUNDER-EXPERIENCE-GAP-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0646` | `ART:src/components/experience-builder/blocks/experience-hero/ExperienceHero.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-03-U1.4-TOURIST-HERO-v1.1.0.md` | docs/blueprint/15.10.H-03-U1.4-TOURIST-HERO-v1.1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0647` | `ART:src/components/home/Hero.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-03-U1.4-TOURIST-HERO-v1.1.0.md` | docs/blueprint/15.10.H-03-U1.4-TOURIST-HERO-v1.1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0648` | `ART:src/lib/experience-builder/blocks/experience-hero/contract.ts` | `implements` | `DOC:docs/blueprint/15.10.H-03-U1.4-TOURIST-HERO-v1.1.0.md` | docs/blueprint/15.10.H-03-U1.4-TOURIST-HERO-v1.1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0649` | `ART:src/routes/lovable/experience-hero-preview.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-03-U1.4-TOURIST-HERO-v1.1.0.md` | docs/blueprint/15.10.H-03-U1.4-TOURIST-HERO-v1.1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0650` | `ART:src/components/experience-builder/blocks/experience-hero/ExperienceHeroFromProduct.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-03-U1.5-TOURISM-LIBRARY-HARDENING-v1.0.md` | docs/blueprint/15.10.H-03-U1.5-TOURISM-LIBRARY-HARDENING-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0651` | `ART:src/components/home/Hero.tsx` | `implements` | `DOC:docs/blueprint/15.10.H-03-U1.5-TOURISM-LIBRARY-HARDENING-v1.0.md` | docs/blueprint/15.10.H-03-U1.5-TOURISM-LIBRARY-HARDENING-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0652` | `ART:scripts/surface-composer-smoke.tsx` | `demonstrates` | `DOC:docs/blueprint/15.10.H-03-U1.5-TOURISM-LIBRARY-HARDENING-v1.0.md` | docs/blueprint/15.10.H-03-U1.5-TOURISM-LIBRARY-HARDENING-v1.0.md § prueba/evidencia externa validada | 2026-07-21 |
| `E0653` | `ART:src/styles.css` | `implements` | `DOC:docs/blueprint/15.10.H-03-VALLADOLID-COLONIAL-DESIGN-SYSTEM-v1.0.md` | docs/blueprint/15.10.H-03-VALLADOLID-COLONIAL-DESIGN-SYSTEM-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0654` | `ART:src/styles.css` | `implements` | `DOC:docs/blueprint/15.10.H-03-VISUAL-IDENTITY-AND-INSTITUTIONAL-BADGES-DIRECTIVE-v1.0.md` | docs/blueprint/15.10.H-03-VISUAL-IDENTITY-AND-INSTITUTIONAL-BADGES-DIRECTIVE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0655` | `ART:public/push-sw.js` | `implements` | `DOC:docs/blueprint/15.10.Z-FINAL-COMPLETION-AUDIT-v1.0.md` | docs/blueprint/15.10.Z-FINAL-COMPLETION-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0656` | `ART:src/pwa/push.ts` | `implements` | `DOC:docs/blueprint/15.10.Z-FINAL-COMPLETION-AUDIT-v1.0.md` | docs/blueprint/15.10.Z-FINAL-COMPLETION-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0657` | `ART:src/pwa/register-sw.ts` | `implements` | `DOC:docs/blueprint/15.10.Z-FINAL-COMPLETION-AUDIT-v1.0.md` | docs/blueprint/15.10.Z-FINAL-COMPLETION-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0658` | `ART:src/styles.css` | `implements` | `DOC:docs/blueprint/15.10.Z-FINAL-COMPLETION-AUDIT-v1.0.md` | docs/blueprint/15.10.Z-FINAL-COMPLETION-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0659` | `ART:src/lib/navigation/canonical-paths.ts` | `implements` | `DOC:docs/blueprint/15.11-N2.3-CLOSURE-REPORT-v1.0.md` | docs/blueprint/15.11-N2.3-CLOSURE-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0660` | `ART:src/routes/producto.$slug.tsx` | `implements` | `DOC:docs/blueprint/15.11-N2.3-CLOSURE-REPORT-v1.0.md` | docs/blueprint/15.11-N2.3-CLOSURE-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0661` | `ART:src/routes/sitemap[.]xml.ts` | `implements` | `DOC:docs/blueprint/15.11-N2.3-CLOSURE-REPORT-v1.0.md` | docs/blueprint/15.11-N2.3-CLOSURE-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0662` | `ART:src/components/navigation/DestinationSwitcher.tsx` | `implements` | `DOC:docs/blueprint/15.11-N2.4-CLOSURE-REPORT-v1.0.md` | docs/blueprint/15.11-N2.4-CLOSURE-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0663` | `ART:src/lib/navigation/destination-switch.functions.ts` | `implements` | `DOC:docs/blueprint/15.11-N2.4-CLOSURE-REPORT-v1.0.md` | docs/blueprint/15.11-N2.4-CLOSURE-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0664` | `ART:src/components/navigation/NavigationSessionBridge.tsx` | `implements` | `DOC:docs/blueprint/15.11-N3-CLOSURE-REPORT-v1.0.md` | docs/blueprint/15.11-N3-CLOSURE-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0665` | `ART:src/lib/context-engine/live-context.ts` | `implements` | `DOC:docs/blueprint/15.11-N3-CLOSURE-REPORT-v1.0.md` | docs/blueprint/15.11-N3-CLOSURE-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0666` | `ART:src/lib/navigation/session-context.ts` | `implements` | `DOC:docs/blueprint/15.11-N3-CLOSURE-REPORT-v1.0.md` | docs/blueprint/15.11-N3-CLOSURE-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0667` | `ART:src/routes/__root.tsx` | `implements` | `DOC:docs/blueprint/15.11-N3-CLOSURE-REPORT-v1.0.md` | docs/blueprint/15.11-N3-CLOSURE-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0668` | `ART:src/components/home/ConsejoAluxSection.tsx` | `implements` | `DOC:docs/blueprint/16.01-EPICA-E1-ALUX-TRAVELER-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.01-EPICA-E1-ALUX-TRAVELER-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0669` | `ART:src/components/layout/AluxFloatingTrigger.tsx` | `implements` | `DOC:docs/blueprint/16.01-EPICA-E1-ALUX-TRAVELER-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.01-EPICA-E1-ALUX-TRAVELER-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0670` | `ART:src/components/layout/SiteFooter.tsx` | `implements` | `DOC:docs/blueprint/16.01-EPICA-E1-ALUX-TRAVELER-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.01-EPICA-E1-ALUX-TRAVELER-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0671` | `ART:src/components/traveler/AluxSuggestionCard.tsx` | `implements` | `DOC:docs/blueprint/16.01-EPICA-E1-ALUX-TRAVELER-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.01-EPICA-E1-ALUX-TRAVELER-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0672` | `ART:src/components/traveler/AluxTravelerPanel.tsx` | `implements` | `DOC:docs/blueprint/16.01-EPICA-E1-ALUX-TRAVELER-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.01-EPICA-E1-ALUX-TRAVELER-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0673` | `ART:src/lib/alux/contextual-suggest.functions.ts` | `implements` | `DOC:docs/blueprint/16.01-EPICA-E1-ALUX-TRAVELER-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.01-EPICA-E1-ALUX-TRAVELER-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0674` | `ART:src/lib/alux/floating-presence.ts` | `implements` | `DOC:docs/blueprint/16.01-EPICA-E1-ALUX-TRAVELER-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.01-EPICA-E1-ALUX-TRAVELER-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0675` | `ART:src/routes/sitemap[.]xml.ts` | `implements` | `DOC:docs/blueprint/16.01-EPICA-E1-ALUX-TRAVELER-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.01-EPICA-E1-ALUX-TRAVELER-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0676` | `ART:src/lib/alux/contextual-suggest.functions.ts` | `implements` | `DOC:docs/blueprint/16.02-E1-US-E1.2-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.02-E1-US-E1.2-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0677` | `ART:src/lib/concierge/` | `implements` | `DOC:docs/blueprint/16.02-E1-US-E1.2-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.02-E1-US-E1.2-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0678` | `ART:src/lib/traveler/` | `implements` | `DOC:docs/blueprint/16.02-E1-US-E1.2-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.02-E1-US-E1.2-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0679` | `ART:src/components/experience-builder/blocks/experience-related-collection/ExperienceRelatedCollectionBlock.tsx` | `implements` | `DOC:docs/blueprint/16.03-E2-US-E2.1-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.03-E2-US-E2.1-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0680` | `ART:src/components/surfaces/BusinessSurface.tsx` | `implements` | `DOC:docs/blueprint/16.03-E2-US-E2.1-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.03-E2-US-E2.1-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0681` | `ART:src/lib/experience-builder/adapters/business-related-to-block.ts` | `implements` | `DOC:docs/blueprint/16.03-E2-US-E2.1-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.03-E2-US-E2.1-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0682` | `ART:src/routes/oriente-maya/$destino.$categoria.$empresa.index.tsx` | `implements` | `DOC:docs/blueprint/16.03-E2-US-E2.1-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.03-E2-US-E2.1-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0683` | `ART:src/components/experience-builder/blocks/experience-related-collection/ExperienceRelatedCollectionBlock.tsx` | `implements` | `DOC:docs/blueprint/16.04-E2-US-E2.2-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.04-E2-US-E2.2-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0684` | `ART:src/components/surfaces/ProductSurface.tsx` | `implements` | `DOC:docs/blueprint/16.04-E2-US-E2.2-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.04-E2-US-E2.2-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0685` | `ART:src/lib/experience-builder/adapters/product-related-to-block.ts` | `implements` | `DOC:docs/blueprint/16.04-E2-US-E2.2-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.04-E2-US-E2.2-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0686` | `ART:src/routes/oriente-maya/$destino.$categoria.$empresa.$producto.tsx` | `implements` | `DOC:docs/blueprint/16.04-E2-US-E2.2-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.04-E2-US-E2.2-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0687` | `ART:src/components/experience-builder/VisualStudio.tsx` | `implements` | `DOC:docs/blueprint/16.05-E3-US-E3.1-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.05-E3-US-E3.1-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0688` | `ART:src/components/experience-builder/blocks/experience-hero/ExperienceHeroBlock.tsx` | `implements` | `DOC:docs/blueprint/16.05-E3-US-E3.1-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.05-E3-US-E3.1-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0689` | `ART:src/components/surfaces/BusinessSurface.tsx` | `implements` | `DOC:docs/blueprint/16.05-E3-US-E3.1-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.05-E3-US-E3.1-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0690` | `ART:src/components/surfaces/ProductSurface.tsx` | `implements` | `DOC:docs/blueprint/16.05-E3-US-E3.1-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.05-E3-US-E3.1-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0691` | `ART:src/components/surfaces/business-blocks.legacy.tsx` | `implements` | `DOC:docs/blueprint/16.05-E3-US-E3.1-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.05-E3-US-E3.1-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0692` | `ART:src/components/surfaces/business-blocks.tsx` | `implements` | `DOC:docs/blueprint/16.05-E3-US-E3.1-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.05-E3-US-E3.1-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0693` | `ART:src/components/surfaces/business/business-to-kit-vm.ts` | `implements` | `DOC:docs/blueprint/16.05-E3-US-E3.1-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.05-E3-US-E3.1-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0694` | `ART:src/components/surfaces/product-blocks.legacy.tsx` | `implements` | `DOC:docs/blueprint/16.05-E3-US-E3.1-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.05-E3-US-E3.1-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0695` | `ART:src/components/surfaces/product-blocks.tsx` | `implements` | `DOC:docs/blueprint/16.05-E3-US-E3.1-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.05-E3-US-E3.1-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0696` | `ART:src/components/surfaces/product/product-to-kit-vm.ts` | `implements` | `DOC:docs/blueprint/16.05-E3-US-E3.1-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.05-E3-US-E3.1-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0697` | `ART:src/lib/experience-builder/block-library.ts` | `implements` | `DOC:docs/blueprint/16.05-E3-US-E3.1-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.05-E3-US-E3.1-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0698` | `ART:src/lib/experience-builder/page-kind-registry.ts` | `implements` | `DOC:docs/blueprint/16.05-E3-US-E3.1-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.05-E3-US-E3.1-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0699` | `ART:src/routes/_authenticated/admin/turistas.tsx` | `implements` | `DOC:docs/blueprint/16.05-E3-US-E3.1-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.05-E3-US-E3.1-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0700` | `ART:src/routes/lovable/context-engine-preview.tsx` | `implements` | `DOC:docs/blueprint/16.05-E3-US-E3.1-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.05-E3-US-E3.1-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0701` | `ART:src/routes/producto.$slug.tsx` | `implements` | `DOC:docs/blueprint/16.05-E3-US-E3.1-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.05-E3-US-E3.1-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0702` | `ART:src/routes/promociones.tsx` | `implements` | `DOC:docs/blueprint/16.05-E3-US-E3.1-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.05-E3-US-E3.1-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0703` | `ART:src/components/cards/EmpresaCard.tsx` | `implements` | `DOC:docs/blueprint/16.07-E3-US-E3.2-FASE-B-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.07-E3-US-E3.2-FASE-B-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0704` | `ART:src/components/surfaces/DestinationSurface.tsx` | `implements` | `DOC:docs/blueprint/16.07-E3-US-E3.2-FASE-B-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.07-E3-US-E3.2-FASE-B-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0705` | `ART:src/components/surfaces/MarketplaceSurface.tsx` | `implements` | `DOC:docs/blueprint/16.07-E3-US-E3.2-FASE-B-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.07-E3-US-E3.2-FASE-B-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0706` | `ART:src/components/surfaces/product-blocks.tsx` | `implements` | `DOC:docs/blueprint/16.07-E3-US-E3.2-FASE-B-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.07-E3-US-E3.2-FASE-B-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0707` | `ART:src/routes/_authenticated/cuenta/favoritos.tsx` | `implements` | `DOC:docs/blueprint/16.07-E3-US-E3.2-FASE-B-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.07-E3-US-E3.2-FASE-B-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0708` | `ART:src/routes/lovable/` | `implements` | `DOC:docs/blueprint/16.07-E3-US-E3.2-FASE-B-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.07-E3-US-E3.2-FASE-B-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0709` | `ART:src/routes/producto.$slug.tsx` | `implements` | `DOC:docs/blueprint/16.07-E3-US-E3.2-FASE-B-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.07-E3-US-E3.2-FASE-B-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0710` | `ART:src/components/commerce/` | `implements` | `DOC:docs/blueprint/16.08-E3-US-E3.3-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.08-E3-US-E3.3-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0711` | `ART:src/lib/catalog/` | `implements` | `DOC:docs/blueprint/16.08-E3-US-E3.3-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.08-E3-US-E3.3-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0712` | `ART:src/routes/marketplace.$.tsx` | `implements` | `DOC:docs/blueprint/16.08-E3-US-E3.3-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.08-E3-US-E3.3-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0713` | `ART:src/routes/marketplace.tsx` | `implements` | `DOC:docs/blueprint/16.08-E3-US-E3.3-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.08-E3-US-E3.3-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0714` | `ART:src/components/experience-builder/blocks/experience-related-collection/ExperienceRelatedCollectionBlock.tsx` | `implements` | `DOC:docs/blueprint/16.09-E2-US-E2.3-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.09-E2-US-E2.3-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0715` | `ART:src/components/surfaces/CategorySurface.tsx` | `implements` | `DOC:docs/blueprint/16.09-E2-US-E2.3-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.09-E2-US-E2.3-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0716` | `ART:src/lib/catalog/category-related.functions.ts` | `implements` | `DOC:docs/blueprint/16.09-E2-US-E2.3-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.09-E2-US-E2.3-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0717` | `ART:src/lib/experience-builder/adapters/category-related-to-block.ts` | `implements` | `DOC:docs/blueprint/16.09-E2-US-E2.3-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.09-E2-US-E2.3-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0718` | `ART:src/routes/oriente-maya/$destino.$categoria.index.tsx` | `implements` | `DOC:docs/blueprint/16.09-E2-US-E2.3-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.09-E2-US-E2.3-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0719` | `ART:src/components/surfaces/TourismListingSurface.tsx` | `implements` | `DOC:docs/blueprint/16.09-U-VISUAL-V3-DYNAMIC-LISTINGS-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.09-U-VISUAL-V3-DYNAMIC-LISTINGS-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0720` | `ART:src/lib/experience-builder/adapters/tourism-listing-adapters.ts` | `implements` | `DOC:docs/blueprint/16.09-U-VISUAL-V3-DYNAMIC-LISTINGS-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.09-U-VISUAL-V3-DYNAMIC-LISTINGS-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0721` | `ART:src/components/surfaces/TripPlannerSurface.tsx` | `implements` | `DOC:docs/blueprint/16.10-E4-US-E4.1-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.10-E4-US-E4.1-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0722` | `ART:src/components/traveler/GuestPlanPreview.tsx` | `implements` | `DOC:docs/blueprint/16.10-E4-US-E4.1-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.10-E4-US-E4.1-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0723` | `ART:src/routes/arma-tu-viaje.tsx` | `implements` | `DOC:docs/blueprint/16.10-E4-US-E4.1-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.10-E4-US-E4.1-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0724` | `ART:src/lib/traveler/travel-plans.functions.ts` | `implements` | `DOC:docs/blueprint/16.12-E4-US-E4.3-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.12-E4-US-E4.3-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0725` | `ART:src/routes/viaje-compartido.$token.tsx` | `implements` | `DOC:docs/blueprint/16.12-E4-US-E4.3-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.12-E4-US-E4.3-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0726` | `ART:src/start.ts` | `implements` | `DOC:docs/blueprint/16.13-E4-US-E4.4-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.13-E4-US-E4.4-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0727` | `ART:src/lib/traveler/traveler-public.functions.ts` | `implements` | `DOC:docs/blueprint/16.15-E5-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.15-E5-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0728` | `ART:src/lib/workspace/definitions/index.ts` | `implements` | `DOC:docs/blueprint/16.15-E5-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.15-E5-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0729` | `ART:src/routes/viajero.$handle.tsx` | `implements` | `DOC:docs/blueprint/16.15-E5-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.15-E5-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0730` | `ART:src/lib/catalog/business-related.functions.ts` | `implements` | `DOC:docs/blueprint/16.20-E6-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.20-E6-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0731` | `ART:src/lib/catalog/product-related.functions.ts` | `implements` | `DOC:docs/blueprint/16.20-E6-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.20-E6-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0732` | `ART:src/lib/related/overrides.functions.ts` | `implements` | `DOC:docs/blueprint/16.20-E6-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.20-E6-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0733` | `ART:src/routes/_authenticated/cms/relacionados.index.tsx` | `implements` | `DOC:docs/blueprint/16.20-E6-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.20-E6-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0734` | `ART:src/components/cards/EmpresaCard.tsx` | `implements` | `DOC:docs/blueprint/16.21-EG-TRUST-ENGINE-V1-CLOSURE-REPORT-v1.0.md` | docs/blueprint/16.21-EG-TRUST-ENGINE-V1-CLOSURE-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0735` | `ART:src/components/reviews/ReviewComposer.tsx` | `implements` | `DOC:docs/blueprint/16.21-EG-TRUST-ENGINE-V1-CLOSURE-REPORT-v1.0.md` | docs/blueprint/16.21-EG-TRUST-ENGINE-V1-CLOSURE-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0736` | `ART:src/components/reviews/TrustBadge.tsx` | `implements` | `DOC:docs/blueprint/16.21-EG-TRUST-ENGINE-V1-CLOSURE-REPORT-v1.0.md` | docs/blueprint/16.21-EG-TRUST-ENGINE-V1-CLOSURE-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0737` | `ART:src/components/surfaces/product-blocks.tsx` | `implements` | `DOC:docs/blueprint/16.21-EG-TRUST-ENGINE-V1-CLOSURE-REPORT-v1.0.md` | docs/blueprint/16.21-EG-TRUST-ENGINE-V1-CLOSURE-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0738` | `ART:src/lib/reviews/business-response.functions.ts` | `implements` | `DOC:docs/blueprint/16.21-EG-TRUST-ENGINE-V1-CLOSURE-REPORT-v1.0.md` | docs/blueprint/16.21-EG-TRUST-ENGINE-V1-CLOSURE-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0739` | `ART:src/lib/reviews/composer.functions.ts` | `implements` | `DOC:docs/blueprint/16.21-EG-TRUST-ENGINE-V1-CLOSURE-REPORT-v1.0.md` | docs/blueprint/16.21-EG-TRUST-ENGINE-V1-CLOSURE-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0740` | `ART:src/routes/_authenticated/portal/resenas.index.tsx` | `implements` | `DOC:docs/blueprint/16.21-EG-TRUST-ENGINE-V1-CLOSURE-REPORT-v1.0.md` | docs/blueprint/16.21-EG-TRUST-ENGINE-V1-CLOSURE-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0741` | `ART:src/components/hosting/BecomeHostFlow.tsx` | `implements` | `DOC:docs/blueprint/16.22-EPS-CLOSURE-REPORT-v1.0.md` | docs/blueprint/16.22-EPS-CLOSURE-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0742` | `ART:src/components/layout/UserMenu.tsx` | `implements` | `DOC:docs/blueprint/16.22-EPS-CLOSURE-REPORT-v1.0.md` | docs/blueprint/16.22-EPS-CLOSURE-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0743` | `ART:src/lib/hosting/hosting.functions.ts` | `implements` | `DOC:docs/blueprint/16.22-EPS-CLOSURE-REPORT-v1.0.md` | docs/blueprint/16.22-EPS-CLOSURE-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0744` | `ART:src/routes/_authenticated/admin/anfitriones.tsx` | `implements` | `DOC:docs/blueprint/16.22-EPS-CLOSURE-REPORT-v1.0.md` | docs/blueprint/16.22-EPS-CLOSURE-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0745` | `ART:src/routes/_authenticated.tsx` | `implements` | `DOC:docs/blueprint/16.23-E1b-GOOGLE-AUTH-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.23-E1b-GOOGLE-AUTH-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0746` | `ART:src/routes/auth.tsx` | `implements` | `DOC:docs/blueprint/16.23-E1b-GOOGLE-AUTH-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.23-E1b-GOOGLE-AUTH-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0747` | `ART:src/components/experience-builder/blocks/experience-related-collection/ExperienceRelatedCollectionBlock.tsx` | `implements` | `DOC:docs/blueprint/16.24-E7-RECOMMENDATION-ENGINE-V1-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.24-E7-RECOMMENDATION-ENGINE-V1-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0748` | `ART:src/lib/experience-builder/adapters/destination-related-to-block.ts` | `implements` | `DOC:docs/blueprint/16.24-E7-RECOMMENDATION-ENGINE-V1-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.24-E7-RECOMMENDATION-ENGINE-V1-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0749` | `ART:src/lib/traveler/anonymous-draft/contract.ts` | `implements` | `DOC:docs/blueprint/16.AC1-ANONYMOUS-TRAVEL-CONTINUITY-v1.0.md` | docs/blueprint/16.AC1-ANONYMOUS-TRAVEL-CONTINUITY-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0750` | `ART:src/lib/traveler/anonymous-draft/hooks.ts` | `implements` | `DOC:docs/blueprint/16.AC1-ANONYMOUS-TRAVEL-CONTINUITY-v1.0.md` | docs/blueprint/16.AC1-ANONYMOUS-TRAVEL-CONTINUITY-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0751` | `ART:src/lib/traveler/anonymous-draft/import-contract.ts` | `implements` | `DOC:docs/blueprint/16.AC1-ANONYMOUS-TRAVEL-CONTINUITY-v1.0.md` | docs/blueprint/16.AC1-ANONYMOUS-TRAVEL-CONTINUITY-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0752` | `ART:src/lib/traveler/anonymous-draft/legacy.ts` | `implements` | `DOC:docs/blueprint/16.AC1-ANONYMOUS-TRAVEL-CONTINUITY-v1.0.md` | docs/blueprint/16.AC1-ANONYMOUS-TRAVEL-CONTINUITY-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0753` | `ART:src/lib/traveler/anonymous-draft/limits.ts` | `implements` | `DOC:docs/blueprint/16.AC1-ANONYMOUS-TRAVEL-CONTINUITY-v1.0.md` | docs/blueprint/16.AC1-ANONYMOUS-TRAVEL-CONTINUITY-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0754` | `ART:src/lib/traveler/anonymous-draft/store.ts` | `implements` | `DOC:docs/blueprint/16.AC1-ANONYMOUS-TRAVEL-CONTINUITY-v1.0.md` | docs/blueprint/16.AC1-ANONYMOUS-TRAVEL-CONTINUITY-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0755` | `ART:src/lib/traveler/anonymous-draft/contract.ts` | `implements` | `DOC:docs/blueprint/16.AC1.1-FOUNDATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.AC1.1-FOUNDATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0756` | `ART:src/lib/traveler/anonymous-draft/copy.ts` | `implements` | `DOC:docs/blueprint/16.AC1.1-FOUNDATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.AC1.1-FOUNDATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0757` | `ART:src/lib/traveler/anonymous-draft/hooks.ts` | `implements` | `DOC:docs/blueprint/16.AC1.1-FOUNDATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.AC1.1-FOUNDATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0758` | `ART:src/lib/traveler/anonymous-draft/index.ts` | `implements` | `DOC:docs/blueprint/16.AC1.1-FOUNDATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.AC1.1-FOUNDATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0759` | `ART:src/lib/traveler/anonymous-draft/limits.ts` | `implements` | `DOC:docs/blueprint/16.AC1.1-FOUNDATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.AC1.1-FOUNDATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0760` | `ART:src/lib/traveler/anonymous-draft/store.ts` | `implements` | `DOC:docs/blueprint/16.AC1.1-FOUNDATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.AC1.1-FOUNDATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0761` | `ART:src/components/commerce/FavoriteButton.tsx` | `implements` | `DOC:docs/blueprint/16.AC1.2-SURFACE-REWIRING-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.AC1.2-SURFACE-REWIRING-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0762` | `ART:src/components/traveler/AddToTravelPlanButton.tsx` | `implements` | `DOC:docs/blueprint/16.AC1.2-SURFACE-REWIRING-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.AC1.2-SURFACE-REWIRING-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0763` | `ART:src/lib/traveler/anonymous-draft/copy.ts` | `implements` | `DOC:docs/blueprint/16.AC1.2-SURFACE-REWIRING-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.AC1.2-SURFACE-REWIRING-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0764` | `ART:src/components/traveler/ContinuityWelcomeSurface.tsx` | `implements` | `DOC:docs/blueprint/16.AC1.3-DELIGHT-MOMENT-CONTINUITY-v1.0.md` | docs/blueprint/16.AC1.3-DELIGHT-MOMENT-CONTINUITY-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0765` | `ART:src/lib/traveler/anonymous-draft/copy.ts` | `implements` | `DOC:docs/blueprint/16.AC1.3-DELIGHT-MOMENT-CONTINUITY-v1.0.md` | docs/blueprint/16.AC1.3-DELIGHT-MOMENT-CONTINUITY-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0766` | `ART:src/routes/index.tsx` | `implements` | `DOC:docs/blueprint/16.AC1.3-DELIGHT-MOMENT-CONTINUITY-v1.0.md` | docs/blueprint/16.AC1.3-DELIGHT-MOMENT-CONTINUITY-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0767` | `ART:src/styles.css` | `implements` | `DOC:docs/blueprint/16.AC1.3-DELIGHT-MOMENT-CONTINUITY-v1.0.md` | docs/blueprint/16.AC1.3-DELIGHT-MOMENT-CONTINUITY-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0768` | `ART:src/routes/_authenticated/cuenta/mi-viaje.tsx` | `implements` | `DOC:docs/blueprint/16.CV5-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV5-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0769` | `ART:src/components/experience-builder/blocks/DiscoveryNavigatorBlock.tsx` | `implements` | `DOC:docs/blueprint/16.CV5-VALIDATION-REPORT-v1.0.md` | docs/blueprint/16.CV5-VALIDATION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0770` | `ART:src/components/surfaces/MarketplaceSurface.tsx` | `implements` | `DOC:docs/blueprint/16.CV5-VALIDATION-REPORT-v1.0.md` | docs/blueprint/16.CV5-VALIDATION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0771` | `ART:src/lib/` | `implements` | `DOC:docs/blueprint/16.CV5-VALIDATION-REPORT-v1.0.md` | docs/blueprint/16.CV5-VALIDATION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0772` | `ART:src/lib/alux/traveler-lens.functions.ts` | `implements` | `DOC:docs/blueprint/16.CV5-VALIDATION-REPORT-v1.0.md` | docs/blueprint/16.CV5-VALIDATION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0773` | `ART:src/lib/concierge/orders.functions.ts` | `implements` | `DOC:docs/blueprint/16.CV5-VALIDATION-REPORT-v1.0.md` | docs/blueprint/16.CV5-VALIDATION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0774` | `ART:src/lib/traveler/alux-traveler.functions.ts` | `implements` | `DOC:docs/blueprint/16.CV5-VALIDATION-REPORT-v1.0.md` | docs/blueprint/16.CV5-VALIDATION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0775` | `ART:src/lib/traveler/travel-plan-optimize.functions.ts` | `implements` | `DOC:docs/blueprint/16.CV5-VALIDATION-REPORT-v1.0.md` | docs/blueprint/16.CV5-VALIDATION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0776` | `ART:src/lib/traveler/travel-plans.functions.ts` | `implements` | `DOC:docs/blueprint/16.CV5-VALIDATION-REPORT-v1.0.md` | docs/blueprint/16.CV5-VALIDATION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0777` | `ART:src/lib/traveler/trip-phase.ts` | `implements` | `DOC:docs/blueprint/16.CV5-VALIDATION-REPORT-v1.0.md` | docs/blueprint/16.CV5-VALIDATION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0778` | `ART:src/routes/_authenticated/cuenta/mi-viaje.tsx` | `implements` | `DOC:docs/blueprint/16.CV5-VALIDATION-REPORT-v1.0.md` | docs/blueprint/16.CV5-VALIDATION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0779` | `ART:scripts/assert-no-v2-imports.sh` | `demonstrates` | `DOC:docs/blueprint/16.CV5-VALIDATION-REPORT-v1.0.md` | docs/blueprint/16.CV5-VALIDATION-REPORT-v1.0.md § prueba/evidencia externa validada | 2026-07-21 |
| `E0780` | `ART:src/lib/traveler/live-day.ts` | `implements` | `DOC:docs/blueprint/16.CV6-LIVE-DESTINATION-COMPANION-v1.0.md` | docs/blueprint/16.CV6-LIVE-DESTINATION-COMPANION-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0781` | `ART:src/lib/traveler/trip-phase.ts` | `implements` | `DOC:docs/blueprint/16.CV6-LIVE-DESTINATION-COMPANION-v1.0.md` | docs/blueprint/16.CV6-LIVE-DESTINATION-COMPANION-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0782` | `ART:src/lib/traveler/live-day.ts` | `implements` | `DOC:docs/blueprint/16.CV6.1-LIVE-DAY-FOUNDATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.1-LIVE-DAY-FOUNDATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0783` | `ART:src/lib/traveler/trip-phase.ts` | `implements` | `DOC:docs/blueprint/16.CV6.1-LIVE-DAY-FOUNDATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.1-LIVE-DAY-FOUNDATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0784` | `ART:src/lib/traveler/decision-center.ts` | `implements` | `DOC:docs/blueprint/16.CV6.2-NOW-NEXT-LATER-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.2-NOW-NEXT-LATER-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0785` | `ART:src/components/traveler/NowNextLaterSurface.tsx` | `implements` | `DOC:docs/blueprint/16.CV6.3-LIVE-DAY-BOARD-SURFACE-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.3-LIVE-DAY-BOARD-SURFACE-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0786` | `ART:src/routes/_authenticated/cuenta/mi-viaje.tsx` | `implements` | `DOC:docs/blueprint/16.CV6.3-LIVE-DAY-BOARD-SURFACE-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.3-LIVE-DAY-BOARD-SURFACE-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0787` | `ART:src/lib/traveler/destination-context/index.ts` | `implements` | `DOC:docs/blueprint/16.CV6.4-DESTINATION-CONTEXT-CONTRIBUTORS-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.4-DESTINATION-CONTEXT-CONTRIBUTORS-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0788` | `ART:src/lib/traveler/destination-context/registry.ts` | `implements` | `DOC:docs/blueprint/16.CV6.4-DESTINATION-CONTEXT-CONTRIBUTORS-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.4-DESTINATION-CONTEXT-CONTRIBUTORS-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0789` | `ART:src/lib/traveler/destination-context/resolve.ts` | `implements` | `DOC:docs/blueprint/16.CV6.4-DESTINATION-CONTEXT-CONTRIBUTORS-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.4-DESTINATION-CONTEXT-CONTRIBUTORS-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0790` | `ART:src/lib/traveler/destination-context/types.ts` | `implements` | `DOC:docs/blueprint/16.CV6.4-DESTINATION-CONTEXT-CONTRIBUTORS-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.4-DESTINATION-CONTEXT-CONTRIBUTORS-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0791` | `ART:src/components/traveler/NowNextLaterSurface.tsx` | `implements` | `DOC:docs/blueprint/16.CV6.5-CONTEXT-AWARE-DECISIONS-CLOSURE-v1.0.md` | docs/blueprint/16.CV6.5-CONTEXT-AWARE-DECISIONS-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0792` | `ART:src/lib/maps/routes.server.ts` | `implements` | `DOC:docs/blueprint/16.CV6.5-CONTEXT-AWARE-DECISIONS-CLOSURE-v1.0.md` | docs/blueprint/16.CV6.5-CONTEXT-AWARE-DECISIONS-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0793` | `ART:src/lib/traveler/decision-center-destination.ts` | `implements` | `DOC:docs/blueprint/16.CV6.5-CONTEXT-AWARE-DECISIONS-CLOSURE-v1.0.md` | docs/blueprint/16.CV6.5-CONTEXT-AWARE-DECISIONS-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0794` | `ART:src/lib/traveler/destination-context/contributors/` | `implements` | `DOC:docs/blueprint/16.CV6.5-CONTEXT-AWARE-DECISIONS-CLOSURE-v1.0.md` | docs/blueprint/16.CV6.5-CONTEXT-AWARE-DECISIONS-CLOSURE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0795` | `ART:scripts/hours-status.test.ts` | `demonstrates` | `DOC:docs/blueprint/16.CV6.5-CONTEXT-AWARE-DECISIONS-CLOSURE-v1.0.md` | docs/blueprint/16.CV6.5-CONTEXT-AWARE-DECISIONS-CLOSURE-v1.0.md § prueba/evidencia externa validada | 2026-07-21 |
| `E0796` | `ART:scripts/traffic-status.test.ts` | `demonstrates` | `DOC:docs/blueprint/16.CV6.5-CONTEXT-AWARE-DECISIONS-CLOSURE-v1.0.md` | docs/blueprint/16.CV6.5-CONTEXT-AWARE-DECISIONS-CLOSURE-v1.0.md § prueba/evidencia externa validada | 2026-07-21 |
| `E0797` | `ART:src/components/traveler/NowNextLaterSurface.tsx` | `implements` | `DOC:docs/blueprint/16.CV6.5.1-CONTEXT-AWARE-DECISIONS-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.5.1-CONTEXT-AWARE-DECISIONS-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0798` | `ART:src/lib/traveler/decision-center-destination.ts` | `implements` | `DOC:docs/blueprint/16.CV6.5.1-CONTEXT-AWARE-DECISIONS-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.5.1-CONTEXT-AWARE-DECISIONS-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0799` | `ART:src/lib/traveler/destination-context.functions.ts` | `implements` | `DOC:docs/blueprint/16.CV6.5.1-CONTEXT-AWARE-DECISIONS-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.5.1-CONTEXT-AWARE-DECISIONS-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0800` | `ART:src/lib/business/hours-status.ts` | `implements` | `DOC:docs/blueprint/16.CV6.5.2-HOURS-CONTRIBUTOR-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.5.2-HOURS-CONTRIBUTOR-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0801` | `ART:src/lib/traveler/decision-center-destination.ts` | `implements` | `DOC:docs/blueprint/16.CV6.5.2-HOURS-CONTRIBUTOR-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.5.2-HOURS-CONTRIBUTOR-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0802` | `ART:src/lib/traveler/destination-context/contributors/hours.ts` | `implements` | `DOC:docs/blueprint/16.CV6.5.2-HOURS-CONTRIBUTOR-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.5.2-HOURS-CONTRIBUTOR-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0803` | `ART:src/lib/traveler/destination-context/types.ts` | `implements` | `DOC:docs/blueprint/16.CV6.5.2-HOURS-CONTRIBUTOR-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.5.2-HOURS-CONTRIBUTOR-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0804` | `ART:scripts/hours-status.test.ts` | `demonstrates` | `DOC:docs/blueprint/16.CV6.5.2-HOURS-CONTRIBUTOR-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.5.2-HOURS-CONTRIBUTOR-COMPLETION-REPORT-v1.0.md § prueba/evidencia externa validada | 2026-07-21 |
| `E0805` | `ART:src/components/traveler/NowNextLaterSurface.tsx` | `implements` | `DOC:docs/blueprint/16.CV6.5.3-TRAFFIC-CONTRIBUTOR-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.5.3-TRAFFIC-CONTRIBUTOR-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0806` | `ART:src/lib/maps/routes.server.ts` | `implements` | `DOC:docs/blueprint/16.CV6.5.3-TRAFFIC-CONTRIBUTOR-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.5.3-TRAFFIC-CONTRIBUTOR-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0807` | `ART:src/lib/traveler/decision-center-destination.ts` | `implements` | `DOC:docs/blueprint/16.CV6.5.3-TRAFFIC-CONTRIBUTOR-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.5.3-TRAFFIC-CONTRIBUTOR-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0808` | `ART:src/lib/traveler/destination-context.functions.ts` | `implements` | `DOC:docs/blueprint/16.CV6.5.3-TRAFFIC-CONTRIBUTOR-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.5.3-TRAFFIC-CONTRIBUTOR-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0809` | `ART:src/lib/traveler/destination-context/contributors/traffic.ts` | `implements` | `DOC:docs/blueprint/16.CV6.5.3-TRAFFIC-CONTRIBUTOR-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.5.3-TRAFFIC-CONTRIBUTOR-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0810` | `ART:src/lib/traveler/destination-context/types.ts` | `implements` | `DOC:docs/blueprint/16.CV6.5.3-TRAFFIC-CONTRIBUTOR-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.5.3-TRAFFIC-CONTRIBUTOR-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0811` | `ART:src/lib/traveler/traffic-status.ts` | `implements` | `DOC:docs/blueprint/16.CV6.5.3-TRAFFIC-CONTRIBUTOR-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.5.3-TRAFFIC-CONTRIBUTOR-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0812` | `ART:scripts/traffic-status.test.ts` | `demonstrates` | `DOC:docs/blueprint/16.CV6.5.3-TRAFFIC-CONTRIBUTOR-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.5.3-TRAFFIC-CONTRIBUTOR-COMPLETION-REPORT-v1.0.md § prueba/evidencia externa validada | 2026-07-21 |
| `E0813` | `ART:src/components/traveler/NowNextLaterSurface.tsx` | `implements` | `DOC:docs/blueprint/16.CV6.6-ALUX-ESPACIAL-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.6-ALUX-ESPACIAL-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0814` | `ART:src/lib/traveler/alux-spatial.ts` | `implements` | `DOC:docs/blueprint/16.CV6.6-ALUX-ESPACIAL-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.6-ALUX-ESPACIAL-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0815` | `ART:src/pwa/register-sw.ts` | `implements` | `DOC:docs/blueprint/16.CV6.6-ALUX-ESPACIAL-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.6-ALUX-ESPACIAL-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0816` | `ART:scripts/alux-spatial.test.ts` | `demonstrates` | `DOC:docs/blueprint/16.CV6.6-ALUX-ESPACIAL-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.6-ALUX-ESPACIAL-COMPLETION-REPORT-v1.0.md § prueba/evidencia externa validada | 2026-07-21 |
| `E0817` | `ART:src/lib/traveler/alux-spatial.ts` | `implements` | `DOC:docs/blueprint/16.CV6.6-ALUX-ESPACIAL-v1.0.md` | docs/blueprint/16.CV6.6-ALUX-ESPACIAL-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0818` | `ART:scripts/alux-spatial.test.ts` | `demonstrates` | `DOC:docs/blueprint/16.CV6.6-ALUX-ESPACIAL-v1.0.md` | docs/blueprint/16.CV6.6-ALUX-ESPACIAL-v1.0.md § prueba/evidencia externa validada | 2026-07-21 |
| `E0819` | `ART:src/components/traveler/NowNextLaterSurface.tsx` | `implements` | `DOC:docs/blueprint/16.CV6.7-ON-TRIP-CONCIERGE-PRIORITY-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.7-ON-TRIP-CONCIERGE-PRIORITY-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0820` | `ART:src/components/traveler/OnTripConciergePriorityBanner.tsx` | `implements` | `DOC:docs/blueprint/16.CV6.7-ON-TRIP-CONCIERGE-PRIORITY-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.7-ON-TRIP-CONCIERGE-PRIORITY-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0821` | `ART:src/lib/traveler/on-trip-concierge.ts` | `implements` | `DOC:docs/blueprint/16.CV6.7-ON-TRIP-CONCIERGE-PRIORITY-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.7-ON-TRIP-CONCIERGE-PRIORITY-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0822` | `ART:scripts/on-trip-concierge.test.ts` | `demonstrates` | `DOC:docs/blueprint/16.CV6.7-ON-TRIP-CONCIERGE-PRIORITY-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.7-ON-TRIP-CONCIERGE-PRIORITY-COMPLETION-REPORT-v1.0.md § prueba/evidencia externa validada | 2026-07-21 |
| `E0823` | `ART:src/components/traveler/OnTripConciergePriorityBanner.tsx` | `implements` | `DOC:docs/blueprint/16.CV6.7-ON-TRIP-CONCIERGE-PRIORITY-v1.0.md` | docs/blueprint/16.CV6.7-ON-TRIP-CONCIERGE-PRIORITY-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0824` | `ART:src/lib/traveler/on-trip-concierge.ts` | `implements` | `DOC:docs/blueprint/16.CV6.7-ON-TRIP-CONCIERGE-PRIORITY-v1.0.md` | docs/blueprint/16.CV6.7-ON-TRIP-CONCIERGE-PRIORITY-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0825` | `ART:src/components/traveler/LiveRecapSurface.tsx` | `implements` | `DOC:docs/blueprint/16.CV6.8-LIVE-RECAP-HANDOFF-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.8-LIVE-RECAP-HANDOFF-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0826` | `ART:src/components/traveler/NowNextLaterSurface.tsx` | `implements` | `DOC:docs/blueprint/16.CV6.8-LIVE-RECAP-HANDOFF-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.8-LIVE-RECAP-HANDOFF-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0827` | `ART:src/lib/traveler/live-recap.ts` | `implements` | `DOC:docs/blueprint/16.CV6.8-LIVE-RECAP-HANDOFF-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.8-LIVE-RECAP-HANDOFF-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0828` | `ART:scripts/live-recap.test.ts` | `demonstrates` | `DOC:docs/blueprint/16.CV6.8-LIVE-RECAP-HANDOFF-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.8-LIVE-RECAP-HANDOFF-COMPLETION-REPORT-v1.0.md § prueba/evidencia externa validada | 2026-07-21 |
| `E0829` | `ART:src/components/traveler/LiveRecapSurface.tsx` | `implements` | `DOC:docs/blueprint/16.CV6.8-LIVE-RECAP-HANDOFF-v1.0.md` | docs/blueprint/16.CV6.8-LIVE-RECAP-HANDOFF-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0830` | `ART:src/lib/traveler/live-recap.ts` | `implements` | `DOC:docs/blueprint/16.CV6.8-LIVE-RECAP-HANDOFF-v1.0.md` | docs/blueprint/16.CV6.8-LIVE-RECAP-HANDOFF-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0831` | `ART:src/components/traveler/PermissionMoment.tsx` | `implements` | `DOC:docs/blueprint/16.CV6.O1-STAGE-AWARE-WELCOME-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.O1-STAGE-AWARE-WELCOME-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0832` | `ART:src/components/traveler/WelcomeOnboardingModal.tsx` | `implements` | `DOC:docs/blueprint/16.CV6.O1-STAGE-AWARE-WELCOME-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.O1-STAGE-AWARE-WELCOME-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0833` | `ART:src/lib/traveler/journey-stage.ts` | `implements` | `DOC:docs/blueprint/16.CV6.O1-STAGE-AWARE-WELCOME-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.O1-STAGE-AWARE-WELCOME-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0834` | `ART:src/components/traveler/PermissionMoment.tsx` | `implements` | `DOC:docs/blueprint/16.CV6.O1-STAGE-AWARE-WELCOME-v1.0.md` | docs/blueprint/16.CV6.O1-STAGE-AWARE-WELCOME-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0835` | `ART:src/lib/traveler/journey-stage.ts` | `implements` | `DOC:docs/blueprint/16.CV6.O1-STAGE-AWARE-WELCOME-v1.0.md` | docs/blueprint/16.CV6.O1-STAGE-AWARE-WELCOME-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0836` | `ART:src/components/traveler/StageAwareCompanionBoard.tsx` | `implements` | `DOC:docs/blueprint/16.CV6.O2-ADAPTIVE-ALUX-EXPERIENCE-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.O2-ADAPTIVE-ALUX-EXPERIENCE-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0837` | `ART:src/lib/traveler/stage-experience.ts` | `implements` | `DOC:docs/blueprint/16.CV6.O2-ADAPTIVE-ALUX-EXPERIENCE-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.O2-ADAPTIVE-ALUX-EXPERIENCE-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0838` | `ART:src/lib/traveler/use-travel-stage.ts` | `implements` | `DOC:docs/blueprint/16.CV6.O2-ADAPTIVE-ALUX-EXPERIENCE-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.O2-ADAPTIVE-ALUX-EXPERIENCE-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0839` | `ART:src/routes/` | `implements` | `DOC:docs/blueprint/16.CV6.O2-ADAPTIVE-ALUX-EXPERIENCE-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.O2-ADAPTIVE-ALUX-EXPERIENCE-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0840` | `ART:src/routes/_authenticated/cuenta/stage-simulator.tsx` | `implements` | `DOC:docs/blueprint/16.CV6.O2-ADAPTIVE-ALUX-EXPERIENCE-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV6.O2-ADAPTIVE-ALUX-EXPERIENCE-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0841` | `ART:src/components/traveler/StageAwareCompanionBoard.tsx` | `implements` | `DOC:docs/blueprint/16.CV6.O2-STAGE-AWARE-EXPERIENCE-v1.0.md` | docs/blueprint/16.CV6.O2-STAGE-AWARE-EXPERIENCE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0842` | `ART:src/lib/traveler/stage-experience.ts` | `implements` | `DOC:docs/blueprint/16.CV6.O2-STAGE-AWARE-EXPERIENCE-v1.0.md` | docs/blueprint/16.CV6.O2-STAGE-AWARE-EXPERIENCE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0843` | `ART:src/lib/traveler/use-travel-stage.ts` | `implements` | `DOC:docs/blueprint/16.CV6.O2-STAGE-AWARE-EXPERIENCE-v1.0.md` | docs/blueprint/16.CV6.O2-STAGE-AWARE-EXPERIENCE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0844` | `ART:src/routes/_authenticated/cuenta/index.tsx` | `implements` | `DOC:docs/blueprint/16.CV6.O2-STAGE-AWARE-EXPERIENCE-v1.0.md` | docs/blueprint/16.CV6.O2-STAGE-AWARE-EXPERIENCE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0845` | `ART:src/routes/_authenticated/cuenta/stage-simulator.tsx` | `implements` | `DOC:docs/blueprint/16.CV6.O2-STAGE-AWARE-EXPERIENCE-v1.0.md` | docs/blueprint/16.CV6.O2-STAGE-AWARE-EXPERIENCE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0846` | `ART:src/lib/visitor-intel/` | `implements` | `DOC:docs/blueprint/16.CV8.0-JOURNEY-CONTRACTS-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV8.0-JOURNEY-CONTRACTS-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0847` | `ART:src/lib/visitor-intel/ingest.functions.ts` | `implements` | `DOC:docs/blueprint/16.CV8.1-JOURNEY-EVENT-INGESTION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV8.1-JOURNEY-EVENT-INGESTION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0848` | `ART:scripts/visitor-intel-ingest.test.ts` | `demonstrates` | `DOC:docs/blueprint/16.CV8.1-JOURNEY-EVENT-INGESTION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV8.1-JOURNEY-EVENT-INGESTION-COMPLETION-REPORT-v1.0.md § prueba/evidencia externa validada | 2026-07-21 |
| `E0849` | `ART:src/lib/visitor-intel/ingest.functions.ts` | `implements` | `DOC:docs/blueprint/16.CV8.1-JOURNEY-EVENT-INGESTION-v1.0.md` | docs/blueprint/16.CV8.1-JOURNEY-EVENT-INGESTION-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0850` | `ART:scripts/visitor-intel-ingest.test.ts` | `demonstrates` | `DOC:docs/blueprint/16.CV8.1-JOURNEY-EVENT-INGESTION-v1.0.md` | docs/blueprint/16.CV8.1-JOURNEY-EVENT-INGESTION-v1.0.md § prueba/evidencia externa validada | 2026-07-21 |
| `E0851` | `ART:src/lib/visitor-intel/index.ts` | `implements` | `DOC:docs/blueprint/16.CV8.2-JOURNEY-STATE-PROJECTION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV8.2-JOURNEY-STATE-PROJECTION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0852` | `ART:src/lib/visitor-intel/projection.ts` | `implements` | `DOC:docs/blueprint/16.CV8.2-JOURNEY-STATE-PROJECTION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV8.2-JOURNEY-STATE-PROJECTION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0853` | `ART:scripts/visitor-intel-projection.test.ts` | `demonstrates` | `DOC:docs/blueprint/16.CV8.2-JOURNEY-STATE-PROJECTION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV8.2-JOURNEY-STATE-PROJECTION-COMPLETION-REPORT-v1.0.md § prueba/evidencia externa validada | 2026-07-21 |
| `E0854` | `ART:src/lib/visitor-intel/projection.functions.ts` | `implements` | `DOC:docs/blueprint/16.CV8.2-JOURNEY-STATE-PROJECTION-v1.0.md` | docs/blueprint/16.CV8.2-JOURNEY-STATE-PROJECTION-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0855` | `ART:src/lib/visitor-intel/projection.ts` | `implements` | `DOC:docs/blueprint/16.CV8.2-JOURNEY-STATE-PROJECTION-v1.0.md` | docs/blueprint/16.CV8.2-JOURNEY-STATE-PROJECTION-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0856` | `ART:scripts/visitor-intel-projection.test.ts` | `demonstrates` | `DOC:docs/blueprint/16.CV8.2-JOURNEY-STATE-PROJECTION-v1.0.md` | docs/blueprint/16.CV8.2-JOURNEY-STATE-PROJECTION-v1.0.md § prueba/evidencia externa validada | 2026-07-21 |
| `E0857` | `ART:src/lib/visitor-intel/intel-aggregate.functions.ts` | `implements` | `DOC:docs/blueprint/16.CV8.3-VISITOR-INTELLIGENCE-CENTER-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV8.3-VISITOR-INTELLIGENCE-CENTER-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0858` | `ART:src/routes/_authenticated/cms/index.tsx` | `implements` | `DOC:docs/blueprint/16.CV8.3-VISITOR-INTELLIGENCE-CENTER-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV8.3-VISITOR-INTELLIGENCE-CENTER-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0859` | `ART:src/routes/_authenticated/cms/visitor-intel.tsx` | `implements` | `DOC:docs/blueprint/16.CV8.3-VISITOR-INTELLIGENCE-CENTER-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV8.3-VISITOR-INTELLIGENCE-CENTER-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0860` | `ART:src/lib/visitor-intel/journey.ts` | `implements` | `DOC:docs/blueprint/16.CV8.3-VISITOR-INTELLIGENCE-CENTER-v1.0.md` | docs/blueprint/16.CV8.3-VISITOR-INTELLIGENCE-CENTER-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0861` | `ART:src/lib/visitor-intel/events.ts` | `implements` | `DOC:docs/blueprint/16.CV8.3-VISITOR-INTELLIGENCE-CENTER-v1.0.md` | docs/blueprint/16.CV8.3-VISITOR-INTELLIGENCE-CENTER-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0862` | `ART:src/lib/visitor-intel/kpis.ts` | `implements` | `DOC:docs/blueprint/16.CV8.3-VISITOR-INTELLIGENCE-CENTER-v1.0.md` | docs/blueprint/16.CV8.3-VISITOR-INTELLIGENCE-CENTER-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0863` | `ART:src/lib/visitor-intel/projection.ts` | `implements` | `DOC:docs/blueprint/16.CV8.3-VISITOR-INTELLIGENCE-CENTER-v1.0.md` | docs/blueprint/16.CV8.3-VISITOR-INTELLIGENCE-CENTER-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0864` | `ART:src/lib/visitor-intel/segments.functions.ts` | `implements` | `DOC:docs/blueprint/16.CV8.4-VISITOR-INTELLIGENCE-SEGMENTATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV8.4-VISITOR-INTELLIGENCE-SEGMENTATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0865` | `ART:src/lib/visitor-intel/opportunities.functions.ts` | `implements` | `DOC:docs/blueprint/16.CV8.5-BENCHMARKS-OPPORTUNITY-INTELLIGENCE-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV8.5-BENCHMARKS-OPPORTUNITY-INTELLIGENCE-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0866` | `ART:src/routes/_authenticated/cms/visitor-intel.tsx` | `implements` | `DOC:docs/blueprint/16.CV8.5-BENCHMARKS-OPPORTUNITY-INTELLIGENCE-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV8.5-BENCHMARKS-OPPORTUNITY-INTELLIGENCE-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0867` | `ART:src/lib/visitor-intel/opportunities.functions.ts` | `implements` | `DOC:docs/blueprint/16.CV8.5-BENCHMARKS-OPPORTUNITY-INTELLIGENCE-v1.0.md` | docs/blueprint/16.CV8.5-BENCHMARKS-OPPORTUNITY-INTELLIGENCE-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0868` | `ART:src/lib/visitor-intel/events.ts` | `implements` | `DOC:docs/blueprint/16.CV8.6-RECOMMENDATION-VALIDATION-LOOP-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV8.6-RECOMMENDATION-VALIDATION-LOOP-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0869` | `ART:src/lib/visitor-intel/recommendations.functions.ts` | `implements` | `DOC:docs/blueprint/16.CV8.6-RECOMMENDATION-VALIDATION-LOOP-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV8.6-RECOMMENDATION-VALIDATION-LOOP-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0870` | `ART:src/routes/_authenticated/cms/visitor-intel.tsx` | `implements` | `DOC:docs/blueprint/16.CV8.6-RECOMMENDATION-VALIDATION-LOOP-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV8.6-RECOMMENDATION-VALIDATION-LOOP-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0871` | `ART:src/lib/visitor-intel/events.ts` | `implements` | `DOC:docs/blueprint/16.CV8.6-RECOMMENDATION-VALIDATION-LOOP-v1.0.md` | docs/blueprint/16.CV8.6-RECOMMENDATION-VALIDATION-LOOP-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0872` | `ART:src/lib/visitor-intel/recommendations.functions.ts` | `implements` | `DOC:docs/blueprint/16.CV8.6-RECOMMENDATION-VALIDATION-LOOP-v1.0.md` | docs/blueprint/16.CV8.6-RECOMMENDATION-VALIDATION-LOOP-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0873` | `ART:src/lib/visitor-intel/prioritization.ts` | `implements` | `DOC:docs/blueprint/16.CV8.7-PRESCRIPTIVE-DECISION-PRIORITIZATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV8.7-PRESCRIPTIVE-DECISION-PRIORITIZATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0874` | `ART:src/routes/_authenticated/cms/visitor-intel.tsx` | `implements` | `DOC:docs/blueprint/16.CV8.7-PRESCRIPTIVE-DECISION-PRIORITIZATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV8.7-PRESCRIPTIVE-DECISION-PRIORITIZATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0875` | `ART:src/lib/visitor-intel/prioritization.ts` | `implements` | `DOC:docs/blueprint/16.CV8.7-PRESCRIPTIVE-DECISION-PRIORITIZATION-v1.0.md` | docs/blueprint/16.CV8.7-PRESCRIPTIVE-DECISION-PRIORITIZATION-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0876` | `ART:src/lib/visitor-intel/segment-prioritization.ts` | `implements` | `DOC:docs/blueprint/16.CV8.8-SEGMENT-PRIORITIZATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV8.8-SEGMENT-PRIORITIZATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0877` | `ART:src/routes/_authenticated/cms/visitor-intel.tsx` | `implements` | `DOC:docs/blueprint/16.CV8.8-SEGMENT-PRIORITIZATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV8.8-SEGMENT-PRIORITIZATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0878` | `ART:src/lib/visitor-intel/segment-prioritization.ts` | `implements` | `DOC:docs/blueprint/16.CV8.8-SEGMENT-PRIORITIZATION-v1.0.md` | docs/blueprint/16.CV8.8-SEGMENT-PRIORITIZATION-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0879` | `ART:src/lib/visitor-intel/decisions.ts` | `implements` | `DOC:docs/blueprint/16.CV8.9-ACTION-QUEUE-DECISION-WORKFLOW-v1.0.md` | docs/blueprint/16.CV8.9-ACTION-QUEUE-DECISION-WORKFLOW-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0880` | `ART:src/lib/visitor-intel/decisions.ts` | `implements` | `DOC:docs/blueprint/16.CV8.9.1-ACTION-QUEUE-CONTRACT-PROJECTION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV8.9.1-ACTION-QUEUE-CONTRACT-PROJECTION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0881` | `ART:src/lib/visitor-intel/events.ts` | `implements` | `DOC:docs/blueprint/16.CV8.9.1-ACTION-QUEUE-CONTRACT-PROJECTION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV8.9.1-ACTION-QUEUE-CONTRACT-PROJECTION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0882` | `ART:src/lib/visitor-intel/recommendations.functions.ts` | `implements` | `DOC:docs/blueprint/16.CV8.9.1-ACTION-QUEUE-CONTRACT-PROJECTION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV8.9.1-ACTION-QUEUE-CONTRACT-PROJECTION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0883` | `ART:scripts/visitor-intel-decisions.test.ts` | `demonstrates` | `DOC:docs/blueprint/16.CV8.9.1-ACTION-QUEUE-CONTRACT-PROJECTION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV8.9.1-ACTION-QUEUE-CONTRACT-PROJECTION-COMPLETION-REPORT-v1.0.md § prueba/evidencia externa validada | 2026-07-21 |
| `E0884` | `ART:src/lib/visitor-intel/decision-operations.ts` | `implements` | `DOC:docs/blueprint/16.CV8.9.2-DECISION-INGESTION-ROLES-AUDIT-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV8.9.2-DECISION-INGESTION-ROLES-AUDIT-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0885` | `ART:src/lib/visitor-intel/decisions.functions.ts` | `implements` | `DOC:docs/blueprint/16.CV8.9.2-DECISION-INGESTION-ROLES-AUDIT-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV8.9.2-DECISION-INGESTION-ROLES-AUDIT-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0886` | `DOC:docs/blueprint/16.CV8.9.2-DECISION-INGESTION-ROLES-AUDIT-COMPLETION-REPORT-v1.0.md` | `requires` | `ART:supabase/migrations/20260720000200_7b6db1f9-2f0b-4bcf-9e82-3f57f9eac901.sql` | docs/blueprint/16.CV8.9.2-DECISION-INGESTION-ROLES-AUDIT-COMPLETION-REPORT-v1.0.md § migración vinculada validada | 2026-07-21 |
| `E0887` | `ART:scripts/visitor-intel-decision-operations.test.ts` | `demonstrates` | `DOC:docs/blueprint/16.CV8.9.2-DECISION-INGESTION-ROLES-AUDIT-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV8.9.2-DECISION-INGESTION-ROLES-AUDIT-COMPLETION-REPORT-v1.0.md § prueba/evidencia externa validada | 2026-07-21 |
| `E0888` | `ART:src/lib/visitor-intel/decision-metrics.ts` | `implements` | `DOC:docs/blueprint/16.CV8.9.3-4-ACTION-QUEUE-FEEDBACK-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV8.9.3-4-ACTION-QUEUE-FEEDBACK-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0889` | `ART:src/lib/visitor-intel/decision-projection.server.ts` | `implements` | `DOC:docs/blueprint/16.CV8.9.3-4-ACTION-QUEUE-FEEDBACK-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV8.9.3-4-ACTION-QUEUE-FEEDBACK-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0890` | `ART:src/lib/visitor-intel/decision-workspace.ts` | `implements` | `DOC:docs/blueprint/16.CV8.9.3-4-ACTION-QUEUE-FEEDBACK-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV8.9.3-4-ACTION-QUEUE-FEEDBACK-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0891` | `ART:src/lib/visitor-intel/recommendation-learning.ts` | `implements` | `DOC:docs/blueprint/16.CV8.9.3-4-ACTION-QUEUE-FEEDBACK-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV8.9.3-4-ACTION-QUEUE-FEEDBACK-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0892` | `ART:src/routes/_authenticated/cms/visitor-intel.tsx` | `implements` | `DOC:docs/blueprint/16.CV8.9.3-4-ACTION-QUEUE-FEEDBACK-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV8.9.3-4-ACTION-QUEUE-FEEDBACK-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0893` | `ART:src/routes/_authenticated/cms/visitor-intel_.decisions.tsx` | `implements` | `DOC:docs/blueprint/16.CV8.9.3-4-ACTION-QUEUE-FEEDBACK-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV8.9.3-4-ACTION-QUEUE-FEEDBACK-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0894` | `ART:src/lib/visitor-intel/simulation/` | `implements` | `DOC:docs/blueprint/16.CV8.S-VISITOR-INTELLIGENCE-SIMULATION-PACK-v1.0.md` | docs/blueprint/16.CV8.S-VISITOR-INTELLIGENCE-SIMULATION-PACK-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0895` | `ART:src/lib/visitor-intel/simulation/` | `implements` | `DOC:docs/blueprint/16.CV8.S.1-CONTRACTS-ISOLATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV8.S.1-CONTRACTS-ISOLATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0896` | `ART:src/lib/visitor-intel/simulation/` | `implements` | `DOC:docs/blueprint/16.CV8.S.2-EVENT-ENGINE-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV8.S.2-EVENT-ENGINE-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0897` | `ART:src/lib/visitor-intel/simulation/index.ts` | `implements` | `DOC:docs/blueprint/16.CV8.S.2-EVENT-ENGINE-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV8.S.2-EVENT-ENGINE-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0898` | `ART:scripts/visitor-intel-simulation.test.ts` | `demonstrates` | `DOC:docs/blueprint/16.CV8.S.2-EVENT-ENGINE-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV8.S.2-EVENT-ENGINE-COMPLETION-REPORT-v1.0.md § prueba/evidencia externa validada | 2026-07-21 |
| `E0899` | `ART:src/lib/visitor-intel/simulation/sub-motors/` | `implements` | `DOC:docs/blueprint/16.CV8.S.3-SUB-MOTORS-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV8.S.3-SUB-MOTORS-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0900` | `ART:scripts/visitor-intel-simulation.test.ts` | `demonstrates` | `DOC:docs/blueprint/16.CV8.S.3-SUB-MOTORS-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV8.S.3-SUB-MOTORS-COMPLETION-REPORT-v1.0.md § prueba/evidencia externa validada | 2026-07-21 |
| `E0901` | `ART:src/lib/visitor-intel/simulation/persistence.functions.ts` | `implements` | `DOC:docs/blueprint/16.CV8.S.4-PERSISTENCE-AND-ADMIN-UI-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV8.S.4-PERSISTENCE-AND-ADMIN-UI-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0902` | `ART:src/lib/visitor-intel/simulation/scenarios/oriente-maya-90d.ts` | `implements` | `DOC:docs/blueprint/16.CV8.S.4-PERSISTENCE-AND-ADMIN-UI-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV8.S.4-PERSISTENCE-AND-ADMIN-UI-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0903` | `ART:src/routes/_authenticated/cms/simulation.tsx` | `implements` | `DOC:docs/blueprint/16.CV8.S.4-PERSISTENCE-AND-ADMIN-UI-COMPLETION-REPORT-v1.0.md` | docs/blueprint/16.CV8.S.4-PERSISTENCE-AND-ADMIN-UI-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0904` | `ART:src/components/` | `implements` | `DOC:docs/blueprint/17.FOUNDER-AUDIT-v1.0.md` | docs/blueprint/17.FOUNDER-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0905` | `ART:src/lib/` | `implements` | `DOC:docs/blueprint/17.FOUNDER-AUDIT-v1.0.md` | docs/blueprint/17.FOUNDER-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0906` | `ART:src/routes/` | `implements` | `DOC:docs/blueprint/17.FOUNDER-AUDIT-v1.0.md` | docs/blueprint/17.FOUNDER-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0907` | `ART:src/config/site.ts` | `implements` | `DOC:docs/blueprint/18.H0-PERFORMANCE-SEO-BASELINE-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H0-PERFORMANCE-SEO-BASELINE-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0908` | `ART:src/lib/discovery/seo.ts` | `implements` | `DOC:docs/blueprint/18.H0-PERFORMANCE-SEO-BASELINE-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H0-PERFORMANCE-SEO-BASELINE-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0909` | `ART:src/routes/` | `implements` | `DOC:docs/blueprint/18.H0-PERFORMANCE-SEO-BASELINE-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H0-PERFORMANCE-SEO-BASELINE-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0910` | `ART:src/routes/sitemap[.]xml.ts` | `implements` | `DOC:docs/blueprint/18.H0-PERFORMANCE-SEO-BASELINE-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H0-PERFORMANCE-SEO-BASELINE-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0911` | `ART:src/lib/discovery/seo.ts` | `implements` | `DOC:docs/blueprint/18.H1-SEO-METADATA-SWEEP-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H1-SEO-METADATA-SWEEP-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0912` | `ART:src/routes/__root.tsx` | `implements` | `DOC:docs/blueprint/18.H1-SEO-METADATA-SWEEP-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H1-SEO-METADATA-SWEEP-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0913` | `ART:src/routes/sitemap[.]xml.ts` | `implements` | `DOC:docs/blueprint/18.H1-SEO-METADATA-SWEEP-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H1-SEO-METADATA-SWEEP-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0914` | `ART:src/assets/` | `implements` | `DOC:docs/blueprint/18.H3-A2-STORAGE-MEDIA-AUDIT-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H3-A2-STORAGE-MEDIA-AUDIT-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0915` | `ART:src/assets/brand/hero` | `implements` | `DOC:docs/blueprint/18.H3-A2-STORAGE-MEDIA-AUDIT-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H3-A2-STORAGE-MEDIA-AUDIT-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0916` | `ART:src/assets/brand/hero/bg01.webp` | `implements` | `DOC:docs/blueprint/18.H3-A2-STORAGE-MEDIA-AUDIT-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H3-A2-STORAGE-MEDIA-AUDIT-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0917` | `ART:src/lib/cms/media-intelligence.functions.ts` | `implements` | `DOC:docs/blueprint/18.H3-A3-MEDIA-INTELLIGENCE-PIPELINE-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H3-A3-MEDIA-INTELLIGENCE-PIPELINE-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0918` | `ART:src/components/cms/` | `implements` | `DOC:docs/blueprint/18.H3-A3b-MEDIA-INTELLIGENCE-INTEGRATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H3-A3b-MEDIA-INTELLIGENCE-INTEGRATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0919` | `ART:src/components/portal/` | `implements` | `DOC:docs/blueprint/18.H3-A3b-MEDIA-INTELLIGENCE-INTEGRATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H3-A3b-MEDIA-INTELLIGENCE-INTEGRATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0920` | `ART:src/integrations/supabase/` | `implements` | `DOC:docs/blueprint/18.H3-A3b-MEDIA-INTELLIGENCE-INTEGRATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H3-A3b-MEDIA-INTELLIGENCE-INTEGRATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0921` | `ART:src/lib/` | `implements` | `DOC:docs/blueprint/18.H3-A3b-MEDIA-INTELLIGENCE-INTEGRATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H3-A3b-MEDIA-INTELLIGENCE-INTEGRATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0922` | `ART:src/routes/_authenticated/cms/` | `implements` | `DOC:docs/blueprint/18.H3-A3b-MEDIA-INTELLIGENCE-INTEGRATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H3-A3b-MEDIA-INTELLIGENCE-INTEGRATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0923` | `ART:src/routes/_authenticated/portal/` | `implements` | `DOC:docs/blueprint/18.H3-A3b-MEDIA-INTELLIGENCE-INTEGRATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H3-A3b-MEDIA-INTELLIGENCE-INTEGRATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0924` | `ART:scripts/assert-resolve-media-alt.sh` | `demonstrates` | `DOC:docs/blueprint/18.H3-A3b-MEDIA-INTELLIGENCE-INTEGRATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H3-A3b-MEDIA-INTELLIGENCE-INTEGRATION-COMPLETION-REPORT-v1.0.md § prueba/evidencia externa validada | 2026-07-21 |
| `E0925` | `ART:scripts/media-benchmark/run-local.mjs` | `demonstrates` | `DOC:docs/blueprint/18.H3-A4-M0-ADDENDUM-BENCHMARK-RESULTS-v1.0.md` | docs/blueprint/18.H3-A4-M0-ADDENDUM-BENCHMARK-RESULTS-v1.0.md § prueba/evidencia externa validada | 2026-07-21 |
| `E0926` | `ART:scripts/media-benchmark/samples/` | `demonstrates` | `DOC:docs/blueprint/18.H3-A4-M0-ADDENDUM-BENCHMARK-RESULTS-v1.0.md` | docs/blueprint/18.H3-A4-M0-ADDENDUM-BENCHMARK-RESULTS-v1.0.md § prueba/evidencia externa validada | 2026-07-21 |
| `E0927` | `ART:src/lib/media/resolve-source.ts` | `implements` | `DOC:docs/blueprint/18.H3-A4-M0-FOUNDATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H3-A4-M0-FOUNDATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0928` | `ART:scripts/media-benchmark/` | `demonstrates` | `DOC:docs/blueprint/18.H3-A4-M0-FOUNDATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H3-A4-M0-FOUNDATION-COMPLETION-REPORT-v1.0.md § prueba/evidencia externa validada | 2026-07-21 |
| `E0929` | `ART:scripts/media-benchmark/run.ts` | `demonstrates` | `DOC:docs/blueprint/18.H3-A4-M0-FOUNDATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H3-A4-M0-FOUNDATION-COMPLETION-REPORT-v1.0.md § prueba/evidencia externa validada | 2026-07-21 |
| `E0930` | `ART:scripts/media-benchmark/README.md` | `demonstrates` | `DOC:docs/blueprint/18.H3-A4-M0-FOUNDATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H3-A4-M0-FOUNDATION-COMPLETION-REPORT-v1.0.md § prueba/evidencia externa validada | 2026-07-21 |
| `E0931` | `ART:src/lib/media/resolve-source.ts` | `implements` | `DOC:docs/blueprint/18.H3-A4-M1-PILOT-VALIDATION-REPORT-v1.0.md` | docs/blueprint/18.H3-A4-M1-PILOT-VALIDATION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0932` | `ART:src/lib/media/sign.server.ts` | `implements` | `DOC:docs/blueprint/18.H3-A4-M2-READ-PATH-ENABLEMENT-BLUEPRINT-v1.0.md` | docs/blueprint/18.H3-A4-M2-READ-PATH-ENABLEMENT-BLUEPRINT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0933` | `ART:src/lib/media/shadow-evaluator.server.ts` | `implements` | `DOC:docs/blueprint/18.H3-A4-M2-READ-PATH-ENABLEMENT-BLUEPRINT-v1.1.md` | docs/blueprint/18.H3-A4-M2-READ-PATH-ENABLEMENT-BLUEPRINT-v1.1.md § asociación de implementación validada | 2026-07-21 |
| `E0934` | `ART:src/lib/media/resolve-source.ts` | `implements` | `DOC:docs/blueprint/18.H3-A4-M2.1-INSTRUMENTATION-SHADOW-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H3-A4-M2.1-INSTRUMENTATION-SHADOW-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0935` | `ART:src/lib/media/shadow-evaluator.server.ts` | `implements` | `DOC:docs/blueprint/18.H3-A4-M2.1-INSTRUMENTATION-SHADOW-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H3-A4-M2.1-INSTRUMENTATION-SHADOW-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0936` | `ART:src/routes/api/dev/media-shadow-eval.ts` | `implements` | `DOC:docs/blueprint/18.H3-A4-M2.1-INSTRUMENTATION-SHADOW-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H3-A4-M2.1-INSTRUMENTATION-SHADOW-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0937` | `DOC:docs/blueprint/18.H3-A4-M2.1-INSTRUMENTATION-SHADOW-COMPLETION-REPORT-v1.0.md` | `requires` | `ART:[`18.H3-A4-M1-MIGRATION-VALIDATION-REPORT-v1.1.md`](../blueprint/18.H3-A4-M1-MIGRATION-VALIDATION-REPORT-v1.1.md)` | docs/blueprint/18.H3-A4-M2.1-INSTRUMENTATION-SHADOW-COMPLETION-REPORT-v1.0.md § migración vinculada validada | 2026-07-21 |
| `E0938` | `ART:scripts/shadow-evaluator.test.ts` | `demonstrates` | `DOC:docs/blueprint/18.H3-A4-M2.1-INSTRUMENTATION-SHADOW-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H3-A4-M2.1-INSTRUMENTATION-SHADOW-COMPLETION-REPORT-v1.0.md § prueba/evidencia externa validada | 2026-07-21 |
| `E0939` | `ART:src/lib/media/shadow-evaluator.server.ts` | `implements` | `DOC:docs/blueprint/18.H3-A4-M2.2-PRELOAD-INTEGRATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H3-A4-M2.2-PRELOAD-INTEGRATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0940` | `ART:src/lib/media/shadow-preloader.server.ts` | `implements` | `DOC:docs/blueprint/18.H3-A4-M2.2-PRELOAD-INTEGRATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H3-A4-M2.2-PRELOAD-INTEGRATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0941` | `ART:src/routes/api/dev/` | `implements` | `DOC:docs/blueprint/18.H3-A4-M2.2-PRELOAD-INTEGRATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H3-A4-M2.2-PRELOAD-INTEGRATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0942` | `ART:src/routes/api/dev/media-shadow-eval.ts` | `implements` | `DOC:docs/blueprint/18.H3-A4-M2.2-PRELOAD-INTEGRATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H3-A4-M2.2-PRELOAD-INTEGRATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0943` | `ART:scripts/shadow-evaluator.test.ts` | `demonstrates` | `DOC:docs/blueprint/18.H3-A4-M2.2-PRELOAD-INTEGRATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H3-A4-M2.2-PRELOAD-INTEGRATION-COMPLETION-REPORT-v1.0.md § prueba/evidencia externa validada | 2026-07-21 |
| `E0944` | `ART:scripts/shadow-preloader.test.ts` | `demonstrates` | `DOC:docs/blueprint/18.H3-A4-M2.2-PRELOAD-INTEGRATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H3-A4-M2.2-PRELOAD-INTEGRATION-COMPLETION-REPORT-v1.0.md § prueba/evidencia externa validada | 2026-07-21 |
| `E0945` | `ART:src/lib/media/shadow-evaluator.server.ts` | `implements` | `DOC:docs/blueprint/18.H3-A4-M2.3-SIGNING-CACHE-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H3-A4-M2.3-SIGNING-CACHE-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0946` | `ART:src/lib/media/sign.server.ts` | `implements` | `DOC:docs/blueprint/18.H3-A4-M2.3-SIGNING-CACHE-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H3-A4-M2.3-SIGNING-CACHE-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0947` | `ART:scripts/media-shadow-m23-bench.mjs` | `demonstrates` | `DOC:docs/blueprint/18.H3-A4-M2.3-SIGNING-CACHE-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H3-A4-M2.3-SIGNING-CACHE-COMPLETION-REPORT-v1.0.md § prueba/evidencia externa validada | 2026-07-21 |
| `E0948` | `ART:scripts/shadow-evaluator.test.ts` | `demonstrates` | `DOC:docs/blueprint/18.H3-A4-M2.3-SIGNING-CACHE-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H3-A4-M2.3-SIGNING-CACHE-COMPLETION-REPORT-v1.0.md § prueba/evidencia externa validada | 2026-07-21 |
| `E0949` | `ART:scripts/shadow-preloader.test.ts` | `demonstrates` | `DOC:docs/blueprint/18.H3-A4-M2.3-SIGNING-CACHE-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H3-A4-M2.3-SIGNING-CACHE-COMPLETION-REPORT-v1.0.md § prueba/evidencia externa validada | 2026-07-21 |
| `E0950` | `ART:scripts/sign-cache.test.ts` | `demonstrates` | `DOC:docs/blueprint/18.H3-A4-M2.3-SIGNING-CACHE-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H3-A4-M2.3-SIGNING-CACHE-COMPLETION-REPORT-v1.0.md § prueba/evidencia externa validada | 2026-07-21 |
| `E0951` | `DOC:docs/blueprint/18.H3-A4-M2.3.1-PERSISTED-SIGNATURE-PRECOMPUTATION-BLUEPRINT-v1.1.md` | `supersedes` | `DOC:docs/blueprint/18.H3-A4-M2.3.1-PERSISTED-SIGNATURE-PRECOMPUTATION-BLUEPRINT-v1.0.md` | docs/blueprint/18.H3-A4-M2.3.1-PERSISTED-SIGNATURE-PRECOMPUTATION-BLUEPRINT-v1.0.md + 06 v0.5 | 2026-07-21 |
| `E0952` | `DOC:docs/blueprint/18.H3-A4-M2.3.1-PERSISTED-SIGNATURE-PRECOMPUTATION-BLUEPRINT-v1.2.md` | `supersedes` | `DOC:docs/blueprint/18.H3-A4-M2.3.1-PERSISTED-SIGNATURE-PRECOMPUTATION-BLUEPRINT-v1.1.md` | docs/blueprint/18.H3-A4-M2.3.1-PERSISTED-SIGNATURE-PRECOMPUTATION-BLUEPRINT-v1.1.md + 06 v0.5 | 2026-07-21 |
| `E0953` | `ART:src/routes/api/public/hooks/media-signature-renew.ts` | `implements` | `DOC:docs/blueprint/18.H3-A4-M2.3.1-PERSISTED-SIGNATURE-PRECOMPUTATION-BLUEPRINT-v1.2.md` | docs/blueprint/18.H3-A4-M2.3.1-PERSISTED-SIGNATURE-PRECOMPUTATION-BLUEPRINT-v1.2.md § asociación de implementación validada | 2026-07-21 |
| `E0954` | `DOC:docs/blueprint/18.H3-A4-M2.3.1-PHASE-B-COMPLETION-REPORT-v1.1.md` | `supersedes` | `DOC:docs/blueprint/18.H3-A4-M2.3.1-PHASE-B-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H3-A4-M2.3.1-PHASE-B-COMPLETION-REPORT-v1.0.md + 06 v0.5 | 2026-07-21 |
| `E0955` | `ART:src/lib/media/persisted-flag.server.ts` | `implements` | `DOC:docs/blueprint/18.H3-A4-M2.3.1-PHASE-B-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H3-A4-M2.3.1-PHASE-B-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0956` | `ART:src/lib/media/renewal-bootstrap.functions.ts` | `implements` | `DOC:docs/blueprint/18.H3-A4-M2.3.1-PHASE-B-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H3-A4-M2.3.1-PHASE-B-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0957` | `ART:src/lib/media/renewal-hmac.server.ts` | `implements` | `DOC:docs/blueprint/18.H3-A4-M2.3.1-PHASE-B-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H3-A4-M2.3.1-PHASE-B-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0958` | `ART:src/lib/media/renewal-processor.server.ts` | `implements` | `DOC:docs/blueprint/18.H3-A4-M2.3.1-PHASE-B-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H3-A4-M2.3.1-PHASE-B-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0959` | `ART:src/routes/api/public/hooks/media-signature-renew.ts` | `implements` | `DOC:docs/blueprint/18.H3-A4-M2.3.1-PHASE-B-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H3-A4-M2.3.1-PHASE-B-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0960` | `ART:scripts/media-renewal-hmac.test.mjs` | `demonstrates` | `DOC:docs/blueprint/18.H3-A4-M2.3.1-PHASE-B-COMPLETION-REPORT-v1.0.md` | docs/blueprint/18.H3-A4-M2.3.1-PHASE-B-COMPLETION-REPORT-v1.0.md § prueba/evidencia externa validada | 2026-07-21 |
| `E0961` | `ART:src/lib/media/renewal-processor.server.ts` | `implements` | `DOC:docs/blueprint/18.H3-A4-M2.3.1-PHASE-B-COMPLETION-REPORT-v1.1.md` | docs/blueprint/18.H3-A4-M2.3.1-PHASE-B-COMPLETION-REPORT-v1.1.md § asociación de implementación validada | 2026-07-21 |
| `E0962` | `ART:public/logo.png` | `implements` | `DOC:docs/blueprint/18.H3-IMAGE-PIPELINE-BASELINE-AUDIT-v1.0.md` | docs/blueprint/18.H3-IMAGE-PIPELINE-BASELINE-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0963` | `ART:src/assets` | `implements` | `DOC:docs/blueprint/18.H3-IMAGE-PIPELINE-BASELINE-AUDIT-v1.0.md` | docs/blueprint/18.H3-IMAGE-PIPELINE-BASELINE-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0964` | `ART:src/assets/` | `implements` | `DOC:docs/blueprint/18.H3-IMAGE-PIPELINE-BASELINE-AUDIT-v1.0.md` | docs/blueprint/18.H3-IMAGE-PIPELINE-BASELINE-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0965` | `ART:src/assets/brand/hero/bg01.webp` | `implements` | `DOC:docs/blueprint/18.H3-IMAGE-PIPELINE-BASELINE-AUDIT-v1.0.md` | docs/blueprint/18.H3-IMAGE-PIPELINE-BASELINE-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0966` | `ART:src/assets/brand/hero/bg02.webp` | `implements` | `DOC:docs/blueprint/18.H3-IMAGE-PIPELINE-BASELINE-AUDIT-v1.0.md` | docs/blueprint/18.H3-IMAGE-PIPELINE-BASELINE-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0967` | `ART:src/assets/brand/logo.png` | `implements` | `DOC:docs/blueprint/18.H3-IMAGE-PIPELINE-BASELINE-AUDIT-v1.0.md` | docs/blueprint/18.H3-IMAGE-PIPELINE-BASELINE-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0968` | `ART:src/components/home/Hero.tsx` | `implements` | `DOC:docs/blueprint/18.H3-IMAGE-PIPELINE-BASELINE-AUDIT-v1.0.md` | docs/blueprint/18.H3-IMAGE-PIPELINE-BASELINE-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0969` | `ART:src/routes/index.tsx` | `implements` | `DOC:docs/blueprint/18.H3-IMAGE-PIPELINE-BASELINE-AUDIT-v1.0.md` | docs/blueprint/18.H3-IMAGE-PIPELINE-BASELINE-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0970` | `ART:src/lib/mcp/lib/` | `implements` | `DOC:docs/blueprint/19.MCP-M1.0-FOUNDATIONS-COMPLETION-REPORT-v1.0.md` | docs/blueprint/19.MCP-M1.0-FOUNDATIONS-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0971` | `ART:src/lib/mcp/lib/rate-limit.ts` | `implements` | `DOC:docs/blueprint/19.MCP-M1.0-FOUNDATIONS-COMPLETION-REPORT-v1.0.md` | docs/blueprint/19.MCP-M1.0-FOUNDATIONS-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0972` | `ART:src/lib/mcp/lib/sanitize.ts` | `implements` | `DOC:docs/blueprint/19.MCP-M1.0-FOUNDATIONS-COMPLETION-REPORT-v1.0.md` | docs/blueprint/19.MCP-M1.0-FOUNDATIONS-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0973` | `ART:src/lib/mcp/tools/` | `implements` | `DOC:docs/blueprint/19.MCP-M1.0-FOUNDATIONS-COMPLETION-REPORT-v1.0.md` | docs/blueprint/19.MCP-M1.0-FOUNDATIONS-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0974` | `ART:src/components/ui/LazyToasterHost.tsx` | `implements` | `DOC:docs/blueprint/C1-LAZY-TOASTER-SPIKE-REPORT-v1.0.md` | docs/blueprint/C1-LAZY-TOASTER-SPIKE-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0975` | `ART:src/components/ui/sonner.tsx` | `implements` | `DOC:docs/blueprint/C1-LAZY-TOASTER-SPIKE-REPORT-v1.0.md` | docs/blueprint/C1-LAZY-TOASTER-SPIKE-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0976` | `ART:src/lib/toast.ts` | `implements` | `DOC:docs/blueprint/C1-LAZY-TOASTER-SPIKE-REPORT-v1.0.md` | docs/blueprint/C1-LAZY-TOASTER-SPIKE-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0977` | `ART:src/routes/__root.tsx` | `implements` | `DOC:docs/blueprint/C1-LAZY-TOASTER-SPIKE-REPORT-v1.0.md` | docs/blueprint/C1-LAZY-TOASTER-SPIKE-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0978` | `ART:src/lib/` | `implements` | `DOC:docs/blueprint/C2-RENDER-ONLY-BLOCK-CONTRACTS-PHASE0-ANALYSIS-v1.0.md` | docs/blueprint/C2-RENDER-ONLY-BLOCK-CONTRACTS-PHASE0-ANALYSIS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0979` | `ART:src/lib/experience-builder/blocks/` | `implements` | `DOC:docs/blueprint/C2-RENDER-ONLY-BLOCK-CONTRACTS-PHASE0-ANALYSIS-v1.0.md` | docs/blueprint/C2-RENDER-ONLY-BLOCK-CONTRACTS-PHASE0-ANALYSIS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0980` | `ART:src/lib/experience-builder/blocks/experience-hero/` | `implements` | `DOC:docs/blueprint/C2-RENDER-ONLY-BLOCK-CONTRACTS-PHASE0-ANALYSIS-v1.0.md` | docs/blueprint/C2-RENDER-ONLY-BLOCK-CONTRACTS-PHASE0-ANALYSIS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0981` | `ART:src/lib/mcp/` | `implements` | `DOC:docs/blueprint/C2-RENDER-ONLY-BLOCK-CONTRACTS-PHASE0-ANALYSIS-v1.0.md` | docs/blueprint/C2-RENDER-ONLY-BLOCK-CONTRACTS-PHASE0-ANALYSIS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0982` | `ART:src/lib/traveler/anonymous-draft/contract.ts` | `implements` | `DOC:docs/blueprint/C2-RENDER-ONLY-BLOCK-CONTRACTS-PHASE0-ANALYSIS-v1.0.md` | docs/blueprint/C2-RENDER-ONLY-BLOCK-CONTRACTS-PHASE0-ANALYSIS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0983` | `ART:src/lib/visitor-intel/` | `implements` | `DOC:docs/blueprint/C2-RENDER-ONLY-BLOCK-CONTRACTS-PHASE0-ANALYSIS-v1.0.md` | docs/blueprint/C2-RENDER-ONLY-BLOCK-CONTRACTS-PHASE0-ANALYSIS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0984` | `ART:src/routes/api/public/` | `implements` | `DOC:docs/blueprint/C2-RENDER-ONLY-BLOCK-CONTRACTS-PHASE0-ANALYSIS-v1.0.md` | docs/blueprint/C2-RENDER-ONLY-BLOCK-CONTRACTS-PHASE0-ANALYSIS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0985` | `ART:src/routes/index.tsx` | `implements` | `DOC:docs/blueprint/C2-RENDER-ONLY-BLOCK-CONTRACTS-PHASE0-ANALYSIS-v1.0.md` | docs/blueprint/C2-RENDER-ONLY-BLOCK-CONTRACTS-PHASE0-ANALYSIS-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0986` | `ART:src/components/experience-builder/blocks/experience-map/ExperienceMapBlock.tsx` | `implements` | `DOC:docs/blueprint/C2.F1-EXPERIENCE-MAP-PILOT-COMPLETION-REPORT-v1.0.md` | docs/blueprint/C2.F1-EXPERIENCE-MAP-PILOT-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0987` | `ART:src/lib/experience-builder/blocks/experience-map/contract.ts` | `implements` | `DOC:docs/blueprint/C2.F1-EXPERIENCE-MAP-PILOT-COMPLETION-REPORT-v1.0.md` | docs/blueprint/C2.F1-EXPERIENCE-MAP-PILOT-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0988` | `ART:src/lib/experience-builder/blocks/experience-map/defaults.ts` | `implements` | `DOC:docs/blueprint/C2.F1-EXPERIENCE-MAP-PILOT-COMPLETION-REPORT-v1.0.md` | docs/blueprint/C2.F1-EXPERIENCE-MAP-PILOT-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0989` | `ART:src/lib/experience-builder/blocks/experience-map/types.ts` | `implements` | `DOC:docs/blueprint/C2.F1-EXPERIENCE-MAP-PILOT-COMPLETION-REPORT-v1.0.md` | docs/blueprint/C2.F1-EXPERIENCE-MAP-PILOT-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0993` | `ART:scripts/experience-map-defaults.test.ts` | `demonstrates` | `DOC:docs/blueprint/C2.F1-EXPERIENCE-MAP-PILOT-COMPLETION-REPORT-v1.0.md` | docs/blueprint/C2.F1-EXPERIENCE-MAP-PILOT-COMPLETION-REPORT-v1.0.md § prueba/evidencia externa validada | 2026-07-21 |
| `E0991` | `ART:public/push-sw.js` | `implements` | `DOC:docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md` | docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0992` | `ART:src/components/experience-builder/PagesPanel.tsx` | `implements` | `DOC:docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md` | docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0993` | `ART:src/components/experience-builder/SeoPreview.tsx` | `implements` | `DOC:docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md` | docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0994` | `ART:src/config/site.ts` | `implements` | `DOC:docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md` | docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0995` | `ART:src/integrations/supabase/` | `implements` | `DOC:docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md` | docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0996` | `ART:src/lib/discovery/seo.ts` | `implements` | `DOC:docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md` | docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0997` | `ART:src/lib/email-templates/coupon-issued.tsx` | `implements` | `DOC:docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md` | docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0998` | `ART:src/lib/email-templates/coupon-redeemed.tsx` | `implements` | `DOC:docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md` | docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E0999` | `ART:src/lib/email-templates/coupon-review-reminder.tsx` | `implements` | `DOC:docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md` | docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1000` | `ART:src/lib/email-templates/visibility-expired.tsx` | `implements` | `DOC:docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md` | docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1001` | `ART:src/lib/email-templates/visibility-expiring.tsx` | `implements` | `DOC:docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md` | docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1002` | `ART:src/lib/email-templates/visibility-rejected.tsx` | `implements` | `DOC:docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md` | docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1003` | `ART:src/lib/email-templates/visibility-request-received.tsx` | `implements` | `DOC:docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md` | docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1004` | `ART:src/lib/mcp/index.ts` | `implements` | `DOC:docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md` | docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1005` | `ART:src/lib/mcp/lib/contracts.ts` | `implements` | `DOC:docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md` | docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1006` | `ART:src/lib/mcp/tools/` | `implements` | `DOC:docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md` | docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1007` | `ART:src/lib/media/shadow-evaluator.server.ts` | `implements` | `DOC:docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md` | docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1008` | `ART:src/lib/visibility/visibility-notifications.server.ts` | `implements` | `DOC:docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md` | docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1009` | `ART:src/routeTree.gen.ts` | `implements` | `DOC:docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md` | docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1010` | `ART:src/routes/[.]lovable.oauth.consent.tsx` | `implements` | `DOC:docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md` | docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1011` | `ART:src/routes/[.mcp]/` | `implements` | `DOC:docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md` | docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1012` | `ART:src/routes/[.well-known]/oauth-protected-resource.ts` | `implements` | `DOC:docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md` | docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1013` | `ART:src/routes/_authenticated/cuenta/documentos.$orderId.tsx` | `implements` | `DOC:docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md` | docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1014` | `ART:src/routes/blog.tsx` | `implements` | `DOC:docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md` | docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1015` | `ART:src/routes/contacto.tsx` | `implements` | `DOC:docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md` | docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1016` | `ART:src/routes/lovable/email/auth/preview.ts` | `implements` | `DOC:docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md` | docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1017` | `ART:src/routes/mcp.ts` | `implements` | `DOC:docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md` | docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1018` | `ART:src/routes/privacidad.tsx` | `implements` | `DOC:docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md` | docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1019` | `ART:src/routes/sitemap[.]xml.ts` | `implements` | `DOC:docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md` | docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1020` | `ART:src/routes/terminos.tsx` | `implements` | `DOC:docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md` | docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1021` | `DOC:docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md` | `requires` | `ART:supabase/migrations/` | docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md § migración vinculada validada | 2026-07-21 |
| `E1022` | `DOC:docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md` | `requires` | `ART:supabase/migrations/20260701041232_b9fbeade-1c9c-44b2-87c5-a0e627e8629b.sql` | docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md § migración vinculada validada | 2026-07-21 |
| `E1023` | `DOC:docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md` | `requires` | `ART:supabase/migrations/20260703172956_0b9a9687-6638-462e-bdb1-18b9f4dc1a91.sql` | docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md § migración vinculada validada | 2026-07-21 |
| `E1024` | `DOC:docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md` | `requires` | `ART:supabase/migrations/20260704203449_9bd4ac4c-f949-4daa-90f4-0a0ad9f1f6a7.sql` | docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md § migración vinculada validada | 2026-07-21 |
| `E1025` | `ART:scripts/shadow-evaluator.test.ts` | `demonstrates` | `DOC:docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md` | docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md § prueba/evidencia externa validada | 2026-07-21 |
| `E1026` | `ART:scripts/shadow-preloader.test.ts` | `demonstrates` | `DOC:docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md` | docs/blueprint/CANONICAL-DOMAIN-AUDIT-v1.0.md § prueba/evidencia externa validada | 2026-07-21 |
| `E1027` | `ART:public/push-sw.js` | `implements` | `DOC:docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1028` | `ART:src/components/experience-builder/SeoPreview.tsx` | `implements` | `DOC:docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1029` | `ART:src/config/site.ts` | `implements` | `DOC:docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1030` | `ART:src/lib/discovery/index.ts` | `implements` | `DOC:docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1031` | `ART:src/lib/discovery/seo.ts` | `implements` | `DOC:docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1032` | `ART:src/lib/email-templates/` | `implements` | `DOC:docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1033` | `ART:src/lib/email-templates/coupon-issued.tsx` | `implements` | `DOC:docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1034` | `ART:src/lib/email-templates/coupon-redeemed.tsx` | `implements` | `DOC:docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1035` | `ART:src/lib/email-templates/coupon-review-reminder.tsx` | `implements` | `DOC:docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1036` | `ART:src/lib/email-templates/trip-post.tsx` | `implements` | `DOC:docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1037` | `ART:src/lib/email-templates/trip-t14.tsx` | `implements` | `DOC:docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1038` | `ART:src/lib/email-templates/trip-t3.tsx` | `implements` | `DOC:docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1039` | `ART:src/lib/email-templates/trip-welcome.tsx` | `implements` | `DOC:docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1040` | `ART:src/lib/email-templates/visibility-activated.tsx` | `implements` | `DOC:docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1041` | `ART:src/lib/email-templates/visibility-expired.tsx` | `implements` | `DOC:docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1042` | `ART:src/lib/email-templates/visibility-expiring.tsx` | `implements` | `DOC:docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1043` | `ART:src/lib/email-templates/visibility-rejected.tsx` | `implements` | `DOC:docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1044` | `ART:src/lib/email-templates/visibility-request-received.tsx` | `implements` | `DOC:docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1045` | `ART:src/lib/mcp/` | `implements` | `DOC:docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1046` | `ART:src/lib/media/shadow-evaluator.server.ts` | `implements` | `DOC:docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1047` | `ART:src/lib/visibility/visibility-notifications.server.ts` | `implements` | `DOC:docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1048` | `ART:src/routes/[.]lovable.oauth.consent.tsx` | `implements` | `DOC:docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1049` | `ART:src/routes/[.mcp]/` | `implements` | `DOC:docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1050` | `ART:src/routes/[.well-known]/` | `implements` | `DOC:docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1051` | `ART:src/routes/blog.tsx` | `implements` | `DOC:docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1052` | `ART:src/routes/mcp.ts` | `implements` | `DOC:docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1053` | `ART:src/routes/privacidad.tsx` | `implements` | `DOC:docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1054` | `ART:src/routes/producto.$slug.tsx` | `implements` | `DOC:docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1055` | `ART:src/routes/sitemap[.]xml.ts` | `implements` | `DOC:docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1056` | `ART:src/routes/terminos.tsx` | `implements` | `DOC:docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1057` | `DOC:docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md` | `requires` | `ART:supabase/migrations/` | docs/blueprint/PR-1-CANONICAL-CORE-CONSOLIDATION-COMPLETION-REPORT-v1.0.md § migración vinculada validada | 2026-07-21 |
| `E1058` | `ART:public/push-sw.js` | `implements` | `DOC:docs/blueprint/PR-2-INFRASTRUCTURE-EXTERNALIZATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/PR-2-INFRASTRUCTURE-EXTERNALIZATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1059` | `ART:public/pwa-skipwaiting.js` | `implements` | `DOC:docs/blueprint/PR-2-INFRASTRUCTURE-EXTERNALIZATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/PR-2-INFRASTRUCTURE-EXTERNALIZATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1060` | `ART:src/config/site.ts` | `implements` | `DOC:docs/blueprint/PR-2-INFRASTRUCTURE-EXTERNALIZATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/PR-2-INFRASTRUCTURE-EXTERNALIZATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1061` | `ART:src/routes/__root.tsx` | `implements` | `DOC:docs/blueprint/PR-2-INFRASTRUCTURE-EXTERNALIZATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/PR-2-INFRASTRUCTURE-EXTERNALIZATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1062` | `ART:src/routes/llms[.]txt.ts` | `implements` | `DOC:docs/blueprint/PR-2-INFRASTRUCTURE-EXTERNALIZATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/PR-2-INFRASTRUCTURE-EXTERNALIZATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1063` | `ART:src/routes/manifest[.]webmanifest.ts` | `implements` | `DOC:docs/blueprint/PR-2-INFRASTRUCTURE-EXTERNALIZATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/PR-2-INFRASTRUCTURE-EXTERNALIZATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1064` | `ART:src/routes/robots[.]txt.ts` | `implements` | `DOC:docs/blueprint/PR-2-INFRASTRUCTURE-EXTERNALIZATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/PR-2-INFRASTRUCTURE-EXTERNALIZATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1065` | `ART:src/routes/sitemap[.]xml.ts` | `implements` | `DOC:docs/blueprint/PR-2-INFRASTRUCTURE-EXTERNALIZATION-COMPLETION-REPORT-v1.0.md` | docs/blueprint/PR-2-INFRASTRUCTURE-EXTERNALIZATION-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1066` | `ART:src/lib/experience-builder/route-inventory.ts` | `implements` | `DOC:docs/blueprint/SEO-DEMAND-ARCHITECTURE-AUDIT-v1.0.md` | docs/blueprint/SEO-DEMAND-ARCHITECTURE-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1067` | `ART:src/routes/` | `implements` | `DOC:docs/blueprint/SEO-DEMAND-ARCHITECTURE-AUDIT-v1.0.md` | docs/blueprint/SEO-DEMAND-ARCHITECTURE-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1068` | `ART:src/routes/sitemap[.]xml.ts` | `implements` | `DOC:docs/blueprint/SEO-DEMAND-ARCHITECTURE-AUDIT-v1.0.md` | docs/blueprint/SEO-DEMAND-ARCHITECTURE-AUDIT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1069` | `ART:src/lib/discovery/seo.ts` | `implements` | `DOC:docs/blueprint/SEO-LAUNCH-CERTIFICATION-v1.0.md` | docs/blueprint/SEO-LAUNCH-CERTIFICATION-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1070` | `ART:src/lib/mcp/` | `implements` | `DOC:docs/blueprint/SEO-LAUNCH-CERTIFICATION-v1.0.md` | docs/blueprint/SEO-LAUNCH-CERTIFICATION-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1071` | `ART:src/routes/` | `implements` | `DOC:docs/blueprint/SEO-LAUNCH-CERTIFICATION-v1.0.md` | docs/blueprint/SEO-LAUNCH-CERTIFICATION-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1072` | `ART:src/routes/sitemap[.]xml.ts` | `implements` | `DOC:docs/blueprint/SEO-LAUNCH-CERTIFICATION-v1.0.md` | docs/blueprint/SEO-LAUNCH-CERTIFICATION-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1073` | `ART:src/lib/discovery/` | `implements` | `DOC:docs/blueprint/SEO.A1-FASE0-INVENTORY-v1.0.md` | docs/blueprint/SEO.A1-FASE0-INVENTORY-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1074` | `ART:src/lib/discovery/seo.ts` | `implements` | `DOC:docs/blueprint/SEO.A1-FASE0-INVENTORY-v1.0.md` | docs/blueprint/SEO.A1-FASE0-INVENTORY-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1075` | `ART:src/lib/experience-builder/blocks/experience-map/` | `implements` | `DOC:docs/blueprint/SEO.A1-FASE0-INVENTORY-v1.0.md` | docs/blueprint/SEO.A1-FASE0-INVENTORY-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1076` | `ART:src/lib/experience-builder/eb-sitemap.functions.ts` | `implements` | `DOC:docs/blueprint/SEO.A1-FASE0-INVENTORY-v1.0.md` | docs/blueprint/SEO.A1-FASE0-INVENTORY-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1077` | `ART:src/routes/` | `implements` | `DOC:docs/blueprint/SEO.A1-FASE0-INVENTORY-v1.0.md` | docs/blueprint/SEO.A1-FASE0-INVENTORY-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1078` | `ART:src/routes/sitemap[.]xml.ts` | `implements` | `DOC:docs/blueprint/SEO.A1-FASE0-INVENTORY-v1.0.md` | docs/blueprint/SEO.A1-FASE0-INVENTORY-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1079` | `ART:src/config/regions.ts` | `implements` | `DOC:docs/blueprint/SEO.A1.1-ENTITY-STRUCTURED-DATA-MATRIX-v1.0.md` | docs/blueprint/SEO.A1.1-ENTITY-STRUCTURED-DATA-MATRIX-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1080` | `ART:src/config/site.ts` | `implements` | `DOC:docs/blueprint/SEO.A1.1-ENTITY-STRUCTURED-DATA-MATRIX-v1.0.md` | docs/blueprint/SEO.A1.1-ENTITY-STRUCTURED-DATA-MATRIX-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1081` | `ART:src/lib/discovery/seo.ts` | `implements` | `DOC:docs/blueprint/SEO.A1.1-ENTITY-STRUCTURED-DATA-MATRIX-v1.0.md` | docs/blueprint/SEO.A1.1-ENTITY-STRUCTURED-DATA-MATRIX-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1082` | `ART:src/routes/` | `implements` | `DOC:docs/blueprint/SEO.A1.1-ENTITY-STRUCTURED-DATA-MATRIX-v1.0.md` | docs/blueprint/SEO.A1.1-ENTITY-STRUCTURED-DATA-MATRIX-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1083` | `ART:src/lib/discovery/seo.ts` | `implements` | `DOC:docs/blueprint/SEO.A1.1-PR1-FOUNDATION-SCHEMA-COMPLETION-REPORT-v1.0.md` | docs/blueprint/SEO.A1.1-PR1-FOUNDATION-SCHEMA-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1084` | `ART:src/routes/__root.tsx` | `implements` | `DOC:docs/blueprint/SEO.A1.1-PR1-FOUNDATION-SCHEMA-COMPLETION-REPORT-v1.0.md` | docs/blueprint/SEO.A1.1-PR1-FOUNDATION-SCHEMA-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1085` | `ART:src/routes/mapa.tsx` | `implements` | `DOC:docs/blueprint/SEO.A1.1-PR1-FOUNDATION-SCHEMA-COMPLETION-REPORT-v1.0.md` | docs/blueprint/SEO.A1.1-PR1-FOUNDATION-SCHEMA-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1086` | `ART:src/routes/viajero.$handle.tsx` | `implements` | `DOC:docs/blueprint/SEO.A1.1-PR1-FOUNDATION-SCHEMA-COMPLETION-REPORT-v1.0.md` | docs/blueprint/SEO.A1.1-PR1-FOUNDATION-SCHEMA-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1087` | `ART:src/lib/discovery/seo.ts` | `implements` | `DOC:docs/blueprint/SEO.A1.1-PR2-TERRITORIAL-SCHEMA-ACCEPTANCE-REVIEW-v1.0.md` | docs/blueprint/SEO.A1.1-PR2-TERRITORIAL-SCHEMA-ACCEPTANCE-REVIEW-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1088` | `ART:src/lib/discovery/seo.ts` | `implements` | `DOC:docs/blueprint/SEO.A1.1-PR2-TERRITORIAL-SCHEMA-COMPLETION-REPORT-v1.0.md` | docs/blueprint/SEO.A1.1-PR2-TERRITORIAL-SCHEMA-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1089` | `ART:src/routes/oriente-maya/$destino.$categoria.$empresa.$producto.tsx` | `implements` | `DOC:docs/blueprint/SEO.A1.1-PR2-TERRITORIAL-SCHEMA-COMPLETION-REPORT-v1.0.md` | docs/blueprint/SEO.A1.1-PR2-TERRITORIAL-SCHEMA-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1090` | `ART:src/routes/oriente-maya/$destino.$categoria.$empresa.index.tsx` | `implements` | `DOC:docs/blueprint/SEO.A1.1-PR2-TERRITORIAL-SCHEMA-COMPLETION-REPORT-v1.0.md` | docs/blueprint/SEO.A1.1-PR2-TERRITORIAL-SCHEMA-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1091` | `ART:src/routes/oriente-maya/$destino.$categoria.index.tsx` | `implements` | `DOC:docs/blueprint/SEO.A1.1-PR2-TERRITORIAL-SCHEMA-COMPLETION-REPORT-v1.0.md` | docs/blueprint/SEO.A1.1-PR2-TERRITORIAL-SCHEMA-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1092` | `ART:src/routes/oriente-maya/$destino.index.tsx` | `implements` | `DOC:docs/blueprint/SEO.A1.1-PR2-TERRITORIAL-SCHEMA-COMPLETION-REPORT-v1.0.md` | docs/blueprint/SEO.A1.1-PR2-TERRITORIAL-SCHEMA-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1093` | `ART:src/routes/oriente-maya/index.tsx` | `implements` | `DOC:docs/blueprint/SEO.A1.1-PR2-TERRITORIAL-SCHEMA-COMPLETION-REPORT-v1.0.md` | docs/blueprint/SEO.A1.1-PR2-TERRITORIAL-SCHEMA-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1094` | `ART:src/lib/discovery/seo.ts` | `implements` | `DOC:docs/blueprint/SEO.A1.1-PR3-COMMERCIAL-SCHEMA-COMPLETION-REPORT-v1.0.md` | docs/blueprint/SEO.A1.1-PR3-COMMERCIAL-SCHEMA-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1095` | `ART:src/routes/eventos.$slug.tsx` | `implements` | `DOC:docs/blueprint/SEO.A1.1-PR3-COMMERCIAL-SCHEMA-COMPLETION-REPORT-v1.0.md` | docs/blueprint/SEO.A1.1-PR3-COMMERCIAL-SCHEMA-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1096` | `ART:src/routes/oriente-maya/$destino.$categoria.$empresa.$producto.tsx` | `implements` | `DOC:docs/blueprint/SEO.A1.1-PR3-COMMERCIAL-SCHEMA-COMPLETION-REPORT-v1.0.md` | docs/blueprint/SEO.A1.1-PR3-COMMERCIAL-SCHEMA-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1097` | `ART:public/og/default-1200x630.jpg` | `implements` | `DOC:docs/blueprint/SEO.A1.2-ROUTE-METADATA-COVERAGE-COMPLETION-REPORT-v1.0.md` | docs/blueprint/SEO.A1.2-ROUTE-METADATA-COVERAGE-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1098` | `ART:src/config/site.ts` | `implements` | `DOC:docs/blueprint/SEO.A1.2-ROUTE-METADATA-COVERAGE-COMPLETION-REPORT-v1.0.md` | docs/blueprint/SEO.A1.2-ROUTE-METADATA-COVERAGE-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1099` | `ART:src/lib/discovery/seo.ts` | `implements` | `DOC:docs/blueprint/SEO.A1.2-ROUTE-METADATA-COVERAGE-COMPLETION-REPORT-v1.0.md` | docs/blueprint/SEO.A1.2-ROUTE-METADATA-COVERAGE-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1100` | `ART:src/routes/_authenticated.tsx` | `implements` | `DOC:docs/blueprint/SEO.A1.2-ROUTE-METADATA-COVERAGE-COMPLETION-REPORT-v1.0.md` | docs/blueprint/SEO.A1.2-ROUTE-METADATA-COVERAGE-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1101` | `ART:src/routes/sitemap[.]xml.ts` | `implements` | `DOC:docs/blueprint/SEO.A1.2-ROUTE-METADATA-COVERAGE-COMPLETION-REPORT-v1.0.md` | docs/blueprint/SEO.A1.2-ROUTE-METADATA-COVERAGE-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1102` | `ART:src/lib/discovery/seo.ts` | `implements` | `DOC:docs/blueprint/SEO.A1.2-ROUTE-METADATA-COVERAGE-MATRIX-v1.0.md` | docs/blueprint/SEO.A1.2-ROUTE-METADATA-COVERAGE-MATRIX-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1103` | `ART:src/routes/oriente-maya/$destino.index.tsx` | `implements` | `DOC:docs/blueprint/SEO.A2.M1-TERRITORIAL-LANDING-MVP-COMPLETION-REPORT-v1.0.md` | docs/blueprint/SEO.A2.M1-TERRITORIAL-LANDING-MVP-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1104` | `ART:src/routes/oriente-maya/$destino.index.tsx` | `implements` | `DOC:docs/blueprint/SEO.A2.M2-DESTINATION-ROLLOUT-COMPLETION-REPORT-v1.0.md` | docs/blueprint/SEO.A2.M2-DESTINATION-ROLLOUT-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1105` | `ART:src/routes/oriente-maya/$destino.$categoria.$empresa.index.tsx` | `implements` | `DOC:docs/blueprint/SEO.A3.M2-ZAZIL-TUNICH-FIRST-EDITORIAL-DRAFT-COMPLETION-REPORT-v1.0.md` | docs/blueprint/SEO.A3.M2-ZAZIL-TUNICH-FIRST-EDITORIAL-DRAFT-COMPLETION-REPORT-v1.0.md § asociación de implementación validada | 2026-07-21 |
| `E1106` | `ART:src/styles.css` | `implements` | `DOC:docs/blueprint/official-palette.md` | docs/blueprint/official-palette.md § asociación de implementación validada | 2026-07-21 |
| `E1107` | `ART:src/components/surfaces/kit/` | `implements` | `DOC:docs/blueprint/project-constitution/01-Architecture-Policy.md` | docs/blueprint/project-constitution/01-Architecture-Policy.md § asociación de implementación validada | 2026-07-21 |
| `E1108` | `ART:src/components/workspace/` | `implements` | `DOC:docs/blueprint/project-constitution/01-Architecture-Policy.md` | docs/blueprint/project-constitution/01-Architecture-Policy.md § asociación de implementación validada | 2026-07-21 |
| `E1109` | `ART:src/lib/workspace/` | `implements` | `DOC:docs/blueprint/project-constitution/01-Architecture-Policy.md` | docs/blueprint/project-constitution/01-Architecture-Policy.md § asociación de implementación validada | 2026-07-21 |
| `E1110` | `ART:src/styles.css` | `implements` | `DOC:docs/blueprint/project-constitution/01-Architecture-Policy.md` | docs/blueprint/project-constitution/01-Architecture-Policy.md § asociación de implementación validada | 2026-07-21 |
| `E1111` | `ART:src/components/layout/SiteHeader.tsx` | `implements` | `DOC:docs/blueprint/project-constitution/04-Navigation-Policy.md` | docs/blueprint/project-constitution/04-Navigation-Policy.md § asociación de implementación validada | 2026-07-21 |
| `E1112` | `ART:src/lib/workspace/navigation-registry.ts` | `implements` | `DOC:docs/blueprint/project-constitution/04-Navigation-Policy.md` | docs/blueprint/project-constitution/04-Navigation-Policy.md § asociación de implementación validada | 2026-07-21 |
| `E1113` | `ART:src/routes/` | `implements` | `DOC:docs/blueprint/project-constitution/04-Navigation-Policy.md` | docs/blueprint/project-constitution/04-Navigation-Policy.md § asociación de implementación validada | 2026-07-21 |
| `E1114` | `ART:src/lib/workspace/alux-registry.ts` | `implements` | `DOC:docs/blueprint/project-constitution/06-AI-Policy.md` | docs/blueprint/project-constitution/06-AI-Policy.md § asociación de implementación validada | 2026-07-21 |
| `E1115` | `ART:src/components/layout/SiteHeader.tsx` | `implements` | `DOC:docs/blueprint/project-constitution/PROJECT-CONSTITUTION.md` | docs/blueprint/project-constitution/PROJECT-CONSTITUTION.md § asociación de implementación validada | 2026-07-21 |
| `E1116` | `ART:src/routes/_authenticated/mi-viaje.tsx` | `implements` | `DOC:docs/blueprint/project-constitution/PROJECT-CONSTITUTION.md` | docs/blueprint/project-constitution/PROJECT-CONSTITUTION.md § asociación de implementación validada | 2026-07-21 |
| `E1117` | `ART:src/routes/eventos.index.tsx` | `implements` | `DOC:docs/blueprint/RT-1-EVENT-DETAIL-ROUTE-RESTORATION-CLOSURE-REPORT-v1.0.md` | docs/blueprint/RT-1-EVENT-DETAIL-ROUTE-RESTORATION-CLOSURE-REPORT-v1.0.md § restauración del listado tras convertir `eventos.tsx` en layout | 2026-07-21 |
| `E1118` | `ART:src/lib/traveler/trip-eligibility.ts` | `implements` | `DOC:docs/blueprint/TP1.4B-EVENT-SURFACE-INTEGRATION-CLOSURE-REPORT-v1.0.md` | docs/blueprint/TP1.4B-EVENT-SURFACE-INTEGRATION-CLOSURE-REPORT-v1.0.md § contrato canónico TP1 integrado en EventSurface | 2026-07-21 |
| `E1119` | `ART:scripts/tp1-trip-eligibility.test.ts` | `demonstrates` | `DOC:docs/blueprint/TP1.4B-PHASE2-EVENTSURFACE-EVIDENCE-CLOSURE-REPORT-v1.0.md` | docs/blueprint/TP1.4B-PHASE2-EVENTSURFACE-EVIDENCE-CLOSURE-REPORT-v1.0.md § evidencia funcional Playwright + prueba TP1 | 2026-07-21 |

## 7. Validación reproducible

El validador portable `scripts/governance/validate-dependency-map.mjs` rechaza: filas distintas de 470, IDs duplicados, nodos sin ruta o tipo, aristas con extremos inexistentes, aristas sin evidencia, autorreferencias y relaciones duplicadas. El paquete de revisión incluye el validador, JSON canónico, reporte y hashes.

## 8. Criterios para salir de Draft

| Gate | Estado | Evidencia |
|---|---|---|
| `06 v0.10` aprobado | Cumplido | Founder Decision 2026-07-22 · Adjudicación Integral Controlada (Opción A) del Baseline V0. |
| 470 nodos documentales | Cumplido | Derivación uno a uno; 0 duplicados. |
| Nodos y aristas verificables | Cumplido | 988 nodos; 1119 aristas; 0 extremos inválidos. |
| Cadenas críticas representadas | Cumplido con reservas explícitas | Se registran artefactos acreditados y huecos sin convertirlos en hechos. |
| Validación reproducible | Cumplido | Validador portable, JSON canónico, validación y manifiesto incluidos. |
| Aprobación Founder de v0.4 | Cumplido | Aprobación expresa del Founder para registrar y publicar `07 v0.4` como `Approved`. |

Todos los gates de salida quedaron cumplidos; `07 v0.4` se registra como `Approved`.

## 9. Control de versiones

| Versión | Fecha | Autor | Descripción |
|---|---|---|---|
| v0.1 | 2026-07-20 | Founder | Reserva del mapa canónico. |
| v0.2 | 2026-07-21 | Founder | Esquema mínimo, dependencia de `06` y criterios de salida. |
| v0.3 | 2026-07-21 | Founder | Overlay de tres aristas `supersedes`. |
| v0.4 | 2026-07-21 | Founder | Proyección integral reproducible sobre 439 documentos de `06 v0.5`. |
| v0.5 | 2026-07-21 | Founder | Derivación desde `06 v0.6`: incorpora 3 DOC + 3 ART (routes/eventos.index, lib/traveler/trip-eligibility, scripts/tp1-trip-eligibility.test) y 3 aristas verificadas bajo Founder Directive 442. |\n| v0.6 | 2026-07-21 | Founder | Derivación desde `06 v0.8`: incorpora 2 nodos DOC de Commerce sin fabricar implementación ni aristas técnicas; Gate B2 cerrado. |
| v0.4 | 2026-07-21 | Founder | Derivación integral aprobada de `06 v0.5`: 439 documentos, 543 artefactos y 1116 aristas verificadas. |
| v0.8 | 2026-07-22 | Founder | Derivación desde `06 v0.10`: incorpora 23 nodos DOC nuevos (11 Baseline V0 `18.06`–`18.16` + 12 RV0.1/RV0.2 `19.01`–`19.12`) sin fabricar aristas técnicas. Universo reconciliado a **470**. Founder Decision 2026-07-22 (Opción A). |
