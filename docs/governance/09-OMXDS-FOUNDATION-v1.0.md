# OMXDS — Oriente Maya Experience & Destination System

## Documento Fundacional V1.0

**Estado:** Approved  
**Fecha:** 2026-07-21  
**Owner:** Founder  
**Dominio primario:** D01 · product-governance  
**Alcance:** definición estratégica y arquitectura de producto; no autoriza implementación, migraciones ni cambios en producción.

---

## 1. Decisión fundacional

Se establece **OMXDS — Oriente Maya Experience & Destination System** como el sistema regional que organiza la experiencia turística, la inteligencia, las relaciones y las capacidades digitales compartidas del Oriente Maya de Yucatán.

OMXDS no sustituye a Valladolid.mx. Define el ecosistema superior sobre el cual Valladolid.mx opera como su primer producto público y su principal puerta de entrada.

La jerarquía oficial es:

| Nivel | Elemento | Función |
|---|---|---|
| Ecosistema regional | **OMXDS** | Arquitectura común, capacidades compartidas, reglas, datos e inteligencia turística regional. |
| Producto principal | **Valladolid.mx** | Plataforma pública y operativa para descubrir, planear, reservar, vivir y recordar el Oriente Maya de Yucatán. |
| Capa de inteligencia | **Alux** | Compañero inteligente transversal que interpreta contexto y acompaña al viajero. |
| Sistemas especializados | **Videomapping Valladolid** y futuros productos | Soluciones verticales que reutilizan identidad, inventario, pagos, viajeros, notificaciones, analítica y operación del ecosistema. |

Esta decisión evita dos errores: reducir Valladolid.mx a un portal aislado y convertir OMXDS en una segunda plataforma duplicada.

---

## 2. Definición oficial

### OMXDS

**Nombre oficial:** OMXDS — Oriente Maya Experience & Destination System.

**Definición:** Ecosistema digital regional que coordina la experiencia completa del visitante y las capacidades operativas del destino, conectando viajeros, empresas, comunidades, operadores e instituciones mediante una arquitectura común de producto, datos, inteligencia y servicios.

**Uso correcto:** OMXDS nombra el sistema regional y su arquitectura compartida. Valladolid.mx nombra el producto principal que hace visible y operable ese sistema para el mercado.

**No es:** una nueva marca pública obligatoria, un portal adicional, una copia de Valladolid.mx, una OTA, un DMS tradicional ni una carpeta documental paralela.

**Términos que no deben sustituirlo:** megaportal, superapp, marketplace regional, plataforma paraguas.

---

## 3. Behavioral Change Statement

OMXDS debe lograr que el visitante deje de tratar al Oriente Maya de Yucatán como una excursión fragmentada de pocas horas y comience a vivirlo como un territorio conectado que merece más noches, más recorridos y una relación posterior al viaje.

En paralelo, debe lograr que las empresas locales dejen de operar como ofertas digitales aisladas y participen en una red capaz de coordinar información, disponibilidad, comercialización, atención y aprendizaje compartido.

El cambio buscado es:

> **De visitar puntos sueltos a vivir un destino conectado; de vender servicios aislados a construir valor regional compartido.**

---

## 4. Problema que resuelve

El Oriente Maya de Yucatán posee patrimonio, comunidades, gastronomía, naturaleza y experiencias suficientes para sostener estancias más largas, pero el mercado lo percibe y consume de forma fragmentada.

Los síntomas principales son:

- El viajero descubre información en múltiples canales sin continuidad.
- Valladolid funciona con frecuencia como escala y no como base de exploración regional.
- Las empresas pequeñas dependen de intermediarios y tienen baja inteligencia comercial.
- La disponibilidad, horarios, transporte, atención y reservas no comparten contexto.
- Las instituciones carecen de una lectura unificada del comportamiento turístico.
- Cada nuevo producto digital corre el riesgo de reconstruir identidad, pagos, inventario, notificaciones y analítica desde cero.

OMXDS resuelve esta fragmentación creando una columna vertebral regional reusable.

---

## 5. Resultado de negocio

El objetivo estratégico no es acumular funcionalidades. Es aumentar el valor generado por cada relación turística de forma sostenible para el territorio.

### North Star Metric

**Noches adicionales atribuibles al ecosistema por cada 1,000 viajeros activos.**

Esta métrica conecta el comportamiento digital con el resultado turístico que importa: mayor permanencia y derrama distribuida.

### Métricas secundarias V1

