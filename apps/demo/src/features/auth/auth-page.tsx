"use client";

import { useState } from "react";

import { createClient } from "@/shared/lib/supabase";

export function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    setError(null);
    setIsLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    window.location.href = "/feed";
  };

  const handleSignUp = async () => {
    setError(null);
    setIsLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    window.location.href = "/feed";
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f8f8]">
      <div className="flex w-[294px] flex-col gap-[15px]">
        <h1 className="font-inter text-2xl font-black text-black/80">Вхід</h1>

        <label className="flex flex-col gap-1">
          <span className="font-montserrat text-sm font-medium text-black">
            Email
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            className="rounded-[10px] bg-white px-3 py-[11px] font-montserrat text-base outline-none"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-montserrat text-sm font-medium text-black">
            Пароль
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="rounded-[10px] bg-white px-3 py-[11px] font-montserrat text-base outline-none"
          />
        </label>

        {error && (
          <p className="font-montserrat text-sm text-red-500">{error}</p>
        )}

        <button
          type="button"
          onClick={handleSignIn}
          disabled={isLoading}
          className="w-full rounded-[10px] bg-black p-[10px] font-inter text-base font-medium text-white disabled:opacity-50"
        >
          Увійти
        </button>

        <button
          type="button"
          onClick={handleSignUp}
          disabled={isLoading}
          className="w-full rounded-[10px] bg-white p-[10px] font-inter text-base font-medium text-black/80 disabled:opacity-50"
        >
          Зареєструватись
        </button>
      </div>
    </div>
  );
}
