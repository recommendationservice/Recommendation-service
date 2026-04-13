"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

import type { Movie } from "./movies-data";

type MovieDialogProps = {
  movie: Movie | null;
  onClose: () => void;
};

export function MovieDialog({ movie, onClose }: MovieDialogProps) {
  useEffect(() => {
    if (!movie) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [movie, onClose]);

  if (!movie) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[15px] bg-white p-6"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-black/60 hover:text-black"
        >
          <X size={24} />
        </button>

        <h2 className="mb-1 font-inter text-xl font-bold">{movie.title}</h2>
        <p className="mb-4 font-montserrat text-sm text-black/60">
          {movie.year} · {movie.genre.join(", ")} · ⭐ {movie.rating}
        </p>

        {movie.trailerUrl && (
          <div className="mb-4 aspect-video w-full overflow-hidden rounded-[10px]">
            <iframe
              src={movie.trailerUrl}
              title={`${movie.title} — трейлер`}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        <div className="mb-4 font-montserrat text-sm leading-relaxed whitespace-pre-line">
          {movie.description}
        </div>

        {movie.cast && movie.cast.length > 0 && (
          <div className="rounded-[10px] bg-black/5 p-3">
            <p className="mb-1 font-inter text-sm font-bold">Акторський склад</p>
            <p className="font-montserrat text-sm text-black/80">
              {movie.cast.join(", ")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
