export type FeedItem = {
	contentId: string;
	externalId: string;
	metadata: FeedItemMetadata;
	score: number;
	liked: boolean;
	bookmarked: boolean;
	disliked: boolean;
};

export type FeedItemMetadata = {
	title?: string;
	year?: number | null;
	rating?: number | null;
	posterUrl?: string | null;
	description?: string | null;
	trailerUrl?: string | null;
	cast?: string[] | null;
	genres?: string[] | null;
	genre?: string[] | null;
};

export type FeedPage = {
	items: FeedItem[];
	strategy: "cold_start" | "personalized";
	profile: { totalEvents: number };
	hasMore: boolean;
};
