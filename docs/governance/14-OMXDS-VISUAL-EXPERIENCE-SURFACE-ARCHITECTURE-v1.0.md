# 14 · OMXDS Visual Experience & Surface Architecture V1.0

**Estado:** Proposed — autorizado para preparación documental  
**Fecha:** 2026-07-21  
**Autoridad:** Founder  
**Naturaleza:** Blueprint rector visual y de superficies públicas  
**Implementación:** No autorizada  

## 1. Decisión Founder

Se autoriza preparar y reconciliar la arquitectura visual integral de Valladolid.mx antes de ejecutar Commerce, reservaciones o monitoreo. Esta autorización comprende documentación, contratos visuales, PRD y plan Lovable. No autoriza cambios en código, base de datos, producción, Commerce, checkout, reservaciones, Stripe, cobros, liquidaciones ni Visitor Intelligence.

## 2. Resultado de negocio

Valladolid.mx deberá dejar de percibirse como un inventario uniforme o una interfaz SaaS y convertirse en una publicación turística viva: territorial, editorial, confiable y capaz de inspirar, orientar y convertir sin sacrificar identidad ni neutralidad.

### Behavioral Change Statement

El visitante pasará de escanear una cuadrícula indistinta a comprender inmediatamente:

1. dónde está dentro del territorio;
2. qué merece atención primero;
3. qué puede vivir, guardar, cotizar o reservar;
4. quién ofrece cada experiencia;
5. cómo continuar su viaje sin perder contexto.

### North Star visual

Porcentaje de sesiones públicas en las que el visitante interactúa con una entidad secundaria relevante después de comprender la superficie de entrada, sin depender de búsqueda global ni retroceder por desorientación.

Indicadores auxiliares futuros: profundidad de exploración territorial, interacción con destacados editoriales, avance hacia Arma tu Viaje, comprensión de CTA, CLS/LCP, accesibilidad y calidad editorial aprobada.

## 3. Problema que resuelve

La plataforma posee infraestructura reutilizable —Design System, Surface Kit, Experience Builder, navegación territorial y contratos de bloques—, pero la imagen pública no tiene una gramática completa. El Hero del Home concentra casi toda la emoción; destinos, empresas, productos, experiencias y eventos compiten con tratamientos similares. La consecuencia es falta de jerarquía, saturación, pérdida de personalidad y apariencia de catálogo.

No es un problema de “poner más fotos”. Es un problema de dirección, composición, prioridad y semántica visual.

## 4. Principios vinculantes

1. **Destino antes que interfaz.** La tecnología ayuda; el territorio protagoniza.
2. **Inspirar antes de vender.** La conversión nace de deseo, claridad y confianza.
3. **Una superficie, una promesa primaria.** No todos los elementos compiten al mismo nivel.
4. **Jerarquía antes que densidad.** El contenido se edita; no se apila.
5. **Fotografía con función.** Cada imagen explica lugar, experiencia, anfitrión o producto.
6. **Identidad compartida, personalidad preservada.** Todo pertenece a Valladolid.mx sin uniformar a destinos y empresas.
7. **Mobile first real.** La jerarquía se diseña primero para teléfono.
8. **Una entidad, una URL canónica.** Premium cambia composición, no duplica SEO.
9. **Reutilización sin monotonía.** Un solo sistema de bloques admite variantes controladas.
10. **Neutralidad visible.** Relevancia orgánica, selección editorial y promoción pagada no se mezclan.
11. **Calidad visual demostrada.** Typecheck verde no equivale a experiencia aprobada.
12. **Evolución reversible.** Toda implantación usará preview, flags, comparación y rollback.

## 5. Concepto rector

### Valladolid colonial contemporáneo

La experiencia combinará patrimonio, luz cálida, piedra caliza, selva, agua de cenote, cultura maya viva y hospitalidad local con un lenguaje editorial contemporáneo. Debe sentirse como una revista turística premium que conoce el territorio, no como una plantilla genérica disfrazada con amarillo.

### Atributos

- auténtico;
- sensorial;
- elegante sin lujo impostado;
- humano;
- territorial;
- sereno;
- útil;
- tecnológicamente discreto.

### Prohibiciones

- cuadrículas interminables de tarjetas iguales;
- logos como imagen principal de empresa;
- stock evidente o exotización cultural;
- ornamentación “maya” genérica sin fundamento;
- exceso de carruseles;
- más de un CTA primario por bloque;
- badges que compitan con el contenido;
- contenido pagado sin etiqueta;
- diseños Premium que alteren datos, reputación o neutralidad;
- páginas duplicadas por nivel comercial.

## 6. Jerarquía visual canónica

| Nivel | Nombre | Función | Densidad |
|---|---|---|---|
| H1 | Hero cinematográfico | Identidad, promesa y entrada | 1 por superficie elegible |
| H2 | Destacado editorial | Priorizar una historia, lugar o experiencia | 1–3 por página |
| H3 | Tarjeta principal | Explorar entidades comparables | Colecciones acotadas |
| H4 | Resultado compacto | Buscar, filtrar, planear y operar | Alta densidad controlada |

