import { describe, expect, it } from "bun:test";
import { approximateRoute } from "../../src/lib/maps/route-preview";

describe("Non-billable route preview", () => {
  it("marks estimates and computes zero for the same point", () => {
    expect(approximateRoute({ originLat: 20.69, originLng: -88.2, destLat: 20.69, destLng: -88.2 }))
      .toEqual({ ok: true, distanceMeters: 0, durationSeconds: 0, estimated: true });
  });
  it("walking is slower than driving for the same accredited coordinates", () => {
    const input = { originLat: 20.69, originLng: -88.2, destLat: 20.7, destLng: -88.2 };
    const drive = approximateRoute(input);
    const walk = approximateRoute({ ...input, travelMode: "WALK" });
    expect(drive.distanceMeters).toBe(1443);
    expect(walk.durationSeconds).toBe(Math.round(1443 / 1000 / 5 * 3600));
    expect(walk.durationSeconds).toBeGreaterThan(drive.durationSeconds);
  });
});