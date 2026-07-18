# 04 · DECISION MAKING

**Estado:** Approved
**Versión:** 1.0
**Última actualización:** Julio 2026

---

# 1. Propósito

La toma de decisiones es una de las actividades más frecuentes y más delicadas dentro de cualquier proyecto de largo plazo. Cada elección —estratégica, funcional, técnica, operativa o de contenido— deja una huella que se acumula con el tiempo y termina definiendo la naturaleza misma de la plataforma.

Este documento establece el marco oficial para la toma de decisiones dentro de Valladolid.mx. No define arquitectura, no describe procesos de desarrollo y no prescribe herramientas. Define cómo se analizan, evalúan, aprueban, documentan y revisan las decisiones de manera consistente, trazable y alineada con el CANON.

Sin un marco común, las decisiones se toman por impulso, por presión, por preferencia individual o por inercia. Eso genera deuda técnica, deuda organizacional, inconsistencia de producto y pérdida de velocidad real. Un proyecto que pretende durar décadas no puede depender de la memoria personal de quienes lo construyen.

La intención de este documento es simple: que cualquier persona que llegue a Valladolid.mx —Founder, ejecutivo, diseñador, ingeniero, editor, operador, colaborador externo o sistema de inteligencia artificial— pueda entender cómo se decide, qué criterios se aplican, dónde queda registrada la decisión y cómo se revisa si la realidad cambia.

---

# 2. Objetivos

El marco de toma de decisiones persigue los siguientes objetivos permanentes:

## 2.1 Consistencia

Las decisiones deben sentirse coherentes entre sí. Lo que se acepta hoy no debe contradecir lo que se rechazó ayer sin una justificación documentada. La consistencia permite que el proyecto construya una identidad clara y predecible, tanto internamente como ante los usuarios, las empresas y los colaboradores.

## 2.2 Transparencia

El proceso de decisión debe ser comprensible para quienes participan y para quienes se ven afectados. No se trata de publicar cada debate, sino de que el resultado, los criterios y las alternativas consideradas estén disponibles de forma legible. La transparencia genera confianza y reduce la necesidad de repetir explicaciones.

## 2.3 Trazabilidad

Toda decisión importante debe poder rastrearse hasta su origen: quién la propuso, qué problema resolvía, qué alternativas se evaluaron, por qué se eligió una opción, qué riesgos se asumieron y qué se acordó revisar. La trazabilidad permite reconstruir el razonamiento sin depender de la memoria humana.

## 2.4 Responsabilidad

Cada decisión debe tener un dueño claro. No se trata de buscar culpables, sino de saber quién tiene la autoridad para decidir, quién aconseja, quién aprueba y quién ejecuta. La responsabilidad distribuida mal gestionada produce decisiones lentas, ambiguas o evasivas.

## 2.5 Alineación con el CANON

Ninguna decisión puede contradecir los principios permanentes del CANON. Si una decisión parece entrar en tensión con el CANON, el proceso debe hacer esa tensión explícita y resolverla antes de aprobar. El CANON es la fuente de verdad suprema del proyecto.

## 2.6 Reducción de deuda técnica y organizacional

Una decisión mal documentada o mal justificada se convierte en deuda. Una decisión tomada a contrapelo de la arquitectura, del producto o de la experiencia genera costos futuros. Este marco busca que cada decisión relevante sea consciente de su costo a largo plazo y de su reversibilidad.

---

# 3. Principios

Las siguientes reglas gobiernan la toma de decisiones en Valladolid.mx. No son preferencias: son obligaciones del proceso.

## 3.1 CANON First

Antes de evaluar cualquier opción, se consulta el CANON. Si una opción contradice la misión, la visión, los principios fundacionales o las reglas inmutables del proyecto, se descarta. El CANON no es un documento decorativo: es el filtro primero de toda decisión.

## 3.2 Evidence Before Opinion

Las opiniones se documentan, pero no deciden. La evidencia puede venir de datos de uso, entrevistas, métricas de negocio, análisis técnicos, auditorías, investigación de mercado, simulaciones o comportamiento observado. Una decisión basada únicamente en gusto personal, autoridad o presión requiere una justificación excepcional y explícita.

