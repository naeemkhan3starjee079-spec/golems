/**
 * EmailGolem Router
 *
 * Determines which golem should handle an email based on category and score.
 * This is the core routing logic for the v2 "golems = domain experts" architecture.
 *
 * Routing rules:
 * - job, interview → RecruiterGolem (job search domain)
 * - subscription → TellerGolem (financial domain)
 * - tech-update → ClaudeGolem (knowledge/learning domain)
 * - urgent → ClaudeGolem (needs human-facing response)
 * - newsletter, promo, social, other → EmailGolem (stays triaged, no routing)
 */

import type { GolemActor } from "../event-log";

/** Canonical golem → category mapping. Single source of truth for routing. */
export const GOLEM_CATEGORIES: Record<string, string[]> = {
  recruitergolem: ["job", "interview"],
  tellergolem: ["subscription"],
  claudegolem: ["tech-update", "urgent"],
  emailgolem: ["newsletter", "promo", "social", "other"],
};

/** Reverse lookup: category → golem (derived from GOLEM_CATEGORIES) */
const CATEGORY_TO_GOLEM: Record<string, GolemActor> = {};
for (const [golem, cats] of Object.entries(GOLEM_CATEGORIES)) {
  for (const cat of cats) {
    CATEGORY_TO_GOLEM[cat] = golem as GolemActor;
  }
}

export interface RoutingResult {
  targetGolem: GolemActor;
  reason: string;
}

/**
 * Determine which golem should handle an email based on its category and score.
 */
// TODO: Use score for priority-based routing (e.g., score 10 → fast-track to ClaudeGolem)
export function determineTargetGolem(category: string, _score: number): RoutingResult {
  const targetGolem = CATEGORY_TO_GOLEM[category] ?? "emailgolem";

  if (targetGolem === "emailgolem") {
    return {
      targetGolem,
      reason: `${category} email stays with EmailGolem (no specific golem needed)`,
    };
  }

  return {
    targetGolem,
    reason: `${category} email routed to ${targetGolem}`,
  };
}