Ninguna página podrá resolver toda su composición con H3. Debe existir ritmo entre inmersión, contexto, elección y detalle.

## 7. Las ocho familias visuales

Las familias no crean ocho Design Systems; definen ocho gramáticas de composición sobre tokens, bloques y datos compartidos.

| Familia | Promesa | Superficies principales | Rasgo dominante |
|---|---|---|---|
| Territory | Comprender y recorrer un lugar | región, destino, municipio | panorama, identidad y conexiones |
| Landmark | Entender un icono patrimonial o natural | cenote, zona arqueológica, convento | presencia monumental y contexto |
| Business | Confiar en un anfitrión | Empresa Estándar | identidad, evidencia y oferta |
| Premium | Sumergirse en una marca anfitriona | Empresa Premium | narrativa cinematográfica modular |
| Editorial | Aprender e inspirarse | artículo, guía, historia | lectura, fotografía y autoridad |
| Collection | Elegir dentro de una curaduría | listas temáticas y destacados | comparación con intención |
| Event | Decidir con contexto temporal | evento, agenda, festival | fecha, estado, lugar y acceso |
| Journey | Conectar varios momentos | ruta, itinerario, Arma tu Viaje | secuencia, mapa y continuidad |

## 8. Arquitectura de superficies

### 8.1 Home

La Home es portada editorial y punto de orientación, no inventario total. Orden base:

1. Hero “Despierta en Valladolid”.
2. Selector de intención: qué vivir, con quién y cuánto tiempo.
3. Valladolid como Capital Turística del Oriente Maya de Yucatán.
4. Apertura territorial con destinos en composición asimétrica.
5. Experiencias para vivir ahora.
6. Rutas desde Valladolid.
7. Historias y anfitriones.
8. Agenda temporal.
9. Arma tu Viaje y continuidad.
10. Alux contextual.
11. Confianza, responsabilidad y cierre editorial.

El Experience Builder podrá reordenar bloques autorizados, pero no eliminar la función de orientación, identidad territorial o continuidad.

### 8.2 Región y destino

Cada micrositio territorial debe responder: qué lugar es, por qué importa, qué se puede vivir, cómo se conecta y cómo continuar. Contrato mínimo:

- Hero territorial;
- breadcrumb persistente;
- declaración de identidad;
- mapa/contexto geográfico;
- Discovery Navigator;
- destacados editoriales;
- qué hacer, dónde dormir y dónde comer con jerarquía diferenciada;
- rutas y cercanía desde Valladolid;
- agenda;
- historias locales;
- recomendación contextual de Alux;
- CTA Arma tu Viaje.

### 8.3 Empresa Estándar

Presencia completa, digna, útil y escalable para todo anfitrión aprobado:

1. portada fotográfica 4:3 o hero editorial contenido;
2. identidad, categoría, territorio y propuesta de valor;
3. señales verificadas de confianza;
4. descripción y servicios;
5. productos/experiencias;
6. galería;
7. ubicación, horarios, contacto y accesibilidad;
8. CTA único conforme a modalidad autorizada;
9. recomendaciones cercanas.

La capacidad Destacado puede aumentar presencia en colecciones autorizadas, pero no crea una tercera plantilla ni modifica la ficha canónica.

### 8.4 Empresa Premium

Micrositio editorial inmersivo dentro de la misma entidad y URL:

1. Hero cinematográfico con foto o video optimizado;
2. historia del anfitrión;
3. experiencia insignia;
4. galería narrativa;
5. productos y experiencias destacados;
6. itinerarios o colecciones relacionadas;
7. testimonios, reconocimientos y evidencia;
8. bloques editoriales personalizados dentro de whitelist;
9. Alux contextual sin sesgo pagado;
10. CTA comercial autorizado;
11. medición avanzada futura.

Premium amplía capacidad narrativa, no compra reputación, aprobación comercial ni posicionamiento orgánico.

### 8.5 Experiencia o tour

- personas viviendo la actividad como media prioritaria;
- promesa y beneficio central;
- anfitrión explícito;
- duración, idioma, esfuerzo, grupo, territorio y accesibilidad;
- modalidad visible: inspirar, agregar, cotizar o reservar;
- inclusiones, exclusiones, políticas y disponibilidad cuando aplique;
- narrativa, galería, reseñas y experiencias relacionadas.

### 8.6 Producto

- imagen centrada en lo adquirido;
- relación inequívoca con empresa anfitriona;
- precio/unidad sólo cuando esté autorizado;
- variantes y condiciones;
- CTA único;
- contexto territorial y posibilidad de incorporarlo al viaje.

### 8.7 Evento

- formato visual vertical o póster adaptable;
- fecha como jerarquía dominante;
- estado temporal explícito;
- lugar, horario, acceso y organizador;
- tratamiento de finalizado sin borrar autoridad histórica cuando sea relevante.

### 8.8 Ruta, colección e itinerario

