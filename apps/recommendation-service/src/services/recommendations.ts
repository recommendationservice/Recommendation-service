import { eq, and, desc, sql, notInArray, cosineDistance } from "drizzle-orm";

import { db } from "../db/client";
import { content, userProfiles, viewHistory, events } from "../db/schema";

const WARM_USER_THRESHOLD = 5;

type RecommendationItem = {
	id: string;
	externalId: string;
	type: string;
	metadata: unknown;
	score: number;
};

type RecommendationResult = {
	recommendations: RecommendationItem[];
	strategy: "personalized" | "cold_start";
};

type QueryParams = { type?: string; limit: number };

type ScoredRow = {
	id: string;
	externalId: string;
	type: string;
	metadata: unknown;
	score: number | string;
};

function toRecommendationItem(row: ScoredRow): RecommendationItem {
	return {
		id: row.id,
		externalId: row.externalId,
		type: row.type,
		metadata: row.metadata,
		score: Number(row.score),
	};
}

type Profile = typeof userProfiles.$inferSelect;

function shouldUsePersonalized(profile: Profile | undefined): boolean {
	return Boolean(
		profile?.preferenceVector && profile.totalEvents >= WARM_USER_THRESHOLD,
	);
}

async function loadProfile(userId: string): Promise<Profile | undefined> {
	const [profile] = await db
		.select()
		.from(userProfiles)
		.where(eq(userProfiles.externalUserId, userId))
		.limit(1);
	return profile;
}

type RecoParams = { userId: string; type?: string; limit: number };

export async function getRecommendations(
	params: RecoParams,
): Promise<RecommendationResult> {
	const profile = await loadProfile(params.userId);
	const viewedContentIds = profile
		? await getViewedContentIds(profile.id)
		: [];
	if (shouldUsePersonalized(profile)) {
		const vector = profile!.preferenceVector!;
		return getPersonalizedRecommendations(vector, viewedContentIds, params);
	}
	return getColdStartRecommendations(viewedContentIds, params);
}

async function getViewedContentIds(profileId: string): Promise<string[]> {
	const viewed = await db
		.select({ contentId: viewHistory.contentId })
		.from(viewHistory)
		.where(eq(viewHistory.userId, profileId));
	return viewed.map((v) => v.contentId);
}

function baseContentFilters(viewedContentIds: string[], params: QueryParams) {
	return [
		eq(content.isActive, true),
		...(viewedContentIds.length > 0
			? [notInArray(content.id, viewedContentIds)]
			: []),
		...(params.type ? [eq(content.type, params.type)] : []),
	];
}

const contentBaseFields = {
	id: content.id,
	externalId: content.externalId,
	type: content.type,
	metadata: content.metadata,
} as const;

function personalizedConditions(
	preferenceVector: number[],
	viewedContentIds: string[],
	params: QueryParams,
) {
	return [
		...baseContentFilters(viewedContentIds, params),
		sql`${content.embedding} IS NOT NULL`,
	];
}

function similarityExpr(preferenceVector: number[]) {
	return sql<number>`1 - (${cosineDistance(content.embedding, preferenceVector)})`;
}

type PersonalizedArgs = {
	preferenceVector: number[];
	viewedContentIds: string[];
	params: QueryParams;
};

async function queryPersonalized(args: PersonalizedArgs): Promise<ScoredRow[]> {
	const { preferenceVector, viewedContentIds, params } = args;
	const similarity = similarityExpr(preferenceVector);
	const where = and(
		...personalizedConditions(preferenceVector, viewedContentIds, params),
	);
	return db
		.select({ ...contentBaseFields, score: similarity })
		.from(content)
		.where(where)
		.orderBy(desc(similarity))
		.limit(params.limit);
}

async function getPersonalizedRecommendations(
	preferenceVector: number[],
	viewedContentIds: string[],
	params: QueryParams,
): Promise<RecommendationResult> {
	const results = await queryPersonalized({
		preferenceVector,
		viewedContentIds,
		params,
	});
	return {
		recommendations: results.map(toRecommendationItem),
		strategy: "personalized",
	};
}

const coldStartEventCount = sql<number>`COALESCE((
  SELECT COUNT(*)::int FROM ${events}
  WHERE ${events.contentId} = ${content.id} AND ${events.weight} > 0
), 0)`;

async function getColdStartRecommendations(
	viewedContentIds: string[],
	params: QueryParams,
): Promise<RecommendationResult> {
	const results = await db
		.select({ ...contentBaseFields, score: coldStartEventCount })
		.from(content)
		.where(and(...baseContentFilters(viewedContentIds, params)))
		.orderBy(desc(coldStartEventCount), desc(content.createdAt))
		.limit(params.limit);

	return {
		recommendations: results.map(toRecommendationItem),
		strategy: "cold_start",
	};
}
