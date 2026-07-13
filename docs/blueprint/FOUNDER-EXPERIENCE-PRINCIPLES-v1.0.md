# Founder Experience Principles v1.0

**Constitución de la Experiencia Alux**

Documento maestro de gobernanza de producto y experiencia. Consolida las
políticas Founder aprobadas durante la evolución de CV6 y AC1 en dominios
funcionales. **No reemplaza** las políticas individuales en `mem://policies/`
— es la referencia principal para validar la alineación de cualquier nueva
épica antes de iniciar implementación.

No modifica arquitectura, contratos, dominio ni código. Cada sección
referencia las políticas oficiales sin duplicar contenido.

> **Regla de uso:** antes de abrir una nueva épica, sub-ola o capacidad,
> recorrer los 12 dominios y confirmar cumplimiento explícito. Cualquier
> desviación requiere justificación documentada y aprobación Founder.

---

## Índice de dominios

1. Journey & Travel Lifecycle
2. Travel Companion
3. Continuidad
4. Daily Companion
5. Registro y Confianza
6. Permisos
7. Concierge Voice
8. Intent Recognition
9. UX Conversacional
10. Anonymous Continuity
11. Travel Memory
12. Experience First

---

## 1. Journey & Travel Lifecycle

La etapa del viaje es el contexto primario. Toda funcionalidad resuelve
`TravelStage` antes de decidir información, prioridad, permisos,
recomendaciones o CTA. Ciclo oficial: Inspiración → Exploración →
Planeación → Pre-viaje → En destino → Post-viaje → Inspiración.

- `mem://policies/founder-travel-lifecycle.md`
- `mem://policies/founder-journey-first.md`

## 2. Travel Companion

Alux es compañero de viaje, no herramienta transaccional. Onboarding y
capacidades futuras se diseñan como acompañamiento continuo.

- `mem://policies/founder-travel-companion.md`
- `mem://policies/founder-travel-companion-first.md`

## 3. Continuidad

Al regresar el viajero, la experiencia se centra en la continuidad del
viaje — nunca en recuperación técnica. Los primeros cinco segundos
responden dónde nos quedamos, qué es lo más importante ahora y cuál es el
siguiente paso.

- `mem://policies/founder-continuity-recognition.md`
- `mem://policies/founder-first-five-seconds.md`
- `mem://policies/founder-recap-continuity.md`

## 4. Daily Companion

Cada etapa entrega una misión diaria principal que responde "¿para qué
abro Alux hoy?". Toda capacidad nueva declara motivo de retorno mañana.

- `mem://policies/founder-daily-value.md`

## 5. Registro y Confianza

El registro nunca es requisito impuesto. Se gana con valor entregado, se
comunica como recompensa e invitación, y refuerza que el viajero conserva
el control. La confianza crece por niveles (N0 anónimo → N4 transaccional).

- `mem://policies/founder-earn-registration.md`
- `mem://policies/founder-registration-as-reward.md`
- `mem://policies/founder-progressive-trust.md`
- `mem://policies/founder-relationship-before-account.md`
- `mem://policies/founder-invitation.md`
- `mem://policies/founder-trust-continuity.md`

## 6. Permisos

Alux nunca pide permisos (ubicación, notificaciones) antes de demostrar
valor. Cada permiso se solicita en la etapa que lo justifica con
beneficio evidente.

- `mem://policies/founder-travel-companion-first.md` (permisos por etapa)
- `mem://policies/founder-journey-first.md` (`stageAllowsPermission`)

## 7. Concierge Voice

Alux se comunica como Concierge IA. Prohibido lenguaje técnico visible al
viajero (borrador, sesión, almacenamiento, TTL, migración).

- `mem://policies/founder-concierge-voice.md`

## 8. Intent Recognition

Cada acción del viajero es una intención. Alux responde con
microinteracciones conversacionales, nunca con confirmaciones técnicas.

- `mem://policies/founder-intent-recognition.md`

## 9. UX Conversacional

La experiencia se construye como diálogo. Copy orientado a acompañamiento,
decisiones y beneficios; jerarquía visual que guía la decisión en segundos.

- `mem://policies/founder-design-principle.md`
- `mem://policies/founder-decision-center.md`
- `mem://policies/founder-proactive-copilot.md`

## 10. Anonymous Continuity

Los visitantes anónimos reciben valor y construyen viaje parcial sin
registro. Local-first (IndexedDB), sin cuenta anónima, sin escritura de
red por interacción, sin fuentes paralelas al Travel Plan.

- `mem://policies/founder-anonymous-continuity.md`

## 11. Travel Memory

Cada experiencia hace más inteligente el siguiente viaje. El Travel Plan
es la memoria canónica; el Travel Passport se deriva de él. Prohibidos
historiales/perfiles/modelos paralelos.

- `mem://policies/founder-travel-memory-loop.md`
- `mem://policies/founder-travel-passport.md`
- `mem://policies/travel-plan-contract.md`

## 12. Experience First

Toda capacidad responde por escrito "¿qué ayuda concreta recibe el viajero
ahora?". Sin respuesta clara, se oculta o no se implementa.

- `mem://policies/founder-experience-first.md`
- `mem://policies/founder-product-axiom.md`
- `mem://policies/founder-destination-awareness.md`
- `mem://policies/founder-destination-context-engine.md`
- `mem://policies/founder-destination-contributors-guardrail.md`
- `mem://policies/travel-assistance-layer.md`

---

## Checklist de alineación para nuevas épicas