- promesa curatorial;
- imagen panorámica;
- secuencia de paradas;
- duración, distancia y dificultad;
- mapa o continuidad territorial;
- CTA explorar/agregar;
- versión compacta operativa dentro de Arma tu Viaje.

## 9. Sistema de tarjetas

No existirá una tarjeta universal. Sí existirá una anatomía compartida con contratos especializados.

### 9.1 Territory Card

- proporción 16:9;
- nombre y frase identitaria;
- tiempo/distancia desde Valladolid;
- hasta tres motivos;
- CTA “Descubrir destino”.

### 9.2 Business Card

- proporción 4:3;
- fotografía de ambiente/anfitrión;
- categoría, ubicación, nombre y promesa;
- verificaciones discretas;
- CTA derivado de permisos.

### 9.3 Experience Card

- 3:2 en exploración y 4:5 en inspiración;
- acción humana;
- duración, precio “desde” sólo autorizado, idioma/grupo;
- ocasión relevante;
- modalidad comercial visible.

### 9.4 Product Card

- producto como protagonista;
- empresa anfitriona;
- unidad, variante y precio cuando aplique;
- no reutilizar el copy de la empresa.

### 9.5 Event Card

- fecha y estado primero;
- visual vertical;
- lugar y horario;
- sin countdown ornamental.

### 9.6 Journey Card

- panorama;
- número de paradas, duración y tema;
- señal de mapa o secuencia.

### 9.7 Compact Result

Para búsqueda, favoritos, paneles y viaje: miniatura, nombre, metadatos decisivos y una acción. No debe heredar la teatralidad del contenido inspiracional.

## 10. Sistema de imágenes y medios

Toda entidad pública deberá aspirar al paquete mínimo:

- cover;
- card thumbnail;
- social image;
- galería;
- texto alternativo;
- punto focal por breakpoint;
- autor, licencia y vigencia;
- dimensiones y proporción;
- derivaciones AVIF, WebP y JPEG;
- estado de calidad editorial.

### 10.1 Criterios editoriales

- escenas auténticas y situadas;
- personas con consentimiento y contexto;
- luz y color naturales;
- diversidad real del visitante y la comunidad;
- respeto a espacios sagrados y cultura maya;
- evitar saturación, HDR agresivo y filtros inconsistentes.

### 10.2 Fallbacks

La falta de fotografía no autoriza placeholders grises repetidos. Cada categoría tendrá un fallback editorial controlado con textura, color territorial, iconografía accesible y nombre de entidad. El fallback debe comunicar intención y jamás aparentar ser fotografía real.

## 11. Tokens, tipografía, motion y accesibilidad

Se conservan como base los tokens del Valladolid Colonial Design System y la combinación Fraunces/Inter/Tangerine, sujetos a validación visual real. Tangerine se reserva para acentos breves, nunca para información crítica ni párrafos.

Motion:

- revela relación o continuidad;
- respeta `prefers-reduced-motion`;
- evita parallax pesado en móvil;
- no bloquea interacción;
- duración y easing provienen de tokens.

Accesibilidad mínima:

- WCAG 2.2 AA;
- contraste probado sobre media real;
- orden semántico independiente de composición visual;
- foco visible;
- objetivos táctiles mínimos;
- texto alternativo editorial;
- controles de video y no autoplay con sonido;
- lectura correcta con zoom 200% y tamaños móviles.

## 12. SEO territorial, semántico y visual

1. Una entidad mantiene una URL canónica, sea Estándar o Premium.
2. Premium no genera subdominio ni réplica indexable.
3. Breadcrumb visual y `BreadcrumbList` reflejan la misma jerarquía.
4. Cada familia usa JSON-LD apropiado: `TouristDestination`, `TouristAttraction`, `LocalBusiness`/subtipo, `Product`, `Event`, `Trip`, `ItemList`, `Article`.
5. `hreflang` recíproco para es, en, fr, de, it y pt cuando exista traducción válida.
6. Hero y contenido crítico serán SSR/indexables; no dependerán de carruseles cliente.
7. Título, H1, descripción, OG y social image provienen de la misma entidad editorial.
8. Imágenes incluyen dimensiones, `srcset`, formatos y prioridad correcta.
9. El contenido patrocinado se etiqueta y no altera canonical, schema de reputación ni recomendaciones neutrales.
10. Core Web Vitals es gate de publicación, no optimización tardía.

## 13. Gobernanza de composición

### 13.1 Single Studio y Single Source of Truth

El Experience Builder y `page_compositions` permanecen como mecanismo oficial de composición. Ninguna familia crea un segundo CMS, builder o renderer paralelo.

### 13.2 Contratos de bloques

Cada bloque declara:

- familia(s) permitida(s);
- nivel de jerarquía;
- datos requeridos y opcionales;
- variantes whitelist;
- reglas responsive;
- comportamiento sin media/datos;
- semántica y schema;
- presupuesto de rendimiento;
- permisos de edición;
- versión y compatibilidad.

### 13.3 Autoridad editorial y comercial

