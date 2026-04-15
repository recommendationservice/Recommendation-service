import { RecoApiError } from "./errors";
import type {
	GetRecommendationsInput,
	GetRecommendationsResult,
	RecordedEvent,
	RecordEventInput,
	ScoreBreakdownInput,
	ScoreBreakdownResult,
} from "./types";

export type RecoClientOptions = {
	baseUrl: string;
	fetch?: typeof fetch;
};

export type RecoClient = {
	getRecommendations: (
		input: GetRecommendationsInput,
	) => Promise<GetRecommendationsResult>;
	recordEvent: (input: RecordEventInput) => Promise<RecordedEvent>;
	resetUser: (externalUserId: string) => Promise<void>;
	getScoreBreakdown: (
		input: ScoreBreakdownInput,
	) => Promise<ScoreBreakdownResult>;
};

export function createRecoClient(options: RecoClientOptions): RecoClient {
	const baseUrl = options.baseUrl.replace(/\/$/, "");
	const fetchImpl = options.fetch ?? globalThis.fetch;

	async function request<T>(
		path: string,
		init: RequestInit,
	): Promise<T | undefined> {
		const response = await fetchImpl(`${baseUrl}${path}`, {
			...init,
			headers: {
				"content-type": "application/json",
				...init.headers,
			},
		});

		if (!response.ok) {
			const body = await safeJson(response);
			throw new RecoApiError(
				response.status,
				`Reco API ${init.method ?? "GET"} ${path} failed with ${response.status}`,
				body,
			);
		}

		if (response.status === 204) return undefined;
		return (await response.json()) as T;
	}

	return {
		async getRecommendations(input) {
			const query = new URLSearchParams({ userId: input.userId });
			if (input.type) query.set("type", input.type);
			if (input.limit !== undefined) query.set("limit", String(input.limit));
			const result = await request<GetRecommendationsResult>(
				`/recommendations?${query.toString()}`,
				{ method: "GET" },
			);
			return result as GetRecommendationsResult;
		},

		async recordEvent(input) {
			const result = await request<RecordedEvent>("/events", {
				method: "POST",
				body: JSON.stringify(input),
			});
			return result as RecordedEvent;
		},

		async resetUser(externalUserId) {
			await request<void>(`/users/${encodeURIComponent(externalUserId)}`, {
				method: "DELETE",
			});
		},

		async getScoreBreakdown(input) {
			const query = new URLSearchParams({ groupBy: input.groupBy });
			if (input.limit !== undefined) query.set("limit", String(input.limit));
			const path = `/users/${encodeURIComponent(input.externalUserId)}/score-breakdown?${query.toString()}`;
			const result = await request<ScoreBreakdownResult>(path, {
				method: "GET",
			});
			return result as ScoreBreakdownResult;
		},
	};
}

async function safeJson(response: Response): Promise<unknown> {
	try {
		return await response.json();
	} catch {
		return undefined;
	}
}
