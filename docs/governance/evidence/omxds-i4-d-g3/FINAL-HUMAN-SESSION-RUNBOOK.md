# I4-D · G3 · Runbook final de sesión humana única (H05 · H07 · H11 · H12)

**Duración estimada:** 35–45 min · **Dispositivo:** iPad Safari · **Entorno:** no público, datos ficticios
**FLAG:** `omxds_visual_v1_contracts_enabled=false` · **Producción:** no tocada · **G3:** BLOCKED
**Superficie:** `/cms/experience-builder?mode=visual&page=<sandbox>`
**No repetir:** H01, H02, H08 (ya PASS) · H03, H04, H06, H09, H10 (acreditados por la adenda de evidencia objetiva).

## Preparación (5 min)

1. Inicia grabación de pantalla del iPad. Una sola grabación continua para toda la sesión.
2. Cuenta **A (Autor)**: cuenta editorial de prueba. Cuenta **B (Aprobador)**: cuenta distinta con permiso de aprobación (puede abrirse en ventana privada de Safari).
3. Crea la composición sandbox **`G3 Sandbox · Oriente Maya`**, slug `g3-sandbox-oriente-maya`. No enlazada, no publicada en producción. Nunca tocar `home`.

## Bloque 1 · H05 · Zoom nativo (5 min)

1. Con la composición abierta, aplica zoom nativo de Safari al 200 % (pellizco o Aa → zoom).
2. Recorre toda la superficie; verifica que no aparezca desplazamiento horizontal y que todo control siga alcanzable.
3. Reduce el ancho efectivo al mínimo (Split View estrecho ≈ 320 px CSS) y repite el recorrido.
4. Vuelve al 100 %.

**Esperado:** sin scroll horizontal, sin pérdida de función.

## Bloque 2 · H07 · VoiceOver (10 min)

1. Activa VoiceOver (triple clic del botón lateral o Ajustes → Accesibilidad).
2. Recorre: encabezados, landmarks, botones principales del Studio.
3. Abre el diálogo «Añadir sección»: debe anunciarse como diálogo, con nombre; ciérralo y comprueba que el foco vuelve al botón de origen.
4. Desactiva VoiceOver.

**Esperado:** nombres accesibles correctos, rol de diálogo anunciado, estados anunciados.

## Bloque 3 · H11 · Slice vertical con dos cuentas (15 min)

Secuencia exacta:

1. **A** añade a la sandbox un bloque `vmx.experience.section` (editable) y un `vmx.experience.info-grid` (gobernado, fuente `geography.location`).
2. **A** confirma que los `items` del Info Grid no son editables.
3. **A** guarda **Draft** y anota identificador y hash del snapshot.
4. **A** genera **preview** `/preview/composition/$token`, la abre en pestaña privada y verifica `noindex` y no publicación.
5. **A** envía a **Review**.
6. **B** abre la revisión y **aprueba**; la aprobación debe quedar ligada al hash.
7. **Conflicto:** A y B abren la misma composición; A edita y guarda; B guarda su versión anterior → debe rechazarse con aviso de conflicto.
8. **B publica sólo la sandbox.**
9. Revisar **auditoría**: creación, edición, aprobación, conflicto y publicación con actor y timestamp.
10. Ejecutar **rollback** → debe crear un **nuevo Draft**, no publicar, y revalidar `geography.location`.
11. Dejar la sandbox en Draft y archivarla.

## Bloque 4 · H12 · Autorización y seguridad (7 min)

1. Intentar aprobar con la **misma cuenta autora** → debe rechazarse.
2. Abrir el preview **sin sesión** → sólo debe funcionar con token válido y sin PII ni secretos.
3. Usar un token caducado/inválido → mensaje gobernado «Vista previa no disponible».
4. Simular fuente gobernada no disponible → bloque en fail-closed, nunca datos inventados.

## Cierre de sesión

Detén la grabación y envíala una sola vez, indicando PASS/FAIL por bloque y los identificadores/hashes del Bloque 3. Con eso se ejecutan, **una única vez**, los gates finales:

```
bun run typecheck
bun run lint
bun run test:i4:d
bun run validate:i4:d
bun run governance:check
bun run governance:product-check
bun scripts/governance/sync-governance.mjs --check
```
