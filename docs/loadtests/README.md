# Pruebas de carga — Ola 4 (Plan 14.40)

Scripts k6 para validar los SLOs definidos en el Plan 14.40 para
Búsqueda (Etapa 2) y Checkout (Etapa 4). Se mantienen como
entregables documentales en la Etapa 7; su ejecución es manual contra
entornos no productivos.

## Uso

```bash
BASE_URL=https://<preview>.lovable.app k6 run docs/loadtests/marketplace-search.k6.js
BASE_URL=https://<preview>.lovable.app BEARER=<token> k6 run docs/loadtests/checkout.k6.js
```

## SLOs objetivo

- search_marketplace: p95 < 800 ms, error rate < 1%.
- Checkout (createCheckoutSession): p95 < 1500 ms, error rate < 1%.

Resultados se resumen en el Reporte 14.40.7.
