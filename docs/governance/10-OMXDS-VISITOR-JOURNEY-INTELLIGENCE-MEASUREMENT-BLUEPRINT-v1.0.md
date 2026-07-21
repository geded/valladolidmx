# OMXDS · Visitor Journey Intelligence & Measurement Blueprint V1.0

**Estado:** Approved por Founder  
**Fecha:** 2026-07-21  
**Owner:** Founder / Product Governance  
**Dominio primario:** D11 · analytics-intelligence  
**Depende de:** OMXDS Foundation V1.0, CV8 Visitor Intelligence Platform, CV8.0–CV8.9, AC1 Anonymous Travel Continuity, CV6 Stage-Aware Experience, Travel Plan, Concierge, Commerce y Travel Passport.  
**Alcance:** definición funcional, de medición y gobierno. No autoriza instrumentación, migraciones, activación de proveedores, tratamiento nuevo de datos ni cambios en producción.

---

## 1. Decisión

OMXDS adopta un único sistema de inteligencia para comprender el recorrido completo del visitante, desde el primer contacto anónimo hasta su posible regreso como embajador del Oriente Maya de Yucatán.

Este Blueprint no crea un motor analítico paralelo. Gobierna y conecta las capacidades ya existentes de CV8, la continuidad anónima de AC1, las seis etapas temporales de CV6, Travel Plan, Alux, Concierge, reservas, experiencia en destino y memoria postviaje.

Su propósito no es vigilar personas ni coleccionar clics. Es convertir señales permitidas en decisiones que mejoren la experiencia, aumenten la permanencia y distribuyan valor en el territorio.

---

## 2. Behavioral Change Statement

### Antes

- El visitante atraviesa superficies distintas sin que la organización pueda comprender de forma responsable la continuidad de su viaje.
- Producto, marketing, Alux, Concierge y empresas observan fragmentos y atribuyen resultados al último clic.
- La plataforma puede saber que hubo tráfico, pero no qué ayudó a transformar curiosidad en plan, reserva, estancia o recomendación.

### Después

- La organización interpreta una sola historia del viajero, limitada por consentimiento y permisos.
- Cada señal responde a una pregunta de negocio, una transición canónica o un resultado turístico.
- Las decisiones administrativas declaran evidencia, responsable, acción y KPI esperado.
- El viajero recibe mayor continuidad y ayuda contextual sin ser obligado a identificarse antes de obtener valor.

### Resultado verificable

OMXDS puede explicar qué experiencias, contenidos, recomendaciones y acciones contribuyen a que más visitantes permanezcan más noches, reserven oferta local, tengan una mejor estancia y recomienden el destino, sin degradar privacidad ni confianza.

---

## 3. Principios vinculantes

1. **Personas y decisiones, no vanidad.** Pageviews, sesiones y CTR son diagnósticos secundarios; nunca sustituyen resultados del Journey.
2. **Relationship before account.** El valor antecede al registro.
3. **Una sola continuidad.** AC1 y CV8 son las fuentes existentes; se prohíbe una identidad o embudo alterno.
4. **Dos dimensiones, no una confusión.** Madurez de relación y momento real del viaje se almacenan y analizan por separado.
5. **Consentimiento por propósito.** Recopilar una señal no concede permiso universal para reutilizarla.
6. **Minimización.** Sólo se captura lo necesario para una decisión declarada.
7. **Explicabilidad.** Toda inferencia, atribución, alerta o recomendación administrativa debe indicar su evidencia y límites.
8. **Gobierno humano.** La máquina recomienda; una persona autorizada decide y asume responsabilidad.
9. **Valor territorial.** La conversión se evalúa junto con permanencia, satisfacción y beneficio local.
10. **Privacidad como producto.** La confianza es parte del rendimiento, no un trámite legal añadido al final.

---

## 4. Preguntas que el sistema debe responder

### Visitante y experiencia

- ¿Qué buscaba hacer el visitante y en qué momento del viaje estaba?
- ¿Qué contenido, destino, empresa o producto le resultó relevante?
- ¿Dónde obtuvo su primer momento de valor?
- ¿Qué fricción detuvo su avance y qué intervención lo ayudó?
- ¿La experiencia prometida coincidió con la vivida?

### Negocio y territorio

- ¿Qué generó planes, reservas, noches y gasto local, y con qué nivel de confianza puede atribuirse?
- ¿Qué empresas y comunidades recibieron demanda o derrama influenciada por OMXDS?
- ¿Qué canales atraen viajeros valiosos, no sólo visitas baratas?
- ¿Qué productos complementarios aumentan permanencia sin deteriorar satisfacción?

