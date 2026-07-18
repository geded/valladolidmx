# 05 · BLUEPRINT STANDARD

**Estado:** Approved
**Versión:** 1.0
**Última actualización:** Julio 2026

---

# 1. Propósito

Este documento define el estándar oficial para la creación, revisión, aprobación, mantenimiento y evolución de todos los Blueprints de Valladolid.mx.

Un Blueprint es el documento de diseño que precede a la construcción. Es el lugar donde una idea se convierte en propuesta consciente, donde se define el problema, se exploran alternativas, se diseña la experiencia, se modela la arquitectura, se evalúan riesgos y se establecen métricas de éxito antes de que el primer componente o la primera tabla sean creados.

El propósito de este estándar es garantizar que todo Blueprint cumpla con un nivel mínimo de calidad, coherencia y trazabilidad. Ningún desarrollo de funcionalidad nueva, arquitectura nueva, integración nueva o decisión estructural podrá comenzar sin un Blueprint que cumpla este estándar y que haya sido aprobado por las instancias correspondientes.

Este documento no prescribe tecnologías ni describe implementación. Establece el contrato intelectual que debe existir antes de construir: la respuesta a qué se va a hacer, por qué, para quién, cómo se integra con el resto del sistema y cómo se sabrá que funcionó.

## 1.1 Qué es un Blueprint

Un Blueprint es un documento de diseño estratégico, técnico o funcional que describe una iniciativa antes de su implementación. Es la representación escrita de una decisión por construir.

Un Blueprint no es un plan de trabajo. No asigna tareas ni define sprints. Un Blueprint responde a las preguntas fundamentales de diseño: ¿qué problema resolvemos?, ¿para quién?, ¿qué experiencia queremos provocar?, ¿qué arquitectura necesitamos?, ¿qué entidades afectamos?, ¿qué riesgos asumimos?, ¿qué alternativas descartamos y por qué?

Un Blueprint bien escrito permite a cualquier lector —humano o sistema de inteligencia artificial— comprender la intención completa de una iniciativa sin depender de la memoria de quien la propuso.

## 1.2 Por qué existe

Valladolid.mx es un proyecto de largo plazo. Construye infraestructura digital para un destino turístico complejo, con múltiples actores, múltiples canales, múltiples idiomas y una arquitectura que debe evolucionar durante años. En este contexto, construir sin diseño previo genera deuda técnica, deuda organizacional y deuda de experiencia que se acumula de forma silenciosa.

El Blueprint existe para obligar al pensamiento antes de la acción. No para ralentizar: para acelerar con dirección. Un equipo que construye sobre un Blueprint aprobado toma decisiones locales coherentes con una estrategia global. Un equipo que construye sin Blueprint toma decisiones locales que luego deben reconciliarse, desecharse o refactorizarse.

## 1.3 Papel dentro del ciclo de vida del software

El Blueprint ocupa el momento entre la idea y la implementación. Su posición es anterior al PRD, anterior al ADR y anterior al código.

En el ciclo de vida del software de Valladolid.mx, el Blueprint cumple las siguientes funciones:

- **Define la intención:** convierte una idea vaga en una propuesta clara y medible.
- **Alinea criterios:** obliga a que negocio, experiencia y arquitectura sean considerados juntos.
- **Expone riesgos:** identifica problemas antes de que sean costosos de resolver.
- **Facilita la revisión:** proporciona una base objetiva para aprobar, rechazar o pedir cambios.
- **Preserva el conocimiento:** registra por qué se eligió una dirección y qué alternativas se evaluaron.
- **Habilita la reutilización:** explícita si la capacidad puede componerse con piezas existentes del sistema.

## 1.4 Diferencia entre Blueprint, PRD y ADR

Los tres documentos son complementarios, pero tienen responsabilidades distintas.

| Documento | Propósito | Momento | Responsabilidad principal |
|-----------|-----------|---------|---------------------------|
| **Blueprint** | Diseñar la iniciativa antes de construir. | Antes del PRD y antes del código. | Responder qué, por qué, para quién, cómo se integra y qué se medirá. |
| **PRD** | Definir requisitos funcionales y criterios de aceptación. | Después del Blueprint aprobado. | Detallar comportamientos, reglas, flujos, pantallas, validaciones y casos de uso. |
| **ADR** | Registrar una decisión arquitectónica específica. | Cuando se toma una decisión técnica estructural. | Documentar contexto, alternativas, consecuencias y compromisos de una decisión técnica. |

