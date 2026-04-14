"use client";

import { useEffect, useRef, useState } from "react";

type ResetDemoModalProps = {
	isOpen: boolean;
	expectedLogin: string;
	onClose: () => void;
	onConfirmed: () => void;
};

export function ResetDemoModal({
	isOpen,
	expectedLogin,
	onClose,
	onConfirmed,
}: ResetDemoModalProps) {
	const [input, setInput] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const dialogRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!isOpen) {
			setInput("");
			setError(null);
			setIsSubmitting(false);
		}
	}, [isOpen]);

	if (!isOpen) return null;

	const canSubmit = input.trim() === expectedLogin && !isSubmitting;

	const handleSubmit = async () => {
		if (!canSubmit) return;
		setIsSubmitting(true);
		setError(null);
		try {
			const res = await fetch("/api/demo/reset", {
				method: "POST",
				credentials: "include",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ confirmLogin: input.trim() }),
			});
			if (!res.ok) {
				const body = (await res.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(body.error ?? `Reset failed with ${res.status}`);
			}
			onConfirmed();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unknown error");
			setIsSubmitting(false);
		}
	};

	return (
		<div
			role="dialog"
			aria-modal="true"
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div
				ref={dialogRef}
				className="flex w-full max-w-md flex-col gap-4 rounded-[15px] bg-white p-6 shadow-xl"
			>
				<h2 className="font-inter text-xl font-bold leading-tight text-black">
					Скинути стан демо
				</h2>
				<p className="font-montserrat text-sm leading-[1.4] text-black/70">
					Усі ваші лайки, закладки, історія переглядів і профіль у системі
					рекомендацій будуть видалені. Введіть свій логін (
					<span className="font-bold">{expectedLogin}</span>) для
					підтвердження.
				</p>
				<input
					type="text"
					autoFocus
					placeholder="Ваш логін"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && canSubmit) handleSubmit();
					}}
					className="rounded-[10px] border border-black/10 p-3 font-montserrat text-sm text-black outline-none focus:border-black/40"
				/>
				{error && (
					<p className="font-montserrat text-sm text-red-600">{error}</p>
				)}
				<div className="flex justify-end gap-2">
					<button
						type="button"
						onClick={onClose}
						disabled={isSubmitting}
						className="rounded-[10px] px-4 py-2 font-inter text-sm text-black/60 hover:text-black disabled:opacity-50"
					>
						Скасувати
					</button>
					<button
						type="button"
						onClick={handleSubmit}
						disabled={!canSubmit}
						className="rounded-[10px] bg-red-600 px-4 py-2 font-inter text-sm text-white disabled:opacity-40"
					>
						{isSubmitting ? "Скидання..." : "Скинути"}
					</button>
				</div>
			</div>
		</div>
	);
}
