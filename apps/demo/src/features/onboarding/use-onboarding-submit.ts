"use client";

import { useCallback, useState } from "react";

import type { Enrichment } from "@sp/reco-sdk";

const ENDPOINT = "/api/demo/onboarding";
const SUBMIT_TIMEOUT_MS = 15_000;

export type ErrorState =
  | { kind: "none" }
  | { kind: "ai-down"; message: string }
  | { kind: "validation"; message: string }
  | { kind: "network"; message: string };

export type SubmitState = {
  pending: boolean;
  error: ErrorState;
  enrichment?: Enrichment;
  succeededWithEnrichment: boolean;
};

const INITIAL_STATE: SubmitState = {
  pending: false,
  error: { kind: "none" },
  succeededWithEnrichment: false,
};

type ApiErrorBody = { error?: { message?: string } };
type SuccessBody = { enrichment?: Enrichment };

async function postOnboarding(rawPrompt: string | null): Promise<Response> {
  return fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rawPrompt }),
    signal: AbortSignal.timeout(SUBMIT_TIMEOUT_MS),
  });
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    return body?.error?.message ?? fallback;
  } catch {
    return fallback;
  }
}

const AI_DOWN_MESSAGE = "ШІ тимчасово недоступний, спробуй ще раз";

function classifyHttpError(status: number, message: string): ErrorState {
  if (status === 503) return { kind: "ai-down", message: AI_DOWN_MESSAGE };
  if (status === 400 || status === 422) return { kind: "validation", message };
  return { kind: "network", message: `Несподівана помилка (${status})` };
}

function networkErrorState(): SubmitState {
  return {
    pending: false,
    error: { kind: "network", message: "Помилка мережі. Перевір з'єднання і спробуй ще раз." },
    succeededWithEnrichment: false,
  };
}

export type SubmitOptions = {
  onSkipDone: () => void;
  onLlmDoneWithoutEnrichment: () => void;
};

type Setter = (next: SubmitState | ((prev: SubmitState) => SubmitState)) => void;

async function readSuccessBody(response: Response): Promise<SuccessBody> {
  return (await response.json().catch(() => ({}))) as SuccessBody;
}

const successWithEnrichment = (enrichment: Enrichment): SubmitState => ({
  pending: false,
  error: { kind: "none" },
  enrichment,
  succeededWithEnrichment: true,
});

async function resolveSuccess(
  response: Response,
  isSkip: boolean,
  setState: Setter,
  options: SubmitOptions,
): Promise<void> {
  const body = await readSuccessBody(response);
  if (!isSkip && body.enrichment) {
    setState(successWithEnrichment(body.enrichment));
    return;
  }
  setState(INITIAL_STATE);
  (isSkip ? options.onSkipDone : options.onLlmDoneWithoutEnrichment)();
}

const applyHttpFailure = async (response: Response, setState: Setter): Promise<void> => {
  const message = await readErrorMessage(response, "Помилка запиту");
  setState({
    pending: false,
    error: classifyHttpError(response.status, message),
    succeededWithEnrichment: false,
  });
};

const markPending = (setState: Setter): void => {
  setState((s) => ({ ...s, pending: true, error: { kind: "none" } }));
};

const runSubmit = async (
  rawPrompt: string | null,
  setState: Setter,
  options: SubmitOptions,
): Promise<void> => {
  markPending(setState);
  try {
    const response = await postOnboarding(rawPrompt);
    if (!response.ok) return applyHttpFailure(response, setState);
    await resolveSuccess(response, rawPrompt === null, setState, options);
  } catch (error) {
    console.error("[onboarding] fetch failed", error);
    setState(networkErrorState());
  }
};

export function useOnboardingSubmit(options: SubmitOptions) {
  const [state, setState] = useState<SubmitState>(INITIAL_STATE);
  const submit = useCallback(
    async (rawPrompt: string | null) => {
      if (state.pending) return;
      await runSubmit(rawPrompt, setState, options);
    },
    [options, state.pending],
  );
  return { state, submit };
}