El Blueprint puede contener decisiones arquitectónicas preliminares, pero esas decisiones se formalizan en ADRs individuales cuando alcanzan suficiente profundidad. El Blueprint puede contener escenarios de uso, pero los detalles de comportamiento se despliegan en el PRD. El Blueprint no reemplaza al PRD ni al ADR: los precede y los alimenta.

---

# 2. Objetivos

El estándar de Blueprints persigue objetivos permanentes que afectan a la calidad, velocidad y sostenibilidad del proyecto.

## 2.1 Reducir incertidumbre

Un Blueprint obliga a declarar lo que se sabe, lo que se ignora y lo que se asume. Esto reduce la incertidumbre antes de que el desarrollo comience. Cuando una iniciativa se define de forma clara, los equipos pueden estimar con mayor precisión, detectar dependencias temprano y evitar sorpresas durante la construcción.

La incertidumbre no se elimina por completo, pero sí se hace visible. Un riesgo nombrado es administrable. Una suposición oculta es peligrosa.

## 2.2 Diseñar antes de construir

Este estándar institucionaliza el diseño como paso previo obligatorio. Construir sin diseño es una forma de deuda encubierta: parece más rápido al inicio, pero genera retrabajo, fragmentación y dependencia de la memoria individual.

Diseñar antes de construir no significa diseñar todo de una sola vez. Significa que, antes de escribir código, debe existir una propuesta coherente que haya sido revisada y aprobada.

## 2.3 Alinear negocio y arquitectura

Un Blueprint une los objetivos de negocio con las implicaciones arquitectónicas. Obliga a que la misma iniciativa sea evaluada desde la perspectiva del valor comercial y desde la perspectiva técnica. Esto evita que el negocio pida algo imposible de mantener o que la arquitectura construya algo que no genera valor.

## 2.4 Evitar retrabajo

El retrabajo es una de las mayores fuentes de pérdida de velocidad en proyectos de largo plazo. Un Blueprint aprobado reduce el retrabajo al detectar conflictos, duplicaciones, ambigüedades y riesgos antes de que el código exista.

Si dos equipos descubren durante la construcción que están construyendo lo mismo de formas distintas, el costo de reconciliación es alto. Si ese mismo conflicto se detecta en la revisión del Blueprint, el costo es bajo.

## 2.5 Facilitar revisiones

Un Blueprint proporciona una superficie de revisión clara. Los revisores pueden evaluar si la propuesta cumple con el CANON, con los principios arquitectónicos, con la terminología oficial, con la estrategia de producto y con los criterios de calidad.

Sin un Blueprint, la revisión ocurre sobre código ya escrito, lo que genera resistencia, defensiva y costo emocional. Con un Blueprint, la revisión ocurre sobre intenciones, donde cambiar de dirección es más barato.

## 2.6 Mejorar comunicación

Un Blueprint bien escrito se convierte en un punto de referencia para todos los involucrados: Founder, producto, diseño, ingeniería, operaciones, contenido, legal y colaboradores externos. Cuando todos comparten la misma fuente de verdad, las discusiones se vuelven más productivas y menos ambiguas.

## 2.7 Preservar conocimiento

Las decisiones de diseño son conocimiento institucional. Un Blueprint conserva ese conocimiento de forma estructurada, accesible y versionada. Permite que futuros equipos comprendan por qué se construyó algo de una manera determinada, sin depender de quién lo propuso originalmente.

---

# 3. Principios

Todo Blueprint de Valladolid.mx debe estar construido sobre los siguientes principios. No son opcionales: son el filtro por el que se evalúa la calidad de una propuesta.

## 3.1 Behavior First

Antes de describir una funcionalidad, se describe el comportamiento humano que se busca provocar. Un comportamiento es observable: un viajero que descubre algo nuevo, un empresario que reduce el tiempo de respuesta, un concierge que toma una decisión mejor informada.

Las funcionalidades sin comportamiento definido producen software frío y desalineado. Un Blueprint debe responder: ¿qué cambiará en la forma en que las personas actúan, deciden o sienten?

## 3.2 Business First

Una iniciativa debe generar valor comercial, operativo o estratégico para el ecosistema. Ese valor puede ser más ventas, menor costo operativo, mayor fidelidad, mejor experiencia del viajero, más visibilidad para las empresas locales o mejor coordinación institucional.

