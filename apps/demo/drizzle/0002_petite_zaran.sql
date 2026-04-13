ALTER TABLE "movies" ADD COLUMN "tmdb_id" integer;--> statement-breakpoint
ALTER TABLE "movies" ADD CONSTRAINT "movies_tmdb_id_unique" UNIQUE("tmdb_id");