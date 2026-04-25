import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, bookmarks, likes, profiles } from "@/db";
import { getRecoClient } from "@/shared/lib/reco-client";
import { getSessionProfile } from "@/shared/lib/session";

type ResetBody = { confirmLogin?: string };

async function readResetBody(request: Request): Promise<ResetBody> {
  return (await request.json().catch(() => ({}))) as ResetBody;
}

async function clearDemoState(profileId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(profiles)
      .set({ onboardedAt: null })
      .where(eq(profiles.id, profileId));
    await tx.delete(likes).where(eq(likes.userId, profileId));
    await tx.delete(bookmarks).where(eq(bookmarks.userId, profileId));
  });
}

async function resetRecoSide(externalUserId: string): Promise<void> {
  try {
    await getRecoClient().resetUser(externalUserId);
  } catch (error) {
    console.error("[reco] resetUser failed", error);
  }
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function loginMismatch() {
  return NextResponse.json(
    { error: "Login confirmation does not match" },
    { status: 400 },
  );
}

export async function POST(request: Request) {
  const profile = await getSessionProfile();
  if (!profile) return unauthorized();

  const body = await readResetBody(request);
  if (body.confirmLogin !== profile.login) return loginMismatch();

  await clearDemoState(profile.id);
  await resetRecoSide(profile.id);

  return NextResponse.json({ ok: true });
}