El Blueprint debe declarar explícitamente el valor de negocio. Si una iniciativa no tiene un valor de negocio claro, no debe construirse.

## 3.3 Experience First

La experiencia del usuario es el criterio central de diseño. La tecnología, la arquitectura y los datos existen para servir a una experiencia humana coherente. Un Blueprint debe describir la experiencia que se busca crear, no solo los sistemas que se necesitan para soportarla.

## 3.4 Architecture First

La experiencia deseada debe traducirse en una arquitectura coherente. Esto incluye entidades, contratos, integraciones, superficies, seguridad, escalabilidad y evolución. Un Blueprint no puede proponer una experiencia sin explicar cómo el sistema la hará posible de forma sostenible.

## 3.5 Evidence First

Las propuestas deben basarse en evidencia. La evidencia puede provenir de datos de uso, entrevistas, investigación de mercado, auditorías, simulaciones, análisis competitivo, comportamiento observado o principios establecidos en la gobernanza.

Un Blueprint que depende únicamente de opinión o intuición debe marcar sus supuestos explícitamente y proponer cómo validarlos.

## 3.6 Composition First

Antes de crear algo nuevo, se busca componer con lo que ya existe. Valladolid.mx está construido sobre motores, bloques, superficies, registries y capas reutilizables. Un Blueprint debe demostrar que se revisó el ecosistema existente antes de proponer una pieza nueva.

## 3.7 Reuse Before Build

Si una capacidad ya existe, se reutiliza. Si existe parcialmente, se extiende. Si no existe, se construye — y se construye como infraestructura reutilizable, no como solución específica de una sola pantalla o módulo.

## 3.8 Long-term Thinking

Un Blueprint debe evaluar su propuesta en horizontes de años, no solo en el próximo sprint. Debe considerar cómo la iniciativa envejecerá, cómo se mantendrá, cómo evolucionará y cómo afectará a capacidades futuras que aún no existen.

## 3.9 AI Ready

Un Blueprint debe estar escrito de forma que pueda ser consumido por sistemas de inteligencia artificial. Esto significa estructura clara, vocabulario oficial, referencias explícitas, contratos precisos y ejemplos concretos. Alux consume este conocimiento. Un Blueprint desordenado produce una IA desordenada.

## 3.10 Evolutionary Design

Los Blueprints proponen soluciones que pueden evolucionar sin romperse. Se prefieren contratos versionados, extensiones declarativas, migraciones progresivas y cambios aditivos. Un Blueprint no debe diseñar para el caso perfecto de hoy: debe diseñar para el crecimiento real de mañana.

---

# 4. Cuándo crear un Blueprint

## 4.1 Cuándo es obligatorio

Un Blueprint es obligatorio antes de iniciar cualquier iniciativa que cumpla con uno o más de los siguientes criterios:

- **Nueva funcionalidad de producto:** cualquier capacidad que no exista actualmente en la plataforma o que modifique significativamente una capacidad existente.
- **Nueva superficie pública:** landing pages, micrositios, listados, flujos de descubrimiento, experiencias de autoridad o cualquier otra superficie visible por viajeros.
- **Nueva superficie autenticada:** workspaces, paneles, portales, herramientas de gestión, flujos de concierge o cualquier otra superficie operativa.
- **Cambio arquitectónico:** nuevo motor, nuevo registry, nuevo modelo de datos, nuevo contrato público, nuevo patrón de integración o refactor de una pieza central.
- **Nueva integración externa:** pagos, mapas, mensajería, inteligencia artificial, distribución turística, calendarios, transporte o cualquier servicio de terceros.
- **Cambio en el modelo de datos:** nuevas tablas, nuevas relaciones, nuevas entidades, migraciones de datos o cambios en contratos de persistencia.
- **Cambio de experiencia significativo:** modificaciones al flujo de viaje, al onboarding, al proceso de reserva, a la interacción con Alux o a la navegación principal.
- **Decisión de seguridad, privacidad o cumplimiento:** cualquier iniciativa que afecte la seguridad de datos, la privacidad de los usuarios, el cumplimiento normativo o las políticas de acceso.
- **Nueva política de gobernanza, contenido o negocio:** cualquier regla que afecte cómo se crea, revisa, aprueba o publica contenido, productos o decisiones.
- **Nueva dependencia entre equipos:** cualquier iniciativa que requiera coordinación entre dos o más áreas del proyecto.

## 4.2 Cuándo no es necesario

