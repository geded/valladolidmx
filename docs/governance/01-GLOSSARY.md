# 01 · GLOSSARY

**Estado:** Approved
**Versión:** 1.0
**Última actualización:** Julio 2026

---

# 1. Propósito

Este documento define el lenguaje oficial de Valladolid.mx.

Su propósito es eliminar ambigüedades, establecer una terminología común y garantizar que todos los documentos, blueprints, PRD, ADR, código, APIs, CMS, paneles, interfaces de inteligencia artificial y contenido editorial utilicen el mismo vocabulario con el mismo significado.

Cualquier término incluido en este glosario debe utilizarse conforme a la definición aquí establecida. Cuando exista un término oficial, no se admiten sinónimos casuales ni adaptaciones locales.

---

# 2. Reglas del Glosario

Las siguientes reglas rigen el uso de la terminología oficial del proyecto:

- Un concepto tiene una sola definición oficial dentro de Valladolid.mx.
- Un término oficial no puede significar dos cosas distintas.
- Cuando exista un término oficial, deben evitarse sinónimos, abreviaturas informales o adaptaciones locales.
- Todo nuevo término debe añadirse a este glosario antes de ser adoptado en documentos, código, interfaces o conversaciones oficiales del proyecto.
- Las definiciones prevalecen sobre el uso coloquial. Si una palabra tiene un significado común diferente, el significado oficial dentro del proyecto es el aquí declarado.
- Los nombres de módulos, productos y paneles tienen un formato oficial que debe respetarse en mayúsculas, espacios y artículos.

---

# 3. Glosario

Los términos se ordenan alfabéticamente en inglés cuando el término oficial está en inglés, o en español cuando el término oficial está en español.

---

### ADR

**Nombre oficial:** ADR (Architecture Decision Record)

**Definición:** Documento breve que registra una decisión arquitectónica significativa, su contexto, las alternativas consideradas y las consecuencias adoptadas.

**Uso correcto:** Se utiliza cuando una decisión técnica estructural afecta al proyecto a mediano o largo plazo. Debe almacenarse en la ruta oficial de ADR y referenciar al CANON cuando corresponda.

**Términos que no deben utilizarse:** "decisión técnica", "nota de arquitectura", "memo de ingeniería".

**Referencias relacionadas:** Jerarquía Documental (CANON §15), Governance.

---

### Alux

**Nombre oficial:** Alux

**Definición:** Compañero inteligente del viajero. Es la presencia inteligente del Oriente Maya que acompaña al visitante durante todo el ciclo del viaje, explica el territorio, ayuda a decidir sin manipular y complementa al concierge humano y al anfitrión local.

**Uso correcto:** Se refiere a Alux como compañero, copiloto o presencia inteligente. Nunca se le reduce a un chatbot, bot o asistente automático.

**Términos que no deben utilizarse:** chatbot, bot, asistente virtual, IA generativa, agente de ventas.

**Referencias relacionadas:** CANON §20, Filosofía de Alux.

---

### Anonymous Traveler

**Nombre oficial:** Viajero Anónimo (Anonymous Traveler)

**Definición:** Visitante que interactúa con la plataforma sin haber creado una cuenta. Puede descubrir, planear, guardar favoritos y construir un borrador de viaje que persiste localmente en su dispositivo.

**Uso correcto:** Se utiliza para describir a un usuario no autenticado que ya recibe valor del sistema. No es un usuario temporal ni descartable.

**Términos que no deben utilizarse:** usuario no registrado, visitante casual, usuario invitado, anónimo.

**Referencias relacionadas:** CANON §18.5, Anonymous Travel Draft, Founder Continuity Principle.

---

### Anonymous Travel Draft

**Nombre oficial:** Borrador de Viaje Anónimo (Anonymous Travel Draft)

**Definición:** Estado local-first que conserva el progreso de un viajero anónimo: favoritos, experiencias guardadas, notas y contexto. Puede migrarse a una cuenta autenticada sin pérdida de información.

**Uso correcto:** Término interno de arquitectura. En superficies visibles al viajero nunca se usa "borrador", "draft" ni "almacenamiento local".

**Términos que no deben utilizarse:** borrador, draft, sesión anónima, almacenamiento local.

**Referencias relacionadas:** ANON_COPY, Founder Continuity Principle.

---

### Blueprint

**Nombre oficial:** Blueprint

**Definición:** Documento técnico o estratégico detallado que describe una épica, iniciativa, arquitectura o decisión de producto. Es la fuente histórica y técnica de las decisiones aprobadas.

**Uso correcto:** Se utiliza para referirse a los documentos ubicados en `docs/blueprint/`. No es un plan operativo ni un manual de usuario.

**Términos que no deben utilizarse:** especificación, plan técnico, documento maestro, guía.

**Referencias relacionadas:** Jerarquía Documental (CANON §15), Governance.

