# 03 · DOCUMENTATION STANDARD

**Estado:** Approved
**Versión:** 1.0
**Última actualización:** Julio 2026

---

# 1. Propósito

La documentación de Valladolid.mx es un activo estratégico, no un adjunto técnico.

Su propósito es preservar el conocimiento del proyecto, garantizar la continuidad de las decisiones, alinear a los equipos actuales y futuros, y permitir que tanto las personas como los sistemas de inteligencia artificial comprendan el destino, el producto, la arquitectura y las reglas de gobierno con la misma claridad.

Este documento define el estándar oficial de documentación. No describe arquitectura, no describe código y no prescribe una sola tecnología. Describe cómo debe escribirse, organizarse, mantenerse y evolucionar toda la documentación del proyecto para que sea clara, consistente, trazable, reusable, mantenible y comprensible.

Toda documentación que forme parte del repositorio oficial de Valladolid.mx deberá cumplir con este estándar. La calidad de la documentación se mide con los mismos criterios de rigor que la calidad del software.

---

# 2. Objetivos

El estándar de documentación persigue los siguientes objetivos permanentes:

## 2.1 Claridad

Cada documento debe comunicar una idea principal sin ruido. El lector debe entender rápidamente qué se decide, qué se propone o qué se registra, sin necesidad de adivinar intenciones ni reconstruir contexto ausente.

## 2.2 Consistencia

Todos los documentos deben compartir la misma estructura lógica, el mismo lenguaje, el mismo formato de versionado y las mismas convenciones de referencia. La consistencia reduce la fricción cognitiva y permite que los documentos se lean en conjunto.

## 2.3 Trazabilidad

Toda decisión importante debe poder rastrearse hasta su origen: quién la tomó, cuándo, por qué y qué alternativas se consideraron. La documentación no es una opinión publicada: es un registro de decisión.

## 2.4 Reutilización

La documentación debe escribirse una vez y referenciarse muchas. No se copian secciones entre documentos; se enlazan. Cada concepto debe tener una sola definición oficial y cada decisión una sola fuente de verdad.

## 2.5 Mantenibilidad

Los documentos deben ser fáciles de actualizar cuando cambia la realidad. Un documento que nadie se atreve a tocar porque está desordenado, redundante o desactualizado pierde su valor y se convierte en deuda.

## 2.6 Evolución controlada

La documentación vive, pero no de forma caótica. Cada cambio se versiona, se justifica y se registra. Los documentos oficiales no cambian sin autorización ni sin trazabilidad.

## 2.7 Comprensión por personas e IA

La documentación debe ser legible para humanos y útil para sistemas de inteligencia artificial. Estructura semántica clara, vocabulario controlado, referencias explícitas y contratos legibles por máquina permiten que Alux y otros sistemas consuman el conocimiento del proyecto sin distorsión.

---

# 3. Principios de Documentación

Los siguientes principios gobiernan la forma en que se produce y mantiene la documentación de Valladolid.mx.

## 3.1 Documentation First

Antes de construir, se documenta la intención. Antes de decidir, se documenta el contexto. Antes de cambiar, se documenta el porqué. La documentación no es una tarea posterior al desarrollo: es parte del proceso de pensamiento.

Esto no significa documentar cada línea de código. Significa que toda decisión relevante, toda arquitectura, toda regla de negocio, toda interfaz pública y toda dependencia debe quedar registrada antes de que la memoria del momento la distorsione.

## 3.2 Single Source of Truth

Un concepto, una decisión, una regla o un proceso se documenta una sola vez. Si la información existe en dos lugares, eventualmente divergerá. Cuando un documento necesita referirse a algo ya definido, lo enlaza, no lo reescribe.

Este principio aplica a definiciones, procesos, contratos, decisiones, arquitecturas, reglas de seguridad, listados de dependencias y cualquier otro elemento que pueda ser reutilizado.

## 3.3 Write Once

Cada documento debe tener una responsabilidad única y clara. Un documento que intenta ser todo para todos termina sin ser útil para nadie. Se prefiere una colección de documentos especializados y enlazados sobre unos pocos documentos monolíticos.

## 3.4 Avoid Duplication

