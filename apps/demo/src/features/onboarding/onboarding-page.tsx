import { redirect } from "next/navigation";

import { userIsOnboarded } from "@/shared/lib/onboarding-gate";
import { getSessionProfile } from "@/shared/lib/session";

import { OnboardingForm } from "./onboarding-form";

export async function OnboardingPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/auth");
  if (await userIsOnboarded(profile)) redirect("/feed");
  return <OnboardingForm />;
}
