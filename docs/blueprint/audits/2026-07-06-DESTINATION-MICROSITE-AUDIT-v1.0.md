# Auditoría · Micrositio de Destino v1.0
Fecha: 2026-07-06 · Alcance: `DestinationSurface` (Valladolid, Izamal, Espita, futuros)
Autor: Lovable + Founder · Estado: Diagnóstico + Propuesta narrativa (pendiente aprobación Founder)

---

## 1. Diagnóstico interno (evidencia visual)

Ruta auditada: `/oriente-maya/valladolid` — desktop 1440×900 y móvil 390×844.

| Métrica | Desktop | Móvil |
|---|---|---|
| Altura total de página | **7,025 px** | **10,624 px** |
| Nº de secciones que exponen los mismos hoteles/restaurantes/experiencias | **3** (Explorador lateral · Mapa+lista · Sigue descubriendo) | **3** (idem, apilados) |
| Punto de entrada por categoría | 3 lugares distintos | 3 lugares distintos |

### Problemas confirmados (jerarquizados)

1. **Triplicación de descubrimiento (crítico).** El mismo negocio aparece:
   - como pin+card en el bloque *Ubicación · Valladolid* (mapa con letras A/B/C + lista completa a un lado),
   - como card en *Sigue descubriendo* (Hoteles → Restaurantes → Experiencias → Eventos → Productos),
   - como enlace en el *Explorador* (columna derecha) que además **saca al usuario del micrositio** a `/oriente-maya/valladolid/hoteles`.
   → El viajero ve la misma información 3 veces sin ganar contexto nuevo.
2. **Mapa + lista paralelos (crítico).** El bloque de ubicación reproduce el anti-patrón de Google Attractions: pines con letras A/B/C ilegibles cuando hay ≥8 puntos, más una lista vertical de cards completas al lado. Duplicación estructural, no orientación espacial.
3. **Hero incoherente con la identidad colonial.** La galería que actúa como hero mezcla fotos irrelevantes (autobuses turísticos, fotógrafa en estudio, calle blanca tipo Santorini). No transmite Valladolid ni el DSL colonial aprobado.
4. **Cero jerarquía narrativa.** El orden actual es: Galería aleatoria → Hero editorial → Badges → Subnav → Resumen + Lo esencial → Mapa+lista → Descubre (5 grupos). No responde la pregunta *"¿por qué Valladolid?"* antes de listar productos.
5. **Móvil sin secuencia.** 10,624 px de scroll casi lineal, sin agrupación visual, sin puntos de anclaje inspiracionales — es un directorio vertical, no un micrositio.
6. **Cero social proof.** Cards sin rating, sin reseñas, sin voces locales. TripAdvisor/Airbnb dan credibilidad en el primer viewport.
7. **Ancho desperdiciado en desktop.** Grid 2 cols + columna Alux hace que las cards de descubrimiento se apilen en 2 col + hueco derecho vacío; la sensación es *"incómodo"*, como reportaste.

---

## 2. Benchmark (síntesis)

| Elemento | valladolid.mx | Google Travel | TripAdvisor | Airbnb Experiences |
|---|---|---|---|---|
| Hero visual | Texto sobre blanco | Compacto utilitario | Carrusel UGC full-width | Foto de acción + card flotante |
| Editorial de destino | Párrafo básico | Ninguno | 2-3 oraciones antes de listar | Subtítulo funcional |
| Categorías | Duplicadas 3× | Chips que filtran una sola lista | Pills + "Great For" | Ninguna (solo ordenamiento) |
| Mapa | Inexistente | Split list+mapa (desktop) | Página/tab separado | Inexistente |
| Voces / testimonios | No | No | Fotos UGC + foros | **Multi-voz de hosts (rico)** |
| Duplicación percibida | **Alta** | Baja | Media | **Muy baja** |

### Patrones ganadores a adoptar

1. **Hero con humanos en acción**, no monumento vacío (Airbnb).
2. **Una sola aparición por categoría**, diferenciada solo por criterio (rating vs. novedad) — Google + Airbnb.
3. **Editorial 3-5 oraciones** antes de cualquier listado (TripAdvisor).
4. **Multi-voz local** (guía, chef, hotelero) como capa de credibilidad (Airbnb).
5. **Mapa como modo opcional** (overlay/tab), no incrustado en el scroll narrativo (TripAdvisor).
6. **Chips filtrables** en un solo bloque *Qué hacer* en vez de sub-secciones (Google).
7. **Exit ramp intencional** *"Explora desde Valladolid"* (Airbnb).
8. **Rating numérico prominente** desde la primera card (Airbnb/TripAdvisor). Nunca mostrar `0 Valoración`.

### Anti-patrones prohibidos

- ❌ Mostrar la misma categoría 3× (nav + widget + sidebar) — actual.
- ❌ Mapa con pines A-Z + lista completa al lado — actual.
- ❌ Hero sin foto de identidad o con stock irrelevante — actual.
- ❌ Contador de reseñas en 0.
- ❌ Saltar de inspiración a formulario de reserva sin transición.

---

## 3. Propuesta narrativa · Micrositio de Destino v2.0

**Principio rector:** el visitante llega en modo *"¿debería ir?"* y debe salir en modo *"necesito ir pronto."* Cada sección hace **un solo trabajo** antes de pasar al siguiente.