Copiar y pegar contenido entre documentos es una forma de duplicación tan dañina como duplicar código. Cuando se detecta redundancia, se elimina del lugar secundario y se reemplaza por una referencia al documento canónico. La duplicación silenciosa genera inconsistencia.

## 3.5 Keep Documents Alive

Un documento que no se actualiza cuando cambia el proyecto se convierte en un riesgo. Los documentos vivos se revisan periódicamente, se actualizan tras decisiones relevantes y se desactivan cuando dejan de aplicar. Un documento abandonado debe marcarse explícitamente como obsoleto o retirarse.

## 3.6 Decision Traceability

Toda decisión importante debe poder reconstruirse: qué problema resolvía, qué alternativas se evaluaron, por qué se eligió la opción actual, qué riesgos se asumieron y qué se acordó revisar en el futuro. La trazabilidad protege al proyecto de repetir debates y de olvidar lecciones.

## 3.7 Explain the Why before the How

La documentación debe explicar primero por qué algo es como es, y después cómo funciona. El cómo cambia con el stack; el porqué permanece. Un documento que solo describe procedimientos se vuelve obsoleto rápidamente. Un documento que explica el razonamiento permanece relevante.

## 3.8 Consistency over Personal Style

La voz individual del autor no prima sobre la voz del proyecto. Todos los documentos oficiales deben parecer escritos por el mismo equipo, aunque hayan sido producidos por distintas personas. Esto no elimina la claridad ni la calidad literaria: unifica la experiencia del lector.

## 3.9 Long-term Readability

Los documentos se escriben para durar. Se evitan modismos, referencias a conversaciones privadas, nombres de herramientas pasajeras, chistes internos y suposiciones sobre quién los leerá. El lector de dentro de cinco años debe poder entender el documento sin contexto adicional.

## 3.10 AI-friendly Documentation

La documentación debe ser fácilmente procesable por sistemas de inteligencia artificial. Esto significa:

- Estructura semántica clara con encabezados jerárquicos.
- Uso consistente del vocabulario del GLOSSARY.
- Referencias explícitas entre documentos.
- Listados, tablas y definiciones bien formateados.
- Ejemplos concretos y casos de uso.
- Contratos y decisiones expresados en lenguaje preciso.

Alux consume este conocimiento. Una documentación desordenada produce una IA desordenada.

---

# 4. Tipos Oficiales de Documentos

Cada documento del proyecto debe clasificarse en uno de los tipos oficiales. Cada tipo tiene una responsabilidad única y un lugar canónico dentro de la jerarquía documental.

## 4.1 CANON

**Propósito:** Establecer la identidad, misión, visión, principios permanentes y reglas constitucionales del proyecto.

**Características:** Es el documento de mayor jerarquía. Define qué es Valladolid.mx, por qué existe y qué no puede cambiar sin revisión integral. No prescribe tecnología ni procesos operativos.

**Ubicación:** `docs/governance/00-CANON.md`.

## 4.2 Governance

**Propósito:** Gobernar aspectos específicos del proyecto a través de reglas, estándares, principios y referencias oficiales.

**Características:** Los documentos de gobernanza traducen el CANON a dominios concretos. El GLOSSARY gobierna el lenguaje. ARCHITECTURAL PRINCIPLES gobierna la arquitectura. DOCUMENTATION STANDARD gobierna cómo se documenta. Pueden existir documentos de gobernanza adicionales para seguridad, privacidad, diseño, calidad, operación, etc.

**Ubicación:** `docs/governance/`.

## 4.3 Glossary

**Propósito:** Definir el vocabulario oficial del proyecto y eliminar ambigüedades terminológicas.

**Características:** Cada término tiene una definición única, uso correcto, términos prohibidos y referencias relacionadas. Ningún otro documento puede usar sinónimos casuales para un término definido aquí.

**Ubicación:** `docs/governance/01-GLOSSARY.md`.

## 4.4 Architectural Principles

**Propósito:** Definir los principios arquitectónicos permanentes que gobiernan todo el software.

**Características:** No describe tecnologías específicas ni implementación. Define reglas de diseño que permanecerán válidas aunque cambie el stack. Es la Constitución Técnica del proyecto.

**Ubicación:** `docs/governance/02-ARCHITECTURAL-PRINCIPLES.md`.

## 4.5 Documentation Standard

