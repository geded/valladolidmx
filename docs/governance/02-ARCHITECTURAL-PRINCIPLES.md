# 02 · ARCHITECTURAL PRINCIPLES

> Constitución Técnica oficial de Valladolid.mx.
> Traduce la filosofía del CANON y la terminología del GLOSSARY a principios arquitectónicos permanentes.
> Toda decisión de software — presente o futura — debe cumplir estos principios antes de aprobarse.

---

## 1. Propósito

El CANON define **qué somos** y **por qué existimos**.
El GLOSSARY define **cómo nombramos** las cosas.
Este documento define **cómo se construyen**.

`02-ARCHITECTURAL-PRINCIPLES` es la traducción técnica del CANON. Ningún principio aquí escrito depende de una librería, un framework o un proveedor específico. Están redactados para permanecer válidos aunque el stack tecnológico se reemplace por completo en los próximos diez años.

Estos principios son la vara con la que se mide cualquier propuesta arquitectónica, cualquier refactor, cualquier nueva capacidad y cualquier integración externa. No son sugerencias: son la Constitución Técnica del proyecto.

Ámbito de aplicación:

- Toda pieza de software del ecosistema Valladolid.mx (Discovery, Workspace, CMS, Portal, Experience Builder, Alux, integraciones, motores internos, herramientas administrativas, superficies móviles y superficies futuras aún no imaginadas).
- Toda integración con terceros (pagos, mapas, mensajería, IA, analítica, medios, distribución turística).
- Toda evolución del modelo de datos, del modelo de entidades, del modelo de contenido y del modelo de experiencia.

No aplica a:

- Decisiones puramente visuales (gobernadas por el Design System).
- Reglas de negocio específicas (gobernadas por los Blueprints funcionales).
- Tácticas comerciales (gobernadas por la estrategia de producto).

Cuando exista conflicto entre este documento y una implementación en curso, prevalece este documento. La deuda que se genere se documenta y se planifica; no se legitima.

---

## 2. Filosofía Arquitectónica

La arquitectura de Valladolid.mx no imita arquitecturas de software genéricas. Está diseñada específicamente para operar un destino turístico vivo, con múltiples actores, en múltiples idiomas, con múltiples canales, durante todas las fases del viaje. Esta sección desarrolla los diez pilares filosóficos que sostienen el sistema.

### 2.1 Arquitectura centrada en el destino

El destino — no la aplicación, no la empresa, no el usuario individual — es el sujeto principal del sistema. Todas las capacidades técnicas se diseñan para fortalecer el destino como organismo vivo: proteger su identidad, distribuir sus beneficios, amplificar sus voces y sostener su patrimonio.

Consecuencias arquitectónicas:

- El modelo de datos tiene al `Destination` como raíz semántica; las demás entidades se relacionan con él.
- Las superficies públicas se estructuran alrededor del territorio, no de catálogos abstractos.
- Las métricas de éxito se leen en clave de destino (permanencia, distribución, diversidad, salud del ecosistema), no sólo en clave de producto.

### 2.2 Arquitectura centrada en entidades

Las entidades del dominio (Destination, Business, Experience, Traveler, Travel Plan, etc.) gobiernan el sistema. Las pantallas, rutas y componentes son proyecciones de esas entidades, no al revés. Cambiar una pantalla nunca debe implicar cambiar el modelo, y cambiar el modelo debe reflejarse coherentemente en todas las pantallas.

### 2.3 Arquitectura centrada en la experiencia

Antes de definir la tecnología se define la experiencia humana que se busca provocar. La arquitectura debe permitir que la experiencia sea consistente, continua, memorable y coherente entre superficies, dispositivos, idiomas y fases del viaje.

### 2.4 Arquitectura evolutiva

El sistema debe crecer sin romperse. Se prefieren cambios aditivos, contratos versionados y migraciones progresivas. La arquitectura asume que dentro de diez años existirán capacidades hoy inimaginables y debe estar preparada para incorporarlas sin reescrituras masivas.

### 2.5 Arquitectura reusable