---

### Business

**Nombre oficial:** Empresa (Business)

**Definición:** Toda organización, negocio, cooperativa, anfitrión o prestador de servicios turísticos que ofrece productos, experiencias o servicios dentro del ecosistema del Oriente Maya.

**Uso correcto:** Se utiliza como término genérico para el actor económico del destino. En contextos específicos puede usarse "negocio" o "proveedor" si la interfaz lo amerita, pero el concepto oficial es Empresa.

**Términos que no deben utilizarse:** vendor, seller, merchant, comerciante (cuando se refiere al actor principal del sistema).

**Referencias relacionadas:** Business Portal, Business Landing, EmpresaCard.

---

### Business Landing

**Nombre oficial:** Landing de Empresa (Business Landing)

**Definición:** Superficie pública de autoridad dedicada a una empresa específica. Presenta su historia, identidad, oferta, ubicación, experiencias, productos, datos de contacto y señales de confianza. Se construye y edita desde el Experience Builder.

**Uso correcto:** Se utiliza para referirse a la landing de una empresa con modelo de contenido composition-first. La URL canónica sigue el contrato territorial: `/oriente-maya/:destino/:categoria/:empresa`.

**Términos que no deben utilizarse:** página de negocio, perfil de empresa, ficha comercial, micrositio de empresa.

**Referencias relacionadas:** SEO.A3, Navigation Blueprint, Experience Builder.

---

### Business Portal

**Nombre oficial:** Portal de Empresas (Business Portal)

**Definición:** Superficie autenticada donde las empresas del destino gestionan su presencia, productos, reservas, promociones, reseñas y relación con viajeros y concierge.

**Uso correcto:** Se refiere a la experiencia de back-office para empresas. Forma parte del Workspace autenticado.

**Términos que no deben utilizarse:** dashboard de negocio, panel de administración de empresa, backend de proveedor.

**Referencias relacionadas:** Portal, Workspace, Empresa.

---

### Canonical URL

**Nombre oficial:** URL Canónica (Canonical URL)

**Definición:** Dirección única y definitiva que representa una página, entidad o recurso dentro del dominio oficial de Valladolid.mx. Toda página indexable debe tener una URL canónica estable.

**Uso correcto:** Se utiliza en SEO, redirecciones 301, sitemap, metadatos Open Graph y referencias internas. Nunca debe cambiarse sin plan de migración y redirección.

**Términos que no deben utilizarse:** URL principal, enlace oficial, link canónico.

**Referencias relacionadas:** SEO.A1, Canonical Domain Audit, Navigation Blueprint.

---

### CMS

**Nombre oficial:** CMS (Content Management System)

**Definición:** Sistema de gestión de contenido que alimenta al Experience Builder y a las superficies operativas. Permite administrar entidades, composiciones, medios, datos de negocios, configuraciones y contenido editorial.

**Uso correcto:** Se refiere a la capa administrativa de contenido. No es un editor visual independiente del Experience Builder.

**Términos que no deben utilizarse:** admin, backoffice, panel de contenido, gestor.

**Referencias relacionadas:** Experience Builder, Page Composition.

---

### Collection

**Nombre oficial:** Colección (Collection)

**Definición:** Agrupación lógica de experiencias, productos, empresas, destinos o contenidos editorialmente curados. Puede ser manual, algorítmica o territorial.

**Uso correcto:** Se utiliza para listados temáticos, selecciones de temporada, rutas o recomendaciones. No es una categoría ni un simple filtro.

**Términos que no deben utilizarse:** grupo, set, lista, compilado.

**Referencias relacionadas:** Content Block, Experience Builder.

---

### Composition

**Nombre oficial:** Composición (Composition)

**Definición:** Estructura declarativa de bloques de contenido que define una página, landing, micrositio o superficie. Se almacena como JSON y se renderiza mediante el Surface Kit.

**Uso correcto:** Término técnico y de producto. Se usa para describir la configuración de una página editable desde el Experience Builder.

**Términos que no deben utilizarse:** plantilla, layout, configuración de página, estructura.

**Referencias relacionadas:** Page Composition, Content Block, Surface Kit.

---

### Concierge

**Nombre oficial:** Concierge

**Definición:** Servicio humano o asistido que acompaña al viajero en momentos de decisión, reserva, logística o atención personalizada. Es complementario a Alux y no lo reemplaza.

**Uso correcto:** Se refiere al servicio de acompañamiento humano o híbrido. Puede ser operado por empresas, anfitriones o el equipo del destino.

**Términos que no deben utilizarse:** soporte, atención al cliente, asesor, agente de viajes.

**Referencias relacionadas:** Alux, Travel Plan, Sales Journey.

---

### Content Block

**Nombre oficial:** Bloque de Contenido (Content Block)