- La empresa puede proponer datos y medios.
- Administración aprueba publicación, calidad visual, plan y bloques.
- La empresa no se autoasigna Destacado o Premium.
- Premium no concede venta en línea.
- La aprobación comercial sigue separada bajo el documento 13 de Commerce.

### 13.4 Selección editorial y promoción

Se distinguen tres fuentes:

- relevancia orgánica;
- selección editorial;
- posición patrocinada etiquetada.

Alux no modifica recomendaciones neutrales por plan comercial. Las campañas patrocinadas deben declararse como tales.

## 14. Reconciliación de autoridad existente

| Documento/capacidad | Decisión V1.0 |
|---|---|
| 09 UX/UI Design System | Se conserva como base; este documento completa jerarquías y familias |
| 12 Home Master Experience | Se conserva; el contrato Home de §8.1 define la composición canónica futura |
| 12A v2 Dirección de Arte | Se ratifica y operacionaliza |
| 12D Visual Governance | Se conserva; “cumple técnicamente” no equivale a aprobación visual Founder |
| Valladolid Colonial Design System | Se adopta como base de tokens, sujeto a QA con medios reales |
| Surface Kit | Se conserva como infraestructura compartida |
| Experience Builder | Se conserva como único compositor y renderer |
| Plantilla Madre BusinessSurface | Se conserva como orquestador; se separan Estándar y Premium por composición/capabilities |
| Micrositios territoriales | Se conservan; se completa jerarquía editorial y media |
| Parity reports | Prueban compatibilidad, no aceptación estética final |
| Commerce V1.0 | Permanece aprobado pero pausado; no cambia por el plan visual |

En caso de conflicto visual entre Blueprints del mismo nivel, este V1.0 prevalece por fecha y especialidad, siempre subordinado a CANON y gobernanza superior.

## 15. Quality Gates visuales

Cada superficie deberá superar:

1. **G1 Identidad:** se reconoce Valladolid.mx y el territorio.
2. **G2 Jerarquía:** un evaluador identifica protagonista, contexto y siguiente acción en cinco segundos.
3. **G3 Contenido:** copy y medios tienen calidad y derechos.
4. **G4 Responsive:** móvil 360/390/430 y desktop representativos.
5. **G5 Accesibilidad:** WCAG 2.2 AA y contraste sobre medios reales.
6. **G6 SEO:** canonical, hreflang, schema y semántica.
7. **G7 Rendimiento:** presupuestos LCP/CLS/INP y peso de media.
8. **G8 Estados:** loading, vacío, error, sin media, expirado y no autorizado.
9. **G9 Gobernanza:** fuente, versión, permisos y rollback.
10. **G10 Founder Visual Acceptance:** evidencia comparativa aprobada.

No se permite marcar una superficie “Done” sin G10.

## 16. Límites y gates cerrados

Permanecen expresamente no autorizados:

- cambios en `src/`, migraciones o infraestructura;
- publicación en producción;
- inicio de Commerce C0–C8;
- checkout, pagos, reembolsos y liquidaciones;
- reservaciones reales;
- monitor de visitantes o captura adicional de comportamiento;
- contacto u onboarding de empresas;
- Gate B1 y Gate B2;
- creación automática de assets visuales finales sin aprobación editorial.

## 17. Entregables autorizados

1. Auditoría de reconciliación visual.
2. Este Blueprint rector.
3. PRD Suite de superficies y Masterboard.
4. Plan Lovable V0–V8.
5. Actualización documental de roadmap, índice y plan operativo, sin iniciar etapas.

## 18. Definition of Ready para implementación futura

Antes de autorizar V0 deberá existir:

- Blueprint aprobado por Founder;
- PRD y plan integrados en `main`;
- superficies canónicas y contratos de tarjetas cerrados;
- datos/medios de prueba claramente separados de producción;
- preview aislado y feature flags definidos en OFF;
- baseline visual capturado;
- métricas y rollback por etapa;
- confirmación de que Commerce, reservas y monitoreo siguen fuera de alcance.

## 19. Estado de decisión

Este documento queda **Proposed** hasta aprobación explícita posterior del Founder. Su preparación no equivale a autorización de implementación.


---

# Anexo A · Auditoría de reconciliación visual

## 1. Veredicto

Valladolid.mx tiene una base técnica visual madura, pero no una experiencia pública visualmente terminada. La documentación histórica demuestra tokens, componentes, responsive, accesibilidad y reutilización. No demuestra que Home, destinos, empresas, productos, experiencias, eventos y rutas posean jerarquías diferenciadas, fotografía suficiente o una narrativa editorial coherente.

La brecha principal es de **sistema de composición**, no de librería UI.

## 2. Evidencia recuperada