Todo componente, servicio, contrato o superficie se diseña como infraestructura reutilizable por múltiples módulos. La reutilización no es una optimización: es un principio de diseño. Construir algo específico para una sola pantalla es una excepción que exige justificación explícita.

### 2.6 Arquitectura desacoplada

El dominio no conoce a la infraestructura. La infraestructura no conoce a la presentación. La presentación no conoce a la persistencia. Cada capa se comunica con las demás a través de contratos explícitos, nunca a través de detalles internos. El desacoplamiento permite reemplazar una capa sin arrastrar a las demás.

### 2.7 Arquitectura componible

Las capacidades se construyen a partir de piezas pequeñas, bien definidas y combinables. Un bloque, una surface, una composición, un servicio: todos deben poder ensamblarse con otros para producir capacidades más ricas sin duplicar código.

### 2.8 Arquitectura extensible

El sistema se extiende sin modificarse. Nuevas capacidades entran como extensiones declarativas (variantes, capabilities, extensions, feature flags), no como bifurcaciones del núcleo. El núcleo permanece estable; la superficie crece.

### 2.9 Arquitectura observable

Todo lo que ocurre en el sistema debe poder observarse: peticiones, decisiones, errores, latencias, uso, salud de dependencias, comportamiento de la IA. Sin observabilidad no hay evolución responsable ni operación confiable.

### 2.10 Arquitectura preparada para IA

La IA es una capacidad transversal del sistema, no un módulo aislado. La arquitectura provee dominio explicable, contratos legibles por máquinas, metadatos semánticos y trazabilidad. Alux consume estos contratos; no los inventa.

---

## 3. Principios Fundamentales

Estos principios son la aplicación directa de la filosofía anterior. Toda decisión técnica debe poder justificarse invocando uno o varios de ellos.

### 3.1 Entity First

Primero se modela la entidad. Después se modela la superficie que la muestra. Nunca al revés. Una entidad mal modelada contamina indefinidamente a todas las pantallas que la consumen.

### 3.2 Experience Before Technology

La experiencia humana define la tecnología, no al revés. Ninguna decisión se toma sólo porque "el framework lo permite" o "la librería lo hace fácil". Se toma porque mejora la experiencia del viajero, del empresario, del concierge o del operador.

### 3.3 Behavior Before Features

Se diseñan comportamientos antes que funcionalidades. Un comportamiento describe cómo se siente algo; una funcionalidad describe qué hace. Las funcionalidades sin comportamiento definido producen software frío y desalineado.

### 3.4 Single Source of Truth

Cada dato, cada regla, cada contrato tiene una y sólo una fuente autorizada. Nunca dos tablas con el mismo significado. Nunca dos servicios que calculen lo mismo. Nunca dos componentes que rendericen lo mismo con reglas distintas.

### 3.5 Composition over Duplication

Ante la necesidad de una capacidad nueva, primero se busca componer con lo existente, después se busca extender, y sólo como último recurso se construye desde cero. Duplicar es una decisión de última instancia que debe justificarse explícitamente.

### 3.6 Reuse Before Build

Antes de construir algo nuevo se audita el ecosistema en busca de piezas existentes. Si existe, se reutiliza. Si existe parcialmente, se extiende. Si no existe, se construye — y se construye como infraestructura reutilizable, no como solución específica.

### 3.7 Progressive Enhancement

El sistema debe funcionar en condiciones básicas y mejorar cuando el entorno lo permita: mejor conectividad, mejor dispositivo, mejor sesión, mejor contexto. Ninguna capacidad esencial debe depender de condiciones ideales.

### 3.8 Offline First cuando aporte valor

Cuando la capacidad ocurre en movimiento — durante el viaje, en zonas rurales, en cenotes, en pueblos — se diseña asumiendo que la conectividad puede desaparecer. El sistema degrada con dignidad y sincroniza cuando recupera red.

### 3.9 API First

Toda capacidad se expone como contrato antes que como pantalla. El contrato es el producto; la UI es un consumidor privilegiado. Esto garantiza que la misma capacidad pueda consumirse desde web, PWA, IA, integraciones y superficies futuras.

### 3.10 Security by Design