## 3.3 User Value Before Preference

La preferencia interna —de diseñador, fundador, ingeniero o ejecutivo— no justifica una decisión por sí sola. La pregunta primaria es: ¿qué valor genera esto para el viajero, para el empresario o para el destino? Las preferencias legítimas se expresan como hipótesis de valor y se someten a evaluación.

## 3.4 Business Value Before Complexity

La complejidad técnica solo se justifica cuando produce valor comercial claro, operativo o estratégico. Construir algo elegante que nadie necesita es una deuda encubierta. La simplicidad que resuelve el problema real siempre vence a la complejidad que anticipa problemas imaginarios.

## 3.5 Reuse Before Build

Antes de crear algo nuevo, se evalúa si ya existe una capacidad, un componente, un bloque, un servicio o un patrón que pueda reutilizarse. Reutilizar no es reciclar: es aplicar el principio de que la infraestructura común del proyecto debe absorber necesidades similares antes de permitir soluciones específicas.

## 3.6 Simplicity First

Entre dos opciones que resuelven el mismo problema con el mismo valor, se prefiere la más simple. La simpleza reduce errores, costos de mantenimiento, tiempo de aprendizaje y superficie de ataque. La simpleza no es sinónimo de pobreza: es claridad de propósito.

## 3.7 Long-term Thinking

Las decisiones se evalúan en horizontes de cinco, diez y veinte años, no solo en el próximo sprint. Una solución rápida que compromete la evolución futura del sistema puede ser más costosa que una solución más lenta pero sostenible. El proyecto se construye para durar.

## 3.8 Document Every Important Decision

Si una decisión afecta arquitectura, producto, experiencia, modelo de datos, seguridad, contenido, operación o estrategia, debe quedar registrada. La documentación no es burocracia: es la memoria institucional del proyecto. Sin ella, el mismo debate se repite cada año.

## 3.9 Reversible vs Irreversible Decisions

Las decisiones reversibles deben tomarse rápido, con peso ligero y seguimiento. Las decisiones irreversibles —aquellas que comprometen arquitectura, datos, contratos públicos, marca, SEO, seguridad o relaciones institucionales— exigen un proceso más riguroso, más participantes y mayor documentación. Conocer la diferencia acelera lo reversible y protege lo irreversible.

## 3.10 Evolution Over Perfection

No se busca la decisión perfecta: se busca la decisión correcta para el momento actual, consciente de que cambiará. El proyecto evoluciona por decisiones iterativas, aprendizaje continuo y corrección abierta. La obsesión por la perfección antes de actuar es una forma de parálisis.

---

# 4. Niveles de Decisión

No todas las decisiones requieren el mismo proceso. Esta sección define los niveles de decisión del proyecto, quién participa y cómo se documentan.

## 4.1 Decisiones estratégicas

Afectan la dirección del proyecto, la visión, el modelo de negocio, las alianzas institucionales, la expansión territorial o la identidad de marca.

- **Ejemplos:** expansión a nuevos destinos, cambio de modelo de ingresos, alianzas con gobiernos, posicionamiento internacional, cambios al CANON.
- **Participantes:** Founder, liderazgo ejecutivo, consejeros clave, representantes del ecosistema cuando aplique.
- **Documentación:** Blueprint estratégico, acta de decisión, actualización del CANON si es necesario.

## 4.2 Decisiones arquitectónicas

Definen la estructura técnica del sistema, los contratos, los modelos de datos, las integraciones, las capas de seguridad o la evolución de motores reutilizables.

- **Ejemplos:** cambio de modelo de datos, nueva integración externa, refactor de un motor central, decisión de seguridad, cambio de contrato público.
- **Participantes:** arquitecto de software, líderes técnicos, responsables de producto y experiencia, Founder en decisiones estructurales.
- **Documentación:** ADR (Architecture Decision Record), Blueprint técnico, actualización de ARCHITECTURAL PRINCIPLES cuando corresponda.

## 4.3 Decisiones de producto