| Fuente | Aporte vigente | Limitación detectada |
|---|---|---|
| `09-UX-UI-DESIGN-SYSTEM` | Componentes y filosofía base | Define “Cards” genéricas sin taxonomía visual completa |
| `12-HOME-MASTER-EXPERIENCE` | Secciones funcionales del Home | No resuelve ritmo editorial integral en todas las superficies |
| `12A-v2` | Dirección de arte “evolucionar, no rediseñar” | Aspiracional; faltan contratos ejecutables por entidad |
| `12D.00/12D.01` | Gobernanza, accesibilidad y gates | Auditoría anterior confundió cumplimiento de infraestructura con cierre visual |
| Colonial Design System | Tokens y lenguaje territorial | No basta para diferenciar entidades ni composiciones |
| Surface Kit | Primitives y adapters reutilizables | La reutilización actual puede producir monotonía |
| Experience Builder | Fuente única de composición | Carece de familias visuales canónicas y restricciones completas |
| BusinessSurface | Orquestador puro | No formaliza Estándar versus Premium |
| Destination parity | Hero y badges | “Parity” no prueba riqueza editorial ni calidad de toda la página |
| Discovery Navigator | Conexión territorial | Resuelve orientación, no jerarquía completa del contenido |

## 3. Hallazgos

### VR-01 · Hero aislado

El Hero del Home concentra identidad y fotografía; la mayoría de los bloques posteriores regresan a tratamientos homogéneos. Riesgo: la promesa emocional se evapora después del primer scroll.

### VR-02 · Tarjeta universal de facto

Destinos, empresas, productos y experiencias comparten patrones demasiado próximos. Riesgo: el visitante no distingue territorio, anfitrión, actividad y objeto comprable.

### VR-03 · Densidad sin edición

Grids y carruseles muestran oferta, pero no establecen protagonista, contraste, pausa o secuencia. Riesgo: fatiga y baja exploración.

### VR-04 · Empresa Estándar y Premium sin contrato canónico

Existen planes y bloques parciales, pero Premium no está definido como una composición visual distinta con límites, derechos y neutralidad.

### VR-05 · Familias visuales ausentes del canon

No existe una taxonomía oficial que gobierne Territory, Landmark, Business, Premium, Editorial, Collection, Event y Journey.

### VR-06 · Medios incompletos

El sistema contempla pipeline y galerías, pero muchas entidades carecen de paquete visual mínimo, focal point, derechos y fallback editorial específico.

### VR-07 · “Done” visual demasiado permisivo

Reportes de cierre usan typecheck, paridad y ausencia de duplicados como evidencia principal. Son necesarias, no suficientes. Falta aceptación visual Founder por pantalla y dispositivo.

### VR-08 · SEO y diseño no unidos en un contrato

Existen políticas SEO avanzadas, pero no una matriz única que vincule familia visual, URL, H1, breadcrumb, schema, medios, hreflang y contenido indexable.

## 4. Matriz conservar / extender / retirar

| Elemento | Decisión | Razón |
|---|---|---|
| Tokens oficiales | Conservar | Coherencia y bajo riesgo |
| Fraunces + Inter | Conservar | Editorial + legibilidad |
| Tangerine | Restringir | Sólo acentos breves |
| PublicHeader/Footer | Conservar | Navegación única |
| BreadcrumbTerritorial | Conservar | Contexto y SEO |
| Surface Kit | Extender | Variantes por familia, no duplicados |
| Experience Builder | Extender | Único compositor |
| `page_compositions` | Conservar | Single Source of Truth |
| Hero oficial | Extender | Variantes por familia sobre el mismo contrato |
| Tarjeta genérica única | Retirar como patrón público | Sustituir por contratos especializados |
| Placeholders grises repetidos | Retirar | Fallbacks editoriales por categoría |
| Premium como “más bloques” | Retirar | Debe ser narrativa y capacidades gobernadas |
| Recomendación pagada de Alux | Prohibir | Confianza y neutralidad |

## 5. Superficies prioritarias para Masterboard

1. Home.
2. Región Oriente Maya de Yucatán.
3. Destino.
4. Landmark.
5. Exploración/resultados.
6. Empresa Estándar.
7. Empresa Premium.
8. Experiencia/tour.
9. Producto.
10. Evento.
11. Ruta/colección.
12. Arma tu Viaje.
13. Estados móviles críticos.

## 6. Riesgos de implementación prematura

- embellecer tarjetas actuales sin resolver jerarquía;
- crear un segundo set de componentes paralelo;
- duplicar URL para Premium;
- mezclar visibilidad pagada con relevancia;
- cargar videos/fotos sin presupuesto y degradar LCP;
- declarar cierre con capturas desktop únicamente;
- incorporar Commerce mientras los CTA todavía no tienen gramática consistente.

## 7. Recomendación

Aprobar primero el Blueprint `14`, el PRD `18.04` y el plan `18.05`. Implementar después por gates V0–V8, comenzando con baseline y Masterboard, sin tocar rutas públicas hasta obtener aprobación visual Founder.


# Anexo B · PRD Suite y Visual Masterboard

## 1. Objetivo

Definir con precisión las superficies, jerarquías, tarjetas, medios, SEO y estados que Lovable deberá construir cuando reciba un GO independiente. El resultado será un sistema visual coherente, editorial y territorial sobre la arquitectura existente.

## 2. Personas y necesidades