**Propósito:** Definir cómo debe escribirse, organizarse, mantenerse y evolucionar toda la documentación del proyecto.

**Características:** Este documento. No prescribe contenido, prescribe forma. Garantiza que toda la documentación del proyecto sea comprensible, consistente y trazable.

**Ubicación:** `docs/governance/03-DOCUMENTATION-STANDARD.md`.

## 4.6 Decision Making

**Propósito:** Registrar las decisiones significativas del proyecto de forma estandarizada.

**Características:** Puede adoptar la forma de ADR, RFC, propuestas de gobierno o registros de aprobación. Siempre incluye contexto, alternativas, decisión, consecuencias y fecha.

**Ubicación:** `docs/decisions/` o `docs/governance/decisions/` según la convención del proyecto.

## 4.7 Blueprint

**Propósito:** Describir una épica, iniciativa, arquitectura o decisión de producto con nivel de detalle técnico y estratégico.

**Características:** Es la fuente histórica y técnica de las decisiones aprobadas. Un Blueprint puede incluir contexto, objetivos, alcance, diseño, riesgos, dependencias, plan de implementación, criterios de aceptación y Completion Report.

**Ubicación:** `docs/blueprint/`.

## 4.8 ADR (Architecture Decision Record)

**Propósito:** Registrar una decisión arquitectónica significativa con su contexto, alternativas y consecuencias.

**Características:** Documento breve, estructurado, numerado y permanente. Responde a: qué se decidió, por qué, qué alternativas se consideraron, qué se sacrificó y qué se acordó revisar.

**Ubicación:** `docs/decisions/ADR-NNNN-titulo-breve.md` o similar.

## 4.9 PRD (Product Requirement Document)

**Propósito:** Definir los requisitos de una funcionalidad o producto antes de su construcción.

**Características:** Incluye problema, objetivos, audiencia, alcance, fuera de alcance, flujos de usuario, criterios de aceptación, dependencias, métricas y riesgos. Un PRD vive durante la construcción y se actualiza al cerrarse la épica.

**Ubicación:** `docs/blueprint/` o `docs/requirements/` según la convención del proyecto.

## 4.10 Runbook

**Propósito:** Describir procedimientos operativos para responder a situaciones conocidas en producción.

**Características:** Lenguaje directo, pasos numerados, comandos exactos, criterios de éxito, contactos de escalación y criterios de cierre. Un runbook no explica teoría: explica qué hacer.

**Ubicación:** `docs/runbooks/`.

## 4.11 Guide

**Propósito:** Explicar a un lector específico cómo realizar una tarea o comprender un tema.

**Características:** Menos formal que un Runbook, más orientado al aprendizaje. Puede incluir ejemplos, capturas de pantalla, casos de uso y explicaciones conceptuales. Un guide responde a "cómo se hace" o "cómo funciona".

**Ubicación:** `docs/guides/`.

## 4.12 Playbook

**Propósito:** Definir un conjunto de procedimientos, estrategias o mejores prácticas para un rol o proceso repetido.

**Características:** Es más amplio que un Runbook. Un playbook describe cómo abordar una clase de situaciones, no un único incidente. Puede incluir principios, criterios de decisión, plantillas y enlaces a runbooks específicos.

**Ubicación:** `docs/playbooks/`.

## 4.13 Research

**Propósito:** Documentar investigaciones, benchmarks, análisis comparativos o hallazgos de descubrimiento.

**Características:** Incluye fuentes, metodología, hallazgos, limitaciones y recomendaciones. Un documento de research no decide: informa. Las decisiones derivadas se registran en ADR o Blueprint.

**Ubicación:** `docs/research/`.

## 4.14 Specification

**Propósito:** Definir con precisión técnica un contrato, una interfaz, un formato o un comportamiento.

**Características:** Lenguaje formal, estructura rígida, ejemplos normativos, versionado estricto. Las especificaciones son contratos: se cumplen o se versionan.

**Ubicación:** `docs/specifications/`.

## 4.15 Checklist

**Propósito:** Definir una lista de verificación aplicable a un proceso, una revisión o una entrega.

**Características:** Elementos verificables, lenguaje binario, responsable definido, criterio de aprobación. Un checklist no explica: asegura que se cumpla lo ya explicado.

