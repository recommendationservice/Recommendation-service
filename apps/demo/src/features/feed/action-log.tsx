"use client";

import { useEffect, useRef } from "react";
import { Eye } from "lucide-react";

import type { ActionEntry } from "./use-feed-state";

type ActionLogProps = {
  actions: ActionEntry[];
};

export function ActionLog({ actions }: ActionLogProps) {
  const lastEntryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    lastEntryRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [actions.length]);

  return (
    <>
      {actions.map((entry, index) => (
        <div
          key={entry.id}
          ref={index === actions.length - 1 ? lastEntryRef : undefined}
          className="flex items-center gap-[7px]"
        >
          <div className="rounded-[5px] bg-[#f8f8f8] p-[5px]">
            <Eye size={24} color="black" />
          </div>
          <p className="font-montserrat text-xs text-black/80">
            <span className="font-bold">{entry.userName}</span>{" "}
            {entry.actionText}
          </p>
        </div>
      ))}
    </>
  );
}
