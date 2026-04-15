"use client";

import { useEffect, useRef } from "react";
import { Bookmark, Eye, Heart } from "lucide-react";

export type ActionKind = "like" | "unlike" | "bookmark" | "unbookmark" | "view";

export type ActionEntry = {
	id: string;
	userName: string;
	kind: ActionKind;
	verb: string;
	title: string;
	detail?: string;
};

type ActionLogProps = {
	actions: ActionEntry[];
};

type IconConfig = {
	Icon: typeof Heart;
	bgClass: string;
	colorVar: string;
};

const ICONS: Record<ActionKind, IconConfig> = {
	like: {
		Icon: Heart,
		bgClass: "bg-action-like-bg",
		colorVar: "var(--color-action-like)",
	},
	unlike: {
		Icon: Heart,
		bgClass: "bg-action-like-bg",
		colorVar: "var(--color-action-like)",
	},
	bookmark: {
		Icon: Bookmark,
		bgClass: "bg-action-bookmark-bg",
		colorVar: "var(--color-action-bookmark)",
	},
	unbookmark: {
		Icon: Bookmark,
		bgClass: "bg-action-bookmark-bg",
		colorVar: "var(--color-action-bookmark)",
	},
	view: {
		Icon: Eye,
		bgClass: "bg-action-view-bg",
		colorVar: "var(--color-action-view)",
	},
};

function ActionIcon({ kind }: { kind: ActionKind }) {
	const { Icon, bgClass, colorVar } = ICONS[kind];
	return (
		<div
			className={`flex size-10 shrink-0 items-center justify-center rounded-full ${bgClass}`}
		>
			<Icon size={20} color={colorVar} strokeWidth={2} />
		</div>
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
					ref={
						index === actions.length - 1 ? lastEntryRef : undefined
					}
					className="flex items-start gap-2"
				>
					<ActionIcon kind={entry.kind} />
					<p className="pt-1 font-montserrat text-sm leading-[1.35] text-black/85">
						<span className="font-bold">{entry.userName}</span>{" "}
						{entry.verb}{" "}
						<span className="font-bold">“{entry.title}”</span>
						{entry.detail ? (
							<>
								{" "}
								<span className="text-black/70">
									{entry.detail}
								</span>
							</>
						) : null}
					</p>
				</div>
			))}
		</>
	);
}
