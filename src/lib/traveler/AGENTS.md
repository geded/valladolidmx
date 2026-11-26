# Traveler rules

- Trip progress: Mi Viaje's itinerary «Tu avance» (current day, done/total, next stop) derives only from the pure `src/lib/traveler/trip-progress.ts` over plan items and the per-device `itinerary-progress` marks. Why: one progress answer offline without touching reservations.
