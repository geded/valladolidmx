# Plan operativo vigente · Reconciliación → Soft Launch

**Estado:** Activo
**Última actualización:** 2026-07-21
**Roadmap rector:** `docs/blueprint/16.00-PRODUCT-EVOLUTION-ROADMAP-v2.1.md`
**Rama activa:** preparación documental OMXDS Visual Experience · ninguna etapa técnica autorizada.
**Base integrada:** `main` · merge `234a8c5f` (PR #6)
**Canal de publicación:** conexión directa de GitHub como vía principal; `gh` sólo como alternativa y nunca como requisito para el Founder.

Este archivo es una instrucción de ejecución subordinada a `docs/governance/00–08` y al roadmap oficial. No crea prioridades nuevas ni sustituye Completion Reports.

## 1. Punto de partida recuperado

- [x] Integración no destructiva de `main` con el trabajo benchmark H2.
- [x] Numeración canónica de `docs/governance/00–08` y auditoría de reconciliación.
- [x] Bun restaurado como gestor canónico; `bun.lock` recuperado y `package-lock.json` retirado.
- [x] Instalación congelada reproducible con Bun 1.3.14.
- [x] Typecheck sin errores.
- [x] Suite de 143 tests aprobada.
- [x] Build de producción aprobado y repetido.
- [x] Deuda de lint heredada documentada; no se mezcla con esta reconciliación.
- [x] Roadmap canónico rebaselined a v2.1 con estados respaldados por evidencia.
- [x] Plan Lovable reescrito para reflejar el estado real.

## 2. Gate R4 · Reconciliación cerrada

- [x] Draft PR #1 revisado e integrado sin reescribir historia publicada.
- [x] `main` alineado con el árbol validado en `47065f81`.
- [x] Bun 1.3.14, lockfile congelado, typecheck, 143 pruebas base y build reproducibles.
- [x] Orden de migraciones revisado y migración correctiva autorizada aplicada.

**DoD R4:** cumplido.

## 3. Próxima épica única · CV8.9

**Blueprint:** `docs/blueprint/16.CV8.9-ACTION-QUEUE-DECISION-WORKFLOW-v1.0.md`
**Objetivo:** convertir recomendaciones prescriptivas de Visitor Intelligence en decisiones humanas trazables y ejecutables.
**Inicio permitido:** después del DoD R4 y con GO Founder.

### Secuencia propuesta

1. [x] **CV8.9.1 · Contratos y proyección**
   - contrato `Action Queue` v1.0.0 congelado;
   - oportunidades y prioridades CV8.5–CV8.8 reutilizadas por adaptadores puros;
   - proyección pura, sin snapshots paralelos;
   - Completion Report aprobado por el Founder el 2026-07-20.
2. [x] **CV8.9.2 · Persistencia, roles y auditoría**
   - [x] estados y transiciones autorizadas;
   - [x] `has_role`, lectura assigned-only y escritura service-only;
   - [x] traza de responsable, decisión, motivo y timestamps;
   - [x] append atómico sin tablas ni snapshots nuevos;
   - [x] aplicar migración y ejecutar smoke DB con autorización Founder;
   - [x] aplicar migración correctiva de orden autoritativo y supersesión única;
   - [x] publicar la rama y su corrección en el PR #2;
   - [x] Completion Report aprobado por el Founder y PR #2 autorizado para integración;
   - [x] integrar PR #2 y desplegar el merge `b3a43282`;
   - [x] verificar que producción sirve exactamente el merge autorizado;
   - [x] ejecutar smoke humano Founder/Admin después de desplegar CV8.9.3;
   - [ ] ejecutar smoke assigned-only cuando existan operadores Concierge Lead/Editor reales.
3. [x] **CV8.9.3 · Superficie operativa — cierre técnico**
   - [x] cola filtrable, buckets, detalle e historial explicable;
   - [x] propuesta desde CV8.7/CV8.8 y propuesta manual;
   - [x] aceptación, owner, KPI, dirección, magnitud, ventana y fecha objetivo;
   - [x] acciones humanas por rol, evidencia, corrección y estados de error/vacío;
   - [x] cero auto-ejecución y cero datos de visitantes.
4. [x] **CV8.9.4 · Feedback, métricas y cierre técnico**
   - [x] `validated/rejected/dismissed` alimentan `family_confidence` CV8.6;
   - [x] aceptación 7d/30d, p50 a aceptar/implementar, validación, sesgo y SLA;
   - [x] proyección pura, cero tablas, snapshots o migraciones;
   - [x] pruebas focalizadas, typecheck, lint acotado y build;
   - [x] publicar la rama y abrir el Draft PR #3;
   - [x] revisar, integrar, desplegar, ejecutar smoke Founder/Admin y aprobar Completion Report;
   - [ ] ejecutar smoke assigned-only cuando existan operadores Concierge Lead/Editor reales.

**DoD CV8.9:** contrato versionado, persistencia segura, UI operable, decisiones auditables, pruebas verdes y Completion Report aprobado.

## 4. Épica cerrada después de CV8.9 · AC1.4–AC1.5

**Contrato rector:** `docs/blueprint/16.AC1-ANONYMOUS-TRAVEL-CONTINUITY-v1.0.md`

Implementar registro progresivo sólo en los momentos de valor oficiales:

- guardar de forma permanente;
- continuar en otro dispositivo;
- compartir;
- recibir recordatorios.

La continuidad anónima debe preservarse y `SignInPromptSheet` no puede actuar como gate genérico de identidad. El cierre requiere medición del paso anónimo → identificado sin pérdida de planes, favoritos o contexto.

Decisión Founder del 2026-07-20: GO explícito al modelo local-first. Invariantes vinculantes:

- `AnonymousTravelDraft` es la única fuente local durante la etapa anónima;
- cero cuenta, fila DB o escritura remota por interacción anónima;
- `guest-queue` se retira como contrato activo y sólo se lee una vez para compatibilidad;
- `importAnonymousDraft` se ejecuta exclusivamente con sesión autenticada, es idempotente y borra lo local sólo tras éxito;
- la validación incluye 1,000 sesiones con 20 interacciones y cero llamadas de red.

Evidencia de cierre:

- [x] PR #5 integrado y desplegado;
- [x] continuidad anónimo → autenticado confirmada con Río Lagartos;
- [x] PR #6 integrado en `main` mediante `234a8c5f`;
- [x] Lovable sincronizado y deployment `bbcf898c-f4db-43d2-9f67-79547c8000f9` completado;
- [x] dock “Tu viaje (1)” y registro progresivo verificados en producción sin cuentas ni datos artificiales.

## 5. Trabajo operativo paralelo permitido

Este trabajo puede prepararse sin abrir otra épica técnica:

- checklist de verificación de negocio, ubicación, horarios, fotos y catálogo;
- lista de 15–25 empresas fundadoras de Valladolid;
- responsable y canal de onboarding;
- runbooks iniciales de soporte e incidentes;
- definición de cobertura Concierge y escalación;
- checklist de GSC, analítica, monitoreo, privacidad, términos y CFDI.

No registrar como empresa onboarded a un mock, seed o registro sin validación humana.

## 6. Secuencia de lanzamiento

1. Reconciliación integrada.
2. CV8.9 cerrado.
3. AC1.4 cerrado.
4. Quince empresas reales verificadas como mínimo; objetivo 25.
5. Operación mínima lista: soporte, runbooks, notificaciones, monitoreo, medición y proceso comercial/fiscal.
6. Soft launch por invitación.
7. Lectura de datos reales y Launch Readiness Report actualizado.
8. Decisión GO/NO-GO para apertura comercial y para CV7.

## 7. No abrir ahora

- MCP M1.1–M1.3; M1.0 ya está cerrado y no es el siguiente paso.
- CV7 antes de cerrar la base operativa, salvo nueva decisión basada en evidencia.
- Header/Navigation Builder, Hero Vivo o Navigation Intelligence.
- nuevas superficies de CMS o capacidades de Alux sin dolor real observado.
- simulación `full`, PWA offline total o expansión territorial automática.
- refactor masivo de lint o performance mezclado con épicas de producto.

## 8. Deuda de evidencia que no debe propagarse

- No afirmar que H2 P1+P2 redujo 15% el entry: el benchmark aislado registra ~−0.1% gzip.
- No afirmar que P1 corrigió TTFB de producción hasta medirlo en un preview o despliegue comparable.
- No presentar datos CV8.S como usuarios, ventas o tracción reales.
- Mantener visibles las aprobaciones Founder y outcome validations pendientes de CV8 y SEO.

## 9. Commerce, Experiences & Settlement · plan preparado

**Blueprint aprobado:** `docs/governance/13-OMXDS-COMMERCE-EXPERIENCES-SETTLEMENT-BLUEPRINT-v1.0.md`  
**PRD:** `docs/blueprint/18.01-OMXDS-COMMERCE-EXPERIENCES-SETTLEMENT-PRD-SUITE-v1.0.md`  
**Plan de etapas:** `docs/blueprint/18.02-OMXDS-COMMERCE-LOVABLE-PLAN-C0-C8-v1.0.md`

Decisión Founder del 2026-07-21:

- Administración autoriza exclusivamente venta y comisión;
- Valladolid.mx usa checkout central;
- aprobación editorial y comercial permanecen separadas;
- existirán paneles Admin y Empresa;
- se autoriza preparar C0–C8;
- todos los flags permanecen OFF;
- Gate B2 permanece cerrado;
- no hay GO de implementación para C0.

Secuencia preparada:

- [ ] C0 · Contención y baseline.
- [ ] C1 · Autoridad comercial.
- [ ] C2 · Panel Admin de Experiencias.
- [ ] C3 · Inventario y reservas.
- [ ] C4 · Checkout sandbox y órdenes.
- [ ] C5 · Ledger.
- [ ] C6 · Conciliación, reembolsos y disputas.
- [ ] C7 · Liquidaciones Admin.
- [ ] C8 · Portal Empresa de ventas y pagos.

No iniciar una etapa por inferencia. Cada una requiere Scope Report, GO, pruebas, flags OFF, Completion Report y autorización para continuar.

## 10. OMXDS Visual Experience & Surface Architecture · prioridad documental

**Blueprint propuesto:** `docs/governance/14-OMXDS-VISUAL-EXPERIENCE-SURFACE-ARCHITECTURE-v1.0.md`  
**Auditoría:** `docs/blueprint/18.03-OMXDS-VISUAL-RECONCILIATION-AUDIT-v1.0.md`  
**PRD Suite:** `docs/blueprint/18.04-OMXDS-VISUAL-SURFACES-PRD-SUITE-v1.0.md`  
**Plan Lovable:** `docs/blueprint/18.05-OMXDS-VISUAL-LOVABLE-PLAN-V0-V8-v1.0.md`

Decisión Founder del 2026-07-21:

- preparar la arquitectura visual antes de Commerce, reservaciones y monitoreo;
- reconciliar Home, territorios, Empresa Estándar y Empresa Premium;
- canonizar ocho familias visuales y jerarquías H1–H4;
- integrar SEO, medios, accesibilidad, rendimiento y gobernanza;
- mantener todos los flags OFF;
- no iniciar V0 ni modificar código, rutas públicas o producción.

Secuencia preparada:

- [ ] V0 · Baseline y reconciliación técnica.
- [ ] V1 · Visual Masterboard.
- [ ] V2 · Contratos, tokens y tarjetas.
- [ ] V3 · Home.
- [ ] V4 · Territorio y Landmark.
- [ ] V5 · Empresa Estándar.
- [ ] V6 · Empresa Premium.
- [ ] V7 · Experiencia, producto, evento, editorial y journey.
- [ ] V8 · Certificación y recomendación GO/NO-GO.

Commerce C0–C8 permanece documentado y pausado. Ninguna etapa visual puede iniciarse por inferencia.

## 11. Regla para actualizar este plan

Al cerrar una ola:

1. crear su Completion Report;
2. actualizar el roadmap v2.1;
3. registrar dependencias o contradicciones;
4. reemplazar aquí sólo el próximo paso operativo;
5. no mantener instrucciones ya ejecutadas como si siguieran pendientes.

**Siguiente acción:** revisar y aprobar la documentación OMXDS Visual Experience. Después de integrarla en `main`, el único gate técnico elegible será V0 · Baseline y reconciliación técnica, que requiere GO Founder independiente y no modifica superficies públicas. Commerce C0–C8, Programa Fundadores, Gate B1, Gate B2, reservaciones y monitoreo continúan cerrados.
