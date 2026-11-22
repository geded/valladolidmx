/** Lectura de servidor de los interruptores de canales (cliente de servicio). */
import { channelsFromFlags, type AluxChannels } from "./channels";

type SettingsQuery = {
  from: (t: string) => {
    select: (s: string) => {
      eq: (
        a: string,
        b: boolean,
      ) => {
        maybeSingle: () => PromiseLike<{ data: { flags?: unknown } | null; error: unknown }>;
      };
    };
  };
};

export async function readAluxSettingsFlagsServer(
  admin: unknown,
): Promise<Record<string, unknown>> {
  const { data, error } = await (admin as SettingsQuery)
    .from("alux_settings")
    .select("flags")
    .eq("singleton", true)
    .maybeSingle();
  if (error) throw new Error("alux_settings_unavailable");
  return ((data?.flags as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
}

/** Si no se puede leer, el canal se considera encendido (no se apaga por un fallo). */
export async function readAluxChannelsServer(admin: unknown): Promise<AluxChannels> {
  try {
    return channelsFromFlags(await readAluxSettingsFlagsServer(admin));
  } catch {
    return channelsFromFlags({});
  }
}

export function embedHostsFromFlags(flags: Record<string, unknown>): string[] {
  const raw = flags["embed_hosts"];
  return Array.isArray(raw)
    ? raw.filter((h): h is string => typeof h === "string").slice(0, 50)
    : [];
}
