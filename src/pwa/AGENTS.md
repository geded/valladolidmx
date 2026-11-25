# PWA

- Installed-app launch: public navigations use StaleWhileRevalidate with `src/pwa/launch-shell.ts` (tests in `scripts/pwa/`): with no open window the SW serves the stored page only if it contains the currently precached `index-*.js`, otherwise network first; the root then soft-refreshes data when the page is over 2 minutes old (`data-rendered-at`). Why: iOS stayed black 3–4 s waiting for SSR and fonts, and a copy from another publish would point at retired chunks.
