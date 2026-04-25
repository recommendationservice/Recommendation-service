"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { FormLayout } from "./form-layout";
import { SuccessView } from "./success-view";
import { useOnboardingSubmit } from "./use-onboarding-submit";

export function OnboardingForm() {
  const router = useRouter();
  const goToFeed = useCallback(() => router.push("/feed"), [router]);
  const { state, submit } = useOnboardingSubmit({
    onSkipDone: goToFeed,
    onLlmDoneWithoutEnrichment: goToFeed,
  });
  const [prompt, setPrompt] = useState("");

  const handleSubmit = useCallback(() => {
    const trimmed = prompt.trim();
    if (trimmed.length > 0) void submit(trimmed);
  }, [prompt, submit]);

  const handleSkip = useCallback(() => void submit(null), [submit]);

  if (state.succeededWithEnrichment) {
    return <SuccessView enrichment={state.enrichment} onContinue={goToFeed} />;
  }

  return (
    <FormLayout
      prompt={prompt}
      onPromptChange={setPrompt}
      pending={state.pending}
      error={state.error}
      onSubmit={handleSubmit}
      onSkip={handleSkip}
    />
  );
}
