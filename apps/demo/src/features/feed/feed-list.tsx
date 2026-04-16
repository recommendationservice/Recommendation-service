"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { FEED_PAGE_SIZE } from "./feed-constants";
import { feedItemToMovie } from "./feed-item-to-movie";
import { MovieCard } from "./movie-card";
import { MovieCardSkeleton } from "./movie-card-skeleton";
import { MovieDialog } from "./movie-dialog";
import { ResetDemoButton } from "./reset-demo-button";
import type { FeedItem } from "./types";
import { useFeedRecommendations } from "./use-feed-recommendations";
import {
	useMovieInteractions,
	type InteractionLogEntry,
} from "./use-movie-interactions";
import type { Movie } from "./movies-data";

type FeedListProps = {
	login: string;
	displayName: string;
	onAction: (entry: InteractionLogEntry) => void;
};

export function FeedList({ login, displayName, onAction }: FeedListProps) {
	const {
		data,
		isLoading,
		isError,
		error,
		refetch,
		hasNextPage,
		isFetchingNextPage,
		fetchNextPage,
	} = useFeedRecommendations();

	const items: FeedItem[] = data?.pages.flatMap((p) => p.items) ?? [];
	const sentinelRef = useIntersectionSentinel({
		enabled: hasNextPage && !isFetchingNextPage && !isError,
		onIntersect: fetchNextPage,
	});

	const { toggleLike, toggleBookmark, toggleDislike } = useMovieInteractions({
		userName: displayName,
		onAction,
	});
	const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

	if (isLoading) {
		return <SkeletonList count={FEED_PAGE_SIZE} />;
	}

	if (isError && items.length === 0) {
		return <ErrorBanner message={error?.message} onRetry={refetch} />;
	}

	if (items.length === 0) {
		return <EmptyBanner />;
	}

	return (
		<>
			{items.map((item) => {
				const movie = feedItemToMovie(item);
				return (
					<MovieCard
						key={item.contentId}
						movie={movie}
						liked={item.liked}
						bookmarked={item.bookmarked}
						disliked={item.disliked}
						onLike={() => toggleLike(item)}
						onBookmark={() => toggleBookmark(item)}
						onDislike={() => toggleDislike(item)}
						onClick={() => setSelectedMovie(movie)}
					/>
				);
			})}

			{isFetchingNextPage && <SkeletonList count={FEED_PAGE_SIZE} />}
			{isError && !isFetchingNextPage && (
				<ErrorBanner message={error?.message} onRetry={fetchNextPage} />
			)}
			{!hasNextPage && !isFetchingNextPage && (
				<EndOfListBanner login={login} />
			)}

			{hasNextPage && items.length > 0 && (
				<div ref={sentinelRef} className="h-px w-full" aria-hidden />
			)}

			<MovieDialog
				movie={selectedMovie}
				onClose={() => setSelectedMovie(null)}
			/>
		</>
	);
}

function SkeletonList({ count }: { count: number }) {
	return (
		<>
			{Array.from({ length: count }).map((_, i) => (
				<MovieCardSkeleton key={`skeleton-${i}`} />
			))}
		</>
	);
}

function ErrorBanner({
	message,
	onRetry,
}: {
	message?: string;
	onRetry: () => void;
}) {
	return (
		<div className="flex flex-col items-center gap-2 rounded-[10px] bg-[rgba(255,0,0,0.08)] p-[15px] text-center">
			<p className="font-montserrat text-sm text-black/80">
				Не вдалося завантажити рекомендації
				{message ? `: ${message}` : ""}
			</p>
			<button
				type="button"
				onClick={() => onRetry()}
				className="rounded-[10px] bg-black/80 px-4 py-2 font-inter text-sm text-white"
			>
				Спробувати ще
			</button>
		</div>
	);
}

function EmptyBanner() {
	return (
		<div className="rounded-[10px] bg-white p-[15px] text-center font-montserrat text-sm text-black/80">
			Рекомендації ще не готові
		</div>
	);
}

function EndOfListBanner({ login }: { login: string }) {
	return (
		<div className="flex flex-col items-center gap-3 rounded-[10px] bg-white p-[15px] text-center">
			<p className="font-montserrat text-sm text-black/60">
				Більше рекомендацій немає на цю мить
			</p>
			<ResetDemoButton login={login} variant="text" />
		</div>
	);
}

type SentinelOptions = {
	enabled: boolean;
	onIntersect: () => void;
};

function useIntersectionSentinel({ enabled, onIntersect }: SentinelOptions) {
	const ref = useRef<HTMLDivElement | null>(null);
	const callbackRef = useRef(onIntersect);
	callbackRef.current = onIntersect;

	useEffect(() => {
		const node = ref.current;
		if (!node || !enabled) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((e) => e.isIntersecting)) {
					callbackRef.current();
				}
			},
			{ rootMargin: "400px" },
		);
		observer.observe(node);
		return () => observer.disconnect();
	}, [enabled]);

	return useCallback((node: HTMLDivElement | null) => {
		ref.current = node;
	}, []);
}
