# Cache rules

- Public read memo serves stale copies up to 30 min while refreshing, and `/api/public/hooks/public-page-warm` (every 10 min) revisits sitemap pages via `page-warm.ts`. Why: first visits to cold pages took 2–9 s and timed out under load.
