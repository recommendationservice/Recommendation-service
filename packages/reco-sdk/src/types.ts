export type RecommendationItem = {
	id: string;
	externalId: string;
	type: string;
	metadata: unknown;
	score: number;
};

export type RecommendationStrategy = "personalized" | "cold_start";

export type GetRecommendationsInput = {
	userId: string;
	type?: string;
	limit?: number;
};

export type GetRecommendationsResult = {
	recommendations: RecommendationItem[];
	strategy: RecommendationStrategy;
	profile: { totalEvents: number };
};

export type RecoEventType =
	| "view"
	| "read"
	| "deep_read"
	| "like"
	| "share"
	| "dislike"
	| "bookmark";

export type RecordEventInput = {
	userId: string;
	contentId: string;
	eventType: RecoEventType;
	weight: number;
	metadata?: Record<string, unknown>;
};

export type RecordedEvent = {
	id: string;
	userId: string;
	contentId: string;
	eventType: string;
	weight: number;
	createdAt: string;
};
