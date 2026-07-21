# OMXDS · Inventario de Capacidades Valladolid.mx V1.0

**Estado:** Proposed for Founder Approval  
**Fecha:** 2026-07-21  
**Owner:** Founder / Product Governance  
**Dominio primario:** D01 · product-governance  
**Depende de:** OMXDS Foundation V1.0, Visitor Journey Intelligence & Measurement Blueprint V1.0, Product Evolution Roadmap v2.1 y Completion Reports vigentes.  
**Alcance:** diagnóstico y priorización documental. No autoriza contacto con empresas, cambios de código, migraciones, instrumentación, cobros ni producción.

---

## 1. Decisión que habilita este inventario

Este documento mapea las capacidades existentes de Valladolid.mx contra las diez capas de OMXDS y determina qué debe ocurrir para lanzar una V1 controlada con viajeros y empresas reales.

La evidencia revisada corrige dos pendientes históricos:

- CV8.9 · Action Queue & Decision Workflow está integrado, desplegado y validado con Founder/Admin.
- AC1.4–AC1.5 · continuidad local-first y momentos de valor para registro están integrados, desplegados y verificados en producción.

Por tanto, el siguiente cuello de botella no es una nueva épica técnica. Es la operación real del destino.

---

## 2. Lenguaje de clasificación

| Estado | Significado |
|---|---|
| **Reusable** | Existe, tiene evidencia suficiente y puede usarse en V1 sin reconstrucción. |
| **Extensible** | Existe y sirve, pero requiere configuración, hardening o validación acotada. |
| **Operational pending** | El software existe; faltan actores, datos, acuerdos o ejecución real. |
| **Missing blocker** | No existe lo mínimo y bloquea el soft launch. |
| **Deferred** | Aporta valor futuro, pero no debe retrasar V1. |
| **Deprecable / duplicate** | Debe retirarse o consolidarse porque compite con una fuente canónica. |

Un Blueprint no prueba implementación. Un Completion Report no prueba operación sostenida. Una simulación no prueba adopción.

---

## 3. Resultado ejecutivo

### Diagnóstico

Valladolid.mx tiene una base funcional suficiente para un soft launch controlado. Las capacidades más maduras son Discovery, CMS/Experience Builder, Travel Plan, continuidad anónima, CV6, Alux, Visitor Intelligence, Action Queue, seguridad por roles y Marketplace base.

Las brechas dominantes son operativas:

1. cero evidencia de 15 empresas reales publicables;
2. oferta comercial Founder aún no congelada;
3. soporte, cobertura Concierge y responsables sin operación demostrada;
4. reglas mínimas de CFDI, reembolsos, disputas, privacidad y términos antes de cobrar;
5. notificaciones, monitoreo y analítica externa sin certificación de operación real;
6. flujos end-to-end sin cohorte real de viajeros.

### Readiness por naturaleza

| Dimensión | Estado V1 |
|---|---|
| Producto para descubrir y planear | **Reusable** |
| Continuidad anónima y registro progresivo | **Reusable** |
| Inteligencia y decisión humana | **Reusable técnicamente / Operational pending** |
| Oferta turística real | **Missing blocker** |
| Operación y soporte | **Missing blocker** |
| Cobro comercial completo | **Extensible / condicionado** |
| Retención postviaje | **Deferred hasta señal real** |

---

## 4. Inventario por las diez capas OMXDS

### 4.1 Identidad y confianza

| Capacidad | Estado | Evidencia | Deuda V1 | Decisión |
|---|---|---|---|---|
| Autenticación y Google Auth | Reusable | cierre E1b | Smoke con cohorte real | Reutilizar |
| Roles Founder/Admin/Empresa/Concierge/Traveler | Reusable | Serie 15.10.4 y RLS | Probar perfiles operativos reales | Reutilizar |
| Continuidad anónima → cuenta | Reusable | AC1.4–AC1.5; PR #5/#6 | Observar segunda importación real | No reconstruir |
| Reclamo y verificación de empresa | Operational pending | onboarding multibusiness + Portal | Ejecutar con empresas reales | Vertical V1 |
| Consentimiento y privacidad | Extensible | políticas Founder + Blueprint 10 | Revisión legal y matriz operativa | Gate de lanzamiento |
| Trust Engine v1 | Reusable | cierre 16.21 | Señal real y reglas de excepción | Mantener acotado |

