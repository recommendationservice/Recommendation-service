import { Sparkles, Snowflake } from "lucide-react";

const COLD_START_THRESHOLD = 5;

type StrategyBadgeProps = {
	strategy: "cold_start" | "personalized";
	totalEvents: number;
};

export function StrategyBadge({ strategy, totalEvents }: StrategyBadgeProps) {
	if (strategy === "personalized") {
		return (
			<div className="flex w-full items-center gap-2 rounded-[10px] bg-white p-[10px]">
				<Sparkles size={18} color="#14b857" />
				<p className="font-montserrat text-sm font-medium leading-[1.22] text-black/80">
					Персоналізовано
				</p>
			</div>
		);
	}

	const clamped = Math.min(totalEvents, COLD_START_THRESHOLD);
	const percent = (clamped / COLD_START_THRESHOLD) * 100;

	return (
		<div className="flex w-full flex-col gap-2 rounded-[10px] bg-white p-[10px]">
			<div className="flex items-center gap-2">
				<Snowflake size={18} color="#3b82f6" />
				<p className="font-montserrat text-sm font-medium leading-[1.22] text-black/80">
					Cold start ({clamped}/{COLD_START_THRESHOLD} подій)
				</p>
			</div>
			<div className="h-1 w-full overflow-hidden rounded-full bg-black/5">
				<div
					className="h-full rounded-full bg-[#3b82f6] transition-[width] duration-300"
					style={{ width: `${percent}%` }}
				/>
			</div>
		</div>
	);
}
