"use client";

import type { ScoreBreakdownItem } from "@sp/reco-sdk";

import { useScoreBreakdown } from "./use-score-breakdown";

type RankColor = "cyan" | "green" | "yellow" | null;

type CategoryRow = {
	label: string;
	value: number;
	rank: number | null;
	color: RankColor;
};

const MAX_ROWS = 5;

export function FavCategories() {
	const { data, isLoading, isFetching, isError } = useScoreBreakdown("genre");

	if (isLoading && !data) return <Shell>{renderSkeleton()}</Shell>;
	if (isError) return null;

	const items = data?.items ?? [];
	if (items.length === 0) return null;

	const rows = buildRows(items);
	if (rows.length === 0) return null;

	const showRefetchIndicator = isFetching && !isLoading;

	return (
		<Shell refetching={showRefetchIndicator}>
			{rows.map((row, index) => (
				<Row key={`${row.label}-${index}`} row={row} />
			))}
		</Shell>
	);
}

function Shell({
	children,
	refetching,
}: {
	children: React.ReactNode;
	refetching?: boolean;
}) {
	return (
		<section className="relative flex max-w-84.25 w-full flex-col items-start overflow-hidden rounded-[10px] bg-white p-[10px]">
			{refetching ? <RefetchBar /> : null}
			<h3 className="font-montserrat text-sm font-bold leading-[1.22] text-black">
				Улюблені категорії
			</h3>
			<p className="mt-1.75 self-stretch whitespace-pre-line font-montserrat text-xs font-normal leading-[1.22] text-black">
				Які категорії фільмів вам будуть рекомендуватись частіше та з
				якими ви частіше взаʼємодіяли
			</p>
			{children}
		</section>
	);
}

function RefetchBar() {
	return (
		<div
			className="pointer-events-none absolute inset-x-0 top-0 h-[2px] overflow-hidden"
			aria-label="оновлення статистики"
		>
			<div className="h-full w-1/3 animate-[fav-refetch_1.2s_ease-in-out_infinite] bg-[#5ccbfb]" />
		</div>
	);
}

function buildRows(items: ScoreBreakdownItem[]): CategoryRow[] {
	return items.slice(0, MAX_ROWS).map((item, index) => {
		const positive = item.score > 0;
		return {
			label: item.key,
			value: item.score,
			rank: positive && index < 3 ? index + 1 : null,
			color: positive ? pickColor(index) : null,
		};
	});
}

function pickColor(index: number): RankColor {
	if (index === 0) return "cyan";
	if (index === 1) return "green";
	if (index === 2) return "yellow";
	return null;
}

function Row({ row }: { row: CategoryRow }) {
	return (
		<div className="mx-auto mt-[7px] flex w-full items-center justify-between gap-[10px] overflow-hidden rounded-[5px] bg-[#f8f8f8] px-[12px] py-[5px]">
			<div className="flex items-center gap-[10px]">
				{row.rank !== null ? (
					<span
						className={`font-montserrat text-sm font-bold leading-[1.22] ${rankColorClass(
							row.color,
						)}`}
					>
						{row.rank}.
					</span>
				) : null}
				<span className="max-w-[220px] truncate font-montserrat text-sm font-medium leading-[1.22] text-black">
					{row.label}
				</span>
			</div>
			<span className="font-montserrat text-sm font-medium leading-[1.22] text-black">
				{row.value}
			</span>
		</div>
	);
}

function rankColorClass(color: RankColor) {
	switch (color) {
		case "cyan":
			return "text-[#5ccbfb]";
		case "green":
			return "text-[#76ea59]";
		case "yellow":
			return "text-[#f1d15c]";
		default:
			return "text-black";
	}
}

function renderSkeleton() {
	return Array.from({ length: MAX_ROWS }).map((_, idx) => (
		<div
			key={idx}
			className="mx-auto mt-[7px] h-[34px] w-[317px] animate-pulse rounded-[5px] bg-[#f8f8f8]"
		/>
	));
}
