"use client";

import { AiDownAlert } from "./ai-down-alert";
import type { ErrorState } from "./use-onboarding-submit";

type ErrorRegionProps = {
  error: ErrorState;
  pending: boolean;
  onRetry: () => void;
};

export function ErrorRegion({ error, pending, onRetry }: ErrorRegionProps) {
  if (error.kind === "ai-down") {
    return <AiDownAlert message={error.message} onRetry={onRetry} disabled={pending} />;
  }
  if (error.kind === "validation" || error.kind === "network") {
    return <p className="font-montserrat text-sm text-red-500">{error.message}</p>;
  }
  return null;
}