**Definición:** Unidad atómica de contenido reutilizable dentro del Experience Builder. Tiene un contrato Zod versionado, una capa de presentación, una capa de contenido y una capa de comportamiento.

**Uso correcto:** Se utiliza para referirse a cualquier bloque oficial de la Biblioteca del Experience Builder. Cada bloque tiene un `blockType` y un `contractVersion`.

**Términos que no deben utilizarse:** componente, widget, módulo de contenido, sección.

**Referencias relacionadas:** H-03 Block Design Rules, Surface Kit, Composition.

---

### Content Composition

**Nombre oficial:** Composición de Contenido (Content Composition)

**Definición:** Sinónimo formal de Composition. Estructura editorial que organiza Content Blocks para formar una superficie pública o administrativa.

**Uso correcto:** Se prefiere Composition en contextos técnicos. Content Composition se usa cuando se quiere enfatizar el origen editorial del contenido.

**Términos que no deben utilizarse:** página, artículo, entrada, contenido.

**Referencias relacionadas:** Composition, Page Composition.

---

### Context Engine

**Nombre oficial:** Motor de Contexto (Context Engine)

**Definición:** Capacidad del sistema que reúne señales operativas del destino en tiempo real: clima, horarios, tráfico, eventos, disponibilidad, ubicación del viajero e incidencias.

**Uso correcto:** Se refiere al sistema reutilizable que alimenta a Alux Espacial, Live Destination Companion y recomendaciones contextuales. No es un módulo aislado.

**Términos que no deben utilizarse:** contexto del destino, datos en tiempo real, motor de señales.

**Referencias relacionadas:** Founder Destination Awareness Principle, CV6.

---

### Destination

**Nombre oficial:** Destino (Destination)

**Definición:** Localidad o territorio turístico dentro del Oriente Maya de Yucatán que tiene presencia propia en la plataforma. Ejemplos: Valladolid, Izamal, Espita, Tizimín, Ek Balam, Río Lagartos.

**Uso correcto:** Se refiere a un actor territorial de primera clase dentro del DOS. No es sinónimo de ciudad genérica ni de punto de interés.

**Términos que no deben utilizarse:** ciudad, lugar, localidad (cuando se refiere al actor territorial operativo del sistema).

**Referencias relacionadas:** Region, Navigation Blueprint, Destination Operating System.

---

### Destination Operating System

**Nombre oficial:** Destination Operating System (DOS)

**Definición:** Infraestructura digital viva de un destino turístico. Coordina descubrimiento, planeación, reserva, operación en sitio, inteligencia turística y relación post-viaje bajo una misma capa coherente.

**Uso correcto:** Es la categoría estratégica de Valladolid.mx. Se usa para explicar qué es y qué no es la plataforma: no es un portal, ni un marketplace, ni una OTA, ni un DMS tradicional.

**Términos que no deben utilizarse:** plataforma turística, portal, ecosistema digital (como sustituto), sistema de gestión de destino.

**Referencias relacionadas:** CANON §16, Valladolid.mx.

---

### Discovery

**Nombre oficial:** Descubrimiento (Discovery)

**Definición:** Capa pública de la plataforma dedicada a la inspiración, exploración y búsqueda de experiencias, empresas, destinos y contenido editorial. Optimizada para SEO, conversión y primeros segundos de valor.

**Uso correcto:** Se refiere a la experiencia de exploración pública antes de cualquier cuenta o viaje guardado. Es la puerta de entrada al DOS.

**Términos que no deben utilizarse:** catálogo, listado, búsqueda, homepage.

**Referencias relacionadas:** Discovery Layer, Tourism Listing Surface, SEO.A2.

---

### Discovery Layer

**Nombre oficial:** Capa de Descubrimiento (Discovery Layer)

**Definición:** Conjunto de superficies, componentes, reglas de navegación y contratos SEO que conforman la experiencia pública de descubrimiento del DOS.

**Uso correcto:** Término arquitectónico. Se usa para distinguir la capa pública de la capa autenticada (Workspace).

**Términos que no deben utilizarse:** sitio público, frontend público, capa de visitantes.

**Referencias relacionadas:** 15.10.5d Discovery Layer Blueprint, Discovery.

---

### Entity

**Nombre oficial:** Entidad (Entity)

**Definición:** Objeto de dominio con identidad propia, relaciones semánticas y representación pública en la plataforma. Puede ser un destino, empresa, experiencia, producto, evento, colección o contenido editorial.

**Uso correcto:** Se utiliza en modelado de datos, SEO, JSON-LD y diseño de superficies. Toda entidad tiene un tipo, un slug y metadatos canónicos.

**Términos que no deben utilizarse:** objeto, registro, fila, item.

**Referencias relacionadas:** SEO Entity, Entity First SEO, Navigation Blueprint.

---

### Event

**Nombre oficial:** Evento (Event)

