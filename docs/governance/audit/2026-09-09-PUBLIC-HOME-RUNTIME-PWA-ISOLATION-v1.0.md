# Home pública · aislamiento de runtime y precache PWA

Fecha: 2026-09-09  
Autorización: PCA-2026-081  
Base: `main@618c1057c4e797bcb5c5ca4b0ff980ed32d9fba5`  
Ruta pública: `/`

## Hallazgos de línea base

- `/` importaba estáticamente `CompositionRenderer`, cuyo grafo incluye las
  familias Home, destino, listado, lugar, negocio, producto, experiencia,
  mapas, bloques de Studio y cockpit administrativo.
- La ruta Home precargaba `composition-renderer` completo: **217,516 bytes / 50,528 gzip**.
- El entry común medía **642,339 bytes / 182,200 gzip**.
- Workbox examinaba `dist`, aunque TanStack Start/Nitro publica en
  `.output/public`; el build generaba **0 entradas / 0 KiB de precache**.
- El `runtimeCaching` genérico para todo JS/CSS podía almacenar chunks privados
  después de visitar CMS o administración, aunque sus documentos navegables
  estuvieran protegidos por `NetworkOnly`.

## Delta implementado

- La ruta `/` usa `HomePremiumRenderer`, adaptador enfocado que conserva la
  misma `HomePremiumSurface`, configuración `vmx.home.premium-g4`, datos CMS,
  contenido real, i18n, apariencia, tipografía y overlay editorial.
- `CompositionRenderer` permanece como autoridad universal del Studio, preview
  y demás familias; no se creó otra plantilla ni se duplicó el Home.
- Registro del Service Worker, actualización y runner de sincronización se
  importan después de hidratación durante idle. La cola durable no cambia.
- `SyncStatusBanner` y `UpdateBanner` se dividen en chunks diferidos.
- Workbox escribe en `.output/public`, precarga sólo el shell público explícito
  y `/offline`, y elimina el cache genérico de todo JS/CSS. Las rutas sensibles
  siguen en `NetworkOnly`.

## Resultado medido

- Preloads específicos de `/`: renderer universal **50,528 gzip** → piezas
  Home enfocadas **12,490 gzip**; reducción aproximada **75.3 %**.
- Entry común: **182,200 gzip** → **166,209 gzip**; reducción **15,991 gzip / 8.8 %**.
- Precache final: **10 entradas / 1,238.13 KiB**, frente a 0 entradas antes.
- El manifiesto de `/` ya no incluye `composition-renderer`; éste continúa
  disponible bajo demanda para las rutas que realmente lo consumen.

## Preservación funcional

- Home Premium y materialización CMS: 39/39 pruebas PASS en el lote combinado.
- Alux personalización: 33/33 PASS.
- Alux memoria y proximidad: 23/23 PASS.
- Alux fusión de memoria: 16/16 PASS.
- Lint del delta: PASS; cero deuda nueva.
- Typecheck: PASS.
- Route Inventory: PASS, 249 rutas cubiertas.
- Build: PASS; Service Worker emitido en `.output/public/sw.js`.
- Validador integral canónico: PASS (lint, I1–I4, typecheck, build,
  proyecciones 07/08, integridad, autorización y change package).
- Precache final verificado: incluye `HomePremiumSurface` y `/offline`; no
  incluye `composition-renderer` ni chunks de CMS/administración.

## Bloqueos de cierre

- Suite completa: **928 PASS / 2 FAIL**. Ambos fallos se reproducen sin cambios
  en la base `main@618c1057` y corresponden a la preview heredada
  `g4-destination-microsite-preview.tsx`; no forman parte del delta autorizado.
- El navegador cloud no pudo alcanzar el servidor local aislado. La evidencia
  responsive 1440/834/430/390 queda pendiente de un preview accesible.
- Conforme a la autorización Founder, no procede fusionar mientras los gates
  requeridos no estén completamente en PASS. No se publica ni despliega.
