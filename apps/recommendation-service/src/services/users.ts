import { eq } from "drizzle-orm";

import { db } from "../db/client";
import { events, userProfiles, viewHistory } from "../db/schema";

export async function getProfileState(
  externalUserId: string,
): Promise<{ hasPreferenceVector: boolean }> {
  const [profile] = await db
    .select({ preferenceVector: userProfiles.preferenceVector })
    .from(userProfiles)
    .where(eq(userProfiles.externalUserId, externalUserId))
    .limit(1)
  return { hasPreferenceVector: profile?.preferenceVector != null }
}

export async function resetUser(externalUserId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [profile] = await tx
      .select({ id: userProfiles.id })
      .from(userProfiles)
      .where(eq(userProfiles.externalUserId, externalUserId))
      .limit(1)

    if (!profile) return

    await tx.delete(viewHistory).where(eq(viewHistory.userId, profile.id))
    await tx.delete(events).where(eq(events.userId, externalUserId))
    await tx.delete(userProfiles).where(eq(userProfiles.id, profile.id))
  })
}
