"use client";

import { ErrorRegion } from "./error-region";
import { PromptField } from "./prompt-field";
import { SkipButton } from "./skip-button";
import { SubmitButton } from "./submit-button";
import type { ErrorState } from "./use-onboarding-submit";

type FormLayoutProps = {
  prompt: string;
  onPromptChange: (value: string) => void;
  pending: boolean;
  error: ErrorState;
  onSubmit: () => void;
  onSkip: () => void;
};

export function FormLayout(props: FormLayoutProps) {
  const submitDisabled = props.pending || props.prompt.trim().length === 0;
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-app-canvas px-4">
      <SkipButton onClick={props.onSkip} disabled={props.pending} />
      <div className="flex w-full max-w-[520px] flex-col gap-4">
        <h1 className="font-inter text-2xl font-black text-black/80">
          Tell us what you like
        </h1>
        <p className="font-montserrat text-sm text-black/70">
          Describe your taste in one sentence. Our AI will turn it into a
          starting point for your feed.
        </p>
        <PromptField value={props.prompt} onChange={props.onPromptChange} />
        <ErrorRegion error={props.error} pending={props.pending} onRetry={props.onSubmit} />
        <SubmitButton onClick={props.onSubmit} disabled={submitDisabled} pending={props.pending} />
      </div>
    </div>
  );
}