Definen qué funcionalidades se construyen, en qué orden, para qué usuarios y con qué criterios de éxito.

- **Ejemplos:** priorización de épicas, alcance de una historia de usuario, lanzamiento de una nueva superficie, retiro de una funcionalidad.
- **Participantes:** product owner, Founder, diseño, ingeniería, operaciones, datos cuando aplique.
- **Documentación:** PRD, Blueprint funcional, Completion Report.

## 4.4 Decisiones de experiencia de usuario (UX)

Afectan la interacción humana con la plataforma: flujos, navegación, componentes, accesibilidad, copy, motion y respuesta emocional.

- **Ejemplos:** cambio de flujo de reserva, nuevo patrón de navegación, rediseño de un componente central, decisión de accesibilidad.
- **Participantes:** diseño de producto, UX researcher, ingeniería frontend, producto, contenido.
- **Documentación:** Análisis UX, Blueprint de diseño, ADR si afecta arquitectura de componentes.

## 4.5 Decisiones de contenido

Definen qué información se publica, cómo se estructura, quién la autoriza, cómo se versiona y qué calidad se exige.

- **Ejemplos:** esquema de una landing, criterios de publicación de una empresa, editorial de un destino, decisión de SEO, alt text de imágenes.
- **Participantes:** editor de contenido, SEO, producto, responsables de calidad, Founder en contenido institucional.
- **Documentación:** Blueprint editorial, PRD de contenido, guía de estilo, acta de aprobación.

## 4.6 Decisiones operativas

Afectan la operación diaria del ecosistema: soporte, moderación, procesamiento de pedidos, conciliación, atención al empresario y gestión de incidentes.

- **Ejemplos:** política de reembolsos, flujo de moderación de reseñas, criterios de verificación de empresas, escala de incidentes.
- **Participantes:** operaciones, soporte, producto, legal, conciérge, Founder en políticas institucionales.
- **Documentación:** Runbook, política operativa, acta de decisión.

## 4.7 Decisiones de infraestructura

Afectan los servicios, proveedores, capacidad, costos, observabilidad, continuidad del negocio y escalabilidad técnica.

- **Ejemplos:** cambio de proveedor de nube, nuevo sistema de monitoreo, política de backups, escalado automático, ajuste de costos.
- **Participantes:** ingeniería de plataforma, seguridad, producto, Founder en decisiones de alto costo o riesgo.
- **Documentación:** ADR, Runbook, Blueprint de infraestructura.

## 4.8 Decisiones de inteligencia artificial (IA)

Afectan el comportamiento de Alux, los modelos utilizados, los datos de entrenamiento, los límites éticos, la transparencia y la gobernanza de respuestas automatizadas.

- **Ejemplos:** cambio de modelo de lenguaje, nuevo prompt de sistema, decisión de autonomía de Alux, política de uso de datos para IA.
- **Participantes:** responsable de IA, producto, arquitectura, legal, ética, Founder.
- **Documentación:** ADR de IA, Blueprint de Alux, registro de evaluación, política de datos.

## 4.9 Decisiones de datos

Afectan la recolección, almacenamiento, uso, retención, privacidad, calidad y compartición de datos del proyecto.

- **Ejemplos:** nuevo evento de analytics, cambio de política de retención, decisión de compartir datos con terceros, esquema de consentimiento.
- **Participantes:** responsable de datos, seguridad, producto, legal, ingeniería.
- **Documentación:** ADR de datos, política de privacidad, impacto de protección de datos.

## 4.10 Decisiones de seguridad

Afectan la protección de información, accesos, autenticación, autorización, infraestructura, dependencias y respuesta a incidentes.

- **Ejemplos:** cambio de política de roles, decisión de RLS, nueva integración de autenticación, respuesta a una vulnerabilidad, revisión de permisos.
- **Participantes:** seguridad, ingeniería, arquitectura, producto, Founder en decisiones de alto riesgo.
- **Documentación:** ADR de seguridad, Runbook de seguridad, acta de decisión.

---

# 5. Proceso de Decisión