| Persona | Necesidad visual |
|---|---|
| Visitante inspiracional | Entender rápidamente por qué quedarse y qué vivir |
| Visitante planificador | Comparar sin perder contexto territorial |
| Visitante onsite | Encontrar información decisiva con poca fricción |
| Anfitrión estándar | Presencia digna, clara y confiable |
| Anfitrión Premium | Narrativa diferenciada sin romper el sistema |
| Editor/Admin | Componer con reglas y previsualizar estados |
| SEO/Contenido | Mantener entidad, URL, schema y medios consistentes |

## 3. Requisitos transversales

### FR-VIS-001 · Jerarquía

Toda superficie declarará H1 Hero, H2 destacado, H3 tarjeta y H4 compacto aplicables. Una página pública no puede ser sólo una cuadrícula H3.

### FR-VIS-002 · Familias

Toda composición declarará una de ocho familias y sólo podrá usar bloques/variantes permitidos para ella.

### FR-VIS-003 · CTA

Cada bloque tendrá máximo un CTA primario. El CTA se deriva de la modalidad y permisos reales; el diseño no puede insinuar reserva si Commerce está apagado.

### FR-VIS-004 · Media

Cada render seleccionará la variante adecuada, preservará focal point, dimensiones, alt y fallback. No habrá layout shift por medios.

### FR-VIS-005 · Mobile

El orden semántico se define primero para móvil; desktop puede recomponer sin alterar lectura ni prioridad.

### FR-VIS-006 · Estados

Loading, vacío, error, sin media, expirado, no autorizado y offline deberán estar diseñados. Ninguno puede convertirse en una cuadrícula rota o botón engañoso.

### FR-VIS-007 · Neutralidad

Selección editorial, ranking orgánico y patrocinio tendrán etiquetas y fuentes diferenciadas. Premium no altera reputación ni Alux.

### FR-VIS-008 · Preview

Toda nueva composición se validará en rutas aisladas o preview tokens antes de sustituir una ruta pública.

## 4. Masterboard canónico

Cada pantalla del Masterboard se entregará en móvil 390 px y desktop 1440 px, con anotaciones de jerarquía, bloques, datos, ratio de imagen, CTA, schema, estados y presupuesto.

### MB-01 Home

Objetivo: inspirar y orientar hacia una primera decisión relevante.

Orden base: Hero → Intent Selector → Capital Turística → Territory Mosaic → Experiences Now → Routes → Hosts/Stories → Events → Trip Continuity → Alux → Trust.

Aceptación:

- Hero no excede una promesa principal y dos acciones;
- primera pantalla explica Valladolid y Oriente Maya de Yucatán;
- después del Hero existe contraste editorial, no una cuadrícula monótona;
- ningún carrusel crítico oculta contenido indexable;
- Arma tu Viaje aparece como continuidad, no carrito.

### MB-02 Región

Objetivo: presentar el Oriente Maya de Yucatán como sistema territorial conectado.

Debe incluir mapa/contexto, destinos destacados, temas, rutas, agenda y rol de Valladolid como capital turística sin borrar la identidad de otros destinos.

### MB-03 Destino

Objetivo: convertir un lugar en base de exploración. Incluye Hero, identidad, Discovery Navigator, mapa, destacados, oferta por jerarquía, rutas cercanas, agenda, historias y continuidad.

### MB-04 Landmark

Objetivo: explicar valor patrimonial/natural, reglas de visita, contexto cultural, conservación, acceso y experiencias relacionadas.

### MB-05 Exploración

Objetivo: comparar con claridad. Combina un destacado H2, filtros compactos y resultados H3/H4. No muestra más de un bloque editorial grande antes de la lista útil.

### MB-06 Empresa Estándar

Objetivo: confianza y decisión. Usa portada, propuesta, verificación, oferta, galería, información operativa, CTA autorizado y cercanía.

### MB-07 Empresa Premium

Objetivo: inmersión narrativa. Usa Hero cinematic, historia, insignia, galería secuencial, oferta curada, itinerario, evidencia y CTA. Mantiene URL y datos canónicos de la empresa.

### MB-08 Experiencia/Tour

Objetivo: comprender vivencia y condiciones. Hero humano, datos decisivos, anfitrión, inclusiones, itinerario, galería, políticas, reseñas y relacionados.

### MB-09 Producto

Objetivo: entender exactamente qué se obtiene. Media de producto, empresa, variante/unidad, condiciones y CTA conforme al gate comercial.

### MB-10 Evento

Objetivo: decidir en tiempo. Fecha/estado, visual, lugar, acceso, programa, organizador y recomendaciones cercanas.

### MB-11 Ruta/Colección

Objetivo: conectar entidades en secuencia. Tema, mapa, paradas, duración, dificultad, recomendaciones y agregar al viaje.

### MB-12 Arma tu Viaje

Objetivo: pasar de inspiración a plan. Utiliza H4 compacto, días/secuencia, mapa, estados de continuidad y asistencia contextual. No reusa cards teatrales dentro del workspace.

## 5. Contratos de tarjetas