**Definición:** Acontecimiento programado con fecha, lugar y experiencia asociada. Puede ser cultural, deportivo, gastronómico, religioso, artesanal o comunitario.

**Uso correcto:** Se refiere a una entidad con calendario, ubicación y posibilidad de conversión. No es sinónimo de actividad recurrente.

**Términos que no deben utilizarse:** actividad, ocurrencia, suceso, fecha.

**Referencias relacionadas:** Entity, Experience.

---

### Experience

**Nombre oficial:** Experiencia (Experience)

**Definición:** Oferta turística que un viajero puede vivir en el destino: tour, actividad, visita guiada, taller, degustación, ruta, ceremonia o encuentro cultural.

**Uso correcto:** Se refiere al producto vivo que se consume en el territorio. Puede estar a cargo de una empresa o de un anfitrión. Es distinta de Producto cuando Producto se refiere a un bien transaccional directo.

**Términos que no deben utilizarse:** servicio, actividad, tour (como categoría superior), actividad turística.

**Referencias relacionadas:** Producto, Business Landing, Tourism Listing Surface.

---

### Experience Builder

**Nombre oficial:** Experience Builder (EB)

**Definición:** Constructor editorial único y oficial de Valladolid.mx. Permite crear, editar, previsualizar, versionar y publicar todas las superficies públicas del DOS mediante composiciones de bloques.

**Uso correcto:** Se refiere al producto interno de edición de páginas. Es el único Studio permitido para superficies públicas.

**Términos que no deben utilizarse:** CMS visual, editor de páginas, constructor, page builder genérico, Studio.

**Referencias relacionadas:** Single Studio Principle, Page Composition, Content Block.

---

### Experience Page

**Nombre oficial:** Página de Experiencia (Experience Page)

**Definición:** Superficie pública que presenta una experiencia específica con su descripción, galería, disponibilidad, ubicación, reseñas, CTA y relaciones con destino, empresa y productos.

**Uso correcto:** Se refiere a la ficha pública de una experiencia. La URL canónica sigue el contrato territorial completo: `/oriente-maya/:destino/:categoria/:empresa/:producto`.

**Términos que no deben utilizarse:** ficha de actividad, detalle de tour, página de servicio.

**Referencias relacionadas:** Navigation Blueprint, Experience, Producto.

---

### Founder

**Nombre oficial:** Founder

**Definición:** Persona con autoridad máxima sobre el proyecto. Es la fuente final de aprobación para principios, conflictos, excepciones a políticas y decisiones estratégicas.

**Uso correcto:** Se refiere a la figura de gobierno del proyecto. No implica un rol técnico ni operativo específico, sino la autoridad de dirección.

**Términos que no deben utilizarse:** dueño, cliente, sponsor, CEO, product owner.

**Referencias relacionadas:** CANON §18, Governance, Project Constitution.

---

### Governance

**Nombre oficial:** Gobernanza (Governance)

**Definición:** Conjunto de reglas, políticas, jerarquías documentales y procesos de decisión que rigen la construcción y evolución de Valladolid.mx.

**Uso correcto:** Se refiere al sistema de gobierno del proyecto, no a la administración operativa ni a la gestión de recursos.

**Términos que no deben utilizarse:** gestión, administración, control, dirección.

**Referencias relacionadas:** docs/governance/, CANON, Project Constitution.

---

### Institutional Badge

**Nombre oficial:** Distintivo Institucional (Institutional Badge)

**Definición:** Indicador visual oficial que reconoce una categoría, certificación o pertenencia institucional: Pueblo Mágico, Despierta en Valladolid, Oriente Maya, Patrimonio, Empresa Verificada, Recomendado por Alux, entre otros.

**Uso correcto:** Se renderiza mediante el bloque oficial `vmx.experience.institutional-badges`. Nunca se hardcodea en una plantilla.

**Términos que no deben utilizarse:** badge, etiqueta, sello, medalla, insignia.

**Referencias relacionadas:** H-03 Institutional Badge Specification, CANON Core.

---

### Journey Stage

**Nombre oficial:** Etapa del Journey (Journey Stage)

**Definición:** Estado derivado del recorrido de un visitante dentro del ciclo del viaje: inspiración, exploración, planeación, reserva, preparación, estancia, regreso o memoria. Se proyecta a partir del historial append-only de eventos.

**Uso correcto:** Término de analítica y producto. Se usa para describir dónde se encuentra un viajero en relación con el destino.

**Términos que no deben utilizarse:** fase, paso, estado del usuario, funnel.

**Referencias relacionadas:** Founder Journey State Principle, Visitor Intelligence.

---

### Landing

**Nombre oficial:** Landing

**Definición:** Superficie pública de alta intención diseñada para captar una consulta, un interés o una necesidad específica del viajero. Puede ser territorial, de empresa, de experiencia o de campaña.

