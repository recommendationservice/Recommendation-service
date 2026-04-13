"use client";

import Image from "next/image";

type FeedPageProps = {
	displayName: string;
	avatarUrl: string | null;
	onLogout: () => void;
	children: React.ReactNode;
	actionLog: React.ReactNode;
};

export function FeedPage({
	displayName,
	avatarUrl,
	onLogout,
	children,
	actionLog,
}: FeedPageProps) {
	return (
		<div className="flex h-screen justify-center overflow-hidden bg-[#f8f8f8]">
			<aside className="flex h-full w-[357px] flex-col justify-between overflow-hidden px-[10px] py-[25px]">
				<div className="flex flex-col items-center gap-5">
					<h1 className="w-full font-inter text-2xl font-black leading-[1.21] text-black/80">
						Рекомендації
					</h1>
					<p className="font-montserrat text-sm leading-[1.22] text-black/80">
						Проєкт демонструє роботу сервісу персоналізованих
						рекомендацій на прикладі фільмів.
					</p>
					<hr className="w-full border-black/10" />
					<p className="font-montserrat text-sm leading-[1.22] text-black/80">
						Демо проєкт реалізований для дипломної роботи по темі
						&quot;Програмна система для формування персоналізованих
						рекомендацій контенту&quot;
					</p>
				</div>
				<div className="flex flex-col gap-5">
					<div className="flex items-center gap-[10px] rounded-[10px] bg-white p-[10px]">
						{avatarUrl ? (
							<Image
								src={avatarUrl}
								alt=""
								width={30}
								height={30}
								className="rounded-full"
							/>
						) : (
							<div className="h-[30px] w-[30px] rounded-full bg-[#d9d9d9]" />
						)}
						<p className="flex-1 font-montserrat text-sm leading-[1.22] text-black/80">
							Привіт{" "}
							<span className="font-bold">{displayName}</span>!
						</p>
						<button
							type="button"
							onClick={onLogout}
							className="font-montserrat text-sm text-black/40 hover:text-black/80"
						>
							Вийти
						</button>
					</div>
				</div>
			</aside>

			<main className="flex w-[543px] flex-col gap-[10px] overflow-y-auto border-x border-black/[0.08] px-[10px] py-[25px]">
				{children}
			</main>

			<aside className="flex h-full w-[370px] flex-col gap-[10px] overflow-hidden px-[10px] py-[25px]">
				<div className="flex flex-col items-center gap-5">
					<h1 className="w-full font-inter text-2xl font-black leading-[1.21] text-black/80">
						Логування
					</h1>
					<p className="font-montserrat text-sm leading-[1.22] text-black/80">
						Логування необхідне для демонстрації системи
						рекомендацій, та як дії користувача впливають на неї
					</p>
					<hr className="w-full border-black/10" />
				</div>
				<div className="flex flex-1 flex-col justify-end gap-[10px] overflow-y-auto rounded-[15px] p-[10px] pb-0">
					{actionLog}
				</div>
			</aside>
		</div>
	);
}
