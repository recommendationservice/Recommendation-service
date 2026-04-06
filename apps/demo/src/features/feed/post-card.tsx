"use client";

import { Bookmark, Heart } from "lucide-react";

import type { Post } from "./posts-data";

type PostCardProps = {
  post: Post;
  liked: boolean;
  bookmarked: boolean;
  onLike: () => void;
  onBookmark: () => void;
  onClick: () => void;
};

export function PostCard({
  post,
  liked,
  bookmarked,
  onLike,
  onBookmark,
  onClick,
}: PostCardProps) {
  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLike();
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    onBookmark();
  };

  return (
    <article
      onClick={onClick}
      className="flex cursor-pointer flex-col gap-[7px] rounded-[15px] bg-white p-[10px]"
    >
      <h2 className="font-inter text-base font-bold text-black">
        {post.title}
      </h2>
      <p className="font-montserrat text-sm text-black">{post.preview}</p>
      {post.image && (
        <img
          src={post.image}
          alt={post.title}
          className="h-[177px] w-full rounded-[10px] object-cover"
        />
      )}
      <div className="flex justify-end gap-[5px]">
        <button
          onClick={handleLike}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(255,0,0,0.1)]"
        >
          <Heart
            size={20}
            color="#ff0000"
            fill={liked ? "#ff0000" : "none"}
          />
        </button>
        <button
          onClick={handleBookmark}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(255,204,0,0.1)]"
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
