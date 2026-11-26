import { createClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import {
  normalizeTaxiPublicConfig,
  type TaxiDriver,
  type TaxiDriverInvitation,
  type TaxiOpenRide,
  type TaxiPublicConfig,
  type TaxiQuote,
  type TaxiRide,
  type TaxiRideStatus,
  type TaxiTracking,
  taxiDriverApplicationBlockReason,
} from "./rules";

type Loose = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

function publicClient(url: string, key: string) {
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

function publicEnv(): { url: string; key: string } {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("backend_not_configured");
  return { url, key };
}

async function assertAdmin(context: { supabase: unknown; userId: string }): Promise<void> {
  const client = context.supabase as unknown as Loose;
  const checks = await Promise.all(
    (["admin", "super_admin"] as const).map((role) =>
      client.rpc("has_role", { _user_id: context.userId, _role: role }),
    ),
  );
  for (const check of checks) {
    if (check.error) throw new Error(check.error.message);
  }
  if (!checks.some((check) => check.data === true)) throw new Error("forbidden");
}

async function afterRideMutation(rideId: string, status: TaxiRideStatus): Promise<void> {
  const [{ sendTaxiRideEmails }, { dispatchPendingPush }] = await Promise.all([
    import("./ride-emails.server"),
    import("@/lib/notifications/push-dispatch.server"),
  ]);
  await Promise.allSettled([
    sendTaxiRideEmails(rideId, status),
    dispatchPendingPush({ limit: 25 }),
  ]);
}

const pointSchema = z.object({
  originLat: z.number().min(-90).max(90),
  originLng: z.number().min(-180).max(180),
  destinationLat: z.number().min(-90).max(90),
  destinationLng: z.number().min(-180).max(180),
  requestedFor: z.string().datetime({ offset: true }),
});

export const getTaxiPublicConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<TaxiPublicConfig> => {
    const { url, key } = publicEnv();
    const { data, error } = await (publicClient(url, key) as unknown as Loose).rpc(
      "taxi_public_config",
    );
    if (error) throw new Error(error.message);
    return normalizeTaxiPublicConfig(data);
  },
);

export const quoteTaxi = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => pointSchema.parse(raw))
  .handler(async ({ data }): Promise<TaxiQuote> => {
    const { url, key } = publicEnv();
    const { data: quote, error } = await (publicClient(url, key) as unknown as Loose).rpc(
      "taxi_quote",
      {
        _origin_lat: data.originLat,
        _origin_lng: data.originLng,
        _destination_lat: data.destinationLat,
        _destination_lng: data.destinationLng,
        _requested_for: data.requestedFor,
      },
    );
    if (error) throw new Error(error.message);
    return quote as TaxiQuote;
  });

export const requestTaxiRide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    pointSchema
      .extend({
        originLabel: z.string().trim().min(3).max(200),
        destinationLabel: z.string().trim().min(3).max(200),
        passengers: z.number().int().min(1).max(6),
        travelerName: z.string().trim().min(2).max(120),
        travelerPhone: z.string().trim().min(8).max(30),
        notes: z.string().trim().max(500).optional(),
        paymentMethod: z.literal("efectivo"),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }): Promise<TaxiRide> => {
    const { data: ride, error } = await (context.supabase as unknown as Loose).rpc(
      "taxi_request_ride",
      {
        _origin_label: data.originLabel,
        _origin_lat: data.originLat,
        _origin_lng: data.originLng,
        _destination_label: data.destinationLabel,
        _destination_lat: data.destinationLat,
        _destination_lng: data.destinationLng,
        _passengers: data.passengers,
        _requested_for: data.requestedFor,
        _traveler_name: data.travelerName,
        _traveler_phone: data.travelerPhone,
        _notes: data.notes ?? null,
        _payment_method: data.paymentMethod,
      },
    );
    if (error) throw new Error(error.message);
    const row = ride as TaxiRide;
    await afterRideMutation(row.id, "requested");
    return row;
  });

export const listMyTaxiRides = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TaxiRide[]> => {
    const { data, error } = await (context.supabase as unknown as Loose)
      .from("taxi_rides")
      .select("*")
      .eq("traveler_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as TaxiRide[];
  });

export const getTaxiRideTracking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ rideId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }): Promise<TaxiTracking | null> => {
    const { data: tracking, error } = await (context.supabase as unknown as Loose).rpc(
      "taxi_ride_tracking",
      { _ride_id: data.rideId },
    );
    if (error) throw new Error(error.message);
    return (tracking ?? null) as TaxiTracking | null;
  });