Todo proceso de decisión relevante debe seguir un flujo común. No todos los pasos requieren la misma profundidad, pero todos deben ser considerados conscientemente.

## 5.1 Identificación del problema

Antes de proponer soluciones, se describe claramente el problema. ¿Qué ocurre? ¿Quién lo experimenta? ¿Con qué frecuencia? ¿Cuál es el costo de no resolverlo? Un problema mal definido produce soluciones elegantes para nada.

## 5.2 Contexto

Se describe el contexto que rodea al problema: restricciones actuales, decisiones previas relacionadas, estado del sistema, datos disponibles, stakeholders afectados y plazos. El contexto evita que se repitan debates ya resueltos y que se ignoren dependencias.

## 5.3 Opciones

Se documentan al menos dos opciones viables. Una única opción no es una decisión: es una imposición. Cada opción debe incluir una descripción clara, los requisitos que satisface y los que no, y una estimación de costo, tiempo y riesgo.

## 5.4 Evaluación

Se aplican los criterios de evaluación de la sección 6 de este documento. La evaluación debe ser explícita: no basta con decir que una opción es mejor, hay que explicar por qué, con qué peso y bajo qué supuestos.

## 5.5 Riesgos

Se identifican los riesgos de cada opción: técnicos, de negocio, de experiencia, de seguridad, de datos, operativos, de cumplimiento y reputacionales. Para cada riesgo se define mitigación, monitorización y plan de contingencia cuando aplique.

## 5.6 Impacto

Se estima el impacto esperado de la decisión: en usuarios, en el negocio, en la arquitectura, en operaciones, en SEO, en datos, en costos y en la velocidad futura del proyecto. El impacto debe ser medible siempre que sea posible.

## 5.7 Recomendación

Se formula una recomendación clara con una justificación. La recomendación debe explicar por qué se prefiere la opción elegida, qué se sacrifica y qué se gana. La recomendación no es la decisión: es la propuesta que alimenta la aprobación.

## 5.8 Aprobación

Se define quién aprueba la decisión según su nivel. Las decisiones menores pueden aprobarse por el responsable directo. Las decisiones mayores requieren aprobación explícita del Founder o del grupo correspondiente. La aprobación queda registrada.

## 5.9 Documentación

La decisión se registra en el formato adecuado según su naturaleza (ver sección 8). La documentación debe incluir problema, contexto, opciones, evaluación, riesgos, impacto, recomendación, aprobación y puntos de revisión futura.

## 5.10 Seguimiento

Toda decisión relevante debe tener un punto de seguimiento. ¿Se cumplieron los objetivos? ¿Aparecieron riesgos no previstos? ¿Es necesario revisar la decisión? El seguimiento cierra el ciclo y convierte la decisión en aprendizaje.

---

# 6. Criterios de Evaluación

Las decisiones se evalúan con criterios comunes. No todos los criterios tienen el mismo peso en cada decisión, pero todos deben ser considerados y el peso debe ser explícito.

## 6.1 Valor para el viajero

¿La decisión mejora la experiencia del visitante? ¿Le ahorra tiempo? ¿Le genera confianza? ¿Le ayuda a descubrir más, disfrutar más o recordar mejor? Si una decisión no aporta valor directo o indirecto al viajero, requiere una justificación excepcional.

## 6.2 Valor para el ecosistema

¿La decisión fortalece a las empresas locales, a las comunidades, a las instituciones o al destino en conjunto? Valladolid.mx existe para distribuir beneficios, no para concentrarlos. Una decisión que perjudica al ecosistema a favor de un solo actor es una decisión fallida.

## 6.3 Valor para el negocio

¿La decisión sostiene la viabilidad económica del proyecto? ¿Aumenta ingresos, reduce costos, mejora la retención, acelera la conversión o fortalece la marca? El valor de negocio no es opuesto al valor del viajero: ambos deben alinearse.

## 6.4 Alineación con el CANON

¿La decisión respeta la misión, visión, principios fundacionales y reglas inmutables del CANON? Esta es una puerta de entrada: si no alinea, no avanza.

## 6.5 Coherencia arquitectónica

