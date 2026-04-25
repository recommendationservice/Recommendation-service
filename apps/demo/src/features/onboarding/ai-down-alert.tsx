"use client";

type AiDownAlertProps = {
  message: string;
  onRetry: () => void;
  disabled: boolean;
};

export function AiDownAlert({ message, onRetry, disabled }: AiDownAlertProps) {
  return (
    <div className="flex flex-col gap-2 rounded-[10px] bg-red-50 p-3">
      <p className="font-montserrat text-sm text-red-700">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={disabled}
        className="self-start rounded-[8px] bg-red-600 px-3 py-1 font-inter text-sm text-white disabled:opacity-50"
      >
        Спробувати ще раз
      </button>
    </div>
  );
}
