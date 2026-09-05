# Lote 3G.1 · Ajuste de jerarquía visual de Alux (corrección transversal)

**Fecha:** 2026-09-05 · **Base:** estado actual de `integration/lovable-valladolidmx`, sin ramas nuevas
**Principio aplicado:** Alux es ayuda contextual secundaria; nunca compite con territorio, destinos, productos ni imágenes.
**Estado:** CERRADO · sin FAIL.

---

## 1. Componentes compartidos corregidos (sin rediseños por plantilla)

| Componente | Rol |
|---|---|
| `src/components/omxds/TourismChip.tsx` | Píldora única: nuevo tamaño `xs` (32 px visuales) con **área táctil real de 44 px** vía extensión `::after`; `sm` pasa a 36 px visuales + 44 táctiles; `md` sin cambios. Fila `rail` con degradado discreto al borde derecho que insinúa el desplazamiento en móvil. |
| `src/components/home-premium/shared/PremiumShowcase.tsx` → `PremiumAluxBar` | Banda compacta de Alux en Home y Atlas. |
| `src/components/alux/TourismAluxPanel.tsx` | Banda compacta de Alux en listados y perfiles. |

Ambos módulos comparten ahora el mismo lenguaje:

- **Sin masa de color:** superficie clara `bg-selva/[0.06]` con borde `border-selva/25` y **acento vertical de marca** `border-l-2 border-selva/70`. Sombra eliminada. La identidad sigue siendo inequívocamente la del sistema Home aprobado.
- **Cabecera reducida:** avatar oficial 28→32 px (antes 40/48), nombre 14 px, rótulo "Concierge IA" 10.5 px.
- **Texto simplificado visualmente:** la pregunta/título se limita a una línea (`line-clamp-1`, `max-w-2xl`); la descripción larga se conserva íntegra para lectores de pantalla (`sr-only`). **No se modificó ningún texto administrable.**
- **Opciones en una sola tira:** móvil = tira horizontal desplazable con snap y degradado indicador; iPad/escritorio = línea compacta con wrap mínimo. Separación 6 px.
- **CTA secundario:** "Planear con Alux" pasa de botón sólido de ancho completo a **botón de contorno, ancho por contenido, 36 px de alto** (44 px táctiles), texto 13 px. Ya no parece la acción primaria de la página.
- **Escritorio:** una sola banda `identidad | pregunta + opciones | CTA`. **Móvil/iPad:** fila 1 = identidad + CTA, fila 2 = pregunta + tira de opciones.
- Contraste, foco visible (`focus-visible:ring`), navegación por teclado y `aria-pressed` intactos.

---

## 2. Altura medida antes / después (píxeles reales)

| Ancho | Antes (3G) | Después (3G.1) | Reducción |
|---|---|---|---|
| 1440 | 118–124 | **80–84** | ≈ −33 % |
| 834 | 173–207 | **126–164** | ≈ −27 % |
| 430 | 173 | **126** | −27 % |
| 390 | 173 | **126** | −27 % |

En móvil el módulo pasa de bloque verde de tres filas altas a una tarjeta breve de dos filas sobre superficie clara: el hero, la fotografía y las tarjetas de producto recuperan la primera jerarquía visual (verificado en capturas de Home, listado y perfil).

---

## 3. Consumidores del componente (propagación automática)

Superficies públicas: `HomePremiumSurface`, `RegionDestinationsPremiumSurface`, `DestinationsAtlasSurface`, `DestinationPremiumSurface`, `PremiumDiscoveryListingSurface` (hoteles, restaurantes, casas de vacaciones, lugares), `ExperiencesListingSurface`, `EventPremiumSurface`, `RoutesListingSurface`, `RoutePremiumSurface`, `producto.$slug`, `$destino.lugares.$slug`.
Fixtures internos `/lovable/*`: 7 previews G4/G8 heredan el mismo componente.
**Ningún consumidor define estilo propio de Alux.**

---

## 4. Validación

| Verificación | Resultado |
|---|---|
| Typecheck (`bunx tsgo --noEmit`) | PASS · sin errores |
| Build (`bun run build`) | PASS · exit 0 |
| Suite (`bun test scripts`) | **777 pass · 0 fail** · 5297 expects |
| Route Inventory | PASS · 246 rutas |
| QA responsive: 11 superficies × 4 anchos = **44 casos** | 44/44 HTTP 200 · overflow 0 px · 1 `<main>` · 1 `<h1>` · 0 chips recortados · 0 imágenes rotas |
| Píldoras con objetivo táctil < 44 px | **0** en 44/44 casos (medición incluye la extensión `::after`) |
| Disparador flotante vs. módulo embebido | Oculto en 1440/834/430/390 con el módulo en pantalla · 0 superposiciones con "Mi Viaje" |
| CTA y chips funcionales (clic, teclado, foco) | PASS |

Capturas: `home-{1440,834,430,390}.png`, `listado-{…}.png`, `perfil-{…}.png`.

**Observación no atribuible:** en una única sesión de navegador reutilizada para 11 navegaciones seguidas en modo desarrollo aparece un aviso de hidratación de React en `/lugares` o `/hoteles`. No se reproduce en 6/6 cargas limpias ni de forma aislada; no depende de este cambio (sólo se tocaron clases estáticas) y no ocurre en compilación de producción.

---

## 5. Pendiente identificado (fuera del alcance autorizado)

El bloque verde sólido **"Tu ruta empieza a tomar forma"** de la Home pertenece a **Mi Viaje / Travel Plan**, no al módulo de Alux, y hoy es el elemento de mayor peso visual de la página en móvil. Su lógica y su diseño están expresamente excluidos de este lote; se requiere autorización específica para aligerarlo con el mismo criterio.

---

## 6. Estado del repositorio

- Rama de edición activa: `edit/edt-993733de-a676-4625-bd95-f31b6e1a9028`, basada en `integration/lovable-valladolidmx`.
- HEAD efectivo al iniciar el lote: `b5611936a6e3a99f553fad90b98b58ecc1b51efa`; los cambios de 3G.1 quedan sobre esa base en la misma rama de edición (la consolidación en `integration/lovable-valladolidmx` la realiza la plataforma; **no se ejecutó git, no hay PR, merge ni despliegue**).

Archivos modificados: `src/components/omxds/TourismChip.tsx`, `src/components/home-premium/shared/PremiumShowcase.tsx`, `src/components/alux/TourismAluxPanel.tsx`, este informe y `roadmap.md`.
No se tocaron CMS, datos, migraciones, RLS, textos administrables, rutas, mapas, claves, dominios, lógica de Alux/Mi Viaje, héroes, pagos, reservas ni flags.
