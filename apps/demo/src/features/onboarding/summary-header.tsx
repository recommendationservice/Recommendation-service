"use client";

type SummaryHeaderProps = { paragraph?: string };

export function SummaryHeader({ paragraph }: SummaryHeaderProps) {
  return (
    <>
      <h2 className="font-inter text-xl font-black text-black/80">
        Ми зрозуміли, що тобі подобається:
      </h2>
      {paragraph && (
        <p className="font-montserrat text-base text-black/80">{paragraph}</p>
      )}
    </>
  );
}