**Uso correcto:** Se refiere a una página de entrada estratégica con propósito de conversión, SEO o descubrimiento. No es sinónimo de página genérica.

**Términos que no deben utilizarse:** página de aterrizaje, micrositio, entrada, página.

**Referencias relacionadas:** Territorial Landing, Business Landing, SEO.A2.

---

### Marketplace

**Nombre oficial:** Marketplace

**Definición:** Funcionalidad transaccional que permite la reserva de experiencias y productos directamente con empresas locales. Es una consecuencia del acompañamiento, no el propósito principal del DOS.

**Uso correcto:** Se usa con cautela en contextos internos. En superficies públicas se privilegia el lenguaje de descubrimiento, experiencia y reserva directa.

**Términos que no deben utilizarse:** tienda, ecommerce, catálogo de compras, plataforma de ventas.

**Referencias relacionadas:** Sales Journey, CV4, Concierge.

---

### Microsite

**Nombre oficial:** Micrositio (Microsite)

**Definición:** Superficie pública con identidad propia, construida para un propósito editorial, promocional o institucional específico. Tiene una URL propia y una composición independiente dentro del Experience Builder.

**Uso correcto:** Se refiere a una experiencia de página completa con narrativa propia. No es una simple sección dentro de una página más grande.

**Términos que no deben utilizarse:** mini sitio, página promocional, landing extendida, sitio satélite.

**Referencias relacionadas:** Experience Builder, Page Composition.

---

### North Star

**Nombre oficial:** North Star

**Definición:** Indicador estratégico permanente que guía las decisiones del proyecto. No depende de un sprint ni de una temporada, y se mantiene aunque cambien equipos, objetivos comerciales o contexto competitivo.

**Uso correcto:** Se refiere a cualquiera de los indicadores declarados en CANON §19. Toda funcionalidad debe declarar a qué North Star contribuye.

**Términos que no deben utilizarse:** objetivo, meta, KPI, north star metric.

**Referencias relacionadas:** CANON §19, North Star del Proyecto.

---

### Oriente Maya de Yucatán

**Nombre oficial:** Oriente Maya de Yucatán

**Definición:** Región turística del estado de Yucatán, México, que agrupa pueblos, cenotes, haciendas, selva, mar cercano, arquitectura colonial y cultura maya viva. Es el territorio sobre el cual opera Valladolid.mx.

**Uso correcto:** Se utiliza como nombre completo y oficial de la región. No se abrevia ni se modifica sin justificación editorial.

**Términos que no deben utilizarse:** oriente, la región, zona maya, península, sureste mexicano (como sustituto).

**Referencias relacionadas:** CANON §17, Destination, Region.

---

### Page Composition

**Nombre oficial:** Composición de Página (Page Composition)

**Definición:** Instancia de Composition que representa una página publicable en el DOS. Incluye metadatos, bloques, configuración SEO, versión, estado de publicación y relaciones con entidades.

**Uso correcto:** Término técnico de la base de datos y del Experience Builder. La tabla canónica es `page_compositions`.

**Términos que no deben utilizarse:** página, plantilla, contenido, layout.

**Referencias relacionadas:** Experience Builder, Single Source of Truth Policy, Composition.

---

### Portal

**Nombre oficial:** Portal

**Definición:** Superficie autenticada de acceso a herramientas operativas para un actor específico del ecosistema. Puede ser Business Portal, Concierge Portal, Founder Portal o Provider Portal.

**Uso correcto:** Se refiere a una experiencia de trabajo autenticada dentro del Workspace. No es una página pública ni un simple dashboard.

**Términos que no deben utilizarse:** dashboard, panel, backoffice, área privada.

**Referencias relacionadas:** Business Portal, Workspace, Portal de Ventas en Línea.

---

### PRD

**Nombre oficial:** PRD (Product Requirement Document)

**Definición:** Documento que describe una funcionalidad, producto o mejora desde la perspectiva de requisitos, usuarios, criterios de aceptación, valor de negocio y dependencias.

**Uso correcto:** Se utiliza para iniciativas de producto que requieren definición previa a la implementación. Debe alinearse al CANON y al Roadmap.

**Términos que no deben utilizarse:** requerimiento, especificación funcional, brief, ticket.

**Referencias relacionadas:** Jerarquía Documental (CANON §15), Product Construction Rules.

---

### Producto

**Nombre oficial:** Producto (Producto)

**Definición:** Bien, servicio o experiencia transaccional ofrecido por una empresa dentro del DOS. Puede ser tangible, digital, una experiencia, un voucher o una reserva.

**Uso correcto:** Se usa como concepto de comercio y catálogo. En contextos turísticos, una Experiencia puede ser un tipo de Producto.

**Términos que no deben utilizarse:** artículo, ítem, SKU, servicio (como categoría superior).

**Referencias relacionadas:** Experience, Marketplace, Commerce.

