/** CV8.9.4 · Pure aggregation shared by recommendation and decision outcomes. */
export const MIN_FAMILY_SIGNAL = 5 as const;

export interface FamilyLearningSignal {
  metric_id: string;
  sample_size: number;
  validated: number;
  discarded: number;
  learned_confidence: number;
  reliability: "insufficient_data" | "learning" | "reliable";
}

export interface FamilyLearningOutcome {
  metric_id: string;
  outcome: "validated" | "discarded";
}

export function projectFamilyLearningSignals(
  outcomes: readonly FamilyLearningOutcome[],
): FamilyLearningSignal[] {
  const family = new Map<string, { validated: number; discarded: number }>();
  for (const signal of outcomes) {
    const counts = family.get(signal.metric_id) ?? { validated: 0, discarded: 0 };
    counts[signal.outcome] += 1;
    family.set(signal.metric_id, counts);
  }

  return Array.from(family.entries())
    .map(([metric_id, counts]) => {
      const sample = counts.validated + counts.discarded;
      const confidence = sample === 0 ? 0 : counts.validated / sample;
      const reliability: FamilyLearningSignal["reliability"] =
        sample < MIN_FAMILY_SIGNAL
          ? "insufficient_data"
          : sample < MIN_FAMILY_SIGNAL * 3
            ? "learning"
            : "reliable";
      return {
        metric_id,
        sample_size: sample,
        validated: counts.validated,
        discarded: counts.discarded,
        learned_confidence: Number(confidence.toFixed(4)),
        reliability,
      };
    })
    .sort(
      (left, right) =>
        right.sample_size - left.sample_size || left.metric_id.localeCompare(right.metric_id),
    );
}