Un Blueprint no es necesario para cambios menores, rutinarios o operativos que no alteren arquitectura, experiencia, contratos o modelo de datos. Ejemplos de cambios que no requieren Blueprint:

- Correcciones de bugs que no cambian la arquitectura ni la experiencia.
- Ajustes visuales menores dentro del Design System aprobado.
- Cambios de copy, traducciones o textos de interfaz que no alteren funcionalidad.
- Configuraciones de contenido realizadas a través de CMS o Experience Builder.
- Variaciones de datos dentro de entidades existentes sin cambios estructurales.
- Tareas de mantenimiento, monitoreo, seguridad reactiva o operación continua.
- Experimentos técnicos de bajo alcance que se documentan como spikes y cuyo resultado no se compromete a producción.

Si existe duda sobre si una iniciativa requiere Blueprint, la respuesta por defecto es sí. Es preferible crear un Blueprint breve que omitir uno que luego resulte necesario.

## 4.3 Ejemplos

| Iniciativa | ¿Requiere Blueprint? | Justificación |
|------------|----------------------|---------------|
| Agregar un nuevo bloque al Experience Builder | Sí | Afecta arquitectura de componentes, contratos, reutilización y experiencia. |
| Modificar el color de un botón | No | Cambio visual menor dentro del Design System. |
| Crear un nuevo tipo de página pública | Sí | Afecta superficie, SEO, entidades y modelo de contenido. |
| Actualizar una traducción | No | Cambio de copy sin alterar funcionalidad. |
| Cambiar el modelo de reservas | Sí | Afecta negocio, experiencia, arquitectura y datos. |
| Agregar una nueva integración de pagos | Sí | Afecta arquitectura, seguridad, negocio y experiencia. |
| Refactor interno de un helper sin cambio de contrato | No | No altera superficie, contrato público ni experiencia. |
| Cambiar la navegación principal | Sí | Afecta experiencia, arquitectura de rutas y SEO. |

---

# 5. Ciclo de Vida

Un Blueprint atraviesa un ciclo de vida definido. Cada etapa tiene responsabilidades claras y produce un artefacto que habilita la siguiente.

## 5.1 Idea

Toda iniciativa comienza como una idea. La idea puede provenir del Founder, del equipo de producto, de los usuarios, de las empresas del ecosistema, de análisis de datos, de oportunidades de mercado o de la evolución de la arquitectura.

En esta etapa la idea no tiene forma documental oficial. Puede existir en notas, conversaciones, tickets, propuestas informales o insights de investigación. La idea es valida si responde a una pregunta de valor: ¿qué problema resuelve?, ¿para quién?, ¿por qué importa?

## 5.2 Investigación

Antes de escribir el Blueprint, se recopila contexto. Esto incluye:

- Revisión del CANON, del GLOSSARY y de los principios arquitectónicos.
- Revisión de documentos de gobernanza relacionados.
- Análisis de capacidades existentes que puedan reutilizarse.
- Investigación de usuarios, mercado, competencia o contexto territorial.
- Recopilación de datos, métricas o evidencia que justifiquen la iniciativa.
- Identificación de dependencias, riesgos y restricciones conocidas.

La investigación no necesita ser exhaustiva, pero sí suficiente para que el Blueprint no sea un ejercicio de imaginación aislada.

## 5.3 Blueprint

Una vez recopilado el contexto, se redacta el Blueprint siguiendo la estructura oficial definida en este estándar. El Blueprint es el primer documento formal de la iniciativa. Debe ser completo, coherente, medible y alineado con la gobernanza.

Durante esta etapa se invita a revisión cruzada con personas que aporten perspectivas de negocio, experiencia, arquitectura, contenido, operación y seguridad.

## 5.4 Revisión

El Blueprint se somete a revisión formal. Los revisores evalúan:

- Alineación con el CANON, el GLOSSARY y los principios arquitectónicos.
- Claridad del problema y de los objetivos.
- Coherencia entre experiencia, arquitectura y modelo de datos.
- Reutilización de capacidades existentes.
- Identificación de riesgos y alternativas.
- Calidad de las métricas propuestas.
- Cumplimiento del checklist de este estándar.

La revisión puede generar comentarios, solicitudes de cambio o aprobación. Un Blueprint que no cumple el checklist no puede aprobarse.

## 5.5 Aprobación

