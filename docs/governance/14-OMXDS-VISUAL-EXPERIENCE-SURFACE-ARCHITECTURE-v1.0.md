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

