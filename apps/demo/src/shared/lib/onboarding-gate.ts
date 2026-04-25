import { eq } from "drizzle-orm";

import { db, profiles } from "@/db";

import { getRecoClient } from "./reco-client";

type ProfileLike = {
  id: string;
  onboardedAt: Date | null;
};

async function markOnboardedLazy(profileId: string): Promise<void> {
  try {
    await db
      .update(profiles)
      .set({ onboardedAt: new Date() })
      .where(eq(profiles.id, profileId));
  } catch (err) {
    console.error("[onboarding-gate] lazy-mark failed", err);
  }
}

async function checkRecoVector(profileId: string): Promise<boolean> {
  const state = await getRecoClient().getProfileState(profileId);
  return state.hasPreferenceVector;
}

export async function userIsOnboarded(profile: ProfileLike): Promise<boolean> {
  if (profile.onboardedAt) return true;
  try {
    const hasVector = await checkRecoVector(profile.id);
    if (hasVector) await markOnboardedLazy(profile.id);
    return hasVector;
  } catch (err) {
    console.error("[onboarding-gate] reco profile-state failed", err);
    return false;
  }
}
