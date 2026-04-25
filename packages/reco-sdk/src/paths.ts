import type {
	BootstrapInput,
	GetRecommendationsInput,
	ScoreBreakdownInput,
} from "./types";

export function buildRecommendationsPath(
	input: GetRecommendationsInput,
): string {
	const query = new URLSearchParams({ userId: input.userId });
	if (input.type) query.set("type", input.type);
	if (input.limit !== undefined) query.set("limit", String(input.limit));
	return `/recommendations?${query.toString()}`;
}

export function buildScoreBreakdownPath(input: ScoreBreakdownInput): string {
	const query = new URLSearchParams({ groupBy: input.groupBy });
	if (input.limit !== undefined) query.set("limit", String(input.limit));
	const id = encodeURIComponent(input.externalUserId);
	return `/users/${id}/score-breakdown?${query.toString()}`;
}

export function buildResetUserPath(externalUserId: string): string {
	return `/users/${encodeURIComponent(externalUserId)}`;
}

export function buildBootstrapPath(input: BootstrapInput): string {
	return `/users/${encodeURIComponent(input.externalUserId)}/bootstrap`;
}

export function buildProfileStatePath(externalUserId: string): string {
	return `/users/${encodeURIComponent(externalUserId)}/profile-state`;
}

export function buildBootstrapBody(input: BootstrapInput): string {
	const body: { rawPrompt?: string } = {};
	if (input.rawPrompt !== undefined) body.rawPrompt = input.rawPrompt;
	return JSON.stringify(body);
}
