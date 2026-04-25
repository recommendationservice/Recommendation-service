"use client";

import { useState } from "react";

import { postLogin, readRedirect } from "./login-api";

type AuthLoginState = {
  login: string;
  setLogin: (value: string) => void;
  error: string | null;
  isLoading: boolean;
  submit: () => Promise<void>;
};

async function readErrorMessage(res: Response): Promise<string> {
  const data = await res.json().catch(() => ({}) as { error?: string });
  return data?.error || "Помилка входу";
}

type Setters = {
  setError: (e: string | null) => void;
  setIsLoading: (v: boolean) => void;
};

async function performLogin(value: string, setters: Setters): Promise<void> {
  const trimmed = value.trim();
  if (!trimmed) return;
  setters.setError(null);
  setters.setIsLoading(true);
  const res = await postLogin(trimmed);
  if (!res.ok) {
    setters.setError(await readErrorMessage(res));
    setters.setIsLoading(false);
    return;
  }
  window.location.href = await readRedirect(res);
}

export function useAuthLogin(): AuthLoginState {
  const [login, setLogin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const submit = () => performLogin(login, { setError, setIsLoading });
  return { login, setLogin, error, isLoading, submit };
}
