import { eq, and, desc, sql, notInArray, cosineDistance } from "drizzle-orm";

import { db } from "../db/client";
import { content, viewHistory, events } from "../db/schema";
import {
  findOrCreateProfile,
  upsertViewHistoryBatch,
  type Profile,
  type Tx,
} from "./events";

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
	profile: { totalEvents: number };
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

function shouldUsePersonalized(profile: Profile, totalEvents: number): boolean {
	return Boolean(profile.preferenceVector && totalEvents >= WARM_USER_THRESHOLD);
}

async function countUserEvents(tx: Tx, externalUserId: string): Promise<number> {
	const [row] = await tx
		.select({ count: sql<number>`count(*)::int` })
		.from(events)
		.where(eq(events.userId, externalUserId));
	return row?.count ?? 0;
}

type RecoParams = { userId: string; type?: string; limit: number };

export async function getRecommendations(
	params: RecoParams,
): Promise<RecommendationResult> {
	return db.transaction(async (tx) => {
		const profile = await findOrCreateProfile(tx, params.userId);
		const totalEvents = await countUserEvents(tx, params.userId);
		const personalized = shouldUsePersonalized(profile, totalEvents);
		const viewedContentIds = await getViewedContentIds(tx, profile.id);
		const items = personalized
			? await queryPersonalized(tx, {
					preferenceVector: profile.preferenceVector!,
					viewedContentIds,
					params,
				})
			: await queryColdStart(tx, viewedContentIds, params);

		await upsertViewHistoryBatch(
			tx,
			profile.id,
			items.map((item) => item.id),
		);

		return {
			recommendations: items.map(toRecommendationItem),
			strategy: personalized ? "personalized" : "cold_start",
			profile: { totalEvents },
		};
	});
}

async function getViewedContentIds(tx: Tx, profileId: string): Promise<string[]> {
	const viewed = await tx
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

async function queryPersonalized(
	tx: Tx,
	args: PersonalizedArgs,
): Promise<ScoredRow[]> {
	const { preferenceVector, viewedContentIds, params } = args;
	const similarity = similarityExpr(preferenceVector);
	const where = and(...personalizedConditions(viewedContentIds, params));
	return tx
		.select({ ...contentBaseFields, score: similarity })
		.from(content)
		.where(where)
		.orderBy(desc(similarity))
		.limit(params.limit);
}

async function queryColdStart(
	tx: Tx,
	viewedContentIds: string[],
	params: QueryParams,
): Promise<ScoredRow[]> {
	return tx
		.select({ ...contentBaseFields, score: sql<number>`0` })
		.from(content)
		.where(and(...baseContentFilters(viewedContentIds, params)))
		.orderBy(sql`RANDOM()`)
		.limit(params.limit);
}