| Contrato | Ratio | Campos obligatorios | CTA |
|---|---:|---|---|
| TerritoryCard | 16:9 | nombre, identidad, territorio, distancia/tiempo | Descubrir |
| BusinessCard | 4:3 | nombre, categoría, ubicación, promesa, media | Ver perfil/acción autorizada |
| ExperienceCard | 3:2 o 4:5 | promesa, anfitrión, duración, modalidad | Vivir/Agregar/Cotizar/Reservar |
| ProductCard | 1:1 o 4:3 | producto, empresa, unidad/variante | Ver/Agregar/Comprar autorizado |
| EventCard | 4:5 | fecha, estado, lugar, título | Ver evento |
| JourneyCard | 16:9 | tema, paradas, duración | Explorar/Agregar |
| CompactResult | 1:1 miniatura | nombre, tipo, metadato decisivo | Acción contextual |

Reglas comunes: título máximo controlado, fallback específico, badges limitados, acción completa accesible, sin nested links, foco visible y tracking futuro sin PII.

## 6. Empresa Estándar vs Premium

| Capacidad | Estándar | Premium |
|---|---|---|
| URL/entidad | Canónica | La misma canónica |
| Hero | Fotográfico/editorial contenido | Cinematográfico foto/video |
| Historia | Resumen + descripción | Narrativa modular extensa |
| Galería | Estándar | Secuencial y ampliada |
| Productos | Lista completa | Curaduría + lista completa |
| Itinerarios | Relacionados automáticos | Bloques editoriales autorizados |
| Bloques personalizados | No | Whitelist Premium |
| Analítica futura | Base | Avanzada con consentimiento |
| Posición orgánica | Sin privilegio | Sin privilegio |
| Alux neutral | Sí | Sí, sin sesgo pagado |
| Venta online | Sólo autorización Commerce | Sólo autorización Commerce |

## 7. Matriz SEO

| Superficie | Schema principal | Breadcrumb | Riesgo a evitar |
|---|---|---|---|
| Home | WebSite/Organization | No obligatorio | saturar H1 |
| Región/Destino | TouristDestination | Sí | páginas territoriales duplicadas |
| Landmark | TouristAttraction | Sí | datos culturales imprecisos |
| Empresa | LocalBusiness/subtipo | Sí | Premium duplicado |
| Experiencia | Product + Offer sólo autorizado | Sí | precio falso o stale |
| Producto | Product | Sí | confundir empresa y producto |
| Evento | Event | Sí | estado/fecha caducos |
| Ruta | Trip/ItemList | Sí | orden no indexable |
| Editorial | Article | Sí contextual | contenido delgado |

Todos deberán definir canonical, title, H1, meta description, OG, social media, alternates y seis locales sólo cuando la traducción exista.

## 8. Presupuestos no funcionales

- LCP objetivo ≤ 2.5 s p75 en móvil realista.
- CLS ≤ 0.1.
- INP ≤ 200 ms p75.
- imágenes con width/height y `srcset`.
- Hero móvil sin descargar video desktop innecesario.
- JavaScript de interacción diferido; contenido esencial SSR.
- WCAG 2.2 AA.
- sin autoplay sonoro.
- respeto a reduced motion y data saver cuando aplique.

## 9. Analytics futuro, no autorizado ahora

Cuando el monitor reciba autorización separada, sólo se medirán eventos definidos por resultado: impresión de bloque, selección de entidad, cambio de contexto territorial, agregar al viaje, CTA autorizado y profundidad útil. Este PRD no autoriza instrumentación, identificadores ni captura de visitantes.

## 10. Criterios de aceptación global

1. Un usuario identifica tipo de entidad sin leer la URL.
2. Home, destino, empresa y experiencia tienen siluetas distintas.
3. Estándar y Premium son claramente diferentes sin perder marca compartida.
4. Mobile conserva prioridad y no sólo apila desktop.
5. Fallbacks parecen diseñados, no errores.
6. SEO, accesibilidad y rendimiento pasan sus gates.
7. No se duplica CMS, renderer, URL ni entidad.
8. Evidencia comparativa obtiene aprobación Founder.

## 11. Fuera de alcance

Commerce C0–C8, inventario, checkout, pagos, reservaciones reales, liquidaciones, Visitor Intelligence, tracking, producción, contacto con empresas y creación definitiva del banco de medios.


# Anexo C · Plan Lovable V0–V8

## 1. Regla de ejecución

Lovable ejecutará una etapa por vez. Cada etapa requiere Scope Report, GO Founder explícito, preview aislado, pruebas, evidencia visual, Closure Report y autorización para continuar. No se permite ejecutar V0–V8 en un solo prompt.

## 2. Feature flags propuestos

Todos nacen `false` y deberán negar también del lado servidor cuando corresponda:

- `visual_v1_masterboard_preview`
- `visual_v1_home`
- `visual_v1_territory`
- `visual_v1_business_standard`
- `visual_v1_business_premium`
- `visual_v1_entity_cards`
- `visual_v1_editorial_event_journey`
- `visual_v1_public_rollout`

