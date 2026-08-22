# I4-D · G3 · Runbook de sesión humana única (G3-H03 … G3-H12)

**Estado:** preparado · **G3:** BLOCKED · **FLAG:** `omxds_visual_v1_contracts_enabled=false` · **Producción:** no tocada
**Entorno permitido:** no público, datos ficticios. No publicar, no desplegar, no usar datos reales.
**Superficie base:** `/cms/experience-builder?mode=visual&page=<composición de prueba>`

## 0. Datos de prueba aislados y reversibles

Crear en la sesión (no reutilizar la Página de Inicio publicada):

- Composición ficticia: **`G3 Sandbox · Oriente Maya`**, slug **`g3-sandbox-oriente-maya`** (no enlazada, no publicada en producción).
- Bloques: 1 × `vmx.experience.section` (authorable) + 1 × `vmx.experience.info-grid` (gobernado, fuente `geography.location`).
- Actores: **Autor** = cuenta editorial de prueba; **Aprobador** = cuenta distinta con permiso de aprobación.
- Reversión: al terminar, dejar la composición en Draft y archivarla/eliminarla. Ninguna acción toca `home` ni rutas públicas.

## 1. Escenarios

### G3-H03 · Responsive 1024 px

- Pantalla: Studio → Vista previa → Tablet/1024. Rol: Editor o Admin. Estado inicial: composición sandbox abierta.
- Acciones: 1) fijar viewport 1024; 2) scroll vertical completo del canvas; 3) abrir menú del header; 4) usar el buscador.
- Esperado: encabezado sticky visible tras scroll, overflow horizontal 0, controles operables.
- Evidencia: captura antes/después del scroll.

### G3-H04 · Responsive 1440 px

- Igual que H03 con viewport 1440.
- Evidencia: captura antes/después del scroll.

### G3-H05 · Zoom 200 % / reflow 320 px

- Acciones: 1) zoom del navegador al 200 %; 2) recorrer la superficie; 3) reducir a 320 px CSS de ancho efectivo; 4) verificar que toda función siga accesible sin scroll horizontal.
- Evidencia: captura a 200 % y captura a 320 px.

### G3-H06 · Teclado

- Acciones: 1) Tab desde el inicio; 2) recorrer header, canvas, panel de bloques, inspector y diálogos; 3) abrir y cerrar un diálogo con Esc; 4) reordenar un bloque con teclado.
- Esperado: foco visible siempre, orden lógico, sin trampa de foco, retorno de foco al cerrar diálogos.
- Evidencia: video corto o secuencia de capturas del recorrido.

### G3-H07 · Lector de pantalla

- Acciones: activar VoiceOver (Safari/iPad) o NVDA; recorrer encabezados, landmarks, botones del Studio y el diálogo de añadir bloque.
- Esperado: nombres accesibles correctos, rol `dialog` anunciado, estados anunciados.
- Evidencia: video con audio o transcripción de anuncios.

### G3-H08 · Touch

- Acciones: en iPad, operar sin teclado: seleccionar bloque, reordenar, abrir inspector, guardar.
- Esperado: todo operable sin hover; objetivos táctiles cómodos.
- Evidencia: video corto.

### G3-H09 / G3-H10 · Tema Sol / Luna

- Acciones: 1) cambiar a Sol; 2) recorrer la composición; 3) cambiar a Luna; 4) repetir.
- Esperado: mismo contenido, orden, CTAs y estado; contraste legible.
- Evidencia: capturas emparejadas Sol/Luna del mismo scroll.

### G3-H11 · Slice vertical completo (secuencia única)

Ejecutar en este orden exacto:

1. **Autor** crea `g3-sandbox-oriente-maya` con la sección authorable y el Info Grid gobernado.
2. Autor confirma que los `items` del Info Grid provienen de `geography.location` y no son editables.
3. Autor guarda **Draft** y anota el identificador y hash del snapshot.
4. Autor genera **preview** `/preview/composition/$token`, abre en pestaña privada y verifica `noindex` y no publicación.
5. Autor envía a **Review**.
6. **Aprobador** (usuario distinto) abre la revisión y aprueba; el sistema debe ligar la aprobación al hash.
7. **Conflicto:** autor y aprobador abren la misma composición; autor edita y guarda; aprobador guarda su versión anterior → debe rechazarse con aviso de conflicto (sin last-write-wins silencioso).
8. Aprobador **publica** el sandbox (sólo el sandbox, nunca `home`).
9. Revisar **auditoría**: deben existir eventos de creación, edición, aprobación, conflicto y publicación con actor y timestamp; verificar inmutabilidad.
10. Ejecutar **rollback** a la versión anterior → debe crear un **nuevo Draft** (no publicar automáticamente) y revalidar `geography.location`.
11. Dejar la composición en Draft y archivarla.

- Evidencia: capturas de cada paso (3, 4, 6, 7, 9, 10) + identificadores y hashes anotados en la sección 5 del Acceptance Report.

### G3-H12 · Seguridad

- Acciones: 1) intentar aprobar con la cuenta del propio autor → debe rechazarse; 2) abrir el preview sin sesión → debe funcionar sólo con token válido y sin PII/secrets; 3) usar un token caducado/inválido → mensaje gobernado «Vista previa no disponible»; 4) simular fuente gobernada no disponible → bloque en estado fail-closed, nunca datos inventados.
- Evidencia: capturas de los 4 intentos.

## 2. Registro

Al terminar, trasladar cada resultado (PASS/FAIL + referencia de evidencia) a la tabla del Acceptance Report y declarar Open P0 / Open P1. Sólo entonces se ejecuta el cierre documental de G3.
