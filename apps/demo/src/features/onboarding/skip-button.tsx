"use client";

type SkipButtonProps = { onClick: () => void; disabled: boolean };

export function SkipButton({ onClick, disabled }: SkipButtonProps) {
  return (
    <button
      type="button"
      aria-label="Skip onboarding"
      onClick={onClick}
      disabled={disabled}
      className="absolute right-4 top-4 rounded-full bg-white px-3 py-1 text-2xl text-black/70 disabled:opacity-50"
    >
      ×
    </button>
  );
}
