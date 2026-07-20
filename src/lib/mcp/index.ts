import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchBusinesses from "./tools/search-businesses";
import getMyProfile from "./tools/get-my-profile";
import listMyTravelPlans from "./tools/list-my-travel-plans";

// El emisor OAuth DEBE ser el host directo de Supabase (no el proxy .lovable.cloud).
// VITE_SUPABASE_PROJECT_ID es inlined por Vite en build-time.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "valladolid-mx-mcp",
  title: "Valladolid.mx MCP",
  version: "0.1.0",
  instructions:
    "Herramientas oficiales de Valladolid.mx / Oriente Maya. Usa `search_businesses` para descubrir negocios y experiencias publicadas. Usa `get_my_traveler_profile` y `list_my_travel_plans` para leer datos del viajero autenticado (respetando RLS).",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchBusinesses, getMyProfile, listMyTravelPlans],
});
