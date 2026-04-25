"use client";

const BUTTON_CLASS =
  "w-full rounded-[10px] bg-black p-[10px] font-inter text-base font-medium text-white disabled:opacity-50";

type Props = {
  onClick: () => void;
  disabled: boolean;
};

export function AuthSubmitButton({ onClick, disabled }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={BUTTON_CLASS}
    >
      Увійти
    </button>
  );
}