La seguridad no se añade al final. Se modela desde el primer diseño: control de acceso, aislamiento por fila, validación de entrada, verificación de firma, auditoría de acciones sensibles, principio de mínimo privilegio.

### 3.11 Privacy by Design

Los datos personales se tratan como responsabilidad, no como activo. Se recogen los mínimos necesarios, se conservan el menor tiempo posible, se explican al viajero y se respetan las jurisdicciones aplicables.

### 3.12 Accessibility by Design

La accesibilidad es una condición de diseño, no una capa posterior. Contraste, navegación por teclado, roles semánticos, tamaños táctiles, foco visible y alternativas textuales son obligatorios desde el primer render.

### 3.13 SEO by Design

Toda superficie pública se modela primero como entidad semántica indexable (metadatos estructurados, canonical, hreflang cuando aplique) y después como página humana. El SEO no se parcha: se diseña.

### 3.14 AI Ready

Toda entidad, toda capacidad y todo contenido se diseña para poder ser consumido por IA: descripciones legibles, relaciones explícitas, contexto suficiente, permisos claros y trazabilidad de decisiones.

### 3.15 Performance by Design

El rendimiento se decide en el diseño, no en la optimización tardía. Bundle mínimo, carga diferida, imágenes derivadas, consultas acotadas, caché consciente y cero renders innecesarios.

### 3.16 Explainability

Toda acción sensible — especialmente las de IA — debe poder explicarse: qué se hizo, por qué, con qué fuentes, con qué efecto y cómo revertirlo. La opacidad no está permitida.

### 3.17 Observability

El sistema se instrumenta desde el inicio: logs estructurados, métricas, trazas, alarmas, health checks. Lo que no se observa no se opera.

### 3.18 Scalability

La arquitectura debe soportar crecimiento sostenido en visitantes, contenido, empresas, superficies e idiomas sin rediseños traumáticos. Se prefieren decisiones que escalen linealmente y se evitan cuellos de botella únicos.

### 3.19 Evolvability

La capacidad de cambiar es un requisito no funcional de primer nivel. Se favorecen contratos versionados, feature flags, migraciones idempotentes y deprecación controlada.

### 3.20 No Vendor Lock-In

Ninguna capacidad esencial del dominio depende de forma irreversible de un proveedor específico. Se aíslan los proveedores tras adaptadores, se mantienen los datos en formatos portables y se documentan las rutas de salida.

### 3.21 Deterministic Behavior

Ante la misma entrada, el sistema produce el mismo resultado. Los efectos no deterministas (aleatoriedad, tiempo, IA) se encapsulan explícitamente y son observables. El determinismo es la base de la confianza operativa.

### 3.22 Backward Compatibility cuando sea posible

Los contratos públicos (URLs indexadas, APIs consumidas, formatos exportados) se rompen sólo como último recurso, con análisis de impacto, plan de migración, redirecciones estables y validación posterior.

---

## 4. Separación de Responsabilidades

La plataforma se organiza en capas claras. Cada capa tiene un mandato único y contratos definidos hacia las demás. La violación de estas fronteras es un antipatrón.

### 4.1 Dominio

Contiene las entidades, las reglas de negocio y las invariantes del destino. No conoce persistencia, no conoce UI, no conoce proveedores. Es el corazón semántico del sistema y la fuente última de verdad conceptual.

### 4.2 Aplicación

Orquesta casos de uso combinando entidades del dominio y servicios de infraestructura. Contiene la lógica de flujo: qué se hace, en qué orden, bajo qué condiciones. No contiene reglas de negocio; las invoca.

### 4.3 Infraestructura

Provee acceso a lo externo: persistencia, mensajería, pagos, mapas, IA, correo, almacenamiento de medios, colas, tareas programadas. Se aísla tras adaptadores y repositorios; ningún detalle de proveedor se filtra al dominio.

### 4.4 Presentación

Renderiza estado y captura interacción. No contiene reglas de negocio, no realiza consultas directas a la persistencia y no toma decisiones sensibles por sí sola. Consume contratos de aplicación y dominio.

### 4.5 CMS