### Operación

- ¿Dónde debe intervenir Alux, Concierge, marketing, contenido u operación?
- ¿Qué oportunidad merece prioridad, quién debe atenderla y qué KPI validará la acción?
- ¿Qué señales faltan, sobran o producen ruido?

---

## 5. Las dos dimensiones oficiales del Journey

### 5.1 Madurez de relación — contrato CV8 congelado

Extraño → Anónimo → Identificado → Explorador → Interesado → Travel Plan → Concierge → Reserva → Viajero → Embajador.

| Transición | Entrada canónica | Pregunta principal |
|---|---|---|
| T1 · Extraño → Anónimo | `visitor.session.started` | ¿Qué canal atrajo una visita real? |
| T2 · Anónimo → Identificado | `visitor.identified` | ¿Qué momento de valor mereció la identificación? |
| T3 · Identificado → Explorador | `journey.exploration.deepened` | ¿Qué provocó exploración profunda? |
| T4 · Explorador → Interesado | `intent.signal.captured` | ¿Qué produjo intención verificable? |
| T5 · Interesado → Travel Plan | `plan.created` | ¿Qué convirtió interés en organización? |
| T6 · Travel Plan → Concierge | `plan.promoted_to_case` | ¿Qué necesitó asistencia humana? |
| T7 · Concierge → Reserva | `order.confirmed` | ¿Qué construyó confianza para reservar? |
| T8 · Reserva → Viajero | `livejourney.onsite` | ¿Qué preparación llegó a experiencia real? |
| T9 · Viajero → Embajador | `advocacy.signal.captured` | ¿Qué generó recomendación, regreso o ayuda a otros? |

La etapa se deriva de evidencia. No puede editarse manualmente ni crearse un embudo por módulo.

### 5.2 Momento temporal del viaje — contrato CV6

Inspiración → Exploración → Planeación → Previaje → En destino → Postviaje.

Esta dimensión responde cuándo ocurre la necesidad. No reemplaza la madurez de relación. Un visitante puede estar registrado y apenas inspirándose, o permanecer anónimo mientras construye un borrador serio de viaje.

### 5.3 Vista combinada

Cada lectura operativa puede combinar ambas dimensiones, por ejemplo: `anonymous + planning`, `reservation + pre_trip` o `traveler + on_trip`. La combinación no crea una nueva etapa ni modifica los dos contratos fuente.

---

## 6. Alcance de observación por fase

### 6.1 Visitante anónimo

Se puede observar, según consentimiento aplicable:

- canal, campaña, referido y landing de entrada;
- dispositivo, idioma y región aproximada no precisa;
- sesiones y retornos dentro del alcance permitido;
- superficies, destinos, categorías y entidades consultadas;
- búsquedas, filtros, mapas, galerías, videos y recomendaciones utilizadas;
- interacción estructurada con Alux, sin convertir conversación sensible en telemetría;
- favoritos, comparaciones y elementos agregados al borrador local;
- fechas tentativas, viajeros, intereses o presupuesto cuando los declare;
- creación, persistencia y recuperación del borrador AC1;
- invitación de registro mostrada y momento de valor que la originó;
- aceptación, rechazo o abandono de la invitación;
- última señal útil antes de abandonar.

El sistema usa identificadores propios de sesión, sujeto anónimo y borrador. Se prohíbe fingerprinting probabilístico o invasivo.

### 6.2 Visitante identificado o registrado

Con consentimiento y propósito explícitos:

- unión determinista del historial anónimo elegible con la cuenta;
- preferencias declaradas e inferencias explicables;
- continuidad entre dispositivos autenticados;
- viajes, favoritos, borradores y conversaciones operativas vinculadas;
- fechas, acompañantes, presupuesto e intereses declarados;
- recordatorios y recomendaciones aceptadas, ignoradas o descartadas;
- evolución de intención y retorno a la plataforma;
- historial de viajes y señales de recurrencia.

El registro no borra la historia elegible ni convierte automáticamente todos los datos previos en perfil permanente. La unión debe registrar fuente, consentimiento y momento.

### 6.3 Planeación y Concierge

