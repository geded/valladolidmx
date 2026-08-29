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

| Familia | Tamaños | Formatos | Derivadas |
| --- | --- | --- | --- |
| `alux-ia-full` | 96, 128, 192, 256, 384, 512 (6) | PNG · WebP · AVIF (3) | **18** |
| `alux-ia-avatar` | 32, 40, 44, 48, 64, 80, 96, 128, 192 (9) | PNG · WebP · AVIF (3) | **27** |
| — | — | **Total derivadas** | **45** |

Reconciliación autorizada: **45 derivadas + 1 original + 2 maestras = 48 activos**.
Inventario físico verificado: `png` 15, `webp` 15, `avif` 15 (6 full + 9 avatar por formato), `master` 2, `source` 1.
**No existen archivos full adicionales**: la mención previa de "24 derivadas full" fue un error aritmético de redacción en el reporte, no un excedente en disco. Cero archivos eliminados, cero regeneración.

## G · Gobernanza de activos

- Raíz canónica: `/brand/alux/`.
- Original inmutable: `/brand/alux/source/alux-ia-source-original.jpeg` (nunca se sobrescribe).
- Maestras transparentes: `/brand/alux/master/alux-ia-{full,avatar}-master-transparent.png`.
- `public/brand/alux/manifest.json` v1.1.0: 48 activos; cada entrada declara `originalFilename`, `canonicalPath`, `role`, `family`, `width`, `height`, `format`, `bytes`, `sha256`, `derivedFrom`, `transparent` y `usage`.
- Los nombres de origen (`IMG_0550.png`, `IMG_0549.png`, `3a53f1cb-….jpeg`) se conservan **sólo** como metadato de procedencia; nunca como rutas públicas.
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

## C2 · Cierre funcional de GAP-01…04 e integración transversal de Alux

### GAP-01 · Guardar ≠ Agregar a Mi Viaje
- `experienceCtaBarActionSchema` incorpora `favoriteItem` (entidad real, fail-closed).
- `ExperienceCtaBar` renderiza `FavoriteButton` (→ `traveler_favorites`) para `favorite`
  y `AddToTravelPlanButton` (→ Travel Plan canónico) para `add-to-trip`. Almacenes
  separados; Guardar no agrega al viaje. Estado agregado/guardado lo expone cada
  componente canónico, idéntico en todas las familias.

### GAP-02 · Mapa real
- `vmx.experience.map` registrado en producción y Studio del `composition-renderer`.
- Sin coordenadas reales el bloque se omite (fail-closed).

### GAP-03 · Slot 18 · `vmx.alux.planner`
- Contrato v1.1.0: `context` (entityRef, entityLabel, destinationSlug/Name, zoneName,
  relations) normalizado con Zod; contexto inválido ⇒ `null`.
- `buildAluxPlannerHref` propaga entidad y territorio a `/arma-tu-viaje`.
- Chips de contexto y prompts provienen SÓLO de relaciones reales; con contexto y
  sin relaciones no se muestra ningún chip (cero recomendaciones inventadas).
- `usePlannerPresence` garantiza **un único planificador contextual por página**.

### GAP-04 · FAQ reutilizable
- `adaptSeoLandingFaq` es el adaptador único: la config de `vmx.kit.faq` y el
  JSON-LD `FAQPage` derivan de la misma lista normalizada ⇒ FAQ visible ≡ JSON-LD.
- Sin preguntas reales: ni bloque ni JSON-LD.

### Inventario real por familia (`src/lib/alux/alux-surface-inventory.ts`)

| Familia | Dock global | Alux Planner | Maestro | Contexto recibido | Duplicación |
|---|---|---|---|---|---|
| Home | Sí (único) | Sí | avatar+full | territorio Oriente Maya | Ninguna |
| Destino | Sí (único) | Sí | avatar+full | destino + categorías reales | Ninguna |
| Listados | Sí (único) | No | avatar | destino + categoría | Ninguna |
| Hotel | Sí (único) | Sí | avatar+full | business + destino/zona + cercanos | Ninguna |
| Restaurante | Sí (único) | Sí | avatar+full | business + destino/zona + cercanos | Ninguna |
| Evento | Sí (único) | Sí | avatar+full | event + destino/zona + sede | Ninguna |
| Experiencia | Sí (único) | Sí | avatar+full | product + destino/zona + empresa | Ninguna |
| Tour | Sí (único) | Sí | avatar+full | product + destino/zona + empresa | Ninguna |
| Producto | Sí (único) | Sí | avatar+full | product + destino/zona + empresa | Ninguna |
| Lugar | Sí (único) | Sí | avatar+full | place + destino/zona + cercanos | Ninguna |
| Landing SEO | Sí (único) | Sí (slot 18) | avatar+full | entityRef + destino + slots reales | Ninguna |

Casa de vacaciones (`vacation_rental`) permanece **sin autoasignación productiva**
hasta la aceptación visual del Founder.

### QA
- Anchos 390/430/768/1024/1280/1440: overflow horizontal **0**, consola limpia.
- Un solo `<header>`, un solo footer y un solo `[data-alux-dock]` por página.
- Safe zone móvil respetada (`data-alux-safe-zone-spacer`, `bottomOffset` sticky).
- Gates: typecheck, `validate:r1:cl` y contratos Alux en PASS.

### Invariantes
Cero publicación, cero rutas públicas nuevas, cero redirects, cero sitemap,
cero migraciones y `omxds_visual_v1_contracts_enabled=false`.