Gobierna la creación, edición, versionado y publicación de contenido editorial. Es la fuente de verdad del contenido humano; no toma decisiones de negocio ni de presentación fuera de su ámbito.

### 4.6 Portal

Superficie autenticada para actores del ecosistema (empresarios, operadores, staff institucional). Consume las mismas entidades del dominio que Discovery, pero con capacidades y permisos distintos.

### 4.7 Workspace

Motor operativo transversal: navegación, contexto, selección, inspector, sheets, comandos, undo, toasts. Es infraestructura compartida por todas las superficies autenticadas; no pertenece a ningún módulo específico.

### 4.8 Experience Builder

Único constructor editorial interno del ecosistema. Ensambla superficies públicas a partir de bloques oficiales, composiciones y plantillas. Todo el contenido público editable pasa por él.

### 4.9 Surface Kit

Colección oficial de superficies reutilizables (listados turísticos, hero, cards, mapas, filtros). Estandariza patrones de interacción y garantiza consistencia entre módulos.

### 4.10 IA

Capa transversal que consume dominio, aplicación e infraestructura para asistir a viajeros, empresarios y operadores. Nunca es fuente de verdad; siempre es intérprete explicable de fuentes existentes.

---

## 5. Modelo de Entidades

La filosofía Entity First implica que el sistema se piense primero como una red de entidades del dominio y sólo después como pantallas. Esta sección describe conceptualmente las entidades raíz.

- **Destination** — Territorio turístico con identidad propia. Raíz semántica del sistema. Contiene regiones, negocios, experiencias y eventos.
- **Region** — Agrupación territorial dentro o alrededor de un destino (por ejemplo, Oriente Maya como región cultural). Permite navegación y distribución territorial.
- **Business** — Actor comercial del ecosistema (hotel, restaurante, tour operador, artesano, guía). Sujeto de portal, ventas, reputación y contenido.
- **Experience** — Vivencia turística ofrecida (recorrido, taller, ceremonia, actividad). Entidad principal del catálogo experiencial.
- **Product** — Unidad vendible y reservable con precio, capacidad y disponibilidad. Se asocia a una Business y puede pertenecer a una Experience.
- **Event** — Manifestación cultural, deportiva, gastronómica o cívica con fecha y lugar. Se ancla a un Destination y opcionalmente a una Business.
- **Traveler** — Persona que planea o vive el viaje. Puede iniciar como Anonymous Traveler y evolucionar a cuenta registrada sin perder continuidad.
- **Travel Plan** — Estructura viva del viaje del Traveler: intención, fechas, integrantes, itinerario, decisiones, recuerdos.
- **Concierge Case** — Interacción operativa entre el ecosistema y un Traveler para resolver, recomendar, coordinar o vender. Trazable y auditable.
- **Media Asset** — Recurso visual o audiovisual con original inmutable y variantes derivadas. Fuente única de imagen para todas las superficies.
- **Collection** — Agrupación curada de entidades (rutas temáticas, listas editoriales, selecciones institucionales). Permite narrativas transversales.
- **Composition** — Estructura editorial que ensambla bloques oficiales para producir una superficie pública concreta.
- **Surface** — Superficie renderizable del sistema, pública o autenticada, con contrato de composición y permisos declarados.
- **Workspace** — Contexto operativo autenticado con navegación, selección, inspector y comandos consistentes.

Las entidades gobiernan el sistema. Las pantallas son proyecciones. Si una pantalla necesita "algo que no encaja con ninguna entidad", primero se cuestiona la pantalla; después, en su caso, se propone evolucionar el modelo.

---

## 6. Componentización

La componentización define cómo se dividen las piezas del software. Cada tipo de pieza tiene un propósito único; mezclarlos es un antipatrón.

### 6.1 Componente

Pieza de UI reutilizable que renderiza estado y emite eventos. No contiene reglas de negocio ni acceso directo a datos. Se compone con otros componentes para formar Surfaces y Blocks.

### 6.2 Surface

Superficie completa con contrato propio (props, permisos, comportamientos). Encapsula un patrón de interacción reutilizable (listado turístico, ficha, mapa, workspace). Vive en el Surface Kit.

### 6.3 Block

