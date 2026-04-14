"use client";

import { StrategyBadge } from "./strategy-badge";
import { useFeedRecommendations } from "./use-feed-recommendations";

export function FeedStrategyBadge() {
	const { data } = useFeedRecommendations();
	const lastPage = data?.pages[data.pages.length - 1];
	if (!lastPage) return null;

	return (
		<StrategyBadge
			strategy={lastPage.strategy}
			totalEvents={lastPage.profile.totalEvents}
		/>
	);
}