### 4.2 Knowledge & Content

| Capacidad | Estado | Evidencia | Deuda V1 | Decisión |
|---|---|---|---|---|
| Entidades territoriales canónicas | Reusable | rutas N2/N3 y SEO/GEO | Validar contenido real | Reutilizar |
| CMS y Experience Builder | Reusable | Serie 15.10.4b | Entrenamiento editorial | No ampliar |
| Fichas de empresa y catálogo | Operational pending | Portal + rutas públicas | 15–25 perfiles reales completos | Vertical V1 |
| Contenido multilingüe | Extensible | es/en/fr + scaffold | Priorizar es/en en V1 | Diferir expansión |
| Calidad de datos | Missing blocker | checklist 17.1 existe | Owner, revisión, cadencia y evidencia | Resolver manualmente primero |
| Zazil Tunich editorial | Extensible | cierre técnico SEO.A3.M2 | Aprobación editorial para verified | Usar como piloto |

### 4.3 Discovery

| Capacidad | Estado | Evidencia | Deuda V1 | Decisión |
|---|---|---|---|---|
| Home, destinos, hoteles, restaurantes, experiencias y eventos | Reusable | Discovery y Surface Kit | Smoke con contenido real | Reutilizar |
| Búsqueda, filtros y colecciones | Reusable | Marketplace/Discovery | Densidad de inventario real | No reconstruir |
| Navegación territorial | Reusable | 15.11 N3 Closure | QA móvil de rutas críticas | Reutilizar |
| SEO técnico y schema | Extensible | H1 y SEO.A1–A3 | GSC, hreflang y condiciones post-deploy | Cerrar mínimo |
| Mapas y geolocalización | Extensible | contexto territorial | Verificar claves, facturación y coordenadas | Gate operativo |

### 4.4 Traveler Journey

| Capacidad | Estado | Evidencia | Deuda V1 | Decisión |
|---|---|---|---|---|
| Favoritos y Arma tu Viaje | Reusable | Serie 16.10–16.15 | Uso real y métricas | Reutilizar |
| Borrador anónimo local-first | Reusable | AC1.4–AC1.5 | Telemetría remota no autorizada | Preservar |
| Registro en momentos de valor | Reusable | dock y SignInPromptSheet verificados | Medir conversión real | Reutilizar |
| Intelligent Travel Workspace | Reusable | CV5 | Barrido móvil pendiente | QA acotado |
| Live Destination Companion | Reusable | CV6.1–CV6.8 | Operación onsite real | Pilotear |
| Travel Passport / Memory Loop | Deferred | CV7 sólo Blueprint | Sin señal de retención real | No bloquear V1 |

### 4.5 Commerce

| Capacidad | Estado | Evidencia | Deuda V1 | Decisión |
|---|---|---|---|---|
| Productos, órdenes y comisiones | Extensible | Wave 4 + código de pagos | Reconciliación con negocio real | Pilotear controlado |
| Checkout y Stripe webhook | Extensible | rutas y adaptador Stripe | Configuración/secretos/smoke real | Gate si hay cobro |
| Cotización Concierge | Reusable técnicamente | casos y propuestas | Operador real + SLA | Pilotear |
| CFDI 4.0 | Missing blocker para cobro comercial | sólo plan/assessment | Política o proveedor y responsable | Resolver antes de cobrar |
| Reembolsos, disputas y contracargos | Missing blocker para cobro comercial | pendiente reconocido | Workflow mínimo, aunque manual | Resolver antes de cobrar |
| Pases/asientos especializados | Deferred | PRD Videomapping externo | No acelera V1 central | Posponer |

### 4.6 Operations

