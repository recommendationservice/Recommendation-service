"use client";

import type { ChangeEvent, KeyboardEvent } from "react";

const INPUT_CLASS =
  "rounded-[10px] bg-white px-3 py-[11px] font-montserrat text-base outline-none";

type LoginFieldProps = {
  login: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function LoginField({ login, onChange, onSubmit }: LoginFieldProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") onSubmit();
  };
  return (
    <label className="flex flex-col gap-1">
      <span className="font-montserrat text-sm font-medium text-black">
        Логін
      </span>
      <input
        type="text"
        value={login}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Введіть логін"
        className={INPUT_CLASS}
      />
    </label>
  );
}
