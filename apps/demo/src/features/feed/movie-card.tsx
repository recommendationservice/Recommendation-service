"use client";

import { Bookmark, Heart } from "lucide-react";

import type { Movie } from "./movies-data";

type MovieCardProps = {
  movie: Movie;
  liked: boolean;
  bookmarked: boolean;
  onLike: () => void;
  onBookmark: () => void;
  onClick: () => void;
};

export function MovieCard({
  movie,
  liked,
  bookmarked,
  onLike,
  onBookmark,
  onClick,
}: MovieCardProps) {
  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLike();
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    onBookmark();
  };

  return (
    <article className="flex flex-col gap-[7px] rounded-[10px] bg-white p-[10px]">
      <h2 className="font-inter text-base font-bold leading-[1.21] text-black">
        {movie.title}
      </h2>
      <p className="font-montserrat text-sm leading-[1.22] text-black">
        {movie.year} · {movie.genre.join(", ")} · ⭐ {movie.rating}
      </p>
      {movie.posterUrl && (
        <img
          src={movie.posterUrl}
          alt={movie.title}
          className="h-[177px] w-full rounded-[10px] object-cover"
        />
      )}
      <p className="font-montserrat text-sm leading-[1.22] text-black line-clamp-2">
        {movie.description.split("\n")[0]}
      </p>
      <div className="flex items-center gap-[5px] rounded-[10px]">
        <button
          onClick={onClick}
          className="flex flex-1 items-center justify-center gap-[10px] overflow-hidden rounded-[10px] bg-black/5 p-[10px] font-inter text-base font-medium leading-[1.21] text-black"
        >
          Переглянути
        </button>
        <button
          onClick={handleLike}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgba(255,0,0,0.1)]"
        >
          <Heart
            size={20}
            color="#ff0000"
            fill={liked ? "#ff0000" : "none"}
          />
        </button>
        <button
          onClick={handleBookmark}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgba(255,204,0,0.1)]"
        >
          <Bookmark
            size={20}
            color="#ffcc00"
            fill={bookmarked ? "#ffcc00" : "none"}
          />
        </button>
      </div>
    </article>
  );
}
