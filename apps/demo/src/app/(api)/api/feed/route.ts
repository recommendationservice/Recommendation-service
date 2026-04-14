import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, likes, bookmarks } from "@/db";
import { getRecoClient } from "@/shared/lib/reco-client";
import { getSessionProfile } from "@/shared/lib/session";
import type {
	FeedItem,
	FeedItemMetadata,
	FeedPage,
} from "@/features/feed/types";

const DEFAULT_LIMIT = 3;
const MAX_LIMIT = 20;

export async function GET(request: Request) {
	const t0 = Date.now();
	const profile = await getSessionProfile();
	if (!profile) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const limit = parseLimit(request);
	console.log(`[feed:GET] user=${profile.login} limit=${limit}`);
	const tReco = Date.now();
	const reco = await getRecoClient().getRecommendations({
		userId: profile.id,
		limit,
	});
	console.log(
		`[feed:GET]   reco.getRecommendations in ${Date.now() - tReco}ms → ${reco.recommendations.length} items, strategy=${reco.strategy}, totalEvents=${reco.profile.totalEvents}`,
	);

	const externalIds = reco.recommendations.map((r) => r.externalId);
	const [likedIds, bookmarkedIds] = await loadInteractionIds(
		profile.id,
		externalIds,
	);

	const items: FeedItem[] = reco.recommendations.map((r) => ({
		contentId: r.id,
		externalId: r.externalId,
		metadata: (r.metadata ?? {}) as FeedItemMetadata,
		score: r.score,
		liked: likedIds.has(r.externalId),
		bookmarked: bookmarkedIds.has(r.externalId),
	}));

	const body: FeedPage = {
		items,
		strategy: reco.strategy,
		profile: reco.profile,
		hasMore: items.length === limit,
	};
	console.log(`[feed:GET] done in ${Date.now() - t0}ms`);
	return NextResponse.json(body);
}

function parseLimit(request: Request): number {
	const raw = new URL(request.url).searchParams.get("limit");
	if (!raw) return DEFAULT_LIMIT;
	const parsed = Number.parseInt(raw, 10);
	if (Number.isNaN(parsed) || parsed < 1) return DEFAULT_LIMIT;
	return Math.min(parsed, MAX_LIMIT);
}

async function loadInteractionIds(
	profileId: string,
	movieIds: string[],
): Promise<[Set<string>, Set<string>]> {
	if (movieIds.length === 0) return [new Set(), new Set()];

	const [likedRows, bookmarkedRows] = await Promise.all([
		db
			.select({ movieId: likes.movieId })
			.from(likes)
			.where(and(eq(likes.userId, profileId), inArray(likes.movieId, movieIds))),
		db
			.select({ movieId: bookmarks.movieId })
			.from(bookmarks)
			.where(
				and(
					eq(bookmarks.userId, profileId),
					inArray(bookmarks.movieId, movieIds),
				),
			),
	]);

	return [
		new Set(likedRows.map((r) => r.movieId)),
		new Set(bookmarkedRows.map((r) => r.movieId)),
	];
}
