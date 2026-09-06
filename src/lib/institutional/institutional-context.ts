/**
 * Lote 3B · C — Hidratación de la autoridad institucional.
 *
 * `institutional-authority.ts` expone un store sincrónico para que los
 * helpers existentes no cambien de firma. Aquí se resuelve el valor
 * vigente desde el CMS y se hidrata el store tanto en SSR (loader raíz)
 * como en cliente (hook del árbol raíz).
 */
import { queryOptions, useQuery } from "@tanstack/react-query";
import { getInstitutionalAuthoritySettings } from "./institutional-authority.functions";
import { setInstitutionalAuthority } from "./institutional-authority";

export const INSTITUTIONAL_AUTHORITY_QUERY_KEY = ["institutional", "badges", "authority"] as const;

export const institutionalAuthorityQueryOptions = queryOptions({
  queryKey: INSTITUTIONAL_AUTHORITY_QUERY_KEY,
  queryFn: async () => {
    const value = await getInstitutionalAuthoritySettings();
    // Hidrata en el mismo momento de la lectura (SSR incluido).
    if (value) setInstitutionalAuthority(value);
    return value ?? null;
  },
  staleTime: 5 * 60_000,
});

/** Mantiene el store sincronizado en cliente. Sin efectos visuales. */
export function useInstitutionalAuthority() {
  const { data } = useQuery(institutionalAuthorityQueryOptions);
  if (data) setInstitutionalAuthority(data);
  return data ?? null;
}
