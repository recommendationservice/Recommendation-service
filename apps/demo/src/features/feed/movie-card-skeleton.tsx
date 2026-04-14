export function MovieCardSkeleton() {
	return (
		<article className="flex animate-pulse flex-col gap-[7px] rounded-[10px] bg-white p-[10px]">
			<div className="h-5 w-2/3 rounded bg-black/5" />
			<div className="h-4 w-1/2 rounded bg-black/5" />
			<div className="h-[177px] w-full rounded-[10px] bg-black/5" />
			<div className="h-4 w-full rounded bg-black/5" />
			<div className="h-4 w-5/6 rounded bg-black/5" />
			<div className="flex items-center gap-[5px]">
				<div className="h-9 flex-1 rounded-[10px] bg-black/5" />
				<div className="h-9 w-9 rounded-full bg-black/5" />
				<div className="h-9 w-9 rounded-full bg-black/5" />
			</div>
		</article>
	);
}
