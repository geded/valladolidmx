# Cache rules

- Cold shared reads run alongside the CMS stamp read and deduplicate by key while pending; validate timestamps before reuse. Why: remove a sequential database round trip and concurrent duplicate reads without weakening invalidation.
- Public read memo serves stale copies up to 30 min while refreshing, and `/api/public/hooks/public-page-warm` (every 10 min) revisits sitemap pages via `page-warm.ts`. Why: first visits to cold pages took 2–9 s and timed out under load.
- CMS writes on public content tables fire a statement trigger that clears `public_read_cache` and stamps `__cms_changed__`; `publicReadMemo` drops copies older than that stamp (checked every 5 s per server). Why: edits must show immediately despite the 30-min stale window.
- Shared anonymous HTML is fresh for 60 s; `src/server.ts` serves copies up to 10 min old instantly (only if newer than the CMS stamp, deployment-scoped keys) and re-renders them via `ctx.waitUntil` with a per-isolate refresh token. Why: a 2–5 s synchronous re-render after one idle minute showed as a black launch screen; photo signatures outlive the window.
- HTML storage is gzip+base64 and decoded before responding; Server-Timing separates lookup/unpack from hosting latency. Why: shrink database transfers without double-compressing browser responses.
