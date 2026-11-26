import { haversineKm } from "@/lib/alux/proximity";

/** Non-billable preview; not a measured road route or live traffic. */
export function approximateRoute(input: {
  originLat: number; originLng: number; destLat: number; destLng: number;
  travelMode?: "DRIVE" | "WALK" | "BICYCLE" | "TWO_WHEELER";
}) {
  const distanceMeters = Math.round(haversineKm(
    { lat: input.originLat, lng: input.originLng },
    { lat: input.destLat, lng: input.destLng },
  ) * 1.3 * 1000);
  const speed = input.travelMode === "WALK" ? 5 : input.travelMode === "BICYCLE" ? 15 : 50;
  return { ok: true, distanceMeters, durationSeconds: Math.round(distanceMeters / 1000 / speed * 3600), estimated: true as const };
}