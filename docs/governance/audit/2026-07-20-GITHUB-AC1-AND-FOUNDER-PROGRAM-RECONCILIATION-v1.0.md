# Auditoría · GitHub, cierre AC1 y preparación del Programa Fundadores v1.0

**Fecha:** 2026-07-20  
**Estado:** Cerrada  
**Alcance:** PR #1–#7, publicación directa, AC1.4–AC1.5 y transición al Programa Fundadores Valladolid.

## 1. Conclusión ejecutiva

El repositorio ya contenía la plataforma técnica para registrar, reclamar, verificar, administrar y publicar empresas. El problema no era rehacer esa plataforma. Existían cuatro desalineaciones: historia dividida entre ramas, documentos que describían estados anteriores, dos contratos locales para el viaje anónimo y una dependencia operativa incorrecta de GitHub CLI en un entorno donde el Founder no trabaja desde una computadora local.

Los PR #1–#7 dejaron una única base en `main`, cerraron CV8.9, unificaron AC1 sobre `AnonymousTravelDraft`, corrigieron el dock anónimo, verificaron producción y registraron la conexión directa de GitHub como canal principal. El pendiente real ya no es técnico: es formar y verificar una cohorte de empresas reales.

## 2. Hallazgos y resolución

| ID | Antes | Riesgo | Resolución | Evidencia final |
| --- | --- | --- | --- | --- |
| A-01 | Trabajo dividido entre `main` y ramas de benchmark/producto. | Historia, paquetes y roadmap podían divergir. | Reconciliación no destructiva y una base única. | PR #1. |
| A-02 | Gobernanza duplicada y dos lockfiles incompatibles. | Fuentes de autoridad y builds no reproducibles. | Serie `00–08`, Bun 1.3.14 y `bun.lock` único. | PR #1. |
| A-03 | CV8 producía inteligencia, pero faltaba una cola humana gobernada. | Recomendaciones sin decisión ni trazabilidad. | Action Queue, roles, auditoría, UI y feedback. | PR #2–#4. |
| A-04 | Botones anónimos escribían `AnonymousTravelDraft`, mientras otras superficies leían `guest-queue`. | Pérdida aparente, duplicidad o discontinuidad al autenticarse. | Contrato local único, migración local legacy e importación idempotente poslogin. | PR #5. |
| A-05 | El dock flotante conservaba una regla heredada “sólo autenticado”. | El viaje existía localmente, pero el anónimo no tenía acceso persistente ni CTA de guardado. | Dock `Tu viaje`, resumen y registro progresivo opt-in. | PR #6 y smoke público. |
| A-06 | El flujo de publicación se detenía si `gh` no estaba instalado. | El Founder podía creer que los cambios estaban guardados cuando sólo existían localmente. | Conexión directa de GitHub como vía principal; `gh` queda como alternativa. | PR #7 y `.lovable/plan.md`. |
| A-07 | Roadmap y Completion Report seguían diciendo que AC1 estaba pendiente. | El siguiente equipo podía repetir trabajo ya desplegado. | Cierre documental con SHAs, deployment y smokes reales. | PR #7. |
| A-08 | “Programa Fundadores” existía como hito, pero sin un plan operativo canónico. | Confundir capacidad técnica con empresas reales incorporadas. | Plan operativo y checklist verificable separados del runtime. | `17.1-PROGRAMA-FUNDADORES-VALLADOLID-OPERATING-PLAN-v1.0.md`. |

## 3. Estado final verificado

- `main` contiene los PR #1–#7.
- AC1.4–AC1.5 está cerrado en producción.
- La planeación anónima permanece local-first y sin filas de base de datos por interacción.
- La conversión anónimo → autenticado fue confirmada con Río Lagartos.
- El dock `Tu viaje (1)` y el prompt progresivo fueron verificados en producción.
- La recarga conserva el viaje local en el mismo navegador.
- No se crearon usuarios ni empresas artificiales como evidencia de cierre.
- La publicación futura usa primero la conexión directa de GitHub.

## 4. Documentos que quedaron completados

| Documento | Situación anterior | Estado actual |
| --- | --- | --- |
| Completion Report AC1.4–AC1.5 | Integración y dock aparecían pendientes. | Cerrado con evidencia de PR #5, PR #6, deployment y smoke. |
| Roadmap v2.1 | AC1 figuraba como cierre técnico en rama. | AC1 figura cerrado; Programa Fundadores es el siguiente hito. |
| `.lovable/plan.md` | Conservaba una rama/base antigua y dependía del siguiente PR de AC1. | Registra `main`, el cierre y la política de publicación directa. |
| Programa Fundadores | Sólo aparecía como recomendación y meta de 15–25. | Cuenta con alcance, checklist, estados, métricas y gates operativos. |

## 5. Pendientes legítimos, no defectos del repositorio

- Seleccionar empresas reales; no deben inventarse ni sembrarse como evidencia.
- Aprobar la oferta comercial. “0% de comisión durante seis meses” permanece como propuesta del assessment, no como condición vigente.
- Designar responsable de contacto, verificación y publicación.
- Incorporar un mínimo de 15 empresas publicables, con objetivo de 25.
- Observar una segunda sesión autenticada real para confirmar operacionalmente que una importación AC1 ya completada no se repite; el contrato está cubierto por pruebas automatizadas y no bloquea el cierre.

## 6. Decisión resultante

No abrir otra épica técnica para “arreglar empresas”. Usar las capacidades existentes y ejecutar el Programa Fundadores como una operación humana controlada. Cualquier landing, automatización o cambio del portal debe responder a una fricción observada durante esa cohorte y volver a pasar por autorización Founder.
