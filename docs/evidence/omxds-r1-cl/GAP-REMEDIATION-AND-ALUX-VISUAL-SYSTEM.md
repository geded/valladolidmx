# G8-R1-C+L · Addendum A — Remediación GAP-01…04 + Sistema Visual Canónico Alux IA

Autorización: `docs/governance/addenda/PCA-2026-050-ADDENDUM-A.json`
Flag: `omxds_visual_v1_contracts_enabled = false` · Cero publicación · Cero redirects · Cero sitemap · Cero migración · Cero contenido inventado.

## A · GAP-01 · Agregar a Mi Viaje

| Elemento | Resolución |
| --- | --- |
| Contrato | `experienceCtaBarActionSchema.action` incorpora `add-to-trip` + `travelItem` (kind/targetId/title/slug/imageUrl/subtitle). |
| Render | `ExperienceCtaBar` delega **íntegramente** en `AddToTravelPlanButton` (acción canónica de Travel Plan). Cero lógica paralela, cero segundo store. |
| Fail-closed | Sin `travelItem` con entidad real la acción **no se renderiza**. |
| Estados | Los estados (idle / agregando / ya en Mi Viaje) los provee la acción canónica, idénticos al resto del ecosistema. |

## B · GAP-02 · Mapa

`vmx.experience.map` estaba registrado en la biblioteca pero sin caso en el renderer.
Se añade **un solo** adaptador (`ExperienceMapRender`) usado por Studio y producción, sobre el componente existente `ExperienceMapBlock`. Sin puntos con `lat`/`lng` reales el bloque se omite (no se dibuja mapa vacío ni ubicación inventada).

## C · GAP-03 · Planificador Alux

Nuevo slot contractual `aluxPlanner` (`vmx.alux.planner`, `omitWhenEmpty: true`).
`premium-seo-landing` pasa formalmente de **17 a 18 slots**; `contractVersion` → `1.1.0`.
Se añade además paridad Studio/producción del bloque (antes Studio mostraba placeholder).

## D · GAP-04 · FAQ

Verificación solicitada: **`vmx.product.faq` NO es semánticamente neutral** — depende de `ProductSurfaceContext` y sólo hidrata en superficies de producto.
Resolución sin bloque nuevo: el slot `faq` de la landing reutiliza **`vmx.kit.faq`**, bloque neutral ya registrado en la biblioteca y en el renderer (`KIT_MAP`), construido sobre `KitFaq`.
`buildSeoLandingFaqJsonLd()` emite `FAQPage` **espejo exacto** de las preguntas visibles; sin FAQ visible no se emite structured data.

## E · Sistema visual transversal Alux IA

- Componente único canónico: `src/components/alux/AluxMark.tsx` (`family="avatar" | "full"`).
- Consumo exclusivo de `/brand/alux/`; prohibido duplicar el activo dentro de plantillas.
- Un solo dock/chat global por página: `AluxFloatingTrigger` (ya con política de presencia `useAluxFloatingPresence`, que lo oculta ante CTA sticky comercial). El bloque `vmx.alux.planner` es contenido embebido, no un segundo dock.
- El bloque Planificador y el dock global comparten la misma identidad visual.

## F · Derivadas autorizadas (generación mecánica)

Script determinista e idempotente: `scripts/brand/alux/generate-alux-derivatives.py`.
Sin IA, sin redibujo, sin nuevas poses, sin monocromos, sin recoloraciones, sin fondos.

| Familia | Tamaños | Formatos |
| --- | --- | --- |
| `alux-ia-full` | 96, 128, 192, 256, 384, 512 | PNG · WebP · AVIF |
| `alux-ia-avatar` | 32, 40, 44, 48, 64, 80, 96, 128, 192 | PNG · WebP · AVIF |

## G · Gobernanza de activos

- Raíz canónica: `/brand/alux/`.
- Original inmutable: `/brand/alux/source/alux-ia-source-original.jpeg` (nunca se sobrescribe).
- Maestras transparentes: `/brand/alux/master/alux-ia-{full,avatar}-master-transparent.png`.
- `public/brand/alux/manifest.json`: 48 activos, cada uno con `sha256`, `bytes`, `path` y procedencia.
- Declarado explícitamente: **no son fotografías turísticas ni medios documentales**; no entran al pipeline de medios editoriales G8-M1.

## H · Accesibilidad y responsive

- Con texto contiguo "Alux" ⇒ imagen decorativa (`alt=""`, `aria-hidden`).
- Sin texto contiguo ⇒ `alt="Alux, concierge IA de Valladolid.mx"`.
- `width`/`height` explícitos + `object-contain` ⇒ sin CLS.
- `loading="eager"` sólo en el dock; `lazy` en el bloque interior.
- Áreas táctiles y zona segura de Alux preservadas (sin solapar CTA sticky ni contenido).

## I · Contrato resultante de la landing

18 slots, orden narrativo: hero · subnav · badges · intro · features · story · highlight · practical · gallery · offers · infoGrid · quote · **map** · related · reviews · **faq (vmx.kit.faq)** · **aluxPlanner** · ctaBar (con `add-to-trip`).
Slot vacío ⇒ bloque omitido. Autoridad visual y SHA-256 acreditados sin cambios.

## Gates

- `bunx tsgo --noEmit` → PASS
- `bun test scripts/omxds/r1-cl/` → 32 pass / 0 fail