---

### PWA

**Nombre oficial:** PWA (Progressive Web App)

**Definición:** Aplicación web progresiva que permite experiencias offline, instalación en dispositivos, notificaciones push y sincronización en segundo plano.

**Uso correcto:** Se refiere a la capacidad técnica de la plataforma para comportarse como app nativa sin requerir tiendas de aplicaciones.

**Términos que no deben utilizarse:** app, aplicación móvil, app nativa.

**Referencias relacionadas:** 15.10.6 PWA Offline, Service Worker.

---

### Region

**Nombre oficial:** Región (Region)

**Definición:** Área geográfica que agrupa múltiples destinos. El Oriente Maya de Yucatán es la región principal del DOS, pero la arquitectura está preparada para futuras regiones.

**Uso correcto:** Se refiere a la unidad territorial superior al destino. Se usa en navegación, SEO territorial y contexto regional.

**Términos que no deben utilizarse:** área, zona, territorio (como categoría superior del sistema).

**Referencias relacionadas:** Destination, Oriente Maya de Yucatán, Navigation Blueprint.

---

### SEO Entity

**Nombre oficial:** Entidad SEO (SEO Entity)

**Definición:** Representación semántica de una entidad del DOS para motores de búsqueda y asistentes de IA. Incluye JSON-LD, BreadcrumbList, metadatos canónicos, relaciones y Open Graph.

**Uso correcto:** Se refiere al modelado semántico de una página o entidad para descubrimiento orgánico. Toda superficie pública se modela primero como SEO Entity.

**Términos que no deben utilizarse:** SEO técnico, optimización, metadata, schema.

**Referencias relacionadas:** Founder Entity First SEO, SEO.A1, Entity.

---

### Signal

**Nombre oficial:** Señal (Signal)

**Definición:** Dato observable del comportamiento del viajero o del estado del destino que alimenta decisiones de Alux, Visitor Intelligence o el Context Engine.

**Uso correcto:** Se utiliza en arquitectura de eventos y analítica. Una señal puede ser conductual (clic, favorito) o operativa (clima, tráfico).

**Términos que no deben utilizarse:** evento, métrica, dato, indicador.

**Referencias relacionadas:** Context Engine, Visitor Intelligence, Founder Signal Quality.

---

### Single Studio Principle

**Nombre oficial:** Single Studio Principle

**Definición:** Política que establece que existe un único Experience Builder para crear y editar todas las superficies públicas del DOS. No se permiten editores paralelos.

**Uso correcto:** Se usa para justificar decisiones de consolidación de herramientas editoriales. Toda superficie pública futura se evalúa contra este principio.

**Términos que no deben utilizarse:** un solo editor, editor único, centralización de editores.

**Referencias relacionadas:** 15.10.4d Single Studio Principle, Experience Builder.

---

### Slug

**Nombre oficial:** Slug

**Definición:** Identificador textual legible y único de una entidad o página, utilizado en URLs. Es estable, sin espacios ni caracteres especiales, y forma parte del contrato de Canonical URL.

**Uso correcto:** Se refiere al fragmento semántico de una URL que identifica a una entidad. Ejemplo: `zazil-tunich` en `/oriente-maya/valladolid/hoteles/zazil-tunich`.

**Términos que no deben utilizarse:** identificador de URL, alias, clave, ID de texto.

**Referencias relacionadas:** Canonical URL, Navigation Blueprint, Entity.

---

### Surface

**Nombre oficial:** Superficie (Surface)

**Definición:** Componente de interfaz reutilizable que renderiza una experiencia de usuario completa en un contexto determinado. Puede ser pública, autenticada o de administración.

**Uso correcto:** Término de arquitectura de frontend. Se usa para referirse a un componente de alto nivel con responsabilidad de presentación, contenido y comportamiento.

**Términos que no deben utilizarse:** pantalla, vista, página, componente.

**Referencias relacionadas:** Surface Kit, Tourism Listing Surface, Discovery Layer.

---

### Surface Kit

**Nombre oficial:** Surface Kit

**Definición:** Biblioteca oficial de Superficies reutilizables que implementan los contratos del Experience Builder. Incluye componentes turísticos, layouts, bloques y adaptadores oficiales.

**Uso correcto:** Se refiere a la familia de Superficies del proyecto. Es infraestructura de frontend compartida entre Discovery y Workspace.

**Términos que no deben utilizarse:** librería de componentes, UI kit, design system, component library.

**Referencias relacionadas:** Surface, H-03 Block Design Rules, Tourism Listing Surface.

---

### Territorial Landing

**Nombre oficial:** Landing Territorial (Territorial Landing)

**Definición:** Superficie pública de autoridad dedicada a un destino o región. Presenta la identidad, oferta, empresas, experiencias, eventos y contexto territorial del lugar.

