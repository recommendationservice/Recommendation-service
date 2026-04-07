"use client";

import { useEffect, useRef } from "react";
import { Eye } from "lucide-react";

import type { ActionEntry } from "./use-feed-state";

type ActionLogProps = {
  actions: ActionEntry[];
};

function formatActionText(text: string) {
  const parts = text.split("фільм");
  if (parts.length === 1) return text;
  return (
    <>
      {parts[0]}
      <span className="font-bold">фільм</span>
      {parts[1]}
    </>
  );
}

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
          <div className="shrink-0 rounded-[5px] bg-white p-[5px]">
            <Eye size={24} color="black" />
          </div>
          <p className="font-montserrat text-xs leading-[1.22] text-black/80">
            <span className="font-bold">{entry.userName}</span>{" "}
            {formatActionText(entry.actionText)}
          </p>
        </div>
      ))}
    </>
  );
}