Una vez revisado, el Blueprint se aprueba por la autoridad correspondiente según el nivel de decisión. La aprobación significa que el proyecto autoriza la siguiente etapa: la creación del PRD y el diseño detallado.

La aprobación no es irreversible. Si el contexto cambia significativamente, el Blueprint puede revisarse o retirarse siguiendo el proceso de evolución definido en este estándar.

## 5.6 PRD

Con el Blueprint aprobado, se elabora el Product Requirements Document. El PRD traduce el Blueprint en requisitos funcionales, comportamientos específicos, pantallas, flujos, reglas de negocio, validaciones y criterios de aceptación.

El PRD no redefine la dirección del Blueprint: la detalla. Si durante la redacción del PRD se descubre que el Blueprint era incompleto o incorrecto, se regresa a la etapa de revisión del Blueprint.

## 5.7 Implementación

Con el PRD aprobado, comienza la implementación. Los equipos de ingeniería, diseño y contenido construyen siguiendo el Blueprint y el PRD. Durante la implementación pueden surgir decisiones técnicas específicas que se registran en ADRs.

Si una decisión de implementación contradice el Blueprint aprobado, se debe detener y resolver. No se permite construir a contrapelo del diseño aprobado sin una revisión formal.

## 5.8 ADR

Durante la implementación pueden tomarse decisiones arquitectónicas significativas. Cada decisión de este tipo se registra en un ADR independiente. El ADR referencia al Blueprint que la originó y queda archivado en la ruta oficial de ADRs.

Ejemplos de decisiones que requieren ADR: elección de una librería, cambio de contrato, nuevo patrón de seguridad, modificación de un motor central o decisión de integración.

## 5.9 Producción

Una vez implementada, la iniciativa se despliega en producción. El Blueprint aprobado, el PRD y los ADRs asociados quedan como registro histórico de la decisión. El comportamiento real se mide contra las métricas definidas en el Blueprint.

## 5.10 Evolución

Toda iniciativa en producción evoluciona. Los cambios menores se gestionan dentro del PRD y del código. Los cambios significativos requieren una nueva versión del Blueprint o un nuevo Blueprint, según la magnitud del cambio.

## 5.11 Deprecación

Cuando una iniciativa deja de aplicar, se marca como obsoleta. No se borra el Blueprint: se conserva como registro histórico con una nota que indique qué lo reemplaza y por qué. La deprecación es una decisión formal que se documenta.

---

# 6. Estructura Oficial

Todo Blueprint de Valladolid.mx debe contener, como mínimo, las siguientes secciones. La estructura puede ampliarse, pero no omitirse.

## 6.1 Resumen Ejecutivo

Síntesis de una página o menos que permita al lector comprender la propuesta completa sin adentrarse en los detalles. Debe incluir: problema, propuesta, valor esperado y estado de la iniciativa.

## 6.2 Problema

Descripción clara del problema que resuelve la iniciativa. Debe responder: ¿quién lo tiene?, ¿cuándo ocurre?, ¿qué consecuencias genera?, ¿por qué es importante resolverlo ahora?, ¿qué evidencia lo respalda?

## 6.3 Objetivos

Objetivos medibles y alineados con la misión del proyecto. Deben distinguir entre objetivos de negocio, objetivos de experiencia y objetivos técnicos. Todo objetivo debe ser verificable.

## 6.4 Contexto

Contexto necesario para entender la propuesta. Incluye antecedentes, decisiones previas relacionadas, estado actual del sistema, investigaciones relevantes, restricciones y supuestos.

## 6.5 Usuarios

Identificación de los usuarios afectados. Puede incluir viajeros, empresarios, concierges, operadores, administradores, editores, Alux o sistemas externos. Debe describir qué ganan y qué pierden.

## 6.6 Escenarios

Escenarios narrativos que describen situaciones reales en las que la iniciativa aporta valor. Los escenarios conectan la funcionalidad con el comportamiento humano.

## 6.7 Casos de uso

Casos de uso principales y secundarios. Cada caso debe indicar actor, acción, resultado esperado y criterios de éxito. No deben confundirse con historias de usuario: son descripciones de comportamiento del sistema.

## 6.8 Journey

Descripción del recorrido del usuario a través de la iniciativa. Debe mostrar puntos de contacto, decisiones, estados emocionales, posibles fricciones y momentos de valor.

## 6.9 Experiencia

Descripción detallada de la experiencia que se busca provocar. Incluye principios de diseño, interacciones clave, estados de carga, errores, vacíos, éxito y accesibilidad. Debe referenciar al Design System cuando aplique.

