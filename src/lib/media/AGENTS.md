# Public variant delivery

- `attachReadyVariants` checks published/non-deleted assets in a bulk query matching the public proxy before offering derived URLs; preserve configured original fallbacks. Why: old compositions may reference draft assets whose variants the proxy must refuse; never relax that public boundary.