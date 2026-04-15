"use client";

import type { ScoreBreakdownItem } from "@sp/reco-sdk";

import { useScoreBreakdown } from "./use-score-breakdown";

type CategoryVariant = "primary" | "green" | "yellow" | "empty";

type CategoryRow = {
	label: string;
	value: number;
	fillWidth?: number;
	variant: CategoryVariant;
};

const ROW_WIDTH = 317;
const BAR_HEIGHT = 34;
const MAX_ROWS = 4;

export function FavCategories() {
	const { data, isLoading, isError } = useScoreBreakdown("genre");

	if (isLoading && !data) return <Shell>{renderSkeleton()}</Shell>;
	if (isError) return null;

	const items = data?.items ?? [];
	if (items.length === 0) return null;

	const rows = buildRows(items);
	if (rows.length === 0) return null;

	return (
		<Shell>
			{rows.map((row, index) => (
				<Row key={`${row.label}-${index}`} row={row} />
			))}
		</Shell>
	);
}

function Shell({ children }: { children: React.ReactNode }) {
	return (
		<section className="flex w-[337px] flex-col items-start gap-[7px] overflow-hidden rounded-[10px] bg-white p-[10px]">
			<h3 className="font-montserrat text-sm font-bold leading-[1.22] text-black">
				Улюблені категорії
			</h3>
			<p className="self-stretch whitespace-pre-line font-montserrat text-xs font-normal leading-[1.22] text-black">
				Які категорії фільмів вам будуть рекомендуватись частіше та які ви
			</p>
			{children}
		</section>
	);
}

function buildRows(items: ScoreBreakdownItem[]): CategoryRow[] {
	const top = items.slice(0, MAX_ROWS);
	const maxAbs = top.reduce((acc, i) => Math.max(acc, Math.abs(i.score)), 0);
	if (maxAbs === 0) return [];

	return top.map((item, index) => {
		const variant = pickVariant(index, item.score);
		const fillWidth =
			variant === "green" || variant === "yellow"
				? Math.round((Math.abs(item.score) / maxAbs) * ROW_WIDTH)
				: undefined;
		return {
			label: item.key,
			value: item.score,
			variant,
			fillWidth,
		};
	});
}

function pickVariant(index: number, score: number): CategoryVariant {
	if (score <= 0) return "empty";
	if (index === 0) return "primary";
	if (index === 1) return "green";
	if (index === 2) return "yellow";
	return "empty";
}

function renderSkeleton() {
	return Array.from({ length: MAX_ROWS }).map((_, idx) => (
		<div
			key={idx}
			className="h-[34px] animate-pulse rounded-[5px] bg-[#f8f8f8]"
			style={{ width: ROW_WIDTH }}
		/>
	));
}

function Row({ row }: { row: CategoryRow }) {
	const isPrimary = row.variant === "primary";
	return (
		<div
			className={`relative flex items-center justify-between gap-[10px] overflow-hidden rounded-[5px] px-[12px] py-[5px] ${
				isPrimary ? "bg-[#95c5fb]" : "bg-[#f8f8f8]"
			}`}
			style={{ width: ROW_WIDTH }}
		>
			{row.fillWidth ? (
				<div
					className={`absolute left-0 top-0 ${
						row.variant === "green" ? "bg-[#bef78c]" : "bg-[#ffe19a]"
					}`}
					style={{ width: row.fillWidth, height: BAR_HEIGHT }}
				/>
			) : null}
			<span
				className={`relative font-montserrat text-sm font-medium leading-[1.22] ${
					row.variant === "empty" ? "text-black" : "text-black/50"
				}`}
			>
				{row.label}
			</span>
			<span
				className={`relative font-montserrat text-sm font-medium leading-[1.22] ${valueColorClass(
					row.variant,
				)}`}
			>
				{row.value}
			</span>
		</div>
	);
}

function valueColorClass(variant: CategoryVariant) {
	switch (variant) {
		case "green":
			return "text-[#7da758]";
		case "yellow":
			return "text-[#dfc382]";
		case "empty":
			return "text-black";
		default:
			return "text-black/50";
	}
}