- creación y cambios relevantes del Travel Plan;
- items agregados, retirados o comparados;
- solicitud de ayuda y promoción mediante `promotePlanToCase`;
- primera respuesta, SLA y estado del caso;
- propuestas enviadas, abiertas, aceptadas, modificadas o rechazadas;
- productos y empresas recomendados;
- intervención atribuible de Alux y Concierge;
- motivo de abandono cuando sea declarado;
- tiempo desde intención hasta reserva.

### 6.4 Reserva y compra

- inicio y abandono de checkout;
- reserva y pago confirmados;
- importe, moneda, productos, empresa y destino beneficiados;
- noches planeadas y confirmadas;
- complementos y venta cruzada;
- cambios, cancelaciones y reembolsos;
- canal, contenido e intervenciones que participaron en la conversión.

Los datos financieros sensibles permanecen en sus sistemas transaccionales. Visitor Intelligence conserva referencias permitidas y resultados, no números de tarjeta ni payloads de pago.

### 6.5 Previaje

- consulta del itinerario y vouchers;
- checklist y preparación;
- recordatorios enviados, abiertos o accionados;
- permisos de notificación;
- consultas operativas a Alux o Concierge;
- cambios de última hora;
- servicios adicionales;
- señales agregadas de preparación.

### 6.6 En destino

Sólo con valor explicado y consentimiento apropiado:

- inicio de `on_trip` y uso de Live Day;
- actividades realizadas, omitidas o reprogramadas;
- recomendaciones contextuales mostradas y aceptadas;
- solicitudes de asistencia, incidencias, SLA y resolución;
- uso confirmado de transporte, entradas o servicios integrados;
- compras adicionales;
- distribución agregada del gasto y de las visitas;
- evidencia de una noche adicional generada o influenciada.

La ubicación precisa no se solicita durante inspiración, exploración o planeación. Tampoco se almacena una ruta continua por defecto.

### 6.7 Postviaje y embajador

- cierre del viaje y actividades confirmadas;
- satisfacción, calificación, NPS y resolución de quejas;
- reseñas iniciadas o publicadas cuando exista señal verificable;
- recuerdos y Travel Passport;
- contenido compartido y referidos;
- retorno a la plataforma;
- segundo viaje iniciado;
- señal de embajador basada en una acción, no en una etiqueta aspiracional.

---

## 7. Identidad progresiva y continuidad

### 7.1 Identificadores conceptuales

| Referencia | Función | Regla |
|---|---|---|
| `session_ref` | Agrupa actividad continua | Rotable; no representa persona. |
| `anonymous_subject_ref` | Continúa un sujeto AC1 permitido | Propio, pseudónimo y revocable. |
| `draft_ref` | Identifica borrador local de viaje | No equivale a cuenta. |
| `user_ref` | Cuenta autenticada | Separada de telemetría cruda. |
| `plan_ref` | Travel Plan canónico | No duplica su contenido. |
| `case_ref` | Caso Concierge | Referencia, no copia de notas privadas. |
| `order_ref` | Reserva/orden | Referencia a resultado permitido. |
| `trip_ref` | Viaje operativo | Conecta previaje, onsite y postviaje. |

### 7.2 Resolución

- La unión anónimo → identificado es determinista y auditable.
- Nunca se fusionan sujetos por similitud de dispositivo, IP, tipografía, batería u otras señales de fingerprinting.
- Las colisiones o dudas quedan separadas; no se “adivina” identidad.
- Retirar consentimiento detiene usos futuros y activa las políticas de supresión correspondientes.
- Simulación, QA y producción utilizan namespaces y datasets separados.

---

## 8. Contrato conceptual de evento

Todo evento nuevo deberá declarar:

| Campo | Propósito |
|---|---|
| `event_id` | Idempotencia y auditoría. |
| `event_name` / `kind` | Nombre dentro del catálogo aprobado. |
| `schema_version` | Evolución compatible mediante SemVer. |
| `occurred_at` | Tiempo UTC del hecho. |
| `subject_ref` | Sujeto pseudónimo permitido y nivel de confianza. |
| `session_ref` | Contexto de sesión cuando aplique. |
| `journey_stage` | Madurez derivada antes/después, si aplica. |
| `travel_stage` | Momento temporal CV6, si aplica. |
| `surface` y `route` | Lugar funcional, no texto libre ilimitado. |
| `entity_ref` | Destino, empresa, producto o experiencia canónica. |
| `source` | Sistema emisor verificable. |
| `consent_scope` | Propósito autorizado en el momento del evento. |
| `evidence_ref` | Referencia mínima a evidencia, sin copiar datos sensibles. |

