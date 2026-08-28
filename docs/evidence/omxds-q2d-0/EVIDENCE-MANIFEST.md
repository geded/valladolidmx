# G8-Q2D-0 · Evidence Manifest · Place Premium Visual Authority

**Blueprint:** `docs/blueprint/19.42-G8-Q2D-0-PLACE-PREMIUM-VISUAL-AUTHORITY-v1.0.md`
**Instrumento:** `docs/governance/product-authorizations/PCA-2026-046.json`
**Fecha:** 2026-08-28
**Estado:** Pendiente de aprobación visual expresa del Founder (STOP CONDITION)

## 1. Base

- Rama base: `feature/omxds-g8-q2c-places-data-v1`
- HEAD declarado por el Founder: `22b6ab58a3dd57a642827bda0de7675e604c0694`
- Árbol: `0bf51acf550dd244d6168aa996d371788789efb8` (equivalencia criptográfica
  aceptada; Q2C-A no se reconstruye)
- Rama de preservación solicitada: `feature/omxds-g8-q2d-place-visual-authority-v1`

## 2. Superficie entregada

| Elemento | Ruta |
| --- | --- |
| Vista interna noindex | `/lovable/g8-place-premium-visual-approval` |
| Propuesta visual | `src/components/place-premium/PlacePremiumSurface.tsx` |
| Fixture DEMO VISUAL | `src/components/place-premium/place-premium-content.ts` |

Caso de diseño: **Chichén Itzá** · destino **Tinum** · tipo **zona arqueológica**.
Breadcrumb: `Inicio → Oriente Maya → Tinum → Chichén Itzá`.

## 3. Capturas de evidencia

| # | Dirección | Viewport | Archivo |
| --- | --- | --- | --- |
| 1 | Editorial | 390 px | `q2d0-editorial-390.png` |
| 2 | Editorial | 768 px | `q2d0-editorial-768.png` |
| 3 | Editorial | 1440 px | `q2d0-editorial-1440.png` |
| 4 | Cinematográfica | 390 px | `q2d0-cinematografica-390.png` |
| 5 | Cinematográfica | 768 px | `q2d0-cinematografica-768.png` |
| 6 | Cinematográfica | 1440 px | `q2d0-cinematografica-1440.png` |

Cada captura cubre vista superior y secciones inferiores suficientes para
evaluar la ficha completa, incluidos Header y Footer canónicos.

## 4. Comprobaciones visuales

- Overflow horizontal: 0 en 390, 768 y 1440 px.
- Header y Footer canónicos presentes y completos.
- Áreas táctiles ≥ 44 px en controles, breadcrumb y CTAs.
- Foco visible en controles interactivos.
- Cero errores de consola.
- Imágenes sin deformación (`object-cover` con relación de aspecto fija).
- Texto legible sobre imagen (overlays con contraste AA).
- Módulos sin contenido ocultos: **Eventos relacionados** no se renderiza.

## 5. Diferencias entre direcciones

| Dimensión | Editorial | Cinematográfica |
| --- | --- | --- |
| Hero | Split rounded: foto + tarjeta de identidad | Full-bleed con overlay, CTA centrado |
| Breadcrumb | En flujo, sobre el hero | Barra sticky bajo el hero |
| Orden | Intro → Esencial (panel) → Galería (mosaico) | Esencial (banda) → Galería (filmstrip) → Intro (centrada) |
| Densidad | Lectura amplia, fotos intercaladas | Alta densidad superior, contenido progresivo |
| Datos | Idénticos | Idénticos |

## 6. Confirmaciones

- Cero datos: sin lecturas ni escrituras; sin migraciones ni esquema.
- Cero publicación: Chichén Itzá y Ek' Balam permanecen en `draft`.
- Cero rutas públicas y cero redirects.
- Cero flags: `omxds_visual_v1_contracts_enabled` permanece `false`.
- Sin `pageKind=place`, sin plantilla productiva `premium-entity-place`,
  sin cambios en el Experience Builder productivo ni en "Qué hacer".
