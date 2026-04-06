"use client";

import { useState } from "react";

import {
  ActionLog,
  FeedPage,
  parseNameFromEmail,
  PostCard,
  PostDialog,
  posts,
  useFeedState,
} from "@/features/feed";
import type { Post } from "@/features/feed";

export default function FeedRoute() {
  const userEmail = "user@example.com";
  const userName = parseNameFromEmail(userEmail);

  const { likes, bookmarks, actions, toggleLike, toggleBookmark } =
    useFeedState(userName);

  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  return (
    <FeedPage
      userEmail={userEmail}
      actionLog={<ActionLog actions={actions} />}
    >
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          liked={likes.has(post.id)}
          bookmarked={bookmarks.has(post.id)}
          onLike={() => toggleLike(post.id)}
          onBookmark={() => toggleBookmark(post.id)}
          onClick={() => setSelectedPost(post)}
        />
      ))}
      <PostDialog
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
      />
    </FeedPage>
  );
}