| Capacidad | Estado | Evidencia | Deuda V1 | Decisión |
|---|---|---|---|---|
| Portal de Empresas | Reusable técnicamente | cierre multibusiness | 15–25 operadores reales | Vertical V1 |
| Programa Fundadores | Operational pending | plan 17.1 Proposed | Oferta, responsable y cohorte | Primer vertical |
| Concierge Workspace | Reusable técnicamente | CV4/CV6/CV8.9 | Turnos, SLA y cobertura | Gate operativo |
| Action Queue | Reusable técnicamente | CV8.9 cerrado | Datos y owners reales | Activar con cohorte |
| Soporte e incidentes | Missing blocker | assessment 17 | Runbooks, canal y guardia | Resolver |
| Transporte/hoteles integrados | Deferred | capacidades parciales/PRD | No requerido para soft launch base | Posponer |

### 4.7 Intelligence

| Capacidad | Estado | Evidencia | Deuda V1 | Decisión |
|---|---|---|---|---|
| Alux multilingüe y contextual | Reusable técnicamente | cierres Alux/CV6 | Guardrails y costo con tráfico real | Pilotear |
| Recommendation Engine v1 | Reusable | cierre 16.24 | Validar aceptación real | No ampliar |
| Context Engine y etapa del viaje | Reusable | CV6 O1/O2 | QA con viajeros reales | Reutilizar |
| Feedback a recomendaciones | Reusable técnicamente | CV8.6 + CV8.9.4 | Volumen real mínimo | Esperar señal |
| Perfil contextual | Extensible | fuentes AC1/CV8 | Consentimiento y utilidad real | Mantener mínimo |

### 4.8 Engagement

| Capacidad | Estado | Evidencia | Deuda V1 | Decisión |
|---|---|---|---|---|
| PWA instalable | Extensible | base PWA/SW | Prueba de campo | No bloquear beta |
| Offline total | Deferred | 15.10.6 pendiente | Falta evidencia rural | Posponer |
| Push y email transaccional | Missing blocker para operación asistida | assessment/roadmap | Proveedor, templates, entregabilidad y opt-out | Cerrar mínimo |
| WhatsApp Concierge | Operational option | recomendado en assessment | Número, horario, consentimiento y handoff | Usar si acelera |
| Mensajes por etapa | Extensible | CV6 stage-aware | Canal real y medición | Activar gradualmente |

### 4.9 Destination Intelligence

| Capacidad | Estado | Evidencia | Deuda V1 | Decisión |
|---|---|---|---|---|
| CV8.0–CV8.8 | Reusable técnicamente | Completion Reports | Outcome y aprobaciones pendientes | Operar con datos reales |
| CV8.9 decisiones humanas | Reusable | cierre 2026-07-20 | Assigned-only con operadores reales | Seguimiento |
| Simulation Pack | Reusable para QA | CV8.S | No confundir con tracción | Mantener aislado |
| Journey end-to-end | Governed / partial instrumentation | Blueprint 10 | Inventario de eventos y feature flags | Fase posterior |
| North Star de noches adicionales | Defined, not operational | Foundation + Blueprint 10 | Baseline, reconciliación y atribución | Medir en piloto |
| CSAT/NPS y referrals | Missing / partial | assessment | Encuesta mínima y señal verificable | Cerrar durante piloto |

### 4.10 Platform Foundation

| Capacidad | Estado | Evidencia | Deuda V1 | Decisión |
|---|---|---|---|---|
| Supabase, RLS y roles | Reusable | auditorías y smoke | Revisión de migraciones objetivo | Reutilizar |
| Build, typecheck y tests | Reusable | reconciliación y CI | Mantener gate por PR | Obligatorio |
| Observabilidad interna | Extensible | dashboards CMS | APM y errores de usuario final | Cerrar mínimo |
| Performance | Extensible | H0–H2 | TTFB productivo no medido | Medir, no proclamar |
| Media pipeline | Deferred/flagged OFF | H3 M0–M2.3.1 | Flags OFF y hallazgo H-1 | No activar |
| Accesibilidad y pen-test | Extensible | controles parciales | Auditoría proporcional antes de apertura | Soft-launch gate |
| MCP M1.0 | Reusable / no prioritario | Completion Report | M1.1–M1.3 sin GO | Diferir |

---

## 5. Fuentes únicas que no deben duplicarse

