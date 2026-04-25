"use client";

import { AuthSubmitButton } from "./auth-submit-button";
import { LoginField } from "./login-field";
import { useAuthLogin } from "./use-auth-login";

export function AuthPage() {
  const { login, setLogin, error, isLoading, submit } = useAuthLogin();

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-canvas">
      <div className="flex w-[294px] flex-col gap-[15px]">
        <h1 className="font-inter text-2xl font-black text-black/80">Вхід</h1>
        <LoginField login={login} onChange={setLogin} onSubmit={submit} />
        {error && (
          <p className="font-montserrat text-sm text-red-500">{error}</p>
        )}
        <AuthSubmitButton
          onClick={submit}
          disabled={isLoading || !login.trim()}
        />
      </div>
    </div>
  );
}
