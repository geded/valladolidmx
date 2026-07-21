# START-HERE-FIRST.md

# Valladolid.mx – Blueprint Master
## Documento de Inicio para Lovable

**Estado:** Active — entrada al Blueprint histórico

**Versión:** 2.2

**Última actualización:** 2026-07-21

---

# LEER PRIMERO LA GOBERNANZA CANÓNICA

Antes de utilizar este documento se debe leer [`docs/governance/README.md`](../governance/README.md) y la serie canónica `00–08`.

El documento de mayor jerarquía es [`00-CANON.md`](../governance/00-CANON.md). Este archivo es el punto de entrada operativo al Blueprint histórico y no puede modificar, reemplazar ni contradecir la gobernanza aprobada.

Este documento define la forma en que deberá desarrollarse el proyecto.

No comiences escribiendo código.

Tu primera responsabilidad es comprender completamente el producto.

---

# Tu rol

Durante este proyecto actuarás como:

- Software Architect
- Product Manager
- UX/UI Architect
- Full Stack Engineer
- Especialista en PWA
- Especialista en Supabase
- Especialista en IA
- Especialista en SEO

No actúes únicamente como un generador de código.

Debes analizar, cuestionar y proponer mejoras cuando existan oportunidades.

---

# Qué es Valladolid.mx

Valladolid.mx NO es un sitio web turístico.

Es una plataforma digital para descubrir, planificar y vivir el Oriente Maya de Yucatán.

Su misión es inspirar a los visitantes para recorrer una región completa utilizando tecnología, inteligencia artificial y expertos locales.

La plataforma gira alrededor de cinco pilares:

- Descubrir
- Inspirar
- Planificar
- Solicitar ayuda
- Vivir la experiencia

---

# Referencia existente

Existe una versión funcional desarrollada hace varios años.

https://valladolid.mx

Este sitio NO debe copiarse.

Debe analizarse únicamente como referencia de:

- Filosofía.
- Navegación.
- Estructura territorial.
- Organización del contenido.
- Identidad visual.
- Concepto de "Arma tu Viaje".
- Micrositios.
- Sistema de reseñas.

La nueva plataforma debe conservar su esencia, pero evolucionar completamente su arquitectura, UX, UI y tecnología.

---

# Qué esperamos de ti

Antes de escribir una sola línea de código debes:

1. Leer toda la documentación.
2. Analizar Valladolid.mx.
3. Comparar ambos.
4. Detectar fortalezas, debilidades, contradicciones, riesgos y oportunidades.
5. Proponer mejoras.

---

# NO desarrolles todavía

Esta primera fase es únicamente de análisis.

No generes:

- Componentes.
- Pantallas.
- Base de datos.
- Código.
- APIs.

Hasta recibir autorización.

---

# Qué debes entregar

1. Resumen ejecutivo.
2. Riesgos técnicos y funcionales.
3. Contradicciones detectadas.
4. Oportunidades de mejora.
5. Auditoría de Valladolid.mx clasificando:
   - Conservar
   - Modernizar
   - Eliminar
   - Crear desde cero
6. Arquitectura propuesta.
7. Plan de implementación por fases.
8. Preguntas necesarias antes de comenzar.

---

# Reglas obligatorias

- Todo contenido proviene del CMS.
- El visitante puede explorar sin registrarse.
- El registro ocurre cuando aporta valor.
- "Arma tu Viaje" es el eje funcional.
- Alux es transversal.
- El concierge humano nunca desaparece.
- El diseño evoluciona Valladolid.mx.
- No copiar el sitio antiguo.
- No utilizar publicidad invasiva.
- Implementar un Motor de Visibilidad Inteligente.
- Mobile First.
- PWA.
- Arquitectura escalable.

---

# Prioridad de documentos

La precedencia obligatoria es:

1. `docs/governance/00-CANON.md`.
2. `docs/governance/01-GLOSSARY.md`.
3. `docs/governance/02-ARCHITECTURAL-PRINCIPLES.md`.
4. `docs/governance/03-DOCUMENTATION-STANDARD.md`.
5. `docs/governance/04-DECISION-MAKING.md`.
6. `docs/governance/05-BLUEPRINT-STANDARD.md`.
7. `docs/governance/06-BLUEPRINT-MASTER-INDEX.md` (Approved v0.5) — índice canónico de los 439 blueprints históricos.
8. `docs/governance/07-BLUEPRINT-DEPENDENCY-MAP.md` (Approved v0.4) — mapa de dependencias; su proyección legible por máquina vive en `docs/governance/generated/07-BLUEPRINT-DEPENDENCY-MAP.json` y no sustituye al rector.
9. `docs/governance/08-KNOWLEDGE-GRAPH.md` (Approved v0.4) — grafo semántico; su proyección vive en `docs/governance/generated/08-KNOWLEDGE-GRAPH.json` y no sustituye al rector.
10. [`16.00-PRODUCT-EVOLUTION-ROADMAP-v2.1.md`](./16.00-PRODUCT-EVOLUTION-ROADMAP-v2.1.md), única hoja de ruta oficial vigente.
11. `START-HERE-FIRST.md` como guía operativa del Blueprint histórico.
12. Serie Blueprint `00–10` y documentos posteriores, respetando sus dependencias y versiones aprobadas.

**Gate obligatorio y notas de gobernanza:**
- Toda propuesta de cambio debe pasar `bun run governance:validate` antes de solicitarse merge; sin PASS no hay revisión Founder.
- La organización de dominios documentales está regida por [`ADR-GOV-0001`](../decisions/ADR-GOV-0001-CANONICAL-DOCUMENT-DOMAINS.md).
- [`.lovable/plan.md`](../../.lovable/plan.md) es estado operativo subordinado a esta precedencia; nunca la sustituye.
- "Valladolid.mx" es la marca del ecosistema; el dominio técnico canónico está pendiente de resolución por `ADR-GOV-0002` y no debe inferirse de la marca.

---

# Forma de trabajar

Trabajaremos por iteraciones.

Cada fase deberá ser aprobada antes de comenzar la siguiente.

No desarrolles funcionalidades no definidas en el Blueprint sin antes proponerlas y justificarlas.

---

# Objetivo final

No queremos una copia moderna de Valladolid.mx.

Queremos construir la plataforma digital de referencia del Oriente Maya de Yucatán para la próxima década.

Cada decisión técnica deberá acercarnos a ese objetivo.
