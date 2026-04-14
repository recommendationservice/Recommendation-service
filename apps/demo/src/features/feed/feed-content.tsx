"use client";

import { useCallback, useState } from "react";

import { ActionLog, type ActionEntry } from "./action-log";
import { FeedList } from "./feed-list";
import { FeedPage } from "./feed-page";
import { FeedStrategyBadge } from "./feed-strategy-badge";
import { ResetDemoButton } from "./reset-demo-button";

type FeedContentProps = {
	displayName: string;
	avatarUrl: string | null;
	login: string;
};

export function FeedContent({ displayName, avatarUrl, login }: FeedContentProps) {
	const [actions, setActions] = useState<ActionEntry[]>([]);

	const appendAction = useCallback((entry: ActionEntry) => {
		setActions((prev) => [...prev, entry]);
	}, []);

	const handleLogout = async () => {
		await fetch("/api/auth/logout", { method: "POST" });
		window.location.href = "/auth";
	};

	return (
		<FeedPage
			displayName={displayName}
			avatarUrl={avatarUrl}
			onLogout={handleLogout}
			actionLog={<ActionLog actions={actions} />}
			strategyBadge={<FeedStrategyBadge />}
			resetButton={<ResetDemoButton login={login} onReset={() => setActions([])} />}
		>
			<FeedList
				login={login}
				displayName={displayName}
				onAction={appendAction}
			/>
		</FeedPage>
	);
}