## 6.10 Arquitectura

Descripción técnica de alto nivel. Debe incluir:

- Entidades afectadas.
- Capas, módulos, motores o registries involucrados.
- Contratos públicos o internos.
- Integraciones con sistemas existentes.
- Flujos de datos principales.
- Consideraciones de seguridad, privacidad y escalabilidad.

## 6.11 Modelo de datos

Descripción del modelo de datos necesario. Incluye entidades, atributos relevantes, relaciones, reglas de integridad, migraciones requeridas y políticas de acceso cuando aplique.

## 6.12 Impacto

Análisis del impacto esperado en negocio, experiencia, arquitectura, operación, contenido y ecosistema. Debe diferenciar entre impacto inmediato y impacto a largo plazo.

## 6.13 Riesgos

Identificación de riesgos técnicos, de negocio, de experiencia, de operación, de seguridad y de dependencia. Cada riesgo debe incluir probabilidad, impacto, mitigación y plan de contingencia cuando sea posible.

## 6.14 Alternativas

Descripción de las alternativas consideradas y por qué se descartaron o se prefirió la opción principal. Una propuesta sin alternativas evaluadas es una opinión, no un diseño.

## 6.15 Métricas

Definición de métricas de éxito. Deben incluir métricas de resultado, métricas de proceso y métricas de salud. Cada métrica debe tener baseline cuando exista, target, método de medición y frecuencia.

## 6.16 Checklist

Confirmación de que el Blueprint cumple con el checklist oficial de este estándar. Debe ser una sección explícita con casillas de verificación.

## 6.17 Conclusión

Síntesis final que reafirme la propuesta, su alineación con el CANON y su valor esperado. Debe cerrar el documento con una declaración clara de qué se está pidiendo aprobar.

## 6.18 Control de Versiones

Tabla de versiones con número, fecha, autor y descripción de cambios. El Control de Versiones debe seguir el formato utilizado en el CANON y en los demás documentos de gobernanza.

---

# 7. Calidad del Blueprint

Un Blueprint es aceptable cuando cumple con los siguientes criterios de calidad.

## 7.1 Completo

Contiene todas las secciones obligatorias de la estructura oficial. No deja preguntas fundamentales sin respuesta. Si una sección no aplica, se declara explícitamente con una justificación breve.

## 7.2 Coherente

La experiencia descrita es coherente con la arquitectura propuesta. Los objetivos se alinean con el problema. Las métricas se conectan con los objetivos. Las alternativas se evalúan con los mismos criterios.

## 7.3 Medible

Los objetivos y las métricas son cuantificables o al menos verificables. Un Blueprint que promete "mejorar la experiencia" sin definir cómo se medirá es incompleto.

## 7.4 Trazable

Todas las decisiones, supuestos, riesgos y alternativas pueden rastrearse hasta su origen. El Blueprint referencia a otros documentos de gobernanza cuando corresponde.

## 7.5 Reutilizable

Demuestra que se consideró la reutilización de capacidades existentes. Cuando propone algo nuevo, explica cómo otros módulos o superficies podrían beneficiarse.

## 7.6 Escalable

La propuesta soporta crecimiento en usuarios, contenido, destinos, idiomas, canales y capacidades futuras. No diseña para el caso ideal de hoy.

## 7.7 Compatible con CANON

No contradice la misión, visión, principios fundamentales ni reglas inmutables del CANON. Si existe tensión, se hace explícita y se resuelve.

## 7.8 Compatible con GLOSSARY

Usa la terminología oficial del proyecto. No introduce sinónimos informales ni nuevos términos sin definición.

## 7.9 Compatible con Architecture

La arquitectura propuesta respeta los principios arquitectónicos permanentes: Entity First, Experience Before Technology, Composition over Duplication, Reuse Before Build, Single Source of Truth, entre otros.

---

# 8. Checklist

Este checklist es obligatorio antes de aprobar cualquier Blueprint. Todos los ítems deben poder responderse afirmativamente o justificarse explícitamente.

