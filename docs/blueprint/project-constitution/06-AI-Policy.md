# 06 · AI Policy

**Versión:** 1.0 · Oficial
**Fuente consolidada:** `08-ALUX-INTELLIGENCE-SYSTEM.md`, `11.4-AI-INTEGRATIONS-PLATFORM.md`, `15.10.4-ADENDA-ALUX-OPERATIONAL-PLATFORM-v1.0.md`, `15.10.5b` (Contextual Layer), Sub-olas F/G/H de Alux Traveler, memoria Core.

---

## 1. Explainable by Default

Toda respuesta importante de Alux declara explícitamente:

- **`rationale`** — por qué se sugiere.
- **`sources[]`** — de dónde proviene la información.
- **`effect`** — qué haría al aplicarse.
- **`reversible`** — si el usuario puede deshacer.

No es opcional. Es parte del contrato.

## 2. Lo que Alux nunca hace (v1)

Alux **nunca**:

- modifica automáticamente el plan de viaje;
- reserva;
- envía al Concierge sin autorización explícita del usuario;
- genera pagos;
- crea cotizaciones;
- contacta empresas.

Toda acción que afecte estado del usuario requiere confirmación manual vía UI existente (`AddToTravelPlanButton`, `promotePlanToCase()`).

## 3. Sin memoria paralela

Alux **no** crea memoria persistente conversacional propia. Consume exclusivamente el contexto oficial declarado por el workspace activo. Para el viajero es el **Travel Workspace** (ver Política 07).

## 4. Contexto operativo vía registries

Alux consume el contexto vía **Context Registry** declarativo y capacidades declaradas en el **Alux Registry** del workspace activo (`src/lib/workspace/alux-registry.ts`). Prohibidos estados contextuales aislados fuera del registry.

## 5. Workspace Copilot Layer

Alux se integra a cada workspace vía el **Workspace Copilot Layer**. Prohibido bypass del registry para leer/mutar contexto directamente.

## 6. Catálogo público sólo vía server functions aprobadas

El enriquecimiento con datos de catálogo se hace exclusivamente a través de **public-read server functions** aprobadas. Prohibido leer tablas directamente desde funciones de Alux.

## 7. AI Gateway

El proveedor de modelos por defecto es el **Lovable AI Gateway**. Alternativas requieren autorización explícita.

## 8. Auditoría

Toda sugerencia relevante se registra (ej. `alux_traveler_suggestions`) para auditoría, calidad y evolución del prompt.

---

## Regla operativa

**Explainable, reversible, autorizado.** Ninguna capacidad de Alux se libera si viola uno de los tres.

---

## Conflictos pendientes de decisión del Founder

Ninguno al momento de esta versión.