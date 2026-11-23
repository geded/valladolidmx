# Visibility rules

- Listing order: full public listings (business families via `buildPublicListing`, experiences via `experience-public-reads.server.ts`) receive organic alphabetical rows and place paid packages with `arrangeListing` in `commercial-slots.ts` — first card of every block of 4, one commercial slot per business, pinned spotlights first, weighted daily rotation, nothing hidden; only the slotted card is marked `commercialPlacement: "contratado"` («Recomendado»). Why: the approved 2026-09-18 visibility plan bounds paid exposure in every listing instead of an unbounded boost sort.