Pieza editorial oficial del Experience Builder, con contrato versionado (contenido, presentación, comportamiento) y variantes declarativas. Nunca se duplica; evoluciona.

### 6.4 Composition

Ensamblaje ordenado de bloques que produce una superficie pública concreta. Versionada, auditable y editable desde el Experience Builder.

### 6.5 Provider

Proveedor de contexto o capacidad transversal (tema, sesión, permisos, feature flags, contexto operativo). Se registra una vez y se consume vía contratos declarativos.

### 6.6 Service

Encapsula lógica de aplicación o de dominio orquestando entidades y adaptadores. No renderiza; no accede directamente a UI.

### 6.7 Adapter

Traduce entre el dominio y un proveedor externo (pago, mapa, IA, correo). Aísla al dominio de detalles de terceros y permite sustituirlos sin propagar cambios.

### 6.8 Repository

Provee acceso a la persistencia de una entidad respetando sus invariantes. Es el único que conoce el detalle de almacenamiento; el dominio consume la interfaz.

### 6.9 Hook

Extrae y comparte comportamiento reactivo entre componentes de UI. No contiene reglas de negocio; consume servicios y expone estado consumible.

### 6.10 Store

Estado compartido con contrato explícito. Se usa sólo cuando el estado excede el árbol de un componente y debe compartirse entre superficies. Nunca como cajón desastre.

### 6.11 Cuándo crear cada uno

- **Componente**: cuando una pieza visual se repite o merece nombre propio.
- **Surface**: cuando un patrón de interacción se repite entre módulos.
- **Block**: cuando una capacidad editorial pública debe poder editarse desde el Experience Builder.
- **Composition**: cuando una superficie pública debe ensamblarse a partir de bloques.
- **Provider**: cuando una capacidad transversal debe estar disponible sin pasar props manualmente.
- **Service**: cuando existe un caso de uso con reglas propias que orquesta entidades.
- **Adapter**: cuando entra un proveedor externo al sistema.
- **Repository**: cuando una entidad necesita persistencia.
- **Hook**: cuando un comportamiento reactivo se repite en más de un componente.
- **Store**: cuando el estado debe cruzar fronteras naturales del árbol de UI.

### 6.12 Cuándo NO crearlo

- No crear un componente para envolver un único uso trivial.
- No crear una Surface para una pantalla específica sin patrón reutilizable.
- No crear un Block fuera del Experience Builder.
- No crear un Provider para estado local.
- No crear un Service para operaciones triviales.
- No crear un Adapter cuando el proveedor puede consumirse dentro de infraestructura sin filtrarse al dominio.
- No crear un Repository para consultas ad-hoc de presentación.
- No crear un Hook para lógica de un solo componente.
- No crear un Store para datos que pertenecen a una entidad.

---

## 7. Reutilización

La reutilización es política, no estilo. Estas reglas son permanentes.

- **Nunca duplicar lógica.** Dos lugares con la misma regla eventualmente divergen. La divergencia es siempre un bug futuro.
- **Nunca duplicar componentes.** Si dos componentes hacen "casi lo mismo", se generaliza uno; no se mantienen dos.
- **Nunca duplicar entidades.** Una entidad, una fuente. Si aparece "otra tabla parecida", se cuestiona el modelo antes de crearla.
- **Extender antes de reemplazar.** Se prefieren variantes, capabilities y extensions antes que forks del núcleo.
- **Componer antes de copiar.** Si la capacidad puede lograrse combinando piezas existentes, se compone.
- **Generalizar antes de bifurcar.** Un caso particular se resuelve enriqueciendo el contrato general; no se abre una rama paralela.

La duplicación se paga siempre con intereses. La reutilización es un beneficio compuesto.

---

## 8. Evolución

La plataforma se construye para durar. Su evolución obedece a principios explícitos.

