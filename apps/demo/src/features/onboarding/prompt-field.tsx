"use client";

const MAX_PROMPT_LENGTH = 2000;

type PromptFieldProps = { value: string; onChange: (value: string) => void };

export function PromptField({ value, onChange }: PromptFieldProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      maxLength={MAX_PROMPT_LENGTH}
      placeholder="напр. Темні трилери 90-х, як Сімка"
      className="min-h-[120px] rounded-[10px] bg-white p-3 font-montserrat text-base outline-none"
    />
  );
}