¿La decisión respeta los principios arquitectónicos permanentes? ¿No genera duplicación, no rompe contratos, no crea dependencias innecesarias y no contradice la evolución planeada del sistema?

## 6.6 Complejidad

¿Qué tan complejo es implementar y mantener la decisión? ¿La complejidad se justifica con el valor esperado? La complejidad es un costo real que se paga cada día, en cada cambio, en cada onboarding.

## 6.7 Coste

¿Cuál es el costo total de la decisión? No solo el costo inicial de implementación, sino también el costo de operación, mantenimiento, dependencias, licencias, infraestructura y oportunidad. Un costo bajo con deuda oculta puede ser más caro que una inversión mayor inicial.

## 6.8 Riesgo

¿Qué puede salir mal? ¿Qué riesgos técnicos, de negocio, de experiencia, de seguridad, legales o reputacionales implica? ¿Hay forma de mitigarlos? Las decisiones de alto riesgo requieren planes de contingencia y seguimiento estrecho.

## 6.9 Escalabilidad

¿La decisión escala con el crecimiento de usuarios, empresas, destinos, contenidos y transacciones? ¿Mantiene su eficiencia cuando el sistema crece? Una solución que funciona hoy para cien usuarios puede colapsar mañana para cien mil.

## 6.10 Reutilización

¿La decisión aprovecha o fortalece capacidades existentes? ¿Produce algo que otros módulos, superficies o equipos puedan reutilizar? ¿Evita duplicar soluciones similares? Reutilizar es multiplicar el valor.

## 6.11 Mantenibilidad

¿La decisión es fácil de mantener, depurar, actualizar y evolucionar? ¿Puede ser entendida por personas que no participaron en su creación? ¿Tiene pruebas, observabilidad y documentación suficiente? Lo que no se puede mantener se convierte en deuda.

---

# 7. Gestión de Conflictos

Es inevitable que aparezcan tensiones entre criterios. Esta sección define cómo resolver los conflictos más frecuentes de manera predecible y alineada con el CANON.

## 7.1 Negocio vs Tecnología

Cuando una oportunidad de negocio exige una solución técnicamente problemática, no se elige automáticamente el negocio ni la tecnología. Se evalúa: ¿la oportunidad es real y medible? ¿El costo técnico es aceptable? ¿Existe una alternativa que satisfaga ambos? La decisión debe ser documentada como deuda consciente si se sacrifica arquitectura por velocidad comercial.

## 7.2 UX vs Rendimiento

Cuando una experiencia deseable impacta el rendimiento, no se sacrifica la experiencia por defecto ni se acepta un rendimiento deficiente por costumbre. Se busca una solución que respete ambos: lazy loading, división de código, optimización de assets, patrones de carga progresiva o rediseño del flujo. Si no es posible, se decide explícitamente cuál es el umbral aceptable.

## 7.3 Innovación vs Estabilidad

La innovación es necesaria, pero no a expensas de la estabilidad del sistema. Se prefiere la innovación controlada: experimentos aislados, feature flags, lanzamientos graduales, rollback rápido y aprendizaje medible. La estabilidad no es enemiga de la innovación: es la base que permite innovar sin miedo.

## 7.4 Corto vs Largo plazo

Las necesidades inmediatas no justifican decisiones que dañen el futuro. Cuando hay tensión, se documenta el costo a largo plazo de la opción cortoplacista. Si se opta por el corto plazo, se compromete un plan de recuperación. El largo plazo es el cliente principal de este proyecto.

## 7.5 Automatización vs Intervención humana

La automatización se aplica donde reduce esfuerzo repetitivo, errores y tiempo. La intervención humana se reserva donde aporta juicio, empatía, creatividad o responsabilidad. Alux no reemplaza al concierge humano: lo amplía. La decisión de automatizar algo debe incluir un umbral de escalamiento humano.

---

# 8. Registro de Decisiones

Las decisiones se registran en el formato más adecuado. Esta sección define cuándo usar cada tipo de documento.

## 8.1 ADR — Architecture Decision Record

