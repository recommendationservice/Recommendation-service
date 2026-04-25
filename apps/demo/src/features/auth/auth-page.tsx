"use client";

import { useState } from "react";

export function AuthPage() {
  const [login, setLogin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!login.trim()) return;

    setError(null);
    setIsLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: login.trim() }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Помилка входу");
      setIsLoading(false);
      return;
    }

    const data = await res.json().catch(() => null);
    const target = (data?.redirect as string | undefined) ?? "/feed";
    window.location.href = target;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-canvas">
      <div className="flex w-[294px] flex-col gap-[15px]">
        <h1 className="font-inter text-2xl font-black text-black/80">Вхід</h1>

        <label className="flex flex-col gap-1">
          <span className="font-montserrat text-sm font-medium text-black">
            Логін
          </span>
          <input
            type="text"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="Введіть логін"
            className="rounded-[10px] bg-white px-3 py-[11px] font-montserrat text-base outline-none"
          />
        </label>

        {error && (
          <p className="font-montserrat text-sm text-red-500">{error}</p>
        )}

        <button
          type="button"
          onClick={handleLogin}
          disabled={isLoading || !login.trim()}
          className="w-full rounded-[10px] bg-black p-[10px] font-inter text-base font-medium text-white disabled:opacity-50"
        >
          Увійти
        </button>
      </div>
    </div>
  );
}