```text
§1  HERO inmersivo (foto humana + H1 + tagline colonial + 1 CTA)
§2  Contexto editorial (3-5 oraciones · "¿por qué Valladolid?")
§3  Galería editorial (5-6 fotos oficiales del destino, sin captions)
§4  Qué hacer — chips filtrables (Cenotes · Cultura · Gastronomía · Aventura · Haciendas)
    → 6 cards curadas + "Ver todos"
§5  Voces locales (3 testimonios: guía · chef · hotelero)
§6  Dónde dormir (3-5 cards representativas de rangos)
§7  Dónde comer (4-5 cards + Mercado Municipal destacado)
§8  Mapa · modo exploración (botón → overlay full-screen con pines por categoría)
§9  Cuándo ir (timeline 12 meses con 2-3 momentos culturales)
§10 Explora desde Valladolid (Ek Balam · Río Lagartos · Chichén · Izamal, con minutos)
§11 Planea tu visita (subnav a Arma tu Viaje + Alux)
```

### Cambios estructurales clave vs. plantilla actual

| Elemento actual | Decisión v2.0 |
|---|---|
| Galería como hero (fotos aleatorias) | Hero foto + editorial separado; galería es §3 con fotos curadas del destino |
| `DiscoveryNavigator` en columna derecha | **Retirado del micrositio.** Sale al usuario y duplica. La navegación por categoría vive dentro de §4 (chips filtrables) y §10 (destinos cercanos) |
| Mapa con lista paralela (letras A-Z) | Mapa compacto solo con pines; botón "Explorar en mapa" abre overlay full-screen. **La lista debajo del mapa se elimina** |
| `Sigue descubriendo` con 5 grupos (Hoteles/Restaurantes/Experiencias/Eventos/Productos) | Se fragmenta en §6 Dónde dormir + §7 Dónde comer + §4 Qué hacer (chips). Eventos → §9 Cuándo ir. Productos → sección propia solo si hay ≥3 destacados |
| Layout desktop 2+1 col (Alux a la derecha) | Layout single-column ancho controlado (max-w-6xl) al estilo Airbnb; Alux permanece flotante (ya está) |
| Sin voces locales | §5 Voces locales (nuevo bloque, futuro `vmx.experience.local-voices`) |
| Sin "cuándo ir" | §9 Cuándo ir (nuevo bloque, futuro `vmx.experience.calendar`) |

### Bloques oficiales reutilizados vs. nuevos

**Reutilizados (sin duplicar, evolución por config/variant):**
- `vmx.experience.hero` (variant `immersive` con foto única)
- `vmx.experience.section` (contexto editorial)
- `vmx.experience.gallery` (variante `editorial-grid`)
- `vmx.experience.related-collection` (**una vez**, con chips filtrables — evolución de la capability `filters`)
- `vmx.experience.map` (variante `pins-only`, sin lista paralela; capability `openFullscreen`)
- `vmx.experience.institutional-badges`
- `vmx.experience.subnav` + `cta-bar`

**Nuevos (proponer sub-olas H-03 posteriores):**
- `vmx.experience.local-voices` — bloque de testimonios multi-voz (foto + cita + rol).
- `vmx.experience.calendar-strip` — timeline horizontal de momentos culturales.
- `vmx.experience.nearby-destinations` — cards con tiempo de traslado.

### Móvil (mobile-first)

- Hero 100vh con foto + H1 + 1 CTA.
- Cada sección `min-h-[70vh]` con margen respiratorio; subnav sticky permite saltar.
- Chips de §4 con scroll horizontal.
- Mapa: botón fijo "Explorar en mapa" abre bottom-sheet full-screen.
- Meta objetivo: reducir de 10,624 px a **≤ 6,500 px** de scroll total.

---

## 4. Alcance de la iniciativa

**Aplica a:** `DestinationSurface` (Valladolid, Izamal, Espita y futuros destinos del Oriente Maya).

**No modifica en este proyecto (aunque comparten aprendizajes):**
- `BusinessSurface` — se auditará por separado (misma lente) en una iniciativa posterior.
- Páginas de categoría (`/oriente-maya/:destino/:categoria`) — regidas por `TourismListingSurface` (estándar oficial vigente, sin regresión).

---

## 5. Plan de ejecución propuesto

| Fase | Entregable | Duración estimada |
|---|---|---|
| **F0 — Auditoría** (este doc) | Diagnóstico + benchmark + narrativa v2.0 | ✅ Entregado |
| **F1 — Direcciones visuales** | 3 direcciones rendereadas (Airbnb-inmersivo · Google-utilitario elegante · TripAdvisor-editorial social), con DSL Colonial locked | 1 turno |
| **F2 — Wave A · Estructura** | Rehacer `DestinationSurface` con el flujo de 11 secciones sobre bloques existentes (§1-4, §6-8, §10-11). Retirar `DiscoveryNavigator` lateral y lista paralela del mapa. | 2-3 turnos |
| **F3 — Wave B · Bloques nuevos** | `local-voices` + `calendar-strip` + `nearby-destinations` (contratos Zod + 3 capas + fichas de madurez L4) | 3-4 turnos |
| **F4 — Wave C · Datos** | Semillas realistas en Lovable Cloud para §5 (voces), §9 (agenda), §10 (destinos cercanos). Demo Pack. | 1-2 turnos |

Cada Wave: implementación + typecheck + build + smoke + comparativa antes/después + Completion Report + validación Founder antes de continuar.

---

## 6. Decisiones pendientes del Founder

1. ¿Apruebas la **secuencia narrativa de 11 secciones** tal cual, o quieres alterar el orden / agregar / quitar alguna?
2. ¿Autorizo generar las **3 direcciones visuales rendereadas** (F1) ahora?
3. Confirmación: el rediseño **aplica solo a `DestinationSurface`** en esta iniciativa (BusinessSurface auditoría posterior). ✅ / ✏️
4. Los bloques nuevos (`local-voices`, `calendar-strip`, `nearby-destinations`) siguen la regla de Compatibilidad Evolutiva (no duplican existentes) — ¿los apruebas como sub-olas H-03 posteriores a la Wave A?

---

*Fin del documento · v1.0*