Se usa para decisiones técnicas y arquitectónicas con impacto estructural. Un ADR explica el contexto, las opciones consideradas, la decisión tomada, las consecuencias y el estado de la decisión. Es breve, técnico y durable.

## 8.2 Blueprint

Se usa para decisiones de mayor alcance que requieren un marco completo: estrategia, producto, arquitectura, contenido, SEO, operación o IA. Un Blueprint desarrolla la visión, el alcance, las reglas, el plan de ejecución, los criterios de éxito y los riesgos. Es el formato principal de documentación de decisiones en Valladolid.mx.

## 8.3 PRD — Product Requirements Document

Se usa para decisiones de producto que definen una funcionalidad, una épica o una historia de usuario. Un PRD describe el problema, los objetivos, los criterios de aceptación, las dependencias, el diseño propuesto y las métricas de éxito. Cuando la decisión afecta experiencia, se complementa con análisis de diseño.

## 8.4 Runbook

Se usa para decisiones operativas que requieren una guía de ejecución repetible: respuesta a incidentes, procesos de moderación, políticas de soporte, flujos de verificación. Un Runbook describe pasos, responsables, puntos de decisión, escenarios y escalamientos.

## 8.5 Acta de decisión

Se usa para decisiones tomadas en reuniones, sesiones de aprobación o revisiones formales. Una acta registra fecha, participantes, problema, opciones, recomendación, decisión, responsables y puntos de seguimiento. No reemplaza un ADR o Blueprint, pero lo inicia o lo complementa.

## 8.6 Relación entre formatos

Una decisión importante puede generar varios documentos: una acta que aprueba la decisión, un Blueprint que la desarrolla, un ADR que registra la elección técnica y un Runbook que define su operación. Cada documento tiene una responsabilidad única y se referencia entre sí, no se duplica.

---

# 9. Checklist de Decisión

Antes de aprobar cualquier decisión relevante, se debe verificar que se cumplan los siguientes puntos. El checklist no es opcional: es la puerta de salida del proceso de decisión.

## 9.1 Checklist obligatorio

- [ ] El problema está definido con claridad y no confunde síntoma con causa.
- [ ] Se consultó el CANON y no existe contradicción sin resolver.
- [ ] Se documentaron al menos dos opciones viables.
- [ ] Se aplicaron los criterios de evaluación de forma explícita.
- [ ] Se identificaron los riesgos y se definieron mitigaciones o planes de contingencia.
- [ ] Se estimó el impacto en viajeros, ecosistema, negocio, arquitectura y operación.
- [ ] Se determinó si la decisión es reversible o irreversible.
- [ ] Se asignó un dueño claro y un aprobador adecuado al nivel de decisión.
- [ ] Se eligió el formato de registro correcto (ADR, Blueprint, PRD, Runbook o Acta).
- [ ] Se definió un punto de seguimiento o revisión futura.
- [ ] Se comunicó la decisión a quienes deben ejecutarla o quienes se ven afectados.

## 9.2 Checklist extendido para decisiones irreversibles

- [ ] Se analizó el costo total de propiedad a cinco años.
- [ ] Se evaluaron alternativas que minimizan compromisos arquitectónicos permanentes.
- [ ] Se consultó a seguridad, legal o datos si la decisión afecta esos dominios.
- [ ] Se definió un plan de rollback o transición en caso de fracaso.
- [ ] Se validó la decisión con al menos una perspectiva externa al equipo proponente.
- [ ] Se actualizó o programó la actualización de la documentación oficial afectada.

---

# 10. Revisión de Decisiones

Las decisiones no son permanentes por el mero hecho de haber sido documentadas. Esta sección define cuándo y cómo revisarlas.

## 10.1 Momentos de revisión

Una decisión debe revisarse cuando:

- Han pasado doce meses desde su aprobación y afecta arquitectura, producto o estrategia.
- Los supuestos que la sostenían han cambiado significativamente.
- Los resultados medidos difieren de los esperados en un margen relevante.
- Aparece nueva información que la contradice o la mejora.
- El CANON o los principios arquitectónicos evolucionan.
- Una dependencia externa cambia de condiciones.
- La deuda generada supera el beneficio original.

