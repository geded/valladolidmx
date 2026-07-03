# Project Constitution · Valladolid.mx

**Versión:** 1.0
**Estado:** Oficial · Vigente
**Fecha:** 2026-07-03
**Nivel de autoridad:** Máximo. Equivalente a la arquitectura del proyecto.

---

## Propósito

Consolidar en un único cuerpo documental las decisiones de arquitectura, producto, UX, branding e IA que ya fueron aprobadas durante el desarrollo de la plataforma.

Esta Constitución **no crea reglas nuevas**. Rescata, ordena y unifica las decisiones ya vigentes en el Blueprint (`docs/blueprint/`) y en la memoria oficial del proyecto (`mem://index.md`).

A partir de esta versión, el proyecto deja de ser un prototipo y entra en etapa de **consolidación**.

---

## Alcance

Aplica a toda persona (humana o IA) que:

- lea, escriba o modifique código del proyecto;
- diseñe, migre o extienda superficies públicas o autenticadas;
- proponga nueva funcionalidad, arquitectura o branding;
- opere el roadmap oficial.

---

## Cómo utilizar estas políticas

1. **Leer primero.** Cualquier iniciativa importante debe consultar esta Constitución antes de plantear un plan.
2. **Verificar compatibilidad.** Si la implementación propuesta contradice una política vigente, detenerse y solicitar autorización explícita del Founder.
3. **Reutilizar antes de crear.** Todas las políticas priorizan reutilización sobre infraestructura nueva.
4. **Referenciar la fuente.** Cada política apunta a los documentos históricos donde se aprobó. La Constitución no reemplaza esos documentos: los consolida.

---

## Prioridad de las políticas

Orden de precedencia cuando exista conflicto:

1. Autorización explícita y vigente del Founder (última decisión escrita).
2. Constitución del Proyecto (este cuerpo documental).
3. Memoria oficial (`mem://index.md` y archivos referenciados).
4. Blueprint histórico (`docs/blueprint/`).
5. Convenciones implícitas del código.

Ninguna capa inferior puede sobrescribir una superior sin aprobación escrita.

---

## Relación con la documentación existente

- El **Blueprint** (`docs/blueprint/00..15.x`) sigue siendo la fuente histórica y técnica detallada.
- La **memoria oficial** (`mem://index.md`) sigue siendo la lista viva de reglas Core.
- La **Constitución** es la puerta de entrada: consolida las decisiones estratégicas y permanentes.

No se elimina documentación histórica. Cuando exista información obsoleta, se marca como *deprecada* y se referencia la política vigente.

---

## Índice

1. [Architecture Policy](./01-Architecture-Policy.md)
2. [Product Construction Policy](./02-Product-Construction-Policy.md)
3. [UX & Design Policy](./03-UX-Design-Policy.md)
4. [Navigation Policy](./04-Navigation-Policy.md)
5. [Branding Policy](./05-Branding-Policy.md)
6. [AI Policy](./06-AI-Policy.md)
7. [Travel Workspace Policy](./07-Travel-Workspace-Policy.md)
8. [Roadmap Policy](./08-Roadmap-Policy.md)
9. [CHANGELOG](./CHANGELOG.md)

---

## Conflictos pendientes de decisión del Founder

Los conflictos detectados durante la consolidación se documentan al final de cada política, en una sección homónima. Ninguno se resuelve unilateralmente.

Al momento de esta versión 1.0, los conflictos detectados son:

- **Header & Mega Menú**: la Iniciativa Header & Navigation Builder (planificada, `15.10.8`) propone convertirlos en componentes administrables por CMS + Experience Builder, mientras que la implementación actual (`src/components/layout/SiteHeader.tsx`, `PrimaryMegaMenu.tsx`) es v1 estática por código. Política vigente: **mantener v1 estática hasta cerrar Arma tu Viaje, Alux, Demo Pack, Google y Stripe** (memoria `roadmap/header-navigation-builder.md`). No hay conflicto activo, sólo diferimiento explícito.
- **Rutas `/mi-viaje` vs `/cuenta/mi-viaje`**: se conserva `/mi-viaje` como alias redirect (ver `src/routes/_authenticated/mi-viaje.tsx`). Política vigente: la URL canónica es `/cuenta/mi-viaje` bajo Workspace "cuenta". Redirect permanente aprobado.

Cualquier nuevo conflicto detectado se agregará aquí y en la política correspondiente **sin resolverse**, esperando decisión del Founder.

---

## Regla final

Si una implementación futura entra en conflicto con esta Constitución, **debe detenerse** y solicitar autorización del Founder antes de continuar.

La coherencia del proyecto está por encima de la velocidad de entrega.