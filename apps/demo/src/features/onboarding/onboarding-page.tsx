import { redirect } from "next/navigation";

import { getSessionProfile } from "@/shared/lib/session";

import { OnboardingForm } from "./onboarding-form";

export async function OnboardingPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/auth");
  if (profile.onboardedAt) redirect("/feed");
  return <OnboardingForm />;
}