export const cancelTaxiRide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({ rideId: z.string().uuid(), reason: z.string().trim().max(300).optional() })
      .parse(raw),
  )
  .handler(async ({ data, context }): Promise<TaxiRide> => {
    const { data: ride, error } = await (context.supabase as unknown as Loose).rpc(
      "taxi_cancel_ride",
      { _ride_id: data.rideId, _reason: data.reason ?? null },
    );
    if (error) throw new Error(error.message);
    const row = ride as TaxiRide;
    await afterRideMutation(row.id, "cancelled");
    return row;
  });

export const getMyTaxiDriver = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TaxiDriver | null> => {
    const { data, error } = await (context.supabase as unknown as Loose)
      .from("taxi_drivers")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data ?? null) as TaxiDriver | null;
  });

export const listDriverOpenRides = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TaxiOpenRide[]> => {
    const { data, error } = await (context.supabase as unknown as Loose).rpc(
      "taxi_driver_open_rides",
    );
    if (error) throw new Error(error.message);
    return (data ?? []) as TaxiOpenRide[];
  });

export const listDriverTaxiRides = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TaxiRide[]> => {
    const { data, error } = await (context.supabase as unknown as Loose)
      .from("taxi_rides")
      .select("*")
      .not("driver_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as TaxiRide[];
  });

export const setDriverAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ available: z.boolean() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as unknown as Loose).rpc(
      "taxi_driver_set_available",
      { _available: data.available },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const acceptDriverRide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ rideId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }): Promise<TaxiRide> => {
    const { data: ride, error } = await (context.supabase as unknown as Loose).rpc(
      "taxi_driver_accept_ride",
      { _ride_id: data.rideId },
    );
    if (error) throw new Error(error.message);
    const row = ride as TaxiRide;
    await afterRideMutation(row.id, "accepted");
    return row;
  });

export const setDriverRideStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        rideId: z.string().uuid(),
        status: z.enum(["arrived", "in_progress", "completed"]),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }): Promise<TaxiRide> => {
    const { data: ride, error } = await (context.supabase as unknown as Loose).rpc(
      "taxi_driver_set_ride_status",
      { _ride_id: data.rideId, _status: data.status },
    );
    if (error) throw new Error(error.message);
    const row = ride as TaxiRide;
    await afterRideMutation(row.id, data.status);
    return row;
  });

export const updateDriverLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as unknown as Loose).rpc(
      "taxi_driver_update_location",
      { _lat: data.lat, _lng: data.lng },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getTaxiAdminDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{
    config: TaxiPublicConfig;
    drivers: TaxiDriver[];
    invitations: TaxiDriverInvitation[];
    rides: TaxiRide[];
  }> => {
    await assertAdmin(context);
    const client = context.supabase as unknown as Loose;
    const [configRes, driversRes, invitationsRes, ridesRes] = await Promise.all([
      client.rpc("taxi_public_config"),
      client.from("taxi_drivers").select("*").order("created_at", { ascending: false }),
      client.from("taxi_driver_invitations").select("*").order("created_at", { ascending: false }).limit(100),
      client.from("taxi_rides").select("*").order("created_at", { ascending: false }).limit(300),
    ]);
    if (configRes.error) throw new Error(configRes.error.message);
    if (driversRes.error) throw new Error(driversRes.error.message);
    if (invitationsRes.error) throw new Error(invitationsRes.error.message);
    if (ridesRes.error) throw new Error(ridesRes.error.message);
    return {
      config: normalizeTaxiPublicConfig(configRes.data),
      drivers: (driversRes.data ?? []) as TaxiDriver[],
      invitations: (invitationsRes.data ?? []) as TaxiDriverInvitation[],
      rides: (ridesRes.data ?? []) as TaxiRide[],
    };
  });

const fareSettingsSchema = z.object({
  enabled: z.boolean(),
  baseFareCents: z.number().int().min(0).max(1_000_000),
  perKmCents: z.number().int().min(0).max(1_000_000),
  perMinuteCents: z.number().int().min(0).max(100_000),
  minimumFareCents: z.number().int().min(0).max(2_000_000),
  nightSurchargeBps: z.number().int().min(0).max(10_000),
});

