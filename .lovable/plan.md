# C0 · Contención y baseline comercial de Experiencias

## Objetivo

Cerrar el riesgo actual de que una empresa active venta en línea o modifique la comisión efectiva, sin alterar fichas Premium, publicación editorial, Arma tu Viaje, órdenes existentes, pagos, reservaciones ni la operación de Concierge.

## Alcance autorizado

### 1. Contención en servidor y datos
- Sustituir la autorización empresarial del ajuste de venta directa por autorización exclusiva de `admin` o `super_admin`.
- Mantener los valores comerciales existentes sin migrarlos ni reinterpretarlos como aprobación comercial.
- Incorporar las banderas C0–C8 en `platform_settings`, privadas y apagadas por defecto.
- Mantener la lectura histórica necesaria para diagnóstico administrativo.

### 2. Contención en el Portal Empresa
- Convertir “Ventas en línea” en una vista informativa de sólo lectura.
- Retirar los controles que hoy permiten activar venta, fijar comisión o cambiar condiciones.
- Conservar el acceso a las ventas históricas de la empresa.
- Explicar que la empresa podrá solicitar la modalidad comercial cuando C1 esté autorizado; C0 no crea todavía esa solicitud.

### 3. Diagnóstico administrativo
- Conservar `/cms/ventas-en-linea` como lectura de órdenes y comisiones históricas.
- Identificar claramente sus importes como diagnóstico operativo, no como liquidaciones acreditadas.
- No añadir capacidad de cobro, reembolso, conciliación o pago a empresas.

### 4. Evidencia y cierre
- Añadir pruebas negativas que demuestren que una empresa no puede activar venta ni modificar comisión por UI o llamada directa.
- Verificar que admin conserva el diagnóstico y que todos los flags permanecen apagados.
- Ejecutar typecheck, pruebas focalizadas, cobertura de rutas y comprobaciones de gobernanza disponibles.
- Validar Portal Empresa y diagnóstico CMS en 1440, 834, 430 y 390 px.
- Documentar Scope Gate, Preservation Gate, inventario técnico, ADR propuesto de autoridad comercial/ledger, rollback y Completion Report C0.

## Invariantes preservadas

- Plantillas Premium y fichas públicas.
- CMS editorial de Productos y su workflow.
- Arma tu Viaje, Travel Plan, Alux y Concierge.
- Folios ERL/AVL, `concierge_orders`, reservaciones y pagos existentes.
- Datos comerciales históricos, sin borrado ni reescritura.
- Stripe/live, cobros reales y flags continúan apagados.

## Fuera de alcance

- `/cms/experiencias` y sus nueve pestañas (C2).
- Estados y autorización comercial (C1).
- Calendario, inventario y cupos (C3).
- Checkout sandbox/live, ledger, conciliación, reembolsos y liquidaciones (C4–C8).
- Publicación o despliegue.

## Gate de salida

C0 termina con un Completion Report y una demostración verificable. C1 no comienza hasta una nueva aprobación explícita del Founder.