**Ubicación:** `docs/checklists/` o dentro del documento al que aplica.

## 4.16 Roadmap

**Propósito:** Definir la dirección estratégica del producto a mediano y largo plazo.

**Características:** Incluye épicas, dependencias, prioridades, criterios de entrada/salida, riesgos y criterios de reordenamiento. El Roadmap es un documento vivo que se actualiza periódicamente.

**Ubicación:** `docs/blueprint/roadmap/`.

## 4.17 Release Notes

**Propósito:** Comunicar qué cambia en una versión del producto.

**Características:** Lenguaje claro, organizado por categorías, con impacto para usuarios, empresas, operadores y administradores. Incluye cambios breaking, nuevas capacidades, correcciones, mejoras y deprecaciones.

**Ubicación:** `docs/releases/` o `CHANGELOG.md`.

## 4.18 Migration Guide

**Propósito:** Explicar cómo migrar de una versión a otra, de un sistema a otro o de un formato a otro.

**Características:** Pasos ordenados, prerequisitos, comandos, validaciones, rollback y criterios de éxito. Un migration guide nunca asume contexto previo no documentado.

**Ubicación:** `docs/migrations/`.

## 4.19 API Documentation

**Propósito:** Documentar los contratos de las interfaces de programación del proyecto.

**Características:** Incluye endpoints, métodos, parámetros, cuerpos de solicitud, respuestas, códigos de error, ejemplos, versionado y políticas de deprecación. La API documentation es un contrato, no una descripción opcional.

**Ubicación:** `docs/api/` o generada automáticamente desde el código cuando aplique.

---

# 5. Estructura Estándar

Aunque cada tipo de documento tiene sus propias necesidades, se recomienda que cualquier documento oficial siga la siguiente estructura lógica:

## 5.1 Título

El título debe ser claro, único y alineado con el tipo de documento. Debe permitir identificar el contenido sin abrir el archivo.

Ejemplos correctos:

- `15.10.H-03-EPICA-1-I1c-GALLERY-INFOGRID-SECTION-FEATURES-CLOSURE-v1.0.md`
- `SEO.A3.M1-AUTHORITY-BUSINESS-LANDING-COMPLETION-REPORT-v1.0.md`
- `03-DOCUMENTATION-STANDARD.md`

## 5.2 Propósito

La primera sección después del encabezado debe explicar por qué existe el documento. Qué problema resuelve, qué decisión registra, qué estándar define o qué guía ofrece. El propósito establece el contrato con el lector.

## 5.3 Alcance

Define qué cubre el documento y qué queda fuera. El alcance evita ambigüedades sobre la responsabilidad del documento y previene que se convierta en un contenedor de todo.

## 5.4 Contexto

Explica el contexto necesario para entender el documento. Puede incluir referencias a decisiones previas, estado actual del proyecto, problemas detectados, motivación o antecedentes. El contexto no repite lo que ya está en otro documento: lo enlaza.

## 5.5 Definiciones

Lista los términos clave que se usarán en el documento, especialmente si tienen un significado específico dentro del proyecto. Los términos que ya existen en el GLOSSARY se enlazan, no se redefinen.

## 5.6 Contenido principal

Es el cuerpo del documento. Se organiza en secciones numeradas con encabezados jerárquicos. Cada sección debe tener una responsabilidad clara. Se prefieren secciones cortas y numeradas sobre párrafos extensos sin estructura.

## 5.7 Ejemplos

Cuando corresponda, se incluyen ejemplos concretos que ilustren lo descrito. Los ejemplos deben ser realistas, representativos y aplicables al proyecto. No se usan ejemplos genéricos que no aporten claridad.

## 5.8 Relaciones con otros documentos

Explica cómo se relaciona este documento con otros documentos oficiales. Incluye enlaces o referencias a documentos padres, hijos, dependencias, decisiones relacionadas o especificaciones que lo complementan.

## 5.9 Conclusión

Cierra el documento con una síntesis de lo que establece. La conclusión no introduce información nueva: confirma la intención del documento y su lugar dentro del sistema de gobernanza.

## 5.10 Control de versiones

Todo documento oficial debe incluir una sección o tabla de control de versiones al final. Indica versión, fecha, autor y resumen de cambios. El formato debe ser consistente con el resto de la documentación de gobernanza.

