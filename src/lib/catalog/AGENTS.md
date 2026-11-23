# Catalog read rules

- Public business reads scan up to `MARKETPLACE_BUSINESS_SCAN_LIMIT` / `DESTINATION_BUSINESS_SCAN_LIMIT` rows (backend max per query), split id lists with `selectInChunks` (`chunk-ids.ts`) and sign covers in bulk with `signStorageObjects` (`src/lib/media/batch-sign.server.ts`). Why: Valladolid launches with ~200 businesses; small caps hid businesses alphabetically, long `.in()` lists break URLs, and one signing request per photo exhausts Worker subrequests.
