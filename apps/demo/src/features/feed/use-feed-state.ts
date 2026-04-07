"use client";

import { useState } from "react";

export type ActionEntry = {
  id: string;
  userName: string;
  actionText: string;
};

type FeedState = {
  likes: Set<string>;
  bookmarks: Set<string>;
  actions: ActionEntry[];
};

export function useFeedState(userName: string) {
  const [state, setState] = useState<FeedState>({
    likes: new Set(),
    bookmarks: new Set(),
    actions: [],
  });

  const toggleLike = (postId: string) => {
    setState((prev) => {
      const newLikes = new Set(prev.likes);
      const isLiked = newLikes.has(postId);
      if (isLiked) newLikes.delete(postId);
      else newLikes.add(postId);
      return {
        ...prev,
        likes: newLikes,
        actions: [
          ...prev.actions,
          {
            id: crypto.randomUUID(),
            userName,
            actionText: isLiked ? "прибрав лайк з фільму" : "лайкнув фільм",
          },
        ],
      };
    });
  };

  const toggleBookmark = (postId: string) => {
    setState((prev) => {
      const newBookmarks = new Set(prev.bookmarks);
      const isBookmarked = newBookmarks.has(postId);
      if (isBookmarked) newBookmarks.delete(postId);
      else newBookmarks.add(postId);
      return {
        ...prev,
        bookmarks: newBookmarks,
        actions: [
          ...prev.actions,
          {
            id: crypto.randomUUID(),
            userName,
            actionText: isBookmarked
              ? "прибрав закладку з фільму"
              : "додав фільм до улюбленого",
          },
        ],
      };
    });
  };

  return {
    likes: state.likes,
    bookmarks: state.bookmarks,
    actions: state.actions,
    toggleLike,
    toggleBookmark,
  };
}