- **Cambios aditivos.** Primero se añade lo nuevo, después se migra lo viejo, finalmente se retira. Nunca se rompe primero.
- **Compatibilidad.** Los contratos públicos mantienen compatibilidad hacia atrás salvo justificación explícita y plan de migración.
- **Migraciones progresivas.** Los cambios estructurales se ejecutan por olas verificables, con rollback claro.
- **Feature Flags.** Las capacidades nuevas se activan gradualmente por audiencia, entorno o segmento. Nada se enciende globalmente sin observación.
- **Versionado.** Los contratos críticos (bloques, APIs, composiciones, entidades públicas) declaran versión semántica. La versión es información operativa, no decorativa.
- **Deprecación controlada.** Lo obsoleto se marca, se comunica, se acompaña con alternativa y se retira sólo después de que su uso caiga a un umbral seguro.
- **Refactorización segura.** Se refactoriza con red: tests, observabilidad, comparativas antes/después, plan de rollback. Sin red, no se refactoriza.

---

## 9. Patrones Permitidos

Estos patrones están aprobados como vocabulario arquitectónico oficial. Usarlos bien es siempre correcto; usarlos mal, siempre incorrecto.

- **Composition** — Construcción por ensamblaje de piezas pequeñas.
- **Provider** — Distribución de contexto y capacidades transversales.
- **Adapter** — Aislamiento de proveedores externos tras contratos internos.
- **Repository** — Acceso a persistencia respetando invariantes de entidad.
- **Service Layer** — Orquestación de casos de uso sobre el dominio.
- **Dependency Injection** — Provisión explícita de dependencias, evitando globales ocultos.
- **Event Driven** — Comunicación desacoplada por eventos cuando aporta desacoplamiento real (no como moda).
- **Domain Services** — Reglas que no pertenecen a una entidad concreta pero sí al dominio.
- **Factories** — Construcción controlada de entidades complejas con invariantes.
- **Feature Flags** — Activación condicional de capacidades.
- **Lazy Loading** — Carga diferida de código, datos y medios para preservar rendimiento.
- **SSR compatible** — Diseño que respeta la ejecución en servidor para SEO y primer render.
- **PWA compatible** — Diseño que respeta ejecución instalable, offline y móvil de primera clase.

---

## 10. Antipatrones Prohibidos

Estas prácticas están explícitamente prohibidas. Detectarlas obliga a rediseñar, no a justificar.

- **Duplicación de lógica.** Misma regla en dos lugares.
- **Duplicación de componentes.** Dos componentes con propósito equivalente.
- **Código específico para una pantalla.** Piezas que sólo sirven a un único caso sin justificación explícita.
- **Acoplamiento fuerte.** Módulos que conocen detalles internos de otros.
- **Dependencias circulares.** Ciclos entre módulos, capas o entidades.
- **Lógica de negocio dentro de UI.** Reglas del dominio incrustadas en componentes.
- **Consultas directas desde componentes.** UI accediendo a persistencia sin pasar por contratos de aplicación.
- **Hardcodeo.** Valores institucionales, territoriales o de configuración escritos a mano en el código.
- **Estados globales innecesarios.** Stores que existen "por si acaso".
- **Magic Numbers.** Números sin nombre ni contexto en el código.
- **Magic Strings.** Cadenas críticas repetidas sin constante ni contrato.
- **Código muerto.** Rutas, componentes o servicios sin consumidores.
- **Side Effects ocultos.** Funciones que aparentan ser puras y mutan estado externo.

---

## 11. Inteligencia Artificial

La IA es una capacidad transversal del sistema. Se integra bajo reglas estrictas.

- **Alux siempre consume dominio.** No inventa entidades ni reglas; interpreta las existentes.
- **La IA nunca reemplaza reglas de negocio.** Puede sugerir, priorizar, explicar y asistir, pero no sustituye la autoridad del dominio.
- **La IA nunca modifica datos sin autorización.** Toda escritura pasa por contratos de aplicación con permisos verificados y trazabilidad.
- **La IA siempre explica.** Cada respuesta relevante declara rationale, fuentes, efecto y reversibilidad.
- **La IA es una capacidad transversal.** No es un módulo aislado; consume dominio, aplicación e infraestructura como cualquier otra capa autorizada, respetando sus contratos.

El uso de IA sin explicabilidad, sin fuentes o sin trazabilidad está prohibido en superficies productivas.

---

## 12. Calidad Arquitectónica

