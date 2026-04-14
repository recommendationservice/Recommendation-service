"use client";

import {
	useMutation,
	useQueryClient,
	type InfiniteData,
} from "@tanstack/react-query";

import { FEED_QUERY_KEY } from "./feed-constants";
import type { FeedItem, FeedPage } from "./types";

type InteractionKind = "like" | "bookmark";

type ToggleArgs = {
	item: FeedItem;
	kind: InteractionKind;
};

type MutationContext = {
	previous?: InfiniteData<FeedPage, number>;
	nextValue: boolean;
};

async function apiToggle({ item, kind }: ToggleArgs, isOn: boolean): Promise<void> {
	const method = isOn ? "POST" : "DELETE";
	const url = `/api/movies/${item.externalId}/${kind}`;
	const body = isOn ? JSON.stringify({ contentId: item.contentId }) : undefined;
	console.log(`[interaction] ${method} ${url}`);
	const t0 = performance.now();
	const res = await fetch(url, {
		method,
		credentials: "include",
		headers: body ? { "content-type": "application/json" } : undefined,
		body,
	});
	console.log(
		`[interaction] ${method} ${url} → ${res.status} in ${Math.round(performance.now() - t0)}ms`,
	);
	if (!res.ok) throw new Error(`${method} ${url} failed (${res.status})`);
}

type FeedCache = InfiniteData<FeedPage, number>;

function applyOptimistic(
	cache: FeedCache | undefined,
	item: FeedItem,
	kind: InteractionKind,
	nextValue: boolean,
): FeedCache | undefined {
	if (!cache) return cache;
	const delta = nextValue ? +1 : 0; // only POST contributes to totalEvents
	const lastIndex = cache.pages.length - 1;
	return {
		...cache,
		pages: cache.pages.map((page, idx) => {
			const items = page.items.map((it) =>
				it.externalId === item.externalId
					? { ...it, [kind === "like" ? "liked" : "bookmarked"]: nextValue }
					: it,
			);
			if (idx === lastIndex && delta > 0) {
				return {
					...page,
					items,
					profile: { totalEvents: page.profile.totalEvents + delta },
				};
			}
			return { ...page, items };
		}),
	};
}

export type InteractionLogEntry = {
	id: string;
	userName: string;
	actionText: string;
};

type InteractionsOptions = {
	userName: string;
	onAction: (entry: InteractionLogEntry) => void;
};

function actionText(kind: InteractionKind, isOn: boolean, title: string): string {
	if (kind === "like") {
		return isOn ? `лайкнув фільм «${title}»` : `прибрав лайк з фільму «${title}»`;
	}
	return isOn
		? `додав фільм «${title}» до улюбленого`
		: `прибрав закладку з фільму «${title}»`;
}

export function useMovieInteractions({ userName, onAction }: InteractionsOptions) {
	const queryClient = useQueryClient();

	const mutation = useMutation<
		{ args: ToggleArgs; nextValue: boolean },
		Error,
		ToggleArgs,
		MutationContext
	>({
		mutationFn: async (args) => {
			const current = args.kind === "like" ? args.item.liked : args.item.bookmarked;
			const nextValue = !current;
			await apiToggle(args, nextValue);
			return { args, nextValue };
		},
		onMutate: async (args) => {
			await queryClient.cancelQueries({ queryKey: FEED_QUERY_KEY });
			const previous = queryClient.getQueryData<FeedCache>(FEED_QUERY_KEY);
			const current = args.kind === "like" ? args.item.liked : args.item.bookmarked;
			const nextValue = !current;
			queryClient.setQueryData<FeedCache>(FEED_QUERY_KEY, (cache) =>
				applyOptimistic(cache, args.item, args.kind, nextValue),
			);
			onAction({
				id: crypto.randomUUID(),
				userName,
				actionText: actionText(
					args.kind,
					nextValue,
					args.item.metadata.title ?? "фільм",
				),
			});
			return { previous, nextValue };
		},
		onError: (_error, _args, context) => {
			if (context?.previous) {
				queryClient.setQueryData(FEED_QUERY_KEY, context.previous);
			}
		},
	});

	return {
		toggleLike: (item: FeedItem) => mutation.mutate({ item, kind: "like" }),
		toggleBookmark: (item: FeedItem) => mutation.mutate({ item, kind: "bookmark" }),
	};
}
