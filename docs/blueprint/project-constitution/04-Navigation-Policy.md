# 04 · Navigation Policy

**Versión:** 1.0 · Oficial
**Fuente consolidada:** `03-INFORMATION-ARCHITECTURE.md`, `15.10.5a`, `15.10.5c.*`, `15.10.5d.1` (Public Shell), `15.10.8` (planificada), memoria Core.

---

## 1. Dos shells oficiales

- **`PublicShell`** — superficies públicas (Discovery Layer). Header canónico, Footer canónico, SEO/OG unificado.
- **`WorkspaceShell`** — superficies autenticadas operativas. Sidebar, topbar, inspector, command palette y sheets del Workspace Engine.

Prohibido crear un tercer shell.

## 2. Navigation Registry

Toda entrada de navegación autenticada se declara en el **Navigation Registry** (`src/lib/workspace/navigation-registry.ts`).

El Header público v1 se implementa en `src/components/layout/SiteHeader.tsx` y `PrimaryMegaMenu.tsx`. Su conversión a registry administrable está diferida (Iniciativa `15.10.8`).

## 3. Mega Menú

El Mega Menú actual es la versión v1 oficial. Refleja la arquitectura territorial:

`Oriente Maya → Destino → Categoría → Empresa/Experiencia`

## 4. Rutas públicas

Cada sección real del ecosistema tiene una ruta pública dedicada bajo `src/routes/` (TanStack file-based).

Reglas:

- Sin trailing slash.
- `head()` propio con `title`, `description`, `og:*`, `twitter:card`.
- `og:image` sólo en rutas hoja, cuando exista una imagen significativa absoluta https.
- SEO/OG unificado por Discovery Layer.

## 5. Rutas privadas

Viven bajo `_authenticated/`. Toda ruta operativa se monta dentro de un workspace registrado. El workspace se resuelve por `resolveWorkspaceByPath()`; no se hardcodean layouts por ruta.

## 6. Reglas para nuevas rutas

Antes de crear una ruta nueva:

1. Verificar que represente una **sección real del ecosistema** (no navegación temporal).
2. Verificar que no exista una ruta equivalente (prohibido duplicar).
3. Definir shell (`PublicShell` o `WorkspaceShell`).
4. Definir `head()` completo.
5. Registrar en el registry correspondiente si aplica.

## 7. Alias y redirects

Cuando una ruta cambia de ubicación canónica, la ruta anterior se conserva como redirect permanente. Ejemplo: `/mi-viaje` → `/cuenta/mi-viaje`.

---

## Regla operativa

**No crear navegación temporal. No crear rutas duplicadas.**

---

## Conflictos pendientes de decisión del Founder

- **Header administrable vs v1 estático:** Iniciativa `15.10.8` diferida hasta cerrar Arma tu Viaje, Alux, Demo Pack, Google y Stripe. Sin conflicto activo.