export const saveTaxiAdminSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => fareSettingsSchema.parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await (context.supabase as unknown as Loose).rpc(
      "taxi_admin_save_settings",
      {
        _enabled: data.enabled,
        _base_fare_cents: data.baseFareCents,
        _per_km_cents: data.perKmCents,
        _per_minute_cents: data.perMinuteCents,
        _minimum_fare_cents: data.minimumFareCents,
        _night_surcharge_bps: data.nightSurchargeBps,
      },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setTaxiDriverApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ driverId: z.string().uuid(), approved: z.boolean() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await (context.supabase as unknown as Loose).rpc(
      "taxi_admin_set_driver_approval",
      { _driver_id: data.driverId, _approved: data.approved },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const inviteDriverSchema = z.object({
  email: z.string().trim().email().max(254),
  displayName: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30).optional(),
  english: z.boolean(),
  languages: z.array(z.string().trim().min(2).max(20)).max(8),
  licenseNumber: z.string().trim().max(80).optional(),
  vehicleDescription: z.string().trim().min(2).max(160),
  plates: z.string().trim().min(2).max(20),
  insuranceReference: z.string().trim().max(120).optional(),
  approved: z.boolean(),
});

export const inviteTaxiDriver = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => inviteDriverSchema.parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.approved && !data.english) throw new Error("driver_english_required");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let targetUserId: string | null = null;
    let existing = false;
    const { data: invited, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      data.email,
      { data: { display_name: data.displayName } },
    );
    if (invited.user && !inviteError) {
      targetUserId = invited.user.id;
    } else {
      const alreadyRegistered =
        inviteError?.code === "email_exists" ||
        /already (been )?registered|already exists/i.test(inviteError?.message ?? "");
      if (!alreadyRegistered) {
        throw new Error(inviteError?.message ?? "No se pudo enviar la invitación.");
      }
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("user_id")
        .ilike("email", data.email)
        .maybeSingle();
      if (profileError) throw new Error(profileError.message);
      if (!profile?.user_id) {
        throw new Error(
          "Ese correo ya tiene cuenta, pero no se encontró su perfil. Pide al taxista que entre una vez a la aplicación y vuelve a intentarlo.",
        );
      }
      targetUserId = profile.user_id;
      existing = true;
    }
    const { data: driver, error } = await (context.supabase as unknown as Loose).rpc(
      "taxi_admin_upsert_driver",
      {
        _user_id: targetUserId,
        _display_name: data.displayName,
        _email: data.email,
        _phone: data.phone ?? null,
        _english: data.english,
        _languages: data.languages,
        _license_number: data.licenseNumber ?? null,
        _vehicle_description: data.vehicleDescription,
        _plates: data.plates,
        _insurance_reference: data.insuranceReference ?? null,
        _approved: data.approved,
      },
    );
    if (error) throw new Error(error.message);
    return { ok: true, existing, driver: driver as TaxiDriver };
  });

export const createTaxiDriverInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        invitedName: z.string().trim().max(120).optional(),
        invitedEmail: z.string().trim().email().max(254).optional().or(z.literal("")),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }): Promise<TaxiDriverInvitation> => {
    await assertAdmin(context);
    const { data: invitation, error } = await (context.supabase as unknown as Loose).rpc(
      "taxi_admin_create_driver_invitation",
      { _invited_name: data.invitedName || null, _invited_email: data.invitedEmail || null },
    );
    if (error) throw new Error(error.message);
    return invitation as TaxiDriverInvitation;
  });

export const rejectTaxiDriverInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ invitationId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await (context.supabase as unknown as Loose).rpc(
      "taxi_admin_reject_driver_invitation",
      { _invitation_id: data.invitationId },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getTaxiDriverInvitation = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ token: z.string().uuid() }).parse(raw))
  .handler(async ({ data }): Promise<{
    status: TaxiDriverInvitation["status"];
    invited_name: string | null;
    invited_email: string | null;
    can_submit: boolean;
  } | null> => {
    const { url, key } = publicEnv();
    const { data: invitation, error } = await (publicClient(url, key) as unknown as Loose).rpc(
      "taxi_driver_invitation_public",
      { _token: data.token },
    );
    if (error) throw new Error(error.message);
    return invitation as never;
  });

const applicationSchema = z.object({
  token: z.string().uuid(),
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(8).max(30),
  english: z.boolean(),
  languages: z.array(z.string().trim().min(2).max(20)).min(1).max(8),
  unionName: z.string().trim().min(2).max(120),
  licenseNumber: z.string().trim().min(2).max(80),
  insuranceReference: z.string().trim().min(2).max(120),
  vehicleDescription: z.string().trim().min(2).max(160),
  vehicleYear: z.number().int().min(1990).max(2035).nullable(),
  vehicleColor: z.string().trim().max(50).optional(),
  vehicleNumber: z.string().trim().max(50).optional(),
  plates: z.string().trim().min(2).max(20),
  applicantNotes: z.string().trim().max(500).optional(),
});