| Dimensión | Métrica |
|---|---|
| Permanencia | Promedio de noches planeadas y confirmadas desde Valladolid como base regional. |
| Descubrimiento | Destinos y categorías relevantes explorados por sesión o viaje. |
| Continuidad | Porcentaje de viajeros que retoma un plan, favorito o conversación previa. |
| Conversión útil | Viajes que pasan de inspiración a acción verificable sin deteriorar confianza. |
| Economía local | Empresas locales incluidas, contactadas o reservadas por viaje. |
| Distribución | Porcentaje de derrama estimada fuera de los atractivos de mayor concentración. |
| Calidad | Satisfacción, NPS y resolución efectiva por Alux/Concierge. |
| Ecosistema | Empresas activas con información completa y actualizada. |

Una reserva no cuenta como éxito si degrada confianza, utilidad, continuidad o beneficio territorial.

---

## 6. Actores del sistema

| Actor | Necesidad principal | Valor que recibe |
|---|---|---|
| Viajero anónimo | Descubrir sin fricción | Inspiración útil, continuidad local y registro sólo cuando aporta valor. |
| Viajero registrado | Organizar y vivir su viaje | Plan persistente, personalización, reservas, asistencia y memoria. |
| Empresa turística | Vender y operar mejor | Presencia, demanda directa, herramientas, datos y relación con clientes. |
| Concierge | Resolver decisiones complejas | Contexto unificado, casos, propuestas, SLA y seguimiento. |
| Operador/transportista | Coordinar servicios | Demanda, horarios, manifiestos, rutas y notificaciones. |
| Hotel anfitrión | Extender la estancia | Recomendaciones, venta cruzada, logística y atención a huéspedes. |
| Comunidad/custodio | Proteger y compartir patrimonio | Visibilidad responsable, participación y beneficio local. |
| Institución/DMO | Gestionar el destino | Inteligencia agregada, flujos, alertas y evidencia para decidir. |
| Founder/Admin | Gobernar el ecosistema | Políticas, configuración, calidad, métricas y trazabilidad. |

---

## 7. Arquitectura de capacidades V1

OMXDS se organiza por capacidades compartidas, no por sitios independientes.

| Capa | Capacidades V1 |
|---|---|
| Identidad y confianza | Identidad progresiva, roles, permisos, consentimiento, reputación y trazabilidad. |
| Knowledge & Content | Entidades territoriales, CMS, Experience Builder, contenido multilingüe y conocimiento verificable. |
| Discovery | SEO territorial, búsqueda, colecciones, mapas, rutas y superficies de destino. |
| Traveler Journey | Favoritos, Arma tu Viaje, etapas del viaje, continuidad anónima y memoria post-viaje. |
| Commerce | Productos, disponibilidad, promociones, cotización, reserva, pago y pases especializados. |
| Operations | Portal de empresas, Concierge, transporte, hoteles, incidencias y SLA. |
| Intelligence | Alux, perfil contextual, recomendación explicable y Motor de Contexto. |
| Engagement | PWA, notificaciones, mensajería transaccional y comunicación por etapa. |
| Destination Intelligence | Eventos conductuales, embudos, permanencia, flujos, calidad y paneles. |
| Platform Foundation | APIs, integraciones, observabilidad, seguridad, performance, offline y feature flags. |

### Regla de reutilización

Un producto del ecosistema primero consume capacidades existentes; después las extiende; sólo construye una capacidad nueva cuando ninguna existente puede resolver el caso sin deformarse.

---

## 8. Productos y límites

### 8.1 Valladolid.mx

Es la primera implementación y principal superficie pública de OMXDS. Conserva su identidad, posicionamiento y función como Destination Operating System del Oriente Maya de Yucatán.

### 8.2 Alux

No es un producto separado ni un chatbot añadido al final. Es la inteligencia transversal que consume conocimiento, contexto, etapa del viaje y capacidades operativas.

### 8.3 Videomapping Valladolid

Es un sistema especializado del ecosistema. Puede tener marca, dominio y experiencia propios, pero debe reutilizar, cuando corresponda, catálogo, identidad, hoteles, asientos, pagos, transporte, notificaciones y analítica.

### 8.4 Futuros productos

Rutas, pases, comunidades, soluciones institucionales o nuevas experiencias pueden integrarse como productos especializados. Ninguno obtiene permiso automático para duplicar motores centrales.

### Fuera de alcance V1

- Renombrar Valladolid.mx frente al visitante.
- Crear un nuevo frontend llamado OMXDS.
- Migrar código o base de datos únicamente por adoptar el concepto.
- Unificar marcas comerciales sin estrategia de mercado.
- Abrir múltiples destinos en producción antes de validar Valladolid como núcleo.
- Implementar blockchain, gemelos digitales u otros fuegos artificiales tecnológicos sin valor probado.

