import { SITE } from "@/config/site";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";
import {
  formatTaxiDate,
  formatTaxiMoney,
  TAXI_STATUS_LABELS,
  type TaxiRide,
  type TaxiRideStatus,
} from "./rules";

export async function sendTaxiRideEmails(rideId: string, status: TaxiRideStatus): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: ride, error } = await supabaseAdmin
    .from("taxi_rides")
    .select("*")
    .eq("id", rideId)
    .maybeSingle();
  if (error || !ride) return;
  const row = ride as unknown as TaxiRide;
  const recipientIds = new Set<string>([row.traveler_id]);
  let driver: {
    user_id: string;
    display_name: string;
    vehicle_description: string;
    plates: string;
  } | null = null;
  if (row.driver_id) {
    const { data } = await supabaseAdmin
      .from("taxi_drivers")
      .select("user_id, display_name, vehicle_description, plates")
      .eq("id", row.driver_id)
      .maybeSingle();
    driver = data;
    if (driver) recipientIds.add(driver.user_id);
  }
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("user_id, email, display_name")
    .in("user_id", [...recipientIds]);
  const common = {
    folio: row.folio,
    statusLabel: TAXI_STATUS_LABELS[status],
    origin: row.origin_label,
    destination: row.destination_label,
    requestedForLabel: formatTaxiDate(row.requested_for),
    fareLabel: formatTaxiMoney(row.fare_amount, row.currency),
    driverName: driver?.display_name,
    vehicle: driver ? `${driver.vehicle_description} · ${driver.plates}` : undefined,
  };
  await Promise.all(
    (profiles ?? []).map(async (profile) => {
      if (!profile.email) return;
      const isDriver = driver?.user_id === profile.user_id;
      try {
        await sendTemplateEmail("taxi-ride-status", profile.email, {
          templateData: {
            ...common,
            recipientName: profile.display_name ?? (isDriver ? "conductor" : "viajero"),
            forDriver: isDriver,
            rideUrl: `${SITE.url}${isDriver ? "/taxista" : "/cuenta/taxi"}`,
          },
          idempotencyKey: `taxi-${row.id}-${status}-${profile.user_id}`,
        });
      } catch (error) {
        console.warn("[taxi] correo", error instanceof Error ? error.message.slice(0, 160) : error);
      }
    }),
  );
}