Crear estos nombres en documentación no autoriza crear configuración o migraciones.

## 3. V0 · Baseline y reconciliación técnica

Objetivo: mapear rutas, superficies, adapters, bloques, contratos, flags, medios y deuda sin modificar UI pública.

Entregables futuros:

- inventario route → surface → composition → blocks;
- capturas baseline móvil/desktop;
- matriz reutilizar/extender/retirar;
- mapa de datos y medios faltantes;
- presupuesto actual de rendimiento;
- Scope Report de V1.

DoD: cero cambios visibles, cero componentes paralelos y baseline aprobado.

## 4. V1 · Visual Masterboard

Objetivo: construir previews no públicos de las 12 superficies canónicas con datos controlados.

Condiciones:

- sólo rutas de preview protegidas/no indexables;
- móvil 390 y desktop 1440;
- anotaciones H1–H4;
- estados sin media/error/vacío;
- comparación contra baseline;
- Founder Visual Acceptance.

DoD: Masterboard aprobado. Ninguna ruta pública sustituida.

## 5. V2 · Contratos, tokens y tarjetas

Objetivo: evolucionar el Surface Kit y contratos existentes para las seis tarjetas especializadas y niveles de jerarquía.

Guardrails:

- extender bloques oficiales;
- prohibido crear segundo Design System;
- compatibilidad hacia atrás;
- Storybook/preview o equivalente;
- pruebas visuales y accesibles;
- no instrumentación de visitantes.

## 6. V3 · Home

Objetivo: implantar la portada editorial aprobada detrás de `visual_v1_home`.

Incluye ritmo, intención, territorio, experiencias, rutas, historias, agenda, viaje y Alux. No incluye Commerce ni monitoreo.

Rollback: desactivar flag y mantener composición previa intacta.

## 7. V4 · Territorio y Landmark

Objetivo: implantar Región, Destino y Landmark sobre contratos compartidos.

Incluye Discovery Navigator, mapa/contexto disponible, jerarquía de oferta, rutas y agenda. Preserva breadcrumbs, canonical y Context Engine.

## 8. V5 · Empresa Estándar

Objetivo: implantar la presencia base para empresas existentes sin cambiar planes, permisos o aprobación comercial.

CTA deberá respetar gates actuales; con Commerce OFF nunca mostrará compra/reserva activa.

## 9. V6 · Empresa Premium

Objetivo: implantar composición Premium en preview con whitelist, aprobación Admin y misma URL canónica.

No autoriza asignar Premium a empresas reales, contactar anfitriones ni cobrar planes. La prueba usará fixtures claramente marcados.

## 10. V7 · Experiencia, producto, evento, editorial y journey

Objetivo: completar las familias restantes y sustituir monotonía de tarjetas por jerarquías aprobadas.

La experiencia/producto mostrará modalidad informativa o Arma tu Viaje mientras Commerce permanezca cerrado.

## 11. V8 · Certificación y rollout controlado

Objetivo: certificar, no lanzar automáticamente.

Debe entregar:

- regresión visual móvil/desktop;
- accesibilidad WCAG 2.2 AA;
- SEO/canonical/hreflang/schema;
- Core Web Vitals y peso de medios;
- estados y permisos;
- prueba de rollback;
- evidencia Founder;
- recomendación GO/NO-GO.

Activar `visual_v1_public_rollout` requiere autorización Founder posterior y específica.

## 12. Orden obligatorio

`V0 → V1 → V2 → V3 → V4 → V5 → V6 → V7 → V8`

Puede dividirse una etapa; no puede saltarse el Masterboard ni la certificación. Commerce C0 continúa después del programa visual sólo mediante un GO independiente.

## 13. Formato obligatorio de Scope Report

1. etapa y objetivo conductual;
2. rutas y archivos candidatos;
3. contratos reutilizados;
4. cambios visibles esperados;
5. datos/fixtures;
6. SEO, accesibilidad y rendimiento;
7. flag y rollback;
8. pruebas;
9. exclusiones;
10. confirmación de no tocar Commerce, reservas, monitoreo o producción.

## 14. Formato obligatorio de Closure Report

1. alcance ejecutado;
2. diff real;
3. screenshots comparativas 390/1440;
4. estados probados;
5. accesibilidad;
6. SEO;
7. performance;
8. pruebas/typecheck/build;
9. flag confirmado OFF;
10. rollback probado;
11. deuda y decisiones;
12. Founder Visual Acceptance pendiente/aprobada.

## 15. Gates que permanecen cerrados

- todos los flags visuales;
- sustitución de rutas públicas;
- Commerce C0–C8;
- Gate B1 y Gate B2;
- checkout, cobros y liquidaciones;
- reservaciones reales;
- monitor de visitantes;
- producción;
- contacto y asignación de planes a empresas.

## 16. Próxima autorización posible

Después de aprobar e integrar la documentación, la única autorización técnica elegible será **V0 · Baseline y reconciliación técnica**. V0 no cambia UI pública.


