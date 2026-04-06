"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import Markdown from "react-markdown";

import type { Post } from "./posts-data";

type PostDialogProps = {
  post: Post | null;
  onClose: () => void;
};

export function PostDialog({ post, onClose }: PostDialogProps) {
  useEffect(() => {
    if (!post) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [post, onClose]);

  if (!post) return null;

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

        <h2 className="mb-4 font-inter text-xl font-bold">{post.title}</h2>

        {post.image && (
          <img
            src={post.image}
            alt={post.title}
            className="mb-4 h-[200px] w-full rounded-[10px] object-cover"
          />
        )}

        <div className="font-montserrat text-sm leading-relaxed [&_h1]:mb-3 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_strong]:font-bold [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-5">
          <Markdown>{post.content}</Markdown>
        </div>
      </div>
    </div>
  );
}
