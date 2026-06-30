# SYSTEM COVERAGE REPORT v1.0 — Valladolid.mx

**Versión:** 1.0 (línea base)
**Estado:** Vigente · documento vivo
**Fecha:** 2026-06-30
**Mantenimiento:** se actualiza al cierre de cada ola importante.
**Documento complementario:** `15.10.4R-TRACEABILITY-MATRIX.md`

---

## 1. Cobertura global del Blueprint

| Indicador | Valor |
|---|---|
| Capacidades auditadas | 85 |
| Implementadas (total ✅+🟡+🟠) | 78 |
| Implementadas y accesibles desde `/admin` | 12 |
| Implementadas parcialmente | 9 |
| Pendientes | 2 |
| Fuera de alcance (diferidas a olas futuras) | 5 |
| **Cobertura funcional global** | **91.8 %** |
| **Cobertura accesible desde Panel Fundador** | **14.1 %** |
| **Deuda técnica documentada** | **11 ítems** |

## 2. Cobertura por serie / ola

| Serie · Ola | Dominio principal | Implementado | Accesible /admin | Estado |
|---|---|---|---|---|
| 11.x | DB / Identidad / Seguridad | 100 % | 60 % | ✅ |
| 12 / 12C / 12D | Home + Visual Governance | 100 % | 100 % | ✅ |
| 13.x (Gates A–E) | Fase 1 Governance / CMS | 100 % | 30 % | 🟡 |
| 14.10 Ola 1 | CMS Studio | 100 % | 0 % (sin enlace en `/admin`) | 🟡 |
| 14.20 Ola 2 | Content Migration | 100 % | 0 % | 🟡 |
| 14.30 Ola 3 | Portal Empresarial | 100 % | 0 % | 🟡 |
| 14.40 Ola 4 | Marketplace + Pagos | 100 % | 0 % | 🟡 |
| 14.50 Ola 5 | Notificaciones / Observabilidad | 100 % | 0 % | 🟡 |
| 14.50.6 Ola 6 | Centro de actividad | 100 % | 0 % | 🟡 |
| 15.10.1 | EB Foundations | 100 % | 0 % | 🟡 |
| 15.10.2 ADENDA | EB Studio v0 | 100 % | 0 % | 🟡 |
| 15.10.3 | EB Home migration | 100 % | 0 % | 🟡 |
| 15.10.4 / 4b | Alux Operational Platform | 90 % | 20 % | 🟡 |
| **15.10.4R** | **Founder Admin Completion** | **0 %** (en ejecución) | — | **▶** |

## 3. Cobertura por dominio

| Dominio | Implementado | Accesible `/admin` | Pendientes |
|---|---|---|---|
| CMS | 100 % | 0 % (pre-remediación) | Articles/Events/Banners/Promotions/FAQs editors |
| Experience Builder | 100 % | 0 % | UI de templates/themes/variants/sections |
| Portal Empresarial | 100 % | 0 % | — |
| Marketplace | 100 % | 0 % | — |
| Pagos | 100 % | 0 % | — |
| Concierge | 90 % | 0 % | UI de propuestas, cotizaciones, asignaciones |
| Alux | 80 % | 0 % | Panel `/admin/ia` |
| Notificaciones | 100 % | 30 % (actividad) | Paneles directos de Email/Push/Webhooks |
| Observabilidad | 100 % | 0 % | — |
| Identidad / Roles | 100 % | 0 % | Panel `/admin/sistema/usuarios` |
| Home / Territorial | 100 % | 100 % | — |
| Visual Governance | 100 % | n/a | — |

## 4. Mapa de dependencias entre dominios

```text
Identidad ──▶ todos los dominios (RLS, has_role)
CMS ──▶ Home, Marketplace (catálogo), Portal (ficha)
Experience Builder ──▶ Home, Landings `/l/$slug`
Portal ──▶ CMS (empresas, productos), Pagos, Concierge (CC)
Marketplace ──▶ Pagos, Notificaciones, Concierge
Concierge ──▶ Alux, Notificaciones, Pagos
Alux ──▶ Concierge, Notificaciones, AI Gateway
Notificaciones ──▶ Email, Push, Webhooks, IAC, Activity Center
Observabilidad ──▶ todos (logs, alertas)
Panel Fundador (/admin) ──▶ entrada operativa única (15.10.4R)
```

## 5. Riesgos abiertos

| ID | Riesgo | Mitigación |
|---|---|---|
| R1 | Dispersión de superficies admin (CMS / Portal / Concierge sin entrada única) | 15.10.4R Pasos B–D |
| R2 | CMS editorial (Articles/Events/Banners/…) sin UI de edición | Diferido a 15.10.5+ |
| R3 | EB Studio percibido como complejo para no-expertos | 15.10.10 (post-MVP) |
| R4 | Sin panel de gestión de usuarios y roles | 15.10.4R Paso E |
| R5 | Falta de tablero ejecutivo permanente | **Mitigado** con este SYSTEM COVERAGE REPORT |
| R6 | Drift Blueprint ↔ implementación | **Mitigado** con Matriz viva 15.10.4R |

## 6. Próxima ola responsable de cada pendiente

| Pendiente | Próxima ola |
|---|---|
| `/admin/sistema/usuarios` (roles) | 15.10.4R Paso E |
| `/admin/sistema` (config sólo-lectura) | 15.10.4R Paso C |
| `/admin/empresas` agregado | 15.10.4R Paso C |
| `/admin/turistas` agregado | 15.10.4R Paso C |
| `/admin/concierge` agregado | 15.10.4R Paso C |
| `/admin/operaciones` agregado | 15.10.4R Paso C |
| `/admin/ia` agregado (Alux) | 15.10.4R Paso C |
| Editores CMS (Articles/Events/Banners/Promotions/FAQs/Routes/SEO) | 15.10.5 (CMS Editorial Completion) |
| Concierge UI (propuestas/cotizaciones/asignaciones) | 15.10.5 |
| EB Templates/Themes/Variants/Sections UI | 15.10.6 |
| Embeddings Queue · AI Prompts · AI Usage Log | 15.10.7 (AI Ops) |
| Leads CRM · Monetización | Series 16+ |
| Simplificación EB para no expertos | 15.10.10 |

## 7. Evolución porcentual

| Reporte | Cobertura global | Cobertura accesible `/admin` | Δ accesible |
|---|---|---|---|
| Línea base (este reporte) | 91.8 % | 14.1 % | — |

Los próximos reportes se anexarán como filas adicionales para evidenciar la
evolución acumulada del proyecto.

## 8. Gobernanza

- Este documento **no sustituye** a `15.10.4R-TRACEABILITY-MATRIX.md`: la
  Matriz mantiene la trazabilidad fila-a-fila; este reporte ofrece la lectura
  ejecutiva agregada.
- Se actualiza al cierre de cada ola importante (al menos cada cierre de
  Wave 14.x o 15.x).
- Toda nueva ola debe declarar su impacto en cobertura aquí antes de ser
  declarada cerrada.

## Historial

- v1.0 — Línea base emitida junto con la aprobación del Plan 15.10.4R.