---

# 6. Convenciones Editoriales

## 6.1 Niveles de encabezados

Se utiliza Markdown estándar con los siguientes criterios:

- `#` para el título principal del documento.
- `##` para secciones principales numeradas.
- `###` para subsecciones dentro de una sección principal.
- `####` para subdivisiones ocasionales cuando la estructura lo requiere.

Se evita saltar niveles (por ejemplo, pasar de `##` a `####` sin `###`). Cada encabezado debe tener un identificador semántico claro.

## 6.2 Tablas

Las tablas se utilizan para información estructurada, comparaciones, matrices, versiones y listados con múltiples atributos. Deben tener encabezados claros, alineación lógica y contenido conciso.

Ejemplo de uso correcto:

| Tipo | Propósito | Ubicación |
|------|-----------|-----------|
| CANON | Identidad y principios constitucionales | `docs/governance/00-CANON.md` |
| ADR | Decisiones arquitectónicas | `docs/decisions/` |
| Runbook | Procedimientos operativos | `docs/runbooks/` |

## 6.3 Listas

Se usan listas ordenadas cuando el orden importa y listas desordenadas cuando los elementos son independientes. Cada elemento debe ser paralelo en estructura: si uno comienza con verbo, todos deben comenzar con verbo; si uno es una frase, todos deben ser frases.

## 6.4 Bloques de advertencia

Se utilizan bloques de advertencia para destacar información crítica que no debe pasarse por alto. Se prefieren citas con énfasis o bloques destacados. El lenguaje debe ser directo y la acción esperada clara.

Ejemplo:

> **Importante:** Este documento no sustituye al CANON. En caso de conflicto, prevalece el CANON.

## 6.5 Ejemplos

Los ejemplos se presentan en bloques de código o en líneas destacadas cuando corresponde. Deben ser coherentes con el tema del documento y evitar datos ficticios que puedan confundirse con información real del proyecto.

## 6.6 Notas

Las notas aclaran, contextualizan o amplían sin interrumpir el flujo principal. Se usan con moderación y deben aportar valor real, no repetir lo ya dicho.

## 6.7 Referencias

Toda referencia a otro documento, sección, estándar o decisión debe ser explícita. Cuando sea posible, se incluye la ruta del archivo y el número de sección. Las referencias vagas como "ver el documento de arquitectura" no son aceptables.

Ejemplo correcto:

> Ver `02-ARCHITECTURAL-PRINCIPLES.md` §3.4 (Single Source of Truth) y `01-GLOSSARY.md` entrada "Single Source of Truth".

## 6.8 Enlaces internos

Se prefieren enlaces relativos dentro del repositorio sobre enlaces absolutos. Los enlaces a documentos externos deben justificarse y verificarse periódicamente. No se enlazan URLs temporales, documentos de borrador o recursos no controlados por el proyecto.

---

# 7. Estilo de Escritura

## 7.1 Lenguaje claro

Se prefiere la claridad sobre la sofisticación. Se usan frases cortas, estructuras directas y vocabulario preciso. Si una idea puede decirse en diez palabras, no se dice en treinta.

## 7.2 Lenguaje profesional

El tono es profesional, respetuoso y constructivo. Se evita el sarcasmo, la ironía, el lenguaje excesivamente coloquial y las expresiones que puedan interpretarse de múltiples formas.

## 7.3 Evitar ambigüedad

Cada afirmación debe ser interpretable de una sola manera. Se evitan palabras como "quizás", "tal vez", "posiblemente" o "algunos" cuando se describen obligaciones, reglas o decisiones. Cuando algo es opcional, se dice explícitamente que es opcional.

## 7.4 Evitar opiniones

La documentación registra decisiones, principios, hechos y acuerdos. No publica opiniones personales. Cuando se expone una postura, se identifica como decisión aprobada o principio oficial, no como preferencia individual.

## 7.5 Explicar decisiones

Cuando un documento establece una decisión, debe explicar el razonamiento que la sustenta. No basta con decir qué se hace: debe decirse por qué se hace. Esto permite evaluar la decisión en el futuro y aprender de ella.

## 7.6 Definir términos antes de utilizarlos

