---
name: Founder Behavioral First Principle
description: El software es medio; el resultado real de cada épica es un cambio observable de comportamiento del viajero. Toda épica debe declarar el cambio antes de la arquitectura.
type: preference
---
**Founder Behavioral First Principle** (vinculante, complementa Founder Business Value Principle).

El software constituye únicamente un medio. El verdadero resultado esperado de cada épica es un cambio positivo en el comportamiento del viajero. Una funcionalidad correctamente implementada que no modifica el comportamiento esperado NO cumple su propósito.

## Behavioral Change Statement (obligatorio en TODO Blueprint)

Antes de describir arquitectura, componentes o implementación, el Blueprint debe abrir con la sección **Behavioral Change Statement** respondiendo:

1. **¿Qué comportamiento actual del viajero queremos cambiar?** — describir el comportamiento existente que limita el valor del producto.
2. **¿Qué comportamiento esperamos observar después de implementar esta épica?** — definir el comportamiento objetivo de forma observable y medible.
3. **¿Por qué ese cambio acerca a Alux a su objetivo estratégico?** — relacionar explícitamente con el objetivo vigente del producto.
4. **¿Cómo comprobaremos que el comportamiento realmente cambió?** — indicadores verificables (no sólo conversión; también confianza, continuidad, uso, retorno).

## Orden obligatorio de todo Blueprint

**Comportamiento → Experiencia → Arquitectura → Implementación → Métricas.**

Ningún Blueprint puede comenzar describiendo componentes técnicos.

**How to apply:** rechazar/regresar cualquier Blueprint que no abra con Behavioral Change Statement y que no siga el orden obligatorio. Aplica junto con Founder Business Value Principle como requisito conjunto para autorizar la emisión de un Blueprint.