- [ ] El Blueprint tiene un título claro y un código identificador único.
- [ ] El Resumen Ejecutivo permite entender la propuesta en menos de una página.
- [ ] El problema está definido con evidencia y usuarios identificados.
- [ ] Los objetivos son medibles y alineados con la misión del proyecto.
- [ ] El contexto necesario está presente o referenciado.
- [ ] Los usuarios afectados están identificados y caracterizados.
- [ ] Los escenarios y casos de uso describen comportamientos reales.
- [ ] La experiencia deseada está descrita antes de la arquitectura.
- [ ] La arquitectura propuesta respeta los principios arquitectónicos.
- [ ] El modelo de datos está definido o declarado como no aplicable.
- [ ] Se identificaron riesgos con mitigaciones o planes de contingencia.
- [ ] Se evaluaron alternativas y se documentó por qué se eligió la opción principal.
- [ ] Las métricas de éxito están definidas con baseline o target.
- [ ] Se verificó la reutilización de capacidades existentes antes de proponer algo nuevo.
- [ ] El Blueprint no duplica contenido de otros documentos; usa referencias.
- [ ] El lenguaje respeta el GLOSSARY y no introduce términos ambiguos.
- [ ] El Blueprint es coherente con el CANON y los demás documentos de gobernanza.
- [ ] No contiene información sensible, credenciales o datos privados.
- [ ] Está preparado para ser consumido por personas e IA.
- [ ] Incluye Control de Versiones con versión, fecha, autor y cambios.

El checklist no es opcional. Es la última defensa antes de que un Blueprint pase a PRD e implementación.

---

# 9. Errores Frecuentes

Los siguientes errores son comunes en la redacción de Blueprints. Deben evitarse y, si aparecen, corregirse antes de la aprobación.

## 9.1 Empezar por la solución

Describir primero qué se va a construir sin explicar qué problema resuelve. Un Blueprint debe partir del problema, no de la tecnología.

## 9.2 Confun-dir objetivos con funcionalidades

"Crear un botón" no es un objetivo. "Que el viajero pueda guardar una experiencia en menos de dos segundos" sí lo es. Los objetivos describen resultados, no salidas de producto.

## 9.3 Omitir a los usuarios

Un Blueprint que no identifica quién se beneficia es un Blueprint abstracto. Toda iniciativa afecta a alguien: viajero, empresario, operador, sistema o ecosistema.

## 9.4 Describir experiencia sin arquitectura

Una propuesta que solo dice "se verá así" sin explicar cómo el sistema lo hará posible es una maqueta, no un Blueprint.

## 9.5 Describir arquitectura sin experiencia

Un Blueprint que solo describe tablas, APIs y componentes sin explicar qué experiencia humana genera es una especificación técnica, no un diseño de producto.

## 9.6 Ignorar capacidades existentes

Proponer algo nuevo sin revisar si ya existe en el ecosistema viola el principio Reuse Before Build y genera duplicación encubierta.

## 9.7 Métricas vagas

"Mejorar el engagement" o "aumentar la conversión" no son métricas. Las métricas deben ser específicas: "incrementar la tasa de guardado de experiencias del 12% al 18% en los próximos 90 días".

## 9.8 Riesgos genéricos

"Puede haber retrasos" o "podría fallar" no son riesgos útiles. Un buen riesgo identifica la amenaza, su probabilidad, su impacto y su mitigación.

## 9.9 Ausencia de alternativas

Un Blueprint que presenta una única opción como obvia no ha sido diseñado: ha sido asumido. Las alternativas demuestran que se pensó antes de decidir.

## 9.10 Duplicar contenido de otros documentos

Copiar definiciones, principios o contexto de otros documentos genera inconsistencia futura. Se debe referenciar, no reescribir.

## 9.11 Lenguaje informal o ambiguo

Un Blueprint es un documento oficial. Debe usar terminología precisa, evitar modismos, suposiciones implícitas y juicios de valor sin evidencia.

## 9.12 Olvidar la evolución

Un Blueprint que solo funciona para el lanzamiento inicial y no considera mantenimiento, crecimiento ni cambios futuros es una propuesta de corto plazo disfrazada de diseño.

---

# 10. Relación con otros documentos

El Blueprint no existe de forma aislada. Se relaciona con los demás documentos de gobernanza de manera explícita y jerárquica.

## 10.1 CANON

El CANON es la fuente suprema de principios. Todo Blueprint debe ser compatible con la misión, visión, principios fundamentales y reglas inmutables del CANON. Si surge un conflicto, prevalece el CANON y el Blueprint debe ajustarse.

## 10.2 GLOSSARY

El GLOSSARY define el vocabulario oficial. Todo Blueprint debe usar la terminología canónica y evitar sinónimos. Si se introduce un nuevo término, debe proponerse su inclusión en el GLOSSARY.

