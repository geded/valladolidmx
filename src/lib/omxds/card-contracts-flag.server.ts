import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const OMXDS_CARD_CONTRACTS_FLAG = "omxds_visual_v1_contracts_enabled";

export const getOmxdsCardContractsFlag = createServerFn({ method: "GET" }).handler(
  async (): Promise<boolean> => {
    try {
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_PUBLISHABLE_KEY;
      if (!url || !key) return false;
      const supabase = createClient<Database>(url, key, {
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", OMXDS_CARD_CONTRACTS_FLAG)
        .eq("is_public", true)
        .maybeSingle();
      if (error) return false;
      return data?.value === true;
    } catch {
      return false;
    }
  },
);
