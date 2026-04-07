"use client";

import { useState } from "react";

import { createClient } from "@/shared/lib/supabase";

import { ActionLog } from "./action-log";
import { FeedPage } from "./feed-page";
import { MovieCard } from "./movie-card";
import { MovieDialog } from "./movie-dialog";
import { movies } from "./movies-data";
import { useFeedState } from "./use-feed-state";
import type { Movie } from "./movies-data";

type FeedContentProps = {
  displayName: string;
  avatarUrl: string | null;
};

export function FeedContent({ displayName, avatarUrl }: FeedContentProps) {
  const { likes, bookmarks, actions, toggleLike, toggleBookmark } =
    useFeedState(displayName);

  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  return (
    <FeedPage
      displayName={displayName}
      avatarUrl={avatarUrl}
      onLogout={handleLogout}
      actionLog={<ActionLog actions={actions} />}
    >
      {movies.map((movie) => (
        <MovieCard
          key={movie.id}
          movie={movie}
          liked={likes.has(movie.id)}
          bookmarked={bookmarks.has(movie.id)}
          onLike={() => toggleLike(movie.id)}
          onBookmark={() => toggleBookmark(movie.id)}
          onClick={() => setSelectedMovie(movie)}
        />
      ))}
      <MovieDialog
        movie={selectedMovie}
        onClose={() => setSelectedMovie(null)}
      />
    </FeedPage>
  );
}