### Familias existentes a reutilizar

`visitor.*`, `session.*`, `journey.*`, `intent.*`, `plan.*`, `case.*`, `order.*`, `livejourney.*`, `alux.*`, `concierge.*`, `marketing.*`, `advocacy.*`, `decision.*`, `outcome.*` y `recommendation.lifecycle`.

### Gobierno del catálogo

- Whitelist estricta: lo no registrado se rechaza.
- Eventos append-only: una corrección se expresa con evento posterior.
- Ningún evento nuevo se aprueba sin pregunta, decisión, owner, base legal/consentimiento y KPI asociado.
- Propiedades libres, PII, prompts completos, notas internas y payloads transaccionales están prohibidos.
- Cambios breaking requieren aprobación Founder y versión mayor.

---

## 9. Medición y atribución

### 9.1 North Star OMXDS

**Noches adicionales atribuibles al ecosistema por cada 1,000 viajeros activos.**

Debe reportarse en tres niveles distintos:

1. **Generadas:** reserva confirma una extensión atribuible frente a la intención o reserva base.
2. **Influenciadas:** existe evidencia de contribución, pero no causalidad suficiente para adjudicación plena.
3. **Declaradas:** el viajero confirma que una recomendación o servicio influyó en su permanencia.

Nunca se suman los tres niveles como si fueran equivalentes.

### 9.2 North Star operativa CV8

**Journey Progression Rate 30d (JPR-30d):** proporción de sujetos elegibles que avanzan al menos una transición canónica en 30 días.

JPR-30d explica avance; las noches adicionales explican resultado turístico. Ninguna sustituye a la otra.

### 9.3 Métricas complementarias

- tasas T1–T9 y tiempo entre transiciones;
- anónimo → identificado por momento de valor;
- continuidad multi-sesión y recuperación de borrador;
- Travel Plan → Concierge → Reserva;
- noches planeadas, confirmadas e incrementales;
- ingreso turístico local generado o influenciado;
- gasto y demanda distribuidos por destino, categoría y empresa;
- aceptación de recomendaciones de Alux y Concierge;
- SLA, resolución, CSAT y NPS;
- repetición, referidos y Embajador;
- opt-out, retiro de consentimiento y Trust Index.

### 9.4 Atribución

- Se conserva first touch, last touch y recorrido multi-touch.
- El último clic no recibe automáticamente todo el mérito.
- Una intervención cuenta como influencia sólo dentro de una ventana declarada y con evidencia elegible.
- Correlación no se presenta como causalidad.
- Las estimaciones muestran método, ventana, cobertura, confianza y datos faltantes.
- La atribución territorial usa entidades canónicas y evita doble conteo entre empresa, destino y producto.

---

## 10. Visitor Intelligence Center

### 10.1 Panorama Founder/Admin

- viajeros activos por nivel de identidad y etapa temporal;
- JPR-30d, T1–T9 y cuellos de botella;
- noches adicionales generadas, influenciadas y declaradas;
- planes, casos, reservas, ingresos y derrama distribuida;
- cohortes nuevas, recurrentes, recuperadas y perdidas;
- alertas de calidad, consentimiento y cobertura;
- decisiones abiertas de CV8.9.

### 10.2 Journey Explorer autorizado

Línea de tiempo de un sujeto sólo para roles y propósitos permitidos:

- etapas e hitos derivados;
- fuentes, superficies y entidades relevantes;
- momentos de valor y fricciones;
- decisiones ofrecidas y resultados;
- nivel de consentimiento vigente;
- explicación de uniones e inferencias.

No muestra conversaciones completas, notas privadas, datos de pago ni información no necesaria para la tarea.

### 10.3 Análisis operativos

- conversión por canal, campaña, contenido y landing;
- interés territorial y categorías;
- rendimiento de Alux y Concierge;
- planes y abandono;
- checkout y reserva;
- preparación previaje y experiencia onsite;
- satisfacción, retorno y embajadores;
- calidad de instrumentación y eventos rechazados.

### 10.4 Cola de acciones CV8.9

Cada oportunidad accionable debe declarar:

- hallazgo y evidencia;
- transición/KPI afectado;
- segmento elegible;
- explicación y nivel de confianza;
- responsable humano;
- acción acordada y fecha objetivo;
- resultado esperado y ventana de validación;
- estado append-only hasta validación o rechazo.

No se ejecutan automáticamente campañas, contenidos, precios, mensajes o cambios de producto.

---

