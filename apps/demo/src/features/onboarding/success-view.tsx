"use client";

import type { Enrichment } from "@sp/reco-sdk";

import { BadgeSection } from "./badge-section";
import { ContinueButton } from "./continue-button";
import { localizeGenre } from "./genre-labels";
import { SummaryHeader } from "./summary-header";

type SuccessViewProps = { enrichment?: Enrichment; onContinue: () => void };

export function SuccessView({ enrichment, onContinue }: SuccessViewProps) {
  const genres = (enrichment?.genres ?? []).map(localizeGenre);
  const titles = enrichment?.similarTitles ?? [];
  return (
    <div className="flex min-h-screen items-center justify-center bg-app-canvas px-4">
      <div className="flex w-full max-w-[520px] flex-col gap-5 rounded-[10px] bg-white p-6">
        <SummaryHeader paragraph={enrichment?.paragraph} />
        <BadgeSection title="Жанри" items={genres} />
        <BadgeSection title="Схожі фільми" items={titles} />
        <ContinueButton onClick={onContinue} />
      </div>
    </div>
  );
}