export const submitTaxiDriverInvitation = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => applicationSchema.parse(raw))
  .handler(async ({ data }) => {
    const { url, key } = publicEnv();
    const { error } = await (publicClient(url, key) as unknown as Loose).rpc(
      "taxi_submit_driver_invitation",
      {
        _token: data.token,
        _full_name: data.fullName,
        _email: data.email,
        _phone: data.phone,
        _english: data.english,
        _languages: data.languages,
        _union_name: data.unionName,
        _license_number: data.licenseNumber,
        _insurance_reference: data.insuranceReference,
        _vehicle_description: data.vehicleDescription,
        _vehicle_year: data.vehicleYear,
        _vehicle_color: data.vehicleColor || null,
        _vehicle_number: data.vehicleNumber || null,
        _plates: data.plates,
        _applicant_notes: data.applicantNotes || null,
      },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const approveTaxiDriverInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ invitationId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const client = context.supabase as unknown as Loose;
    const { data: invitation, error: invitationError } = await client
      .from("taxi_driver_invitations")
      .select("*")
      .eq("id", data.invitationId)
      .single();
    if (invitationError) throw new Error(invitationError.message);
    const application = invitation as TaxiDriverInvitation;
    const applicationBlock = taxiDriverApplicationBlockReason(application);
    if (applicationBlock) throw new Error(applicationBlock);
    if (!application.email || !application.full_name || !application.vehicle_description || !application.plates) {
      throw new Error("missing_driver_details");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let targetUserId: string | null = null;
    let existing = false;
    const { data: invited, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      application.email,
      { data: { display_name: application.full_name } },
    );
    if (invited.user && !inviteError) {
      targetUserId = invited.user.id;
    } else {
      const alreadyRegistered =
        inviteError?.code === "email_exists" ||
        /already (been )?registered|already exists/i.test(inviteError?.message ?? "");
      if (!alreadyRegistered) {
        throw new Error(inviteError?.message ?? "No se pudo enviar la invitación.");
      }
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("user_id")
        .ilike("email", application.email)
        .maybeSingle();
      if (profileError) throw new Error(profileError.message);
      if (!profile?.user_id) {
        throw new Error(
          "El correo ya tiene cuenta, pero falta su perfil. Pide al taxista que abra una vez la aplicación y vuelve a aprobar.",
        );
      }
      targetUserId = profile.user_id;
      existing = true;
    }

    const { data: driver, error } = await client.rpc("taxi_admin_upsert_driver", {
      _user_id: targetUserId,
      _display_name: application.full_name,
      _email: application.email,
      _phone: application.phone,
      _english: application.english,
      _languages: application.languages,
      _license_number: application.license_number,
      _vehicle_description: application.vehicle_description,
      _plates: application.plates,
      _insurance_reference: application.insurance_reference,
      _approved: true,
    });
    if (error) throw new Error(error.message);
    const driverRow = driver as TaxiDriver;
    const { error: detailsError } = await supabaseAdmin
      .from("taxi_drivers")
      .update({
        union_name: application.union_name,
        vehicle_year: application.vehicle_year,
        vehicle_color: application.vehicle_color,
        vehicle_number: application.vehicle_number,
      })
      .eq("id", driverRow.id);
    if (detailsError) throw new Error(detailsError.message);
    const { error: completeError } = await client.rpc("taxi_admin_complete_driver_invitation", {
      _invitation_id: application.id,
      _user_id: targetUserId,
      _driver_id: driverRow.id,
    });
    if (completeError) throw new Error(completeError.message);
    return { ok: true, existing, driver: driverRow };
  });

export const rateTaxiRide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        rideId: z.string().uuid(),
        rating: z.number().int().min(1).max(5),
        comment: z.string().trim().max(500).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await (context.supabase as unknown as Loose).rpc("taxi_rate_ride", {
      _ride_id: data.rideId,
      _rating: data.rating,
      _comment: data.comment ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const shareTaxiRide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ rideId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }): Promise<{ token: string }> => {
    const { data: token, error } = await (context.supabase as unknown as Loose).rpc(
      "taxi_share_ride",
      { _ride_id: data.rideId },
    );
    if (error) throw new Error(error.message);
    return { token: String(token) };
  });

export interface TaxiSharedRide {
  folio: string;
  status: TaxiRideStatus;
  origin_label: string;
  destination_label: string;
  origin_lat: number;
  origin_lng: number;
  destination_lat: number;
  destination_lng: number;
  driver_name: string | null;
  vehicle_description: string | null;
  vehicle_color: string | null;
  plates: string | null;
  lat: number | null;
  lng: number | null;
  location_updated_at: string | null;
  updated_at: string;
}

export const getSharedTaxiRide = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ token: z.string().regex(/^[a-f0-9]{36}$/) }).parse(raw))
  .handler(async ({ data }): Promise<TaxiSharedRide | null> => {
    const { url, key } = publicEnv();
    const { data: ride, error } = await (publicClient(url, key) as unknown as Loose).rpc(
      "taxi_shared_ride",
      { _token: data.token },
    );
    if (error) throw new Error(error.message);
    return (ride ?? null) as TaxiSharedRide | null;
  });

