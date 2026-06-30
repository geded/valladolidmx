import { useEffect, useState } from "react";

export type WsBreakpoint = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

const QUERIES: Record<WsBreakpoint, string> = {
  xs: "(max-width: 479px)",
  sm: "(min-width: 480px) and (max-width: 767px)",
  md: "(min-width: 768px) and (max-width: 1023px)",
  lg: "(min-width: 1024px) and (max-width: 1279px)",
  xl: "(min-width: 1280px) and (max-width: 1535px)",
  "2xl": "(min-width: 1536px)",
};

export function useWorkspaceBreakpoint(): WsBreakpoint {
  const [bp, setBp] = useState<WsBreakpoint>("lg");

  useEffect(() => {
    const mqls = (Object.keys(QUERIES) as WsBreakpoint[]).map((k) => ({
      k,
      mql: window.matchMedia(QUERIES[k]),
    }));
    const compute = () => {
      const match = mqls.find((m) => m.mql.matches);
      if (match) setBp(match.k);
    };
    compute();
    mqls.forEach(({ mql }) => mql.addEventListener("change", compute));
    return () => mqls.forEach(({ mql }) => mql.removeEventListener("change", compute));
  }, []);

  return bp;
}

export function isTouchBreakpoint(bp: WsBreakpoint): boolean {
  return bp === "xs" || bp === "sm" || bp === "md";
}