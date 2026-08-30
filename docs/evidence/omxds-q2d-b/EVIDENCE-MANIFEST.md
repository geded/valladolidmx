# G8-Q2D-B · Evidence Manifest · Conexión productiva de Lugares y Atractivos

**Blueprint:** `docs/blueprint/19.44-G8-Q2D-B-PLACE-PRODUCTIVE-CONNECTION-v1.0.md`
**Instrumento:** `docs/governance/product-authorizations/PCA-2026-048.json`
**Base:** `feature/omxds-g8-q2d-place-premium-template-v1` · HEAD `85c012b7`
**Fecha:** 2026-08-28

## 1. Alcance entregado

| Elemento                         | Ruta                                                   |
| -------------------------------- | ------------------------------------------------------ |
| Contrato público + adaptador     | `src/lib/places/place-public-contract.ts`              |
| Lectura productiva fail-closed   | `src/lib/places/place-public-reads.server.ts`          |
| Server functions pública/preview | `src/lib/places/place-public-reads.functions.ts`       |
| Ruta técnica inactiva            | `src/routes/oriente-maya/$destino.lugares.$slug.tsx`   |
| Presentación de la ficha (CMS)   | `src/components/cms/places/PlacePresentationPanel.tsx` |
| Persistencia `presentation_mode` | `src/lib/places/place-presentation.functions.ts`       |
| Gate (20 casos)                  | `bun run validate:q2d:b`                               |

## 2. Matriz CMS → ficha pública

| Campo en `/cms/lugares/{id}/editar`                        | Sección de la ficha                   |
| ---------------------------------------------------------- | ------------------------------------- |
| Nombre, nombre oficial, tipo                               | Identidad / eyebrow / título          |
| Descripción corta                                          | Subtítulo y `meta description`        |
| Descripción                                                | Introducción editorial                |
| Highlights                                                 | Lo esencial · recomendaciones         |
| Admisión, notas de entrada, precios, duración, mejor época | Lo esencial · datos                   |
| Accesibilidad, amenidades                                  | Lo esencial · accesibilidad           |
| Horarios (`place_hours`)                                   | Lo esencial · horarios                |
| Ubicación, dirección, cómo llegar                          | Mapa y cómo llegar                    |
| Medios (`place_media` + `media_assets`)                    | Portada y galería                     |
| Relaciones (`place_products`, `place_events`)              | Qué hacer aquí · agenda               |
| Destino / zona                                             | Breadcrumb territorial y canónico     |
| Presentación de la ficha                                   | Dirección Editorial / Cinematográfica |

Todo campo vacío oculta su sección: la ficha nunca se rellena con fixtures ni
con contenido de otra entidad.

## 3. Reglas fail-closed verificadas

- Draft, archivado, eliminado o territorio incompatible → 404 público.
- Preview sólo con sesión y rol editorial, con aviso "Borrador · no publicado".
- Cinematográfica sin portada gobernada aprobada → Editorial + aviso oficial
  (bloqueado también en la base de datos:
  `cinematic_requires_approved_cover`).
- Sin fotografía acreditada → marcador neutral, jamás imagen de otro lugar.
- Cambiar la presentación nunca publica ni cambia el estado del lugar.

## 4. Datos reales (sin cambios de estado)

| Lugar        | Destino | Estado  | Medios aprobados                        |
| ------------ | ------- | ------- | --------------------------------------- |
| Chichén Itzá | Tinum   | `draft` | 0 → marcador neutral, Editorial forzada |
| Ek' Balam    | Temozón | `draft` | 0 → marcador neutral, Editorial forzada |

Ambas previews se sirven exclusivamente por la ruta autenticada de staff; la
lectura pública devuelve 404. No se usó el fixture de Q2D-0 como evidencia.

## 5. QA responsive

Breakpoints verificados en la superficie conectada: 390, 430, 768, 1024, 1280
y 1440 px, sin overflow horizontal y con la zona segura de Alux activa
(`data-alux-safe-zone-spacer`).

## 6. Confirmaciones

- Cero publicación, cero redirects, cero sitemap, cero cambios en "Qué hacer".
- URL histórica `/oriente-maya/ek-balam` intacta.
- `omxds_visual_v1_contracts_enabled = false`.
- Sin PR, sin merge, sin despliegue.
