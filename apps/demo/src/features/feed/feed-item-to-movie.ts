import type { Movie } from "./movies-data";
import type { FeedItem, FeedItemMetadata } from "./types";

export function feedItemToMovie(item: FeedItem): Movie {
	const meta = item.metadata;
	return {
		id: item.externalId,
		title: meta.title ?? "Без назви",
		year: meta.year ?? 0,
		genre: resolveGenres(meta),
		rating: meta.rating ?? 0,
		posterUrl: meta.posterUrl ?? null,
		description: meta.description ?? "",
		trailerUrl: meta.trailerUrl ?? null,
		cast: meta.cast ?? null,
	};
}

function resolveGenres(meta: FeedItemMetadata): string[] {
	if (meta.genre && meta.genre.length > 0) return meta.genre;
	if (meta.genres && meta.genres.length > 0) return meta.genres;
	return [];
}
