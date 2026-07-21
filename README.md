# Valladolid.mx

**Destination Operating System del Oriente Maya de Yucatán**

Valladolid.mx es la plataforma digital del destino para conectar viajeros, empresas, comunidades, operadores e instituciones durante todo el ciclo del viaje: inspiración, exploración, planeación, preparación, estancia y memoria.

No es solamente un portal turístico, un marketplace, una OTA o un chatbot. Es infraestructura de destino: organiza información, experiencias, operación, inteligencia turística y colaboración territorial bajo una misma arquitectura.

## Resultados que gobiernan el producto

Toda capacidad debe contribuir de forma verificable a uno o más de los North Stars definidos en el [CANON](./docs/governance/00-CANON.md):

- aumentar la permanencia del visitante;
- incrementar el consumo local;
- distribuir mejor el turismo;
- fortalecer a las empresas locales;
- mejorar la experiencia integral del viajero;
- generar inteligencia turística para el destino;
- preservar el patrimonio cultural y natural.

Si una iniciativa no mejora la experiencia del viajero ni fortalece el ecosistema local, no merece infraestructura nueva.

## Autoridad documental

Antes de proponer, diseñar o implementar cambios, se debe leer la documentación en este orden:

1. [`docs/governance/00-CANON.md`](./docs/governance/00-CANON.md) — identidad, propósito, principios y North Stars.
2. [`docs/governance/README.md`](./docs/governance/README.md) — jerarquía canónica completa y reglas de precedencia.
3. [`docs/blueprint/16.00-PRODUCT-EVOLUTION-ROADMAP-v2.1.md`](./docs/blueprint/16.00-PRODUCT-EVOLUTION-ROADMAP-v2.1.md) — única priorización vigente del producto.
4. [`docs/blueprint/START-HERE-FIRST.md`](./docs/blueprint/START-HERE-FIRST.md) — entrada operativa al universo histórico de Blueprints.
5. [`.lovable/plan.md`](./.lovable/plan.md) — plan de ejecución subordinado; nunca crea autoridad ni prioridades nuevas.

La precedencia no depende de la fecha del archivo. Ante una contradicción, prevalece el nivel documental superior y la decisión debe resolverse mediante el marco de gobernanza.

## Mapa del repositorio

| Ruta                  | Responsabilidad                                                                |
| --------------------- | ------------------------------------------------------------------------------ |
| `src/`                | Aplicación, rutas, componentes y capacidades de producto.                      |
| `docs/governance/`    | CANON, lenguaje oficial, reglas, índice, dependencias y grafo de conocimiento. |
| `docs/blueprint/`     | Blueprints, PRD, reportes, auditorías y evidencia histórica inventariada.      |
| `docs/decisions/`     | ADR y decisiones arquitectónicas aprobadas.                                    |
| `scripts/governance/` | Validadores reproducibles de las proyecciones canónicas.                       |
| `supabase/`           | Persistencia, migraciones y configuración de servicios de datos.               |
| `public/`             | Activos públicos de la aplicación.                                             |
| `.lovable/plan.md`    | Secuencia operativa vigente, subordinada al roadmap.                           |

## Desarrollo local

### Requisitos

- Bun `1.3.14`, fijado en `package.json`.
- Variables y credenciales del entorno correspondiente. No se versionan secretos.

### Instalación y ejecución

```bash
bun install --frozen-lockfile
bun run dev
```

### Controles disponibles

```bash
bun run typecheck
bun run lint
bun run build
```

El servidor de desarrollo usa Vite. La aplicación se construye con TanStack Start, React y TypeScript; la persistencia e integraciones se conectan a través de las capacidades declaradas por el proyecto.

## Validación de gobernanza

Las proyecciones canónicas de dependencias y conocimiento deben seguir siendo reproducibles:

```bash
bun scripts/governance/validate-dependency-map.mjs
bun scripts/governance/validate-knowledge-graph.mjs
```

Un cambio que afecte `06`, `07`, `08`, sus JSON derivados o sus fuentes debe ejecutar ambos validadores y registrar la evidencia resultante.

## Reglas de contribución

- CANON primero: ninguna implementación puede contradecir la gobernanza aprobada.
- Comportamiento antes que tecnología: definir el cambio humano esperado antes de escoger la solución.
- Valor de negocio antes que infraestructura: toda capacidad debe declarar el resultado que busca mejorar.
- Reutilizar antes de construir: comprobar capacidades existentes antes de crear módulos o fuentes paralelas.
- Entidades antes que pantallas: las superficies proyectan el dominio; no lo redefinen.
- Evidencia antes que estado: un Blueprint aprobado no demuestra implementación ni operación productiva.
- Una fuente de verdad: enlazar la definición canónica en vez de copiarla.
- `main` protegida: trabajar en rama, revisar mediante PR y conservar trazabilidad.
- Cambios aditivos y reversibles por defecto; toda excepción requiere una decisión documentada.

## Estado de la gobernanza

La gobernanza `00–08`, el ADR de los 14 dominios documentales, el mapa de dependencias y el grafo de conocimiento están aprobados. El detalle de versiones, datasets derivados y reglas de mantenimiento vive en [`docs/governance/README.md`](./docs/governance/README.md).

---

Valladolid.mx se construye para que el visitante descubra más, permanezca más tiempo y consuma localmente, mientras el Oriente Maya de Yucatán gana capacidad propia para conocerse, organizarse y crecer.
