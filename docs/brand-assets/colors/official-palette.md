# Paleta Oficial Valladolid.mx — Propuesta

**Estado:** Propuesta — pendiente de aprobación.
**Fuente:** Análisis cromático de los activos oficiales disponibles en
`docs/brand-assets/logos/logo.png` y `docs/brand-assets/photography/hero/`
(bg01.jpg, bg02.jpg).
**Marco normativo:** Documento 12B — Protección de la Identidad Oficial de Marca.

---

## Método

Se cuantificaron los colores dominantes del logotipo oficial y de las dos
fotografías hero oficiales. Del logotipo se extrajeron tres familias
cromáticas nucleares: **ocre cálido**, **verde oliva/selva** y **cian
cenote**. Las fotografías hero confirmaron la presencia de **arenas y
cremas cálidas** (arquitectura colonial de Valladolid) y de **verdes
selva** y **azules cielo/cenote**. La paleta propuesta no inventa color:
normaliza los valores ya presentes en los activos oficiales y los
complementa con neutros cálidos compatibles para fondo y texto.

---

## Paleta propuesta

| Rol | Nombre | HEX | OKLCH |
| --- | --- | --- | --- |
| Color Primario | Ocre Valladolid | `#EAA840` | `oklch(77.7% 0.140 74.9)` |
| Color Secundario | Verde Selva | `#5C6E3F` | `oklch(51.1% 0.073 125.9)` |
| Color de Acento | Cenote | `#00B1D3` | `oklch(70.2% 0.126 218.1)` |
| Color Cenote (profundo, accesible) | Cenote Profundo | `#0E7E96` | `oklch(54.8% 0.096 217.9)` |
| Color Selva (oscuro, jerarquía) | Selva Oscuro | `#2D3A1F` | `oklch(32.9% 0.048 129.7)` |
| Color Piedra Caliza | Caliza | `#ECE4D3` | `oklch(92.1% 0.024 85.8)` |
| Color Fondo | Crema Cálido | `#FBF7EE` | `oklch(97.7% 0.013 86.8)` |
| Color Texto | Noche Maya | `#1C1D14` | `oklch(22.7% 0.017 112.9)` |

---

## Justificación por color

### Primario — Ocre Valladolid `#EAA840`
Color dominante del logotipo oficial y de las fachadas de Valladolid en la
fotografía hero `bg01.jpg`. Es el ADN cromático más reconocible de la
marca. Se usa en CTAs, énfasis editorial y elementos de identidad.

### Secundario — Verde Selva `#5C6E3F`
Verde olivo presente tanto en el logotipo como en la vegetación de
`bg02.jpg`. Aporta el anclaje territorial al Oriente Maya y equilibra la
calidez del primario. Apto para superficies, bordes y estados sutiles.

### Acento — Cenote `#00B1D3`
Cian extraído directamente del logotipo (agua de cenote). Usar con
moderación para destacar acciones secundarias, badges, links activos y
microacentos editoriales. No debe competir con el primario.

### Cenote Profundo `#0E7E96`
Variante oscurecida del Acento para garantizar contraste **AA/AAA** sobre
fondos claros en texto, iconos y enlaces. Resuelve la baja legibilidad del
cian puro como tinta.

### Selva Oscuro `#2D3A1F`
Verde profundo derivado de las sombras de vegetación de `bg02.jpg`. Útil
para tipografía secundaria, footers, modo oscuro y jerarquía sin recurrir
al negro puro.

### Piedra Caliza `#ECE4D3`
Crema medio derivado de las piedras y muros calizos de las fotografías.
Superficie cálida para cards, secciones alternas y separadores. Evita la
frialdad clínica del gris neutro.

### Fondo — Crema Cálido `#FBF7EE`
Blanco roto cálido. Es el fondo base de toda la plataforma, coherente con
la luminosidad de los activos fotográficos oficiales. Cumple Regla 4 del
Doc 12B: modernizar sin reinventar.

### Texto — Noche Maya `#1C1D14`
Casi-negro con un sesgo cálido (no neutro frío) que combina con la base
crema. Garantiza contraste AAA sobre Fondo y Caliza para textos largos.

---

## Reglas de uso

- **Jerarquía:** Primario para acción principal; Acento solo en
  micro-momentos; Secundario para anclaje territorial.
- **Accesibilidad:** Para texto sobre fondo claro usar Texto, Selva
  Oscuro o Cenote Profundo (nunca Acento `#00B1D3` como tinta de
  cuerpo).
- **Fotografía:** La fotografía oficial es la protagonista; los colores
  son acompañamiento, no decoración.
- **Prohibido:** introducir colores fuera de esta paleta sin actualizar
  este documento y obtener aprobación explícita.

---

## Estado

Pendiente de aprobación. Hasta entonces, **no se modifican los tokens
del Design System** (`src/styles.css`). Tras aprobación, esta paleta se
convertirá en la única fuente cromática oficial del proyecto.