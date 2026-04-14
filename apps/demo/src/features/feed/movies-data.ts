export type Movie = {
	id: string;
	title: string;
	year: number;
	genre: string[];
	rating: number;
	posterUrl: string | null;
	description: string;
	trailerUrl: string | null;
	cast: string[] | null;
};
