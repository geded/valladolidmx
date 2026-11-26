# Public variant delivery

- `attachReadyVariants` checks published/non-deleted assets in a bulk query matching the public proxy before offering derived URLs; preserve configured original fallbacks. Why: old compositions may reference draft assets whose variants the proxy must refuse; never relax that public boundary.
- Both public proxies authorize the existing asset/variant first, then stream image bytes through `publicMediaObjectResponse` using the official signed-URL cache; they never expose or follow a Storage redirect. Why: stable canonical/derived URLs stay unchanged while the browser sees only our domain and published images.