## 10.2 Proceso de revisión

La revisión sigue el mismo proceso de decisión, pero comienza con el documento anterior. Se evalúa qué se cumplió, qué no, qué cambió y qué se aprendió. La nueva decisión puede ratificar, modificar o revocar la anterior. En todos los casos, el resultado se documenta y se enlaza con la decisión original.

## 10.3 Gestión de cambios de criterio

Cuando cambian los criterios de evaluación —por evolución del negocio, del mercado, de la regulación o del CANON— las decisiones previas no se invalidan automáticamente. Se revisan bajo los nuevos criterios y se decide si siguen vigentes, si requieren ajuste o si deben retirarse. El cambio de criterio también se documenta.

## 10.4 Deprecación de decisiones

Cuando una decisión deja de aplicar, se marca explícitamente como obsoleta. No se borra: se conserva como registro histórico, con una nota que indica qué la reemplaza y por qué. Borrar decisiones pasadas destruye la trazabilidad del proyecto.

---

# 11. Evolución del Documento

Este documento evolucionará conforme Valladolid.mx crece. No se trata de un manual rígido, sino de un marco que se adapta al aprendizaje del proyecto.

## 11.1 Qué puede cambiar

Pueden cambiar los niveles de decisión, los formatos de registro, los criterios de evaluación o los checklist cuando el proyecto lo requiera. Pueden añadirse nuevos tipos de decisiones —por ejemplo, relacionados con nuevos canales, mercados o tecnologías— sin contradecir los principios.

## 11.2 Qué no puede cambiar

No pueden cambiar los principios fundamentales de este documento: CANON First, Evidence Before Opinion, User Value Before Preference, Business Value Before Complexity, Reuse Before Build, Simplicity First, Long-term Thinking, Document Every Important Decision, Reversible vs Irreversible Decisions y Evolution Over Perfection. Estos principios son permanentes.

## 11.3 Cómo se actualiza

Las actualizaciones siguen el proceso de decisión que este documento describe. Los cambios mayores se registran en un Blueprint o ADR. Los cambios menores se registran en el Control de Versiones. Nunca se modifica este documento sin justificación ni trazabilidad.

## 11.4 Relación con el CANON y los demás documentos de gobernanza

Este documento se alinea con el CANON, el GLOSSARY, ARCHITECTURAL PRINCIPLES y DOCUMENTATION STANDARD. Si surge un conflicto entre este documento y otro documento de gobernanza, prevalece el CANON. Si el conflicto es entre documentos de igual jerarquía, se resuelve mediante una decisión formal documentada.

---

# 12. Control de Versiones

| Versión | Fecha       | Autor    | Descripción                                                               |
|---------|-------------|----------|---------------------------------------------------------------------------|
| v1.0    | 2026-07-18  | Founder  | Emisión inicial del marco oficial de toma de decisiones de Valladolid.mx. |

Este documento se versiona junto al CANON, al GLOSSARY, a ARCHITECTURAL PRINCIPLES y a DOCUMENTATION STANDARD. Su versión mayor sólo cambia cuando se redefine su alcance o su filosofía; los cambios editoriales incrementan la versión menor.

---

# Conclusión

La toma de decisiones es una disciplina central en Valladolid.mx. No se delega al instinto, a la presión del momento ni a la autoridad aislada. Se somete a un marco común que garantiza consistencia, transparencia, trazabilidad y responsabilidad.

Este documento no busca ralentizar al proyecto: busca que el proyecto decida con la misma calidad con la que construye. Una decisión bien tomada preserva arquitectura, alinea equipos, protege la experiencia del viajero y genera valor duradero para el ecosistema del Oriente Maya de Yucatán.

Toda decisión importante en Valladolid.mx debe poder responderse a sí misma: ¿está alineada con el CANON? ¿está basada en evidencia? ¿genera valor para el viajero, el ecosistema y el negocio? ¿está documentada? ¿es reversible o irreversible? ¿tiene un punto de seguimiento?

Cuando una decisión pasa este filtro, no solo es correcta: es sostenible.