| Concepto | Fuente canónica V1 |
|---|---|
| Identidad autenticada y roles | Auth + perfiles/roles existentes |
| Borrador anónimo | AC1 AnonymousTravelDraft |
| Madurez de relación | CV8 Journey T1–T9 |
| Momento temporal | CV6 Stage-Aware |
| Destinos, empresas, productos y eventos | Entidades canónicas del dominio público/CMS |
| Plan del viajero | Travel Plan |
| Caso humano | Concierge Case / promotePlanToCase |
| Orden y pago | Commerce / Orders / provider adapter |
| Evento analítico | Catálogo CV8 append-only |
| Decisión operativa | CV8.9 Action Queue |
| Prioridad | Roadmap v2.1 |

Se prohíbe crear un segundo CRM, tracker, perfil del viajero, onboarding, catálogo, checkout o dashboard para resolver el vertical.

---

## 6. Selección del primer vertical V1

### Candidatos comparados

| Candidato | Impacto en lanzamiento | Reutilización | Deuda nueva | Dependencia externa | Resultado |
|---|---:|---:|---:|---:|---|
| Programa Fundadores Valladolid | Muy alto | Muy alta | Baja | Media | **Seleccionado** |
| Journey Intelligence completo | Alto futuro | Alta | Alta | Legal/analítica | Después del piloto |
| Night Pass / Videomapping | Medio para OMXDS | Media | Alta | Operación, asientos, transporte | Diferido |
| Travel Passport CV7 | Medio | Media | Media | Señal postviaje | Diferido |
| Offline total | Bajo para lanzamiento | Media | Alta | Campo/dispositivos | Diferido |

### Vertical recomendado

**Programa Fundadores Valladolid — Empresa real → verificación → catálogo publicable → descubrimiento → plan/consulta → atención → resultado medible.**

Este vertical reutiliza la mayor parte de la plataforma, genera la oferta necesaria para cualquier recorrido de viajero y produce la primera evidencia real para decidir qué construir después.

No autoriza todavía contactar empresas. Requiere GO Founder sobre oferta comercial, responsable del programa, canal de soporte y tratamiento de consentimiento.

---

## 7. Corte de alcance para V1

### Must — sin esto no hay soft launch

- 15 empresas reales publicables; objetivo 25.
- oferta Founder aprobada y responsable designado;
- perfiles, ubicación, horarios, fotos y al menos un producto/servicio verificados;
- soporte a empresas y viajeros con responsable, horario y escalación;
- smoke descubrir → guardar/planear → registrarse → solicitar/ordenar → atender;
- separación visible entre simulación y datos reales;
- monitoreo de errores y medición mínima;
- política operativa de privacidad, términos, CFDI, cancelación y reembolso antes de cobrar;
- notificación transaccional mínima para los flujos activados.

### Should — durante el piloto

- CSAT de una pregunta y motivo de abandono;
- prueba assigned-only de CV8.9 con operador real;
- Search Console, analítica y schema crítico;
- QA móvil, accesibilidad y seguridad proporcionales;
- baseline de noches planeadas/confirmadas e influencia OMXDS;
- documentación de fricciones por empresa y viajero.

### Could — sólo si no desplaza Must

- WhatsApp Concierge con handoff trazable;
- mejoras puntuales de contenido y onboarding derivadas de uso;
- optimización de una ruta con evidencia de fricción.

### Not now

- CV7, offline total, nuevos módulos Alux, MCP M1.1–M1.3;
- Night Pass como prioridad central;
- Header Builder, Hero Vivo, Navigation Intelligence;
- simulación full, media pipeline ON o refactor masivo;
- expansión territorial antes de validar Valladolid.

---

## 8. Plan de ejecución ágil

### Ola 1 · Congelar operación (3–5 días)

1. Aprobar oferta comercial Founder.
2. Designar responsable y canal de soporte.
3. Confirmar checklist, estados y evidencia del plan 17.1.
4. Definir política mínima de cobro o declarar piloto sin cobro.
5. Elegir las primeras cinco empresas piloto.

**Gate:** invitación lista, responsables claros y cero promesas no autorizadas.

### Ola 2 · Cinco empresas piloto (7–10 días)

1. Registrar o reclamar fichas reales.
2. Verificar identidad, ubicación, horarios, contenido y catálogo.
3. Publicar y ejecutar smoke móvil/escritorio.
4. Registrar fricción sin construir una nueva superficie.