Un documento no debe usar un término especializado sin definirlo o sin referir a su definición oficial. Si el término existe en el GLOSSARY, se enlaza. Si es nuevo, se define en el documento y se propone su incorporación al GLOSSARY.

## 7.7 Consistencia terminológica con el GLOSSARY

Todo documento debe usar los términos oficiales del proyecto. No se admiten sinónimos casuales, abreviaturas informales ni adaptaciones locales. Si un término no existe en el GLOSSARY, se debe evaluar si corresponde añadirlo antes de usarlo repetidamente.

---

# 8. Versionado

La documentación de Valladolid.mx sigue un esquema de versionado semántico simplificado.

## 8.1 v1.0

Versión inicial de un documento. Indica que el documento ha sido aprobado y publicado oficialmente. A partir de v1.0, el documento entra en el sistema de control de cambios.

## 8.2 v1.1

Incremento menor. Indica cambios editoriales, aclaraciones, correcciones menores, adiciones de secciones pequeñas o actualizaciones que no modifican el alcance ni la intención del documento.

## 8.3 v2.0

Incremento mayor. Indica cambios sustantivos que modifican el alcance, la filosofía, las reglas fundamentales o la estructura del documento. Una versión mayor requiere revisión y aprobación explícita.

## 8.4 Breaking changes

Un documento introduce un breaking change cuando establece una regla, definición o procedimiento que contradice o invalida lo anterior. Los breaking changes deben:

- Ser explícitamente identificados como tales.
- Justificar el cambio.
- Indicar qué documentos o procesos se ven afectados.
- Proporcionar una ruta de transición cuando aplique.

## 8.5 Historial

El historial de versiones se registra en la sección de Control de Versiones del documento. Cada entrada debe incluir:

- Número de versión.
- Fecha.
- Autor o responsable.
- Resumen de cambios.
- Justificación del cambio.

## 8.6 Autores

El autor de una versión es la persona o rol responsable de la modificación. No es necesariamente el creador original. Cuando un documento es producto de una decisión colectiva, se registra el rol aprobador o el comité responsable.

## 8.7 Fechas

Las fechas se expresan en formato `YYYY-MM-DD` o con el nombre del mes en español según el contexto del documento. Se mantiene coherencia dentro de un mismo documento.

---

# 9. Relación entre documentos

La documentación de Valladolid.mx no es una colección aislada de archivos: es un sistema de conocimiento interrelacionado. Esta sección describe cómo se vinculan los tipos principales.

## 9.1 CANON

El CANON es el documento raíz. Todos los demás documentos deben ser coherentes con él. En caso de conflicto, prevalece el CANON. Ningún documento de gobernanza, blueprint o ADR puede contradecir los principios constitucionales.

## 9.2 Governance

Los documentos de gobernanza traducen el CANON a dominios específicos. El GLOSSARY gobierna el lenguaje. ARCHITECTURAL PRINCIPLES gobierna la arquitectura. DOCUMENTATION STANDARD gobierna la forma. Cada documento de gobernanza debe referir al CANON y a otros documentos de gobernanza relacionados.

## 9.3 Blueprint

Los Blueprints operan bajo el CANON y bajo los documentos de gobernanza. Traducen principios a decisiones concretas de producto o arquitectura. Un Blueprint puede referir a ADRs, a especificaciones, a research y a roadmaps. Cuando un Blueprint se cierra, su Completion Report se convierte en fuente histórica de decisión.

## 9.4 ADR

Los ADRs registran decisiones puntuales que afectan la arquitectura o el producto. Deben referir al CANON, a ARCHITECTURAL PRINCIPLES y al Blueprint al que pertenecen. Una decisión que contradiga un principio constitucional debe explicar por qué se autoriza y qué excepción se establece.

## 9.5 PRD

Los PRDs definen requisitos bajo un Blueprint. Heredan los principios del CANON, las reglas de gobernanza y las decisiones de los ADRs. Un PRD no redefine problemas ya resueltos: se apoya en documentos superiores.

## 9.6 Runbook

Los Runbooks operan a partir de Blueprints, ADRs, especificaciones y decisiones de arquitectura. Describen qué hacer en situaciones concretas. No explican por qué se decidió algo: eso está en el ADR o Blueprint correspondiente.

## 9.7 Research