Antes de emitir Blueprint de cualquier épica, sub-ola o capacidad:

1. **Journey First** — ¿resuelve `TravelStage` antes de decidir contenido?
2. **Daily Value** — ¿por qué el viajero volverá a abrir Alux mañana?
3. **Experience First** — ¿qué ayuda concreta recibe el viajero ahora?
4. **Concierge Voice** — ¿el copy evita terminología técnica?
5. **Intent Recognition** — ¿cada acción se resuelve con microinteracción conversacional?
6. **Anonymous Continuity** — ¿funciona sin registro y sin escritura de red por clic?
7. **Continuidad** — ¿el retorno del viajero se centra en continuar, no en recuperar?
8. **Registro y Confianza** — ¿qué valor recibió el viajero antes de que se le solicite cuenta?
9. **Permisos** — ¿la etapa justifica cada permiso con beneficio evidente?
10. **Relationship Before Account** — ¿la métrica prioriza relación sobre conversión inmediata?
11. **Travel Memory** — ¿reutiliza Travel Plan como memoria canónica?
12. **Explainability & Reversibility** — ¿cada acción declara motivo y es reversible?

Si cualquier respuesta es "no" o "no está claro", la épica NO está lista
para implementación.

---

## Adenda · Founder Business Value Principle (2026-07-13)

La Constitución define **cómo debe sentirse Alux**. El Founder Business
Value Principle define **para qué existe cada nueva capacidad** y **cómo
se evaluará su éxito**. Ambos son requisito conjunto para autorizar
Blueprint.

Todo Blueprint de nueva épica/sub-ola/capacidad debe incluir:

1. **Objetivo de negocio principal.**
2. **Hipótesis de valor** (falsable).
3. **Métrica primaria de éxito (North Star)** — una sola.
4. **Métricas secundarias** — incluyendo contrapesos de confianza,
   utilidad y continuidad.
5. **Contribución estratégica** — cómo aporta al objetivo vigente.

Cadena obligatoria: **Arquitectura → Experiencia → Comportamiento del
viajero → Resultado de negocio.** Si falta cualquier eslabón, la épica
no se aprueba.

**Objetivo estratégico vigente:** incrementar la permanencia de los
viajeros en el destino, mejorar su experiencia antes/durante/después del
viaje y aumentar la conversión de esa experiencia en beneficios para el
ecosistema turístico local.

Referencia: `mem://policies/founder-business-value.md`.

---

_Documento mantenido por el Founder. Cualquier actualización se emite como
`FOUNDER-EXPERIENCE-PRINCIPLES-vN.M.md` sin sobrescribir versiones
anteriores._

---

## Adenda · Founder Behavioral First Principle (2026-07-13, vinculante)

Complementa el **Founder Business Value Principle**. El software es únicamente
un medio: el resultado real de cada épica es un **cambio observable en el
comportamiento del viajero**. Una funcionalidad correctamente implementada
que no modifica el comportamiento esperado NO cumple su propósito.

### Behavioral Change Statement (obligatorio en todo Blueprint)

Todo Blueprint debe abrir con una sección **Behavioral Change Statement**,
antes de describir arquitectura o componentes, respondiendo:

1. **¿Qué comportamiento actual del viajero queremos cambiar?**
2. **¿Qué comportamiento esperamos observar después de implementar esta épica?** (observable y medible)
3. **¿Por qué ese cambio acerca a Alux a su objetivo estratégico?**
4. **¿Cómo comprobaremos que el comportamiento realmente cambió?** — indicadores verificables: confianza, continuidad, uso y retorno; no sólo conversión.

### Orden obligatorio de todo Blueprint

**Comportamiento → Experiencia → Arquitectura → Implementación → Métricas.**

Ningún Blueprint puede comenzar describiendo componentes técnicos.

### Checklist ampliado

El checklist de 12 preguntas de esta Constitución se amplía con la validación
conjunta **Business Value + Behavioral Change Statement** como requisito
obligatorio para autorizar la emisión de cualquier Blueprint. Ver
`mem://policies/founder-behavioral-first.md`.

---

## Adenda · Founder Outcome Validation Principle (2026-07-13, vinculante)

Complementa el **Founder Behavioral First Principle**. Una épica NO se
considera completamente finalizada sólo porque el código compile, los tests
pasen, la arquitectura sea correcta o el Blueprint se haya ejecutado. Debe
demostrarse además que la experiencia tiene **capacidad de producir el cambio
de comportamiento** definido en su Behavioral Change Statement.

### Outcome Validation (obligatorio en todo Completion Report)

Todo Completion Report debe cerrar con una sección **Outcome Validation**
respondiendo como mínimo:

1. ¿Se implementó completamente la experiencia diseñada?
2. ¿Existe evidencia de que puede provocar el comportamiento esperado?
3. ¿Qué métricas deberán observarse en producción para validar esa hipótesis?
4. ¿Qué resultados podrían demostrar que la hipótesis fue incorrecta? (falsación)
5. ¿Qué ajustes se realizarían si el comportamiento esperado no ocurre?

### Distinción obligatoria

- **Cierre técnico (Completion Report):** certifica que la implementación
  quedó correctamente construida.
- **Validación de resultados (Outcome Validation posterior):** confirma si la
  experiencia realmente produjo el cambio de comportamiento previsto.

Ambos forman parte de la definición de éxito del producto y deben mantenerse
claramente diferenciados. Ver `mem://policies/founder-outcome-validation.md`.