export interface TaxiPlaceHit {
  id: string;
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
}

/** Lugares del territorio con coordenadas publicadas para elegir destino o recogida. */
export const searchTaxiPlaces = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ term: z.string().trim().min(2).max(80) }).parse(raw))
  .handler(async ({ data }): Promise<TaxiPlaceHit[]> => {
    const { accentInsensitiveOr } = await import("@/lib/cms/accent-search");
    const { url, key } = publicEnv();
    const client = publicClient(url, key) as unknown as Loose;
    const bizOr = accentInsensitiveOr(["display_name"], data.term);
    const nameOr = accentInsensitiveOr(["name"], data.term);
    if (!bizOr || !nameOr) return [];
    const [biz, poi, dest] = await Promise.all([
      client
        .from("businesses")
        .select("id, display_name, business_locations(latitude, longitude, is_primary, deleted_at)")
        .eq("status", "published")
        .is("deleted_at", null)
        .or(bizOr)
        .limit(8),
      client
        .from("points_of_interest")
        .select("id, name, latitude, longitude")
        .eq("status", "published")
        .is("deleted_at", null)
        .or(nameOr)
        .limit(6),
      client
        .from("destinations")
        .select("id, name, latitude, longitude")
        .eq("status", "published")
        .is("deleted_at", null)
        .or(nameOr)
        .limit(4),
    ]);
    const out: TaxiPlaceHit[] = [];
    const ok = (lat: unknown, lng: unknown) => typeof lat === "number" && typeof lng === "number";
    for (const d of (dest.data ?? []) as Array<{ id: string; name: string; latitude: number; longitude: number }>)
      if (ok(d.latitude, d.longitude)) out.push({ id: d.id, title: d.name, subtitle: "Destino", lat: d.latitude, lng: d.longitude });
    for (const b of (biz.data ?? []) as Array<{ id: string; display_name: string; business_locations: Array<{ latitude: number | null; longitude: number | null; is_primary: boolean | null; deleted_at: string | null }> | null }>) {
      const locs = (b.business_locations ?? []).filter((l) => !l.deleted_at && ok(l.latitude, l.longitude));
      const loc = locs.find((l) => l.is_primary) ?? locs[0];
      if (loc) out.push({ id: b.id, title: b.display_name, subtitle: "Empresa", lat: loc.latitude!, lng: loc.longitude! });
    }
    for (const p of (poi.data ?? []) as Array<{ id: string; name: string; latitude: number; longitude: number }>)
      if (ok(p.latitude, p.longitude)) out.push({ id: p.id, title: p.name, subtitle: "Lugar", lat: p.latitude, lng: p.longitude });
    return out.slice(0, 10);
  });


export interface TaxiPickupAdmin {
  destinations: { slug: string; name: string }[];
  selected: string[];
  radiusKm: number;
}

export const getTaxiPickupAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TaxiPickupAdmin> => {
    await assertAdmin(context);
    const client = context.supabase as unknown as Loose;
    const [dest, zones] = await Promise.all([
      client.from("destinations").select("slug,name").eq("status", "published").is("deleted_at", null).not("latitude", "is", null).order("name"),
      client.rpc("taxi_pickup_zones"),
    ]);
    if (dest.error) throw new Error(dest.error.message);
    const z = (zones.data ?? []) as { slug: string; radius_km: number }[];
    return {
      destinations: (dest.data ?? []) as { slug: string; name: string }[],
      selected: z.map((x) => x.slug),
      radiusKm: z[0]?.radius_km ?? 30,
    };
  });

export const saveTaxiPickupZones = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ slugs: z.array(z.string().min(1).max(120)).max(50), radiusKm: z.number().int().min(3).max(80) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await (context.supabase as unknown as Loose).rpc("taxi_admin_set_pickup_zones", {
      _slugs: data.slugs,
      _radius_km: data.radiusKm,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
