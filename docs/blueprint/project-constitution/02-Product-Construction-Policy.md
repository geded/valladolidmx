# 02 · Product Construction Policy

**Versión:** 1.0 · Oficial
**Fuente consolidada:** `15.10.4d-PRODUCT-CONSTRUCTION-RULES-v1.0.md`, `15.10.4d-SPRINT-PLAN-v1.0.md`, `15.10-ARCHITECTURE-CLOSURE-AND-PRODUCT-START-v1.0.md`, memoria Core.

---

## 1. Product Construction Rule

La etapa arquitectónica está cerrada. El proyecto opera en **modo Product Construction**:

- Se trabaja sobre el Sprint Plan vigente (`15.10.4d`).
- **Una historia a la vez.** No se inicia la siguiente hasta aprobación explícita del Founder.
- Cada entrega incluye: implementación + typecheck + build + smoke + rollback + Completion Report + demo funcional visible.

## 2. Una iniciativa a la vez

Prohibido mezclar múltiples iniciativas en el mismo turno. Cada Sub-ola cierra antes de abrir la siguiente.

## 3. Arquitectura antes que UI

El orden canónico de cada Sub-ola es: contrato de datos → server functions → UI. Nunca al revés.

## 4. Reutilización obligatoria

Toda nueva funcionalidad **evoluciona el sistema existente**. Nunca crea soluciones paralelas.

Antes de proponer un componente/registry/engine nuevo, verificar en el Blueprint y en la memoria si ya existe una equivalente aprobada.

## 5. Product First Validation

Cada historia US-R* debe demostrar:

1. capacidad incorporada o mejorada;
2. flujo de usuario completo;
3. cero capacidades perdidas;
4. cero experiencia paralela;
5. mejora vs historia anterior.

**DoD obligatorio:** Typecheck + Build + Smoke + Auditoría no-regresión + Comparativa visual antes/después + Demo funcional + Completion Report + Impacto de producto.

*Compilar no es suficiente.*

## 6. Demo Pack Policy

Ninguna entrega se considera terminada sin **Demo Pack**:

- datos realistas sembrados en Lovable Cloud;
- ≥1 registro completo por tipo nuevo;
- URLs exactas;
- credenciales si aplica;
- pasos de reproducción;
- marca de datos temporales.

Prohibido borrar datos demo hasta que el Founder diga literal: *"Demo validada. Puedes eliminar los datos temporales."*

Forma parte del DoD de cada Sub-ola.

## 7. Product Vision Rule

Toda funcionalidad debe cumplir al menos uno:

- ayuda al empresario a vender más;
- ayuda al turista a vivir mejor;
- ayuda a Alux a responder mejor;
- reduce trabajo operativo.

Sin justificación aprobada, no se implementa. Éxito = usuarios reales, no infraestructura.

## 8. Infrastructure Freeze reforzada

Prohibido crear nuevos engines, providers, registries, capas, sistemas de navegación o de diseño. Necesidad arquitectónica nueva → detener y documentar como propuesta, no implementar.

---

## Regla operativa

**Cerrar antes de abrir.** No se autoriza una nueva iniciativa mientras exista una Sub-ola aprobada pero no cerrada por el Founder.

---

## Conflictos pendientes de decisión del Founder

Ninguno al momento de esta versión.