**Uso correcto:** Se refiere a la landing de un destino construida con modelo composition-first. La URL canónica sigue `/oriente-maya/:destino`.

**Términos que no deben utilizarse:** página de destino, ficha de lugar, portal territorial.

**Referencias relacionadas:** SEO.A2.M1, Destination, Navigation Blueprint.

---

### Tourism Card

**Nombre oficial:** Tarjeta Turística (Tourism Card)

**Definición:** Componente visual oficial que representa una experiencia, empresa o producto turístico en un listado. Es la única familia de cards permitida para listados turísticos.

**Uso correcto:** Se usa en Tourism Listing Surface y cualquier listado turístico. Respeta el Founder Discovery Standard.

**Términos que no deben utilizarse:** card, tarjeta de producto, item card, resultado.

**Referencias relacionadas:** Founder Discovery Standard, Tourism Listing Surface.

---

### Tourism Listing Surface

**Nombre oficial:** Superficie de Listado Turístico (Tourism Listing Surface)

**Definición:** Superficie oficial para presentar listados turísticos de cualquier categoría: hoteles, restaurantes, museos, tours, spas, naturaleza, compras y futuras categorías.

**Uso correcto:** Es el patrón único de listado turístico. Toda nueva categoría lo reutiliza por configuración, no por diseño propio.

**Términos que no deben utilizarse:** listado de hoteles, grid de restaurantes, catálogo de tours, results page.

**Referencias relacionadas:** Founder Discovery Standard, Surface Kit, Tourism Card.

---

### Traveler

**Nombre oficial:** Viajero (Traveler)

**Definición:** Persona que descubre, planea, reserva, vive o recuerda un viaje al Oriente Maya de Yucatán. Puede ser anónima o autenticada.

**Uso correcto:** Es el actor principal del sistema. Se usa en producto, diseño, analítica y contenido. No implica un tipo de cuenta específico.

**Términos que no deben utilizarse:** usuario, cliente, turista, visitante (cuando se refiere al actor funcional principal).

**Referencias relacionadas:** Anonymous Traveler, Travel Plan, Travel Memory.

---

### Travel Memory

**Nombre oficial:** Memoria del Viaje (Travel Memory)

**Definición:** Capacidad del sistema para conservar el recuerdo de un viaje vivido: experiencias, reseñas, fotos, itinerario, personas y momentos. Permite que el viajero regrese y que el destino aprenda.

**Uso correcto:** Se refiere a la relación post-viaje y al valor emocional de la experiencia vivida. No es solo un historial de compras.

**Términos que no deben utilizarse:** historial, registro de viaje, bitácora, log.

**Referencias relacionadas:** CANON §18.8, Travel Plan, Traveler.

---

### Travel Plan

**Nombre oficial:** Plan de Viaje (Travel Plan)

**Definición:** Conjunto de experiencias, productos, empresas, notas y decisiones que un viajero organiza para un viaje específico. Puede existir en modo anónimo o autenticado.

**Uso correcto:** Se refiere al objeto funcional que el viajero construye y consulta. En la interfaz puede llamarse "Mi viaje" cuando se refiere a la vista personal.

**Términos que no deben utilizarse:** itinerario, agenda, wishlist, carrito de viaje.

**Referencias relacionadas:** Travel Workspace, Anonymous Travel Draft, Traveler.

---

### Travel Workspace

**Nombre oficial:** Workspace de Viaje (Travel Workspace)

**Definición:** Espacio autenticado donde el viajero gestiona su Travel Plan, favoritos, reservas, vouchers, conversaciones con Alux, recordatorios y memoria del viaje.

**Uso correcto:** Se refiere a la experiencia de trabajo personal del viajero. Es una superficie de Workspace, no una simple página de cuenta.

**Términos que no deben utilizarse:** área de usuario, panel de cliente, cuenta de viajero, dashboard personal.

**Referencias relacionadas:** Travel Plan, Workspace, CANON §7.

---

### Visitor Intelligence

**Nombre oficial:** Inteligencia de Visitantes (Visitor Intelligence)

**Definición:** Capacidad del sistema para analizar señales agregadas del comportamiento de los visitantes y detectar oportunidades, fricciones, segmentos y tendencias útiles para el destino.

**Uso correcto:** Se refiere a la capa analítica y prescriptiva del DOS. No es un perfilamiento individual ni una herramienta de marketing invasivo.

**Términos que no deben utilizarse:** analítica, BI, segmentación, tracking, perfilamiento.

**Referencias relacionadas:** CV8, Founder Opportunity Intelligence, Founder Ethical Segmentation.

---

### Workspace

**Nombre oficial:** Workspace

**Definición:** Espacio de trabajo autenticado de la plataforma. Puede ser del viajero, de una empresa, del concierge, del founder o de un proveedor. Comparte el mismo Workspace Engine y reglas de navegación.

