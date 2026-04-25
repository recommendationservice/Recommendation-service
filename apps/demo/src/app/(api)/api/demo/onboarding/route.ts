import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { RecoApiError } from "@sp/reco-sdk";

import { db, profiles } from "@/db";
import { getRecoClient } from "@/shared/lib/reco-client";
import { getSessionProfile } from "@/shared/lib/session";

type OnboardingBody = { rawPrompt: string | null };
type OnboardingResponse = { ok: true; enrichedText?: string };

async function parseBody(request: Request): Promise<OnboardingBody | null> {
  const raw = await request.json().catch(() => null);
  if (!raw || typeof raw !== "object") return null;
  const value = (raw as { rawPrompt?: unknown }).rawPrompt;
  if (value === null) return { rawPrompt: null };
  if (typeof value === "string") return { rawPrompt: value };
  return null;
}

async function markOnboarded(profileId: string): Promise<void> {
  await db
    .update(profiles)
    .set({ onboardedAt: new Date() })
    .where(eq(profiles.id, profileId));
}

async function callBootstrap(externalUserId: string, rawPrompt: string) {
  return getRecoClient().bootstrapUser({ externalUserId, rawPrompt });
}

function extractRecoMessage(error: RecoApiError): string {
  const body = error.body as { error?: { message?: string } } | undefined;
  return body?.error?.message ?? error.message;
}

function recoErrorResponse(error: unknown) {
  if (error instanceof RecoApiError) {
    return NextResponse.json(
      { error: { message: extractRecoMessage(error) } },
      { status: error.status },
    );
  }
  console.error("[onboarding] unexpected reco error", error);
  return NextResponse.json(
    { error: { message: "Internal Server Error" } },
    { status: 500 },
  );
}

async function handleSkip(profileId: string): Promise<NextResponse> {
  await markOnboarded(profileId);
  return NextResponse.json<OnboardingResponse>({ ok: true });
}

async function handleLlm(
  profileId: string,
  rawPrompt: string,
): Promise<NextResponse> {
  let enrichedText: string | undefined;
  try {
    const result = await callBootstrap(profileId, rawPrompt);
    enrichedText = result.enrichedText;
  } catch (error) {
    return recoErrorResponse(error);
  }
  await markOnboarded(profileId);
  return NextResponse.json<OnboardingResponse>({ ok: true, enrichedText });
}

export async function POST(request: Request) {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await parseBody(request);
  if (!body) {
    return NextResponse.json(
      { error: { message: "Invalid request body" } },
      { status: 400 },
    );
  }

  if (body.rawPrompt === null) return handleSkip(profile.id);
  return handleLlm(profile.id, body.rawPrompt);
}
