/**
 * Test helpers for E2E onboarding scenarios.
 *
 * Implementation lands during `implement` stage. Helpers are typed against the
 * planned shape so spec files compile (and fail at runtime, not at import).
 */

import type { APIRequestContext } from "@playwright/test";

export type SeedUser = {
  id: string;
  login: string;
  onboardedAt: Date | null;
};

export async function seedUser(opts: {
  login: string;
  onboardedAt?: Date | null;
}): Promise<SeedUser> {
  throw new Error("seedUser not yet implemented (TDD red)");
}

export async function setSession(
  request: APIRequestContext,
  userId: string,
): Promise<void> {
  throw new Error("setSession not yet implemented (TDD red)");
}

export async function seedRecoProfile(opts: {
  externalUserId: string;
  preferenceVector: number[];
  events?: number;
}): Promise<void> {
  throw new Error("seedRecoProfile not yet implemented (TDD red)");
}

export async function readDemoOnboardedAt(
  userId: string,
): Promise<Date | null> {
  throw new Error("readDemoOnboardedAt not yet implemented (TDD red)");
}

export async function readRecoPreferenceVector(
  externalUserId: string,
): Promise<number[] | null> {
  throw new Error("readRecoPreferenceVector not yet implemented (TDD red)");
}

export async function cleanup(userId: string): Promise<void> {
  throw new Error("cleanup not yet implemented (TDD red)");
}

export async function stubGeminiToFail(): Promise<void> {
  throw new Error("stubGeminiToFail not yet implemented (TDD red)");
}

export async function unstubGemini(): Promise<void> {
  throw new Error("unstubGemini not yet implemented (TDD red)");
}