**Uso correcto:** Término de producto y arquitectura. Se refiere a una superficie autenticada operativa, no a un panel genérico.

**Términos que no deben utilizarse:** dashboard, panel, backoffice, área de administración.

**Referencias relacionadas:** Workspace Engine, Travel Workspace, Business Portal, Portal.

---

### Workspace Engine

**Nombre oficial:** Workspace Engine

**Definición:** Infraestructura de layouts, navegación, sidebars, inspectors, command palettes, drawers, bottom sheets, gestos, toasts y estado de Workspace compartida por todas las superficies autenticadas.

**Uso correcto:** Término arquitectónico. Ningún módulo nuevo implementa estos elementos por su cuenta; deben reutilizar el Workspace Engine.

**Términos que no deben utilizarse:** motor de dashboard, sistema de paneles, layout engine.

**Referencias relacionadas:** 15.10.5a Workspace Foundations, Workspace First Policy.

---

---

# 4. Convenciones

## 4.1 Uso del idioma

- El idioma principal del proyecto es el español.
- Los nombres propios de productos, módulos y paneles se mantienen en inglés cuando así han sido aprobados: Workspace, Experience Builder, Travel Workspace, Business Portal, Surface, Surface Kit, Alux.
- Los términos de dominio turístico se utilizan en español: Destino, Región, Experiencia, Empresa, Viajero, Viaje, Composición, Bloque de Contenido.
- Los acrónimos técnicos y de documentación se mantienen en inglés: PRD, ADR, CMS, SEO, PWA, DOS, JSON-LD, OG.
- En interfaces visibles al viajero, el idioma se adapta al selector de idioma seleccionado, pero los nombres de marca y producto permanecen inmutables.

## 4.2 Nombres oficiales de módulos

- **Workspace Engine**: infraestructura de superficies autenticadas.
- **Discovery Layer**: capa pública de descubrimiento.
- **Context Engine**: motor de señales contextuales del destino.
- **Surface Kit**: biblioteca de Superficies oficiales.
- **Experience Builder**: constructor editorial único de superficies públicas.
- **Anonymous Travel Draft**: infraestructura local-first de viajeros anónimos.
- **Visitor Intelligence Center**: panel de inteligencia de visitantes.

## 4.3 Nombres oficiales de productos

- **Valladolid.mx**: plataforma principal. Destination Operating System del Oriente Maya de Yucatán.
- **Alux**: compañero inteligente del viajero.
- **Arma tu Viaje**: capacidad de construcción de Travel Plan.
- **Live Destination Companion**: compañero en destino con contexto operativo.
- **Travel Passport**: pasaporte digital de viaje.
- **Business Portal**: portal de empresas.
- **Concierge Portal**: portal de concierge.
- **Portal de Ventas en Línea**: portal de proveedores para ventas directas.

## 4.4 Nombres oficiales de paneles

- **CMS**: gestión de contenido.
- **Experience Builder**: editor de composiciones.
- **Visitor Intelligence Center**: inteligencia de visitantes.
- **Admin Hub**: panel administrativo central.
- **Travel Plans Admin**: administración de planes de viaje.
- **Media Intelligence Pipeline**: pipeline de gestión de assets multimedia.

---

# 5. Evolución del Glosario

Este Glosario es un documento vivo que evolucionará conforme crezca la plataforma.

Todo nuevo término debe seguir el proceso de gobernanza documental antes de ser adoptado:

1. Proponer el término con definición, uso correcto y términos prohibidos.
2. Verificar que no existe un término oficial que ya cubra el concepto.
3. Aprobar el término en el contexto correspondiente de gobernanza.
4. Añadirlo a este Glosario.
5. Actualizar todos los documentos y código que utilizaban terminología anterior.

No se permite utilizar un término nuevo en documentos oficiales, PRD, ADR, código, interfaces o contenido editorial antes de que haya sido incorporado a este Glosario.

---

# 6. Control de Versiones

El Glosario constituye un documento vivo con vocación de permanencia.

Las modificaciones deberán realizarse mediante nuevas versiones documentadas.

Cada versión deberá indicar:

- Número de versión.
- Fecha.
- Autor o responsable.
- Resumen de cambios.
- Justificación del cambio.

No deberán realizarse modificaciones que contradigan la misión, visión o principios fundamentales del CANON sin una revisión integral del propio Glosario y del CANON.

---

# Conclusión

El presente Glosario establece el lenguaje oficial de Valladolid.mx.

Su propósito es asegurar que todos los documentos, blueprints, PRD, ADR, código, APIs, CMS, paneles, interfaces de inteligencia artificial y contenido editorial compartan un mismo vocabulario, con una sola definición por concepto y sin ambigüedades.

Toda decisión futura de nomenclatura deberá contribuir a fortalecer la coherencia, la claridad y la identidad de la plataforma.