Los documentos de research informan decisiones, no las toman. Sus hallazgos se consumen en Blueprints, ADRs o PRDs. Cuando un research genera una decisión, esa decisión se registra en el documento de decisión correspondiente, no en el research.

---

# 10. Buenas prácticas

## 10.1 Escribe para el lector correcto

Antes de escribir, identifica quién leerá el documento. Un PRD se escribe para producto e ingeniería. Un Runbook se escribe para operaciones. Un Blueprint se escribe para stakeholders y equipos técnicos. La misma información puede requerir diferentes documentos para diferentes audiencias.

## 10.2 Mantén el documento enfocado

Un documento debe responder a una pregunta principal. Si durante la redacción aparecen múltiples preguntas, considera dividir el documento en documentos especializados enlazados.

## 10.3 Usa referencias en lugar de repetición

Si un concepto, regla o decisión ya está documentada, enlázala. No la copies. La repetición es la principal causa de inconsistencia documental.

## 10.4 Actualiza el contexto, no solo el resultado

Cuando un documento cambia, actualiza también el contexto: por qué cambió, qué lo motivó, qué se descartó. El resultado sin contexto es difícil de evaluar.

## 10.5 Revisa antes de publicar

Ningún documento oficial se publica sin revisión. La revisión debe verificar claridad, coherencia, ortografía, formato, referencias, versionado y cumplimiento del GLOSSARY y del CANON.

## 10.6 Marca los documentos obsoletos

Si un documento deja de aplicar, no lo elimines silenciosamente. Marca su estado como `Deprecated`, `Superseded` o `Retired`, indica qué documento lo reemplaza y registra la fecha de retiro.

## 10.7 Aprovecha la estructura de Markdown

Usa encabezados, listas, tablas, bloques de código y citas de forma deliberada. La estructura visual refuerza la estructura semántica y facilita la lectura por personas e IA.

## 10.8 Documenta el rechazo también

Las decisiones de no hacer algo son tan importantes como las de hacer algo. Si una propuesta se rechaza, registra el rechazo, el motivo y las condiciones bajo las cuales podría reconsiderarse.

## 10.9 Mantén el índice actualizado

Cada área documental debe tener un índice que liste los documentos activos, su estado, su versión y su relación con otros documentos. Un índice desactualizado es tan problemático como un documento desactualizado.

## 10.10 Haz la documentación reversible

Cuando un documento propone un cambio, incluye una ruta de reversión o condiciones de revisión. Las decisiones permanentes no existen: existen decisiones con condiciones de revisión explícitas.

---

# 11. Errores frecuentes

## 11.1 Copiar contenido entre documentos

Copiar secciones de un documento a otro genera divergencia. Cada vez que se detecta contenido duplicado, debe eliminarse del lugar secundario y reemplazarse por una referencia.

## 11.2 Usar lenguaje impreciso

Frases como "más adelante se verá", "esto se manejará internamente" o "depende del contexto" sin especificar el contexto generan confusión. La documentación debe ser concreta.

## 11.3 Mezclar decisiones con instrucciones

Un documento de decisión no debe convertirse en un manual de procedimiento. Un Runbook no debe registrar por qué se decidió algo. Mantener la separación de tipos de documentos mejora la mantenibilidad.

## 11.4 Olvidar el Control de Versiones

Un documento sin versionado es un documento informal. Toda documentación oficial debe incluir su versión, fecha y autor.

## 11.5 Usar terminología no oficial

Inventar nombres para conceptos que ya tienen un término en el GLOSSARY fragmenta el lenguaje del proyecto. Si un término no existe, propón su incorporación antes de usarlo como oficial.

## 11.6 Documentar solo el éxito

Documentar solo lo que funciona oculta riesgos y lecciones. Los documentos deben incluir limitaciones, riesgos, deuda técnica y decisiones difíciles, no solo logros.

## 11.7 Dejar documentos huérfanos

Un documento que nadie mantiene, nadie referencia y nadie actualiza debe retirarse o fusionarse. La documentación acumulada sin dueño reduce la confianza en todo el sistema documental.

## 11.8 Escribir documentos excesivamente largos

Un documento de cien páginas que nadie lee completo no aporta valor. Se prefiere dividir en documentos más cortos, especializados y enlazados.

## 11.9 Omitir relaciones con otros documentos

