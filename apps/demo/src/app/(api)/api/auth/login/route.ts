import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { db, profiles } from "@/db";

const SESSION_COOKIE = "demo-session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

type ProfileRow = {
  id: string;
  login: string;
  onboardedAt: Date | null;
};

function validateLogin(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function findExisting(login: string): Promise<ProfileRow> {
  const existing = await db.query.profiles.findFirst({
    where: eq(profiles.login, login),
  });
  if (!existing) {
    throw new Error("Profile lookup failed after ON CONFLICT DO NOTHING");
  }
  return existing as ProfileRow;
}

async function upsertProfile(login: string): Promise<ProfileRow> {
  const inserted = await db
    .insert(profiles)
    .values({ login, displayName: login })
    .onConflictDoNothing({ target: profiles.login })
    .returning();
  return inserted.length > 0 ? (inserted[0] as ProfileRow) : findExisting(login);
}

function pickRedirect(profile: ProfileRow): "/onboarding" | "/feed" {
  return profile.onboardedAt ? "/feed" : "/onboarding";
}

async function setSessionCookie(profileId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, profileId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const login = validateLogin(payload?.login);
  if (!login) {
    return NextResponse.json({ error: "Login is required" }, { status: 400 });
  }

  const profile = await upsertProfile(login);
  await setSessionCookie(profile.id);

  return NextResponse.json({ ok: true, redirect: pickRedirect(profile) });
}
