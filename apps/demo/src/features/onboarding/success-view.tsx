"use client";

type SuccessViewProps = { enrichedText?: string; onContinue: () => void };

export function SuccessView({ enrichedText, onContinue }: SuccessViewProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app-canvas px-4">
      <div className="flex w-full max-w-[520px] flex-col gap-4 rounded-[10px] bg-white p-6">
        <h2 className="font-inter text-xl font-black text-black/80">
          We understood you like:
        </h2>
        <p className="font-montserrat text-base text-black/80">{enrichedText}</p>
        <button
          type="button"
          onClick={onContinue}
          className="w-full rounded-[10px] bg-black p-[10px] font-inter text-base font-medium text-white"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