## 11. Acceso por actor

| Actor | Acceso permitido |
|---|---|
| Founder/Admin autorizado | Agregados del ecosistema; recorrido individual sólo con propósito y privilegio explícitos. |
| Producto/Marketing | Cohortes y atribución agregadas; PII excluida. |
| Concierge | Contexto operativo necesario de sus casos; no navegación privada irrelevante. |
| Empresa | Impacto agregado de su propia oferta; nunca actividad privada ni datos de competidores. |
| DMO/Institución | Indicadores territoriales agregados con umbrales de privacidad. |
| Alux | Contexto mínimo autorizado para ayudar; no acceso indiscriminado al almacén analítico. |
| Viajero | Transparencia, consentimiento, exportación, corrección y eliminación aplicables. |

Toda consulta privilegiada debe ser auditable. La interfaz oculta no equivale a control de acceso.

---

## 12. Privacidad, seguridad y retención

- Sin fingerprinting.
- Sin venta de información personal.
- Sin PII dentro del payload analítico.
- Sin ubicación precisa sin consentimiento específico y valor inmediato explicado.
- Sin captura de notas privadas, credenciales, datos completos de pago o conversaciones sensibles.
- Cifrado, RLS y mínimo privilegio en cualquier futura implementación.
- Agregación con umbral mínimo; CV8 mantiene k-anonymity `k ≥ 25` para cortes pequeños.
- Exportación y eliminación conforme a política y ley aplicables.
- Rotación de pseudónimos y separación entre identidad y eventos.
- Retención definida por clase y propósito antes de implementar; este Blueprint no fija plazos legales sin revisión especializada.
- Logs de acceso y consultas privilegiadas con conservación gobernada.
- Incidentes sujetos a runbook de contención, investigación y notificación.

---

## 13. Calidad y observabilidad

El sistema futuro deberá medir:

- cobertura de sesiones y superficies elegibles;
- eventos aceptados, duplicados, tardíos, inválidos y rechazados;
- frescura de proyecciones y dashboards;
- porcentaje de eventos con consentimiento válido;
- integridad de referencias a entidades;
- uniones de identidad exitosas, rechazadas y revertidas;
- estabilidad de definiciones métricas;
- divergencia entre datos simulados y reales;
- costo y latencia por volumen.

Una métrica sin calidad visible no se presenta como verdad; se presenta como estimación o no se publica.

---

## 14. Integración con capacidades existentes

| Capacidad | Fuente única | Uso en este Blueprint |
|---|---|---|
| Identidad y borrador anónimo | AC1 | Continuidad y momento de registro. |
| Madurez de relación | CV8 `journey.ts` | 10 etapas y T1–T9 congeladas. |
| Momento temporal | CV6 Stage-Aware | Seis etapas del viaje real. |
| Eventos y proyección | CV8.0–CV8.2 | Ingesta append-only y estado derivado. |
| Visitor Intelligence Center | CV8.3+ | Paneles, cohortes y segmentación. |
| Decisiones | CV8.9 | Action Queue y gobierno humano. |
| Plan | Travel Plan Contract | Señales de organización; no copia. |
| Casos | Concierge | SLA, propuesta y resultado permitido. |
| Reserva | Commerce / Orders | Confirmación e importe permitido. |
| Onsite | Live Day / CV6 | Asistencia y experiencia en destino. |
| Memoria | Travel Passport | Postviaje y Embajador. |
| Inteligencia | Alux | Decisiones explicables y resultados. |

Si una capacidad ya existe, se extiende mediante su contrato. Este Blueprint no autoriza tablas, trackers, perfiles ni dashboards alternos.

---

## 15. Datos simulados y datos reales

- Los simuladores CV8 utilizan identificadores, esquemas y almacenamiento separados.
- Todo panel indica de forma visible `SIMULATED`, `SHADOW` o `REAL`.
- Los datos simulados no alimentan North Stars, decisiones reales ni perfiles.
- La activación real requiere feature flag, revisión de privacidad, catálogo aprobado y plan de reversión.
- Shadow mode valida calidad sin habilitar decisiones automáticas ni comunicación al viajero.

---

## 16. Fases futuras de implementación

### Fase 0 · Contract Alignment

- inventariar eventos, trackers, tablas y paneles existentes;
- mapearlos a AC1, CV6 y CV8;
- detectar duplicidad, PII, señales sin propósito y huecos;
- congelar diccionario de métricas V1.

### Fase 1 · Privacy & Identity