Toda nueva arquitectura, refactor o capacidad debe responder afirmativamente a estas preguntas antes de aprobarse:

1. ¿Es reusable por más de un módulo actual o previsto?
2. ¿Es escalable ante crecimiento de contenido, usuarios y superficies?
3. ¿Es observable en producción (logs, métricas, trazas, alarmas)?
4. ¿Es extensible mediante variantes, capabilities, extensions o feature flags?
5. ¿Reduce complejidad neta del sistema o al menos no la aumenta injustificadamente?
6. ¿Respeta el CANON (misión, principios, reglas inmutables)?
7. ¿Respeta el GLOSSARY (terminología oficial, sin sinónimos casuales)?
8. ¿Respeta Experience First (mejora la experiencia real, no sólo métricas técnicas)?

Una respuesta negativa exige rediseño; no se compensa con documentación adicional.

---

## 13. Checklist Arquitectónico

Este checklist es obligatorio antes de aprobar cualquier nueva funcionalidad, capacidad o superficie:

- [ ] La entidad involucrada existe y está bien modelada; si no, se propuso su evolución antes que la pantalla.
- [ ] La capacidad se apoya en piezas existentes; toda pieza nueva se justificó explícitamente.
- [ ] Los contratos entre capas son explícitos y versionables.
- [ ] No introduce duplicación de lógica, componentes o entidades.
- [ ] Respeta la separación Dominio / Aplicación / Infraestructura / Presentación.
- [ ] Declara permisos, seguridad, privacidad y accesibilidad desde el diseño.
- [ ] Incorpora SEO cuando es superficie pública y AI Ready cuando es entidad indexable por Alux.
- [ ] Incluye observabilidad suficiente (logs, métricas, alarmas relevantes).
- [ ] Es reversible: plan de rollback, feature flag o migración progresiva declarados.
- [ ] Está documentada en Blueprint y referenciada desde el índice de gobernanza.
- [ ] Cumple el CANON y usa el vocabulario del GLOSSARY.
- [ ] No introduce antipatrones listados en la Sección 10.

El checklist no es formalidad: es la última defensa antes de contaminar la arquitectura.

---

## 14. Evolución del Documento

`02-ARCHITECTURAL-PRINCIPLES` evoluciona con el proyecto, pero no con ligereza. Sus modificaciones siguen reglas explícitas:

- Cambios editoriales menores (redacción, ejemplos, aclaraciones) se aplican por revisión ordinaria y quedan registrados en el Control de Versiones.
- Cambios sustantivos (añadir/quitar principios, redefinir capas, cambiar antipatrones) requieren propuesta escrita, revisión cruzada con CANON y GLOSSARY, y aprobación del Founder.
- Ninguna implementación puede modificar de facto estos principios; primero se modifica el documento, después se implementa.

Cuando la realidad técnica del proyecto entre en conflicto con estos principios, prevalecen los principios. La deuda se documenta y se planifica; no se legitima.

---

## 15. Control de Versiones

| Versión | Fecha       | Autor    | Descripción                                                       |
|---------|-------------|----------|-------------------------------------------------------------------|
| v1.0    | 2026-07-18  | Founder  | Emisión inicial de la Constitución Técnica de Valladolid.mx.      |

Este documento se versiona junto al CANON y al GLOSSARY. Su versión mayor sólo cambia cuando se redefine su alcance o su filosofía; los cambios editoriales incrementan la versión menor.

---

# Conclusión

Este documento es la Constitución Técnica del ecosistema Valladolid.mx. Traduce la filosofía del CANON a principios arquitectónicos que gobiernan todo el software del proyecto: presente, en construcción y futuro.

Ninguna decisión técnica está por encima de estos principios. Ninguna urgencia justifica violarlos. Ninguna herramienta, framework o proveedor puede reemplazarlos. Cuando el stack cambie — y cambiará — estos principios seguirán vigentes, porque describen la forma en la que Valladolid.mx construye su Destination Operating System, no la tecnología con la que lo hace hoy.

La arquitectura es una promesa hacia el futuro del destino, de sus empresas y de sus viajeros. Este documento es esa promesa escrita.
