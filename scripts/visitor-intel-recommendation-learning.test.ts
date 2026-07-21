import { describe, expect, it } from "vitest";

import {
  MIN_FAMILY_SIGNAL,
  projectFamilyLearningSignals,
} from "@/lib/visitor-intel/recommendation-learning";

describe("CV8.9.4 · decision feedback to CV8.6", () => {
  it("combines recommendation and decision outcomes by metric family", () => {
    const result = projectFamilyLearningSignals([
      { metric_id: "JPR_30D", outcome: "validated" },
      { metric_id: "JPR_30D", outcome: "validated" },
      { metric_id: "JPR_30D", outcome: "discarded" },
      { metric_id: "JPR_30D", outcome: "discarded" },
      { metric_id: "JPR_30D", outcome: "validated" },
    ]);

    expect(result).toEqual([
      {
        metric_id: "JPR_30D",
        sample_size: MIN_FAMILY_SIGNAL,
        validated: 3,
        discarded: 2,
        learned_confidence: 0.6,
        reliability: "learning",
      },
    ]);
  });

  it("treats rejected and dismissed decision mappings as negative signals", () => {
    const result = projectFamilyLearningSignals([
      { metric_id: "TRUST_INDEX", outcome: "discarded" },
      { metric_id: "TRUST_INDEX", outcome: "discarded" },
    ]);
    expect(result[0]).toMatchObject({
      sample_size: 2,
      validated: 0,
      discarded: 2,
      learned_confidence: 0,
      reliability: "insufficient_data",
    });
  });
});
