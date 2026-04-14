"use client";

import { useQueryClient } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { useState } from "react";

import { FEED_QUERY_KEY } from "./feed-constants";
import { ResetDemoModal } from "./reset-demo-modal";

type ResetDemoButtonProps = {
	login: string;
	variant?: "icon" | "text";
	onReset?: () => void;
};

export function ResetDemoButton({
	login,
	variant = "icon",
	onReset,
}: ResetDemoButtonProps) {
	const [isOpen, setIsOpen] = useState(false);
	const queryClient = useQueryClient();

	const handleConfirmed = () => {
		setIsOpen(false);
		queryClient.invalidateQueries({ queryKey: FEED_QUERY_KEY });
		onReset?.();
	};

	return (
		<>
			{variant === "icon" ? (
				<button
					type="button"
					onClick={() => setIsOpen(true)}
					className="flex items-center gap-2 rounded-[10px] bg-white p-[10px] font-montserrat text-sm text-black/60 hover:text-black"
				>
					<RotateCcw size={16} />
					Скинути стан демо
				</button>
			) : (
				<button
					type="button"
					onClick={() => setIsOpen(true)}
					className="rounded-[10px] bg-black/80 px-4 py-2 font-inter text-sm text-white hover:bg-black"
				>
					Скинути стан демо
				</button>
			)}
			<ResetDemoModal
				isOpen={isOpen}
				expectedLogin={login}
				onClose={() => setIsOpen(false)}
				onConfirmed={handleConfirmed}
			/>
		</>
	);
}
