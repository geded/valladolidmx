# Cache rules

- Public read memo serves stale copies up to 30 min while refreshing, and `/api/public/hooks/public-page-warm` (every 10 min) revisits sitemap pages via `page-warm.ts`. Why: first visits to cold pages took 2–9 s and timed out under load.
- CMS writes on public content tables fire a statement trigger that clears `public_read_cache` and stamps `__cms_changed__`; `publicReadMemo` drops copies older than that stamp (checked every 5 s per server). Why: edits must show immediately despite the 30-min stale window.