Un documento aislado no forma parte del sistema de conocimiento. Siempre se indica qué documentos lo anteceden, qué documentos dependen de él y qué documentos lo complementan.

## 11.10 Publicar sin revisión

Publicar documentos sin revisión formal introduce errores, inconsistencias y deuda documental. La revisión documental es parte del Definition of Done de cualquier entrega oficial.

---

# 12. Checklist de Calidad

Este checklist es obligatorio antes de aprobar cualquier documento oficial:

- [ ] El documento tiene un título claro y único.
- [ ] El propósito del documento está definido en la primera sección.
- [ ] El alcance está explícito y delimitado.
- [ ] El contexto necesario está presente o referenciado.
- [ ] Los términos clave están definidos o enlazados al GLOSSARY.
- [ ] El contenido principal está organizado en secciones numeradas y jerárquicas.
- [ ] Las decisiones registradas explican el porqué, no solo el qué.
- [ ] No hay duplicación de contenido con otros documentos; se usan referencias.
- [ ] Las referencias a otros documentos son explícitas y verificables.
- [ ] El formato Markdown es correcto y consistente.
- [ ] El lenguaje es claro, profesional y sin ambigüedades.
- [ ] Se respeta la terminología oficial del GLOSSARY.
- [ ] El documento es coherente con el CANON y los documentos de gobernanza.
- [ ] Incluye ejemplos cuando aportan claridad.
- [ ] Tiene una sección de Conclusión.
- [ ] Tiene una sección de Control de Versiones con versión, fecha, autor y cambios.
- [ ] Ha sido revisado por al menos una persona distinta del autor.
- [ ] No contiene información sensible, credenciales o datos privados.
- [ ] Está preparado para ser consumido por personas e IA.

El checklist no es opcional. Es la última defensa antes de que un documento oficial entre al repositorio.

---

# 13. Evolución del Estándar

Este documento evolucionará con el proyecto, pero no con ligereza. Sus modificaciones siguen reglas explícitas:

- **Cambios editoriales menores** (redacción, aclaraciones, ejemplos adicionales) se aplican por revisión ordinaria y se registran como incremento menor en el Control de Versiones.
- **Cambios sustantivos** (nuevos tipos de documentos, cambios en la estructura estándar, nuevos principios, modificaciones al checklist de calidad) requieren propuesta escrita, revisión cruzada con el CANON y el GLOSSARY, y aprobación del Founder.
- **Nuevos documentos de gobernanza** que amplíen este estándar deben ser coherente con él y referenciarse mutuamente.
- **Ninguna documentación oficial** puede ignorar este estándar una vez aprobado. Si la realidad del proyecto exige una excepción, la excepción se documenta como tal y se propone una actualización del estándar.

Cuando surja un nuevo tipo de documento, un nuevo formato o una nueva convención, no se adopta informalmente. Se propone, se discute, se aprueba y se incorpora a este estándar para que todos los documentos futuros lo usen de forma consistente.

---

# 14. Control de Versiones

| Versión | Fecha       | Autor    | Descripción                                                                 |
|---------|-------------|----------|-----------------------------------------------------------------------------|
| v1.0    | 2026-07-18  | Founder  | Emisión inicial del estándar oficial de documentación de Valladolid.mx.     |

Este documento se versiona junto al CANON, al GLOSSARY y a ARCHITECTURAL PRINCIPLES. Su versión mayor sólo cambia cuando se redefine su alcance o su filosofía; los cambios editoriales incrementan la versión menor.

---

# Conclusión

Este documento establece el estándar oficial de documentación de Valladolid.mx. No prescribe qué se debe documentar, sino cómo se debe documentar para que el conocimiento del proyecto sea claro, consistente, trazable, reusable y mantenible.

La documentación es una infraestructura del proyecto tan importante como el código, la arquitectura o el diseño. Un documento bien escrito preserva decisiones, alinea equipos, acelera la incorporación de nuevas personas y permite que Alux y otros sistemas de inteligencia artificial consuman el conocimiento del destino sin distorsión.

Toda documentación oficial de Valladolid.mx debe cumplir con este estándar. Su cumplimiento no es una formalidad: es la condición para que el proyecto conserve su memoria, su coherencia y su capacidad de evolución responsable.