---

## 9. Principios vinculantes propuestos

1. **Experience before infrastructure.** Toda capacidad debe mejorar un comportamiento o experiencia verificable.
2. **Relationship before account.** El viajero recibe valor antes de ser obligado a registrarse.
3. **Territory before transaction.** La conversión sirve al destino; el destino no se reduce a inventario.
4. **Reuse before build.** Las capacidades compartidas no se duplican entre productos.
5. **Entity first.** Destinos, empresas, experiencias, eventos y productos mantienen identidad canónica estable.
6. **One traveler context.** El contexto del viajero debe continuar entre superficies y etapas con consentimiento adecuado.
7. **Human hospitality remains.** Alux amplifica al anfitrión y al Concierge; no elimina la atención humana valiosa.
8. **Local value by design.** La recomendación y comercialización consideran distribución territorial y beneficio local.
9. **Trust is a conversion asset.** Transparencia, exactitud y explicación tienen prioridad sobre presión comercial.
10. **Measure destination outcomes.** El éxito se mide por permanencia, experiencia y valor local, no por clics vanidosos.

---

## 10. Roadmap V1 — 90 días

### Fase 1 · Foundation (semana 1)

- Publicar la definición, jerarquía y North Star aprobadas de OMXDS.
- Integrar OMXDS al CANON y al orden canónico de gobernanza.
- Registrar las relaciones formales en Glosario, ADR y proyecciones `06–08` cuando el inventario determine las capacidades afectadas.
- Definir ownership por capacidad sin reorganizar todavía el código.

**Gate:** gobernanza en verde y cero contradicciones con el CANON.

### Fase 2 · Capability Inventory (semanas 3–4)

- Mapear capacidades existentes del repositorio a las diez capas OMXDS.
- Clasificar cada capacidad: reusable, extensible, duplicada, faltante o deprecable.
- Identificar fuentes únicas de identidad, entidad, contexto, inventario y eventos.
- Comparar candidatos y elegir un único vertical que permita lanzar más rápido la V1 de Valladolid.mx.

**Gate:** mapa verificable con owners, contratos y deuda priorizada.

### Fase 3 · Vertical Slice (semanas 5–8)

- Ejecutar un recorrido completo medible correspondiente al vertical seleccionado después del inventario.
- Reutilizar capacidades existentes antes de crear módulos.
- Instrumentar eventos conductuales y métricas de resultado.

**Gate:** experiencia funcional end-to-end sin duplicar identidad, pagos, notificaciones o analítica.

### Fase 4 · Learn and Scale (semanas 9–12)

- Comparar hipótesis con comportamiento real.
- Corregir fricción, calidad de datos y operación.
- Definir el siguiente vertical según impacto, no entusiasmo interno.
- Publicar roadmap V1.1 con decisiones respaldadas por evidencia.

**Gate:** decisión Founder de escalar, iterar o detener.

---

## 11. Criterios de éxito de esta fundación

La fundación queda completa cuando:

- OMXDS tiene una definición inequívoca y aprobada.
- Valladolid.mx conserva su autoridad como producto principal y DOS.
- Alux y los productos especializados tienen límites claros.
- No existe una carpeta documental paralela ni una arquitectura duplicada.
- Las capacidades regionales cuentan con ownership y fuente única.
- La selección del primer vertical queda gobernada por el inventario de capacidades, el tiempo de lanzamiento de Valladolid.mx y métricas de negocio explícitas.
- Los validadores de gobernanza terminan en PASS.

---

## 12. Registro de aprobación Founder

El Founder aprobó el 2026-07-21:

1. La definición oficial de **OMXDS — Oriente Maya Experience & Destination System**.
2. La jerarquía **OMXDS → Valladolid.mx / Alux / productos especializados**.
3. **Noches adicionales atribuibles al ecosistema por cada 1,000 viajeros activos** como North Star inicial.
4. La publicación canónica de esta Foundation V1.0.

El primer vertical operativo no queda predeterminado. Se decidirá después del inventario de capacidades y se priorizará el que permita lanzar más rápido la V1 de Valladolid.mx.

---

## 13. Control de versión

| Versión | Fecha | Estado | Descripción |
|---|---|---|---|
| 1.0 | 2026-07-21 | Approved | Definición fundacional de OMXDS aprobada por el Founder; el primer vertical queda sujeto al inventario de capacidades y a la velocidad de lanzamiento de Valladolid.mx. |
