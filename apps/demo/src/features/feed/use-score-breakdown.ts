"use client";

import { useQuery } from "@tanstack/react-query";

import type { ScoreBreakdownResult } from "@sp/reco-sdk";

export const SCORE_BREAKDOWN_QUERY_KEY = ["scoreBreakdown"] as const;

export function useScoreBreakdown(groupBy = "genre") {
	return useQuery<ScoreBreakdownResult>({
		queryKey: [...SCORE_BREAKDOWN_QUERY_KEY, groupBy],
		queryFn: async () => {
			const res = await fetch(
				`/api/demo/score-breakdown?groupBy=${encodeURIComponent(groupBy)}`,
				{ credentials: "include" },
			);
			if (!res.ok) throw new Error(`score-breakdown failed (${res.status})`);
			return (await res.json()) as ScoreBreakdownResult;
		},
	});
}