**Gate:** cinco empresas publicadas y principales fricciones documentadas.

### Ola 3 · Escalar a 15–25 (10–15 días)

1. Corregir únicamente bloqueadores repetidos.
2. Incorporar la cohorte restante.
3. Activar soporte, notificaciones y monitoreo mínimo.
4. Probar recorrido end-to-end con operadores reales.

**Gate:** mínimo 15 empresas publicables y operación lista para invitados.

### Ola 4 · Soft launch cerrado (14–21 días)

1. Invitar cohorte limitada de viajeros.
2. Medir continuidad, planes, consultas, reservas/noches y satisfacción.
3. Operar Action Queue con decisiones humanas.
4. Emitir Launch Readiness Report actualizado.

**Gate:** decisión GO/NO-GO para apertura y para la siguiente capacidad.

---

## 9. Métricas del vertical

| Objetivo | Métrica |
|---|---|
| Oferta real | empresas publicables/publicadas |
| Velocidad | mediana contacto → publicación |
| Calidad | porcentaje con checklist completo |
| Activación empresarial | empresas con al menos una actualización o atención real |
| Descubrimiento | viajeros que consultan entidades de la cohorte |
| Planeación | entidades agregadas a favoritos/plan |
| Atención | casos y tiempo de primera respuesta |
| Conversión útil | planes que avanzan a contacto, propuesta u orden |
| Permanencia | noches planeadas, confirmadas e influenciadas |
| Confianza | CSAT, incidencias, cancelaciones y opt-out |
| Valor local | empresas distintas incluidas por viaje |

No se declara tracción con seeds, demos, simulación o visitas internas.

---

## 10. Riesgos y controles

| Riesgo | Control |
|---|---|
| Construir antes de observar | cinco empresas piloto antes de automatizar |
| Contar mocks como oferta | sólo estados Publicable/Publicada reales |
| Cobrar sin operación fiscal | piloto sin cobro o política CFDI aprobada |
| Datos desactualizados | owner y fecha de próxima revisión por ficha |
| Soporte sin dueño | responsable, horario y escalación visibles |
| Sobreinstrumentación | eventos mínimos ligados a decisión y consentimiento |
| Confundir simulación con realidad | namespaces y rotulado separados |
| Prometer cobertura regional prematura | Valladolid como núcleo hasta el gate |

---

## 11. Gates de aprobación

### Gate A · Aprobar inventario

- [ ] Founder acepta la clasificación y las fuentes únicas.
- [ ] Founder confirma Programa Fundadores como primer vertical.
- [ ] Roadmap y plan operativo se actualizan sin abrir épicas paralelas.

### Gate B · Autorizar operación

- [ ] oferta comercial congelada;
- [ ] responsable del programa designado;
- [ ] canal y horario de soporte definidos;
- [ ] primeras cinco empresas candidatas elegidas;
- [ ] modalidad de cobro del piloto decidida.

### Gate C · Autorizar soft launch

- [ ] mínimo 15 empresas reales publicables;
- [ ] recorrido crítico validado;
- [ ] notificaciones, monitoreo y soporte activos;
- [ ] políticas comerciales, fiscales y de privacidad aplicables;
- [ ] cohortes internas/simuladas separadas de las reales.

---

## 12. Registro de decisión pendiente

Este inventario propone:

1. aceptar que la plataforma base es suficiente para iniciar operación controlada;
2. seleccionar Programa Fundadores Valladolid como primer vertical OMXDS V1;
3. congelar las capacidades “Not now” hasta obtener evidencia real;
4. actualizar roadmap y plan sólo después de aprobación Founder;
5. no activar instrumentación nueva del Blueprint 10 dentro de este PR.

La aprobación de este documento no autoriza contactar empresas, activar cobros ni modificar producción. Esas acciones requieren el Gate B.

---

## 13. Control de versión

| Versión | Fecha | Estado | Descripción |
|---|---|---|---|
| 1.0 | 2026-07-21 | Proposed | Inventario de las diez capas OMXDS, fuentes únicas, brechas V1, selección recomendada del Programa Fundadores y corte Must/Should/Could/Not now. |