- definir matriz de consentimiento por propósito;
- diseñar resolución determinista de identidad;
- aprobar retención, exportación, supresión y acceso;
- ejecutar threat model y DPIA/evaluación equivalente.

### Fase 2 · Event Catalog & Instrumentation

- aprobar eventos mínimos por transición y etapa;
- instrumentar detrás de feature flags;
- validar idempotencia, esquema, consentimiento y calidad;
- operar en simulación/shadow antes de datos reales.

### Fase 3 · Projections & Measurement

- derivar estados y métricas sin mutar fuentes;
- implementar atribución con confianza visible;
- reconciliar reservas, noches y resultados.

### Fase 4 · Intelligence Center

- habilitar paneles por rol;
- activar Journey Explorer con auditoría;
- conectar CV8.9 para decisiones humanas.

### Fase 5 · Outcome Validation

- validar adopción, calidad, privacidad y mejora de resultados;
- comparar contra baseline;
- decidir escalar, corregir o retirar señales.

Ninguna fase se inicia por la aprobación de este documento. Cada fase exige autorización específica.

---

## 17. Criterios de aceptación para una implementación futura

1. Existe un inventario de señales y fuentes con owner.
2. Cero motores paralelos de identidad, Journey o decisiones.
3. Las 10 etapas CV8 y seis etapas CV6 permanecen sin renombrar.
4. Todo evento tiene propósito, consentimiento, esquema y KPI.
5. No se emite PII ni contenido sensible como telemetría.
6. La unión de identidad es determinista, reversible y auditable.
7. Simulación y producción están técnicamente separadas.
8. Métricas muestran definición, ventana, cobertura y confianza.
9. Las noches adicionales evitan doble conteo y separan generadas, influenciadas y declaradas.
10. Dashboards aplican permisos y agregación, no sólo ocultamiento visual.
11. Journey Explorer registra cada acceso privilegiado.
12. CV8.9 exige decisión humana y evidencia de resultado.
13. Exportación, eliminación y retiro de consentimiento pasan pruebas.
14. Feature flags y rollback permiten detener la captura sin romper el viaje.
15. Completion Report y Outcome Validation comparan resultados contra este Behavioral Change Statement.

---

## 18. Fuera de alcance V1.0

- implementar código, SDKs, cookies, tablas, migraciones o dashboards;
- activar GA4, CDP, data warehouse o proveedor externo;
- importar bases de terceros;
- enriquecer identidades mediante data brokers;
- seguimiento continuo de ubicación;
- scoring opaco de personas;
- decisiones automáticas sobre precios, campañas, contenido o atención;
- sustituir CRM, sistemas transaccionales o fuentes canónicas;
- prometer causalidad donde sólo existe correlación;
- comercializar datos individuales o agregados reidentificables.

---

## 19. Riesgos y controles

| Riesgo | Control obligatorio |
|---|---|
| Sobreinstrumentación | Catálogo mínimo y pregunta accionable por evento. |
| Reidentificación | Separación de identidad, pseudónimos, agregación y k≥25. |
| Doble conteo de noches/ingresos | Reconciliación y niveles de atribución separados. |
| Identidad equivocada | Unión determinista; incertidumbre permanece separada. |
| Métrica manipulable | Definición congelada, auditoría y contrapesos. |
| Automatización sin gobierno | CV8.9 y aprobación humana obligatoria. |
| Acceso excesivo | RLS, mínimo privilegio, purpose binding y logs. |
| Simulación confundida con realidad | Namespaces y rotulado técnico/visual obligatorio. |
| Datos sin adopción | Owner y decisión asociada a cada panel/KPI. |
| Optimizar conversión dañando confianza | Trust Index, opt-out, CSAT y continuidad como guardrails. |

---

## 20. Registro de aprobación Founder

El Founder autorizó el 2026-07-21 la creación y publicación gobernada de este Blueprint con el alcance completo descrito, integrado a OMXDS Foundation, CV8, AC1 y CV6.

La aprobación es exclusivamente documental. No autoriza modificaciones en producción, captura nueva de datos, cambios de consentimiento, migraciones, integraciones ni despliegues.

---

## 21. Control de versión

| Versión | Fecha | Estado | Descripción |
|---|---|---|---|
| 1.0 | 2026-07-21 | Approved | Define alcance de observación, dos dimensiones del Journey, identidad progresiva, eventos, métricas, atribución, paneles, acceso, privacidad, fases y criterios de aceptación. |
