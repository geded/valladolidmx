# Menu rules

- Menu store: `business_menu_items` is the only carta store. Why: one menu authority, reference-only prices.

- Carta flow: CMS business editor and Portal ficha both mount `BusinessMenuPanel`; photos/PDF go through `readMenuFromFiles` and land as unsaved rows the editor reviews before `saveBusinessMenu`; the public page renders `ExperienceMenu` (`vmx.experience.menu`, anchor `#menu`) inside `BusinessSurface` from `readPublishedMenu`; every Alux channel reads it via `loadMenusFor` in `converse-retrieval.server.ts`, always as reference prices. Why: one authority across editor, preview, public page and Alux, and menu items are sold online only through the pickup-order flow when the business has «Pedidos para recoger» on (see `src/lib/commerce/AGENTS.md`).
