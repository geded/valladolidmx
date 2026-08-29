/**
 * G8-R1-E-R1 · Hook de lectura reactiva de la memoria funcional de Alux.
 * Único consumidor de `memory-store` desde React. SSR-safe: en servidor y
 * en la primera hidratación devuelve el estado neutro.
 */
import { useCallback, useEffect, useState } from "react";
import { summarizeSignals, type AluxSignalSummary, EMPTY_SIGNAL_SUMMARY } from "./behavior-signals";
import {
  NEUTRAL_MEMORY,
  clearAluxMemory,
  readAluxMemory,
  setAluxPersonalization,
  subscribeAluxMemory,
  type AluxMemoryRecord,
  type AluxPersonalizationState,
} from "./memory-store";

export interface UseAluxMemoryResult {
  readonly hydrated: boolean;
  readonly memory: AluxMemoryRecord;
  readonly summary: AluxSignalSummary;
  readonly paused: boolean;
  readonly pause: () => void;
  readonly resume: () => void;
  readonly forget: () => void;
}

export function useAluxMemory(): UseAluxMemoryResult {
  const [hydrated, setHydrated] = useState(false);
  const [memory, setMemory] = useState<AluxMemoryRecord>(NEUTRAL_MEMORY);

  useEffect(() => {
    setMemory(readAluxMemory());
    setHydrated(true);
    return subscribeAluxMemory(setMemory);
  }, []);

  const apply = useCallback((state: AluxPersonalizationState) => {
    setMemory(setAluxPersonalization(state));
  }, []);

  const forget = useCallback(() => {
    clearAluxMemory();
    setMemory(NEUTRAL_MEMORY);
  }, []);

  const paused = memory.personalization === "paused";
  const summary =
    !hydrated || paused || !memory.subjectId
      ? EMPTY_SIGNAL_SUMMARY
      : summarizeSignals({ signals: memory.signals });

  return {
    hydrated,
    memory,
    summary,
    paused,
    pause: () => apply("paused"),
    resume: () => apply("active"),
    forget,
  };
}
