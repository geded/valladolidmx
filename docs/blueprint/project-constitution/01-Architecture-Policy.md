# 01 · Architecture Policy

**Versión:** 1.0 · Oficial
**Fuente consolidada:** `02-ARCHITECTURE-PRINCIPLES.md`, serie `11.x`, `15.10.4d` (Iniciativa 3 · Fase 3.3c), `15.10.5a` Workspace Foundations, `15.10.5c` Migration Blueprint, `15.10.5d` Discovery Layer, `mem://index.md` (Core).

---

## 1. Single Source of Truth

Cada dominio funcional tiene **una única fuente de verdad**. El dominio editorial del Experience Builder vive exclusivamente en `page_compositions` v1.

Prohibido crear un segundo modelo de persistencia para la misma capacidad sin autorización expresa del Founder.

Fuente: `15.10.4d-INICIATIVA-3-FASE-3.3c-COMPLETION-REPORT.md`, memoria Core *Single Source of Truth Policy*.

## 2. CompositionRenderer Freeze

`CompositionRenderer` es infraestructura estable. Ninguna Sub-ola posterior toca su núcleo. Las nuevas capacidades se implementan como bloques/plantillas registradas, no como bifurcaciones del renderer.

## 3. Surface Kit

Toda superficie pública y autenticada consume componentes del **Surface Kit** (`src/components/surfaces/kit/*`). Prohibido crear componentes de superficie paralelos.

## 4. Surface Composer

La composición dinámica de superficies pasa por el **Surface Composer**. Ninguna ruta pública compone bloques a mano fuera del composer.

## 5. Workspace Engine

Toda superficie autenticada operativa usa exclusivamente el **Workspace Engine** (`src/components/workspace/*`, `src/lib/workspace/*`).

El núcleo del Workspace Engine es estable (15.10.5a). Futuras adendas migran capacidades sobre la infraestructura existente; no crean engines paralelos.

## 6. Experience Builder

Único constructor editorial de la plataforma. Cubre todas las superficies públicas (presentes y futuras). Ninguna funcionalidad editorial se desarrolla fuera del Experience Builder sin justificación técnica documentada y aprobada.

Fuente: memoria Core *Single Studio Principle*, *Experience Builder Vision*, *Experience Builder Mission Rule*.

## 7. Preview Registry

Las previsualizaciones autoritativas de entidades y bloques se registran vía el **Preview Registry** (`15.10.4d` Sub-ola 2.2c). Ninguna ruta implementa preview propio fuera del registry.

## 8. Server Functions First

Toda lógica de servidor interna se implementa como `createServerFn` de `@tanstack/react-start`. Los edge functions y `/api/public/*` sólo se usan para webhooks, cron y APIs públicas.

## 9. No Direct Database Access from UI

El cliente **nunca** consulta tablas directamente. Toda lectura/escritura pasa por server functions o RPCs `SECURITY DEFINER` autorizadas.

## 10. Build Once, Reuse Everywhere

Todo componente de Workspace, Surface Kit, Experience Builder o Discovery se diseña como infraestructura reutilizable por Founder, Portal, Concierge, CMS, Cuenta y Discovery.

Fuente: memoria Core *Build Once, Reuse Everywhere*.

## 11. No Duplicate Models

Prohibido duplicar modelos de dominio. Ejemplo vigente: Travel Workspace usa exclusivamente `travel_plans` + `travel_plan_items` + `travel_plan_build_snapshot`. Alux no crea un segundo modelo de viaje.

## 12. No Parallel Engines

Prohibido crear nuevos engines, providers, registries, capas o sistemas de navegación/diseño paralelos. Reutilizar exclusivamente: Experience Builder, Workspace Engine, Discovery Layer, PWA, Lovable Cloud y AI Gateway.

Fuente: memoria Core *Infrastructure Freeze reforzada*.

## 13. Estándares oficiales aprobados

- **Design System:** `src/styles.css` (`@theme` tokens).
- **Workspace Engine:** `src/components/workspace/*`.
- **Registries:** Workspace / Navigation / Alux / Command (`src/lib/workspace/*`).
- **Discovery Layer:** `PublicShell`, Header/Footer canónicos, Cards Registry, SEO/OG unificado.
- **PWA:** service worker, sync queue, push, update lifecycle (`15.10.6.x`).

---

## Regla operativa

**Antes de crear infraestructura nueva, verificar que no exista una equivalente ya aprobada.** Si existe, reutilizar. Si no existe, detener y documentar como propuesta antes de implementar.

---

## Conflictos pendientes de decisión del Founder

Ninguno al momento de esta versión.