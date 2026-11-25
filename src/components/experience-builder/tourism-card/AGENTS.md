# Card media

- Listing galleries reuse `CardMediaGallery` inside existing cards, request only published same-business gallery photos on interaction, and mount only visited images (five including cover). Why: preserve card authority, CMS ordering, visibility, geometry and first-load weight without parallel cards.