## 10.3 ARCHITECTURAL PRINCIPLES

Los principios arquitectónicos definen cómo se construye. Todo Blueprint debe respetar estos principios en su sección de arquitectura y modelo de datos.

## 10.4 DOCUMENTATION STANDARD

Este documento define cómo se escribe un Blueprint. La estructura, el lenguaje, el formato y las convenciones de referencia están regidas por el DOCUMENTATION STANDARD.

## 10.5 DECISION MAKING

El proceso de aprobación, revisión y evolución de un Blueprint sigue el marco de toma de decisiones establecido en DECISION MAKING. La aprobación de un Blueprint es una decisión formal.

## 10.6 PRD

El PRD se deriva del Blueprint. El Blueprint define qué y por qué; el PRD define cómo se comporta. El PRD no puede contradecir el Blueprint aprobado.

## 10.7 ADR

Los ADRs registran decisiones arquitectónicas específicas que surgen del Blueprint o durante su implementación. Cada ADR referencia al Blueprint que la originó.

## 10.8 RUNBOOK

Un RUNBOOK documenta cómo operar una capacidad en producción. Si el Blueprint introduce una capacidad operativa relevante, debe indicarse que se requerirá un RUNBOOK.

---

# 11. Evolución

Los Blueprints evolucionan porque el proyecto evoluciona. Esta sección define cómo se gestionan los cambios en un Blueprint ya aprobado.

## 11.1 Qué puede cambiar

Pueden cambiar detalles de implementación, métricas, dependencias, riesgos y cronogramas sin alterar la dirección del Blueprint. Estos cambios se registran como nuevas versiones menores del mismo documento.

## 11.2 Qué no puede cambiar sin un nuevo Blueprint

No puede cambiar la dirección estratégica, el problema fundamental, la arquitectura central, las entidades principales o los objetivos de negocio sin una revisión formal que pueda dar lugar a una nueva versión mayor o a un nuevo Blueprint.

## 11.3 Proceso de cambio

Los cambios en un Blueprint aprobado siguen este proceso:

1. Identificar la necesidad de cambio y su motivación.
2. Evaluar si el cambio es menor o significativo.
3. Para cambios menores: actualizar el Blueprint, incrementar la versión menor y notificar a los interesados.
4. Para cambios significativos: reabrir revisión formal, evaluar impacto, actualizar el PRD y ADRs relacionados, y aprobar nuevamente.
5. Documentar la decisión de cambio y referenciarla en el Control de Versiones.

## 11.4 Deprecación de Blueprints

Cuando un Blueprint deja de aplicar, se marca como obsoleto. No se elimina. Se añade una nota al inicio del documento indicando:

- Fecha de deprecación.
- Razón de la deprecación.
- Documento que lo reemplaza.
- Recomendación para lectores futuros.

La deprecación protege la trazabilidad del proyecto. Borrar un Blueprint borra parte de la memoria institucional.

---

# 12. Control de Versiones

| Versión | Fecha       | Autor    | Descripción                                                              |
|---------|-------------|----------|--------------------------------------------------------------------------|
| v1.0    | 2026-07-18  | Founder  | Emisión inicial del estándar oficial de Blueprints de Valladolid.mx.   |

Este documento se versiona junto al CANON, al GLOSSARY, a ARCHITECTURAL PRINCIPLES, a DOCUMENTATION STANDARD y a DECISION MAKING. Su versión mayor sólo cambia cuando se redefine su alcance o su filosofía; los cambios editoriales incrementan la versión menor.

---

# Conclusión

Este documento establece el estándar oficial para los Blueprints de Valladolid.mx. No es un formalismo: es la garantía de que toda iniciativa importante se piense antes de construirse, se alinee con la identidad del proyecto y se documente para las personas y los sistemas que vendrán después.

Un Blueprint bien escrito reduce incertidumbre, evita retrabajo, facilita revisiones, preserva conocimiento y permite que el proyecto evolucione sin perder coherencia. Es el puente entre la intención estratégica y la construcción concreta.

Toda funcionalidad nueva, arquitectura nueva, integración nueva o decisión estructural de Valladolid.mx debe contar con un Blueprint que cumpla este estándar. Su cumplimiento es condición necesaria para que una iniciativa pase a PRD, implementación y producción.

Ningún desarrollo comienza sin un Blueprint aprobado.
