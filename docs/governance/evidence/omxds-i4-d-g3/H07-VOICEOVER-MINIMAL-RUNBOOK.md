# I4-D · G3 · Procedimiento mínimo H07 (VoiceOver) ejecutable desde iPad

**Duración:** 8–10 min · **Dispositivo:** iPad Safari · **Rol:** editorial de prueba
**Superficie:** `/cms/experience-builder?mode=visual&page=home`
**FLAG:** `omxds_visual_v1_contracts_enabled=false` · **Producción:** no tocada · **G3:** BLOCKED
**No repetir:** H01, H02, H03, H04, H08 (PASS humano) · H05, H06, H09, H10 (PASS objetivo admisible).

## Preparación (2 min)

1. Ajustes → Accesibilidad → Atajo de accesibilidad → activa **VoiceOver** (triple clic del botón lateral).
2. Abre la superficie en Safari e inicia **grabación de pantalla con audio del micrófono activado**
   (así queda registrada la locución de VoiceOver).

## Pasos (5 min · una sola grabación continua)

1. Activa VoiceOver y desliza a la derecha para recorrer el inicio de la página:
   deben anunciarse **encabezado (banner), navegación y contenido principal** con nombre.
2. Continúa hasta los botones principales del Studio (dispositivo, guardar, vista previa):
   cada uno debe anunciar **nombre + rol «botón»**, no «botón sin etiqueta».
3. Activa **«Añadir sección»**: debe anunciarse como **diálogo** con nombre.
4. Cierra el diálogo: el foco de VoiceOver debe **volver al botón de origen**.
5. Desactiva VoiceOver y detén la grabación.

## Criterio de aceptación

| Comprobación | Esperado |
| ------------ | -------- |
| Landmarks | banner / nav / main anunciados |
| Botones | nombre accesible + rol correcto, ninguno «sin etiqueta» |
| Diálogo | anunciado como diálogo, con nombre |
| Foco al cerrar | regresa al control de origen |

## Entrega

Envía una sola grabación e indica **PASS/FAIL** por cada fila de la tabla anterior.
Si algún control se anuncia sin etiqueta, nómbralo: eso genera defecto concreto y reproducible.

## Nota sobre H11 y H12

No se solicitan todavía. Antes de programarlos hay que confirmar:
composición **sandbox** `g3-sandbox-oriente-maya` creada y no publicada,
**cuenta A (autora)** y **cuenta B (aprobadora)** distintas y con permisos reales de aprobación/publicación.
Sin esas tres condiciones confirmadas, H11 y H12 permanecen `PARTIAL`.
