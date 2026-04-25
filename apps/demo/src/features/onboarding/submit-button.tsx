"use client";

type SubmitButtonProps = {
  onClick: () => void;
  disabled: boolean;
  pending: boolean;
};

export function SubmitButton({ onClick, disabled, pending }: SubmitButtonProps) {
  return (
    <button
      type="button"
      aria-label="Submit"
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-[10px] bg-black p-[10px] font-inter text-base font-medium text-white disabled:opacity-50"
    >
      {pending ? "Thinking about your taste..." : "Submit"}
    </button>
  );
}
