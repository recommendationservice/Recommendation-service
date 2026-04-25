"use client";

type ContinueButtonProps = { onClick: () => void };

export function ContinueButton({ onClick }: ContinueButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-[10px] bg-black p-[10px] font-inter text-base font-medium text-white"
    >
      Продовжити
    </button>
  );
}
