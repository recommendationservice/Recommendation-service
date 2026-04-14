"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import { FEED_PAGE_SIZE, FEED_QUERY_KEY } from "./feed-constants";
import type { FeedPage } from "./types";

async function fetchFeedPage(): Promise<FeedPage> {
	const res = await fetch(`/api/feed?limit=${FEED_PAGE_SIZE}`, {
		credentials: "include",
	});
	if (!res.ok) {
		throw new Error(`Feed fetch failed with ${res.status}`);
	}
	return res.json();
}

export function useFeedRecommendations() {
	return useInfiniteQuery({
		queryKey: FEED_QUERY_KEY,
		initialPageParam: 0,
		queryFn: fetchFeedPage,
		getNextPageParam: (lastPage: FeedPage, allPages: FeedPage[]) =>
			lastPage.hasMore ? allPages.length : undefined,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
		staleTime: Infinity,
	});
}
