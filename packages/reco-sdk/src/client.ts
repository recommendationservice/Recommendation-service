import { RecoApiError } from "./errors";
import type {
	BootstrapInput,
	BootstrapResult,
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
	bootstrapUser: (input: BootstrapInput) => Promise<BootstrapResult>;
};

function isBootstrapResult(value: unknown): value is BootstrapResult {
	if (!value || typeof value !== "object") return false;
	const c = value as Record<string, unknown>;
	if (typeof c.preferenceVectorSet !== "boolean") return false;
	return c.enrichedText === undefined || typeof c.enrichedText === "string";
}

function buildBootstrapBody(input: BootstrapInput): string {
	const body: { rawPrompt?: string } = {};
	if (input.rawPrompt !== undefined) body.rawPrompt = input.rawPrompt;
	return JSON.stringify(body);
}

type Requester = <T>(path: string, init: RequestInit) => Promise<T | undefined>;

async function safeJson(response: Response): Promise<unknown> {
	try {
		return await response.json();
	} catch {
		return undefined;
	}
}

async function throwRecoApiError(
	response: Response,
	path: string,
	method: string | undefined,
): Promise<never> {
	const body = await safeJson(response);
	throw new RecoApiError(
		response.status,
		`Reco API ${method ?? "GET"} ${path} failed with ${response.status}`,
		body,
	);
}

async function performFetch(
	fetchImpl: typeof fetch,
	url: string,
	init: RequestInit,
): Promise<Response> {
	return fetchImpl(url, {
		...init,
		headers: { "content-type": "application/json", ...init.headers },
	});
}

async function readJsonOrEmpty<T>(response: Response): Promise<T | undefined> {
	if (response.status === 204) return undefined;
	return (await response.json()) as T;
}

type RequesterDeps = { baseUrl: string; fetchImpl: typeof fetch };

async function executeRequest<T>(deps: RequesterDeps, path: string, init: RequestInit): Promise<T | undefined> {
	const response = await performFetch(deps.fetchImpl, `${deps.baseUrl}${path}`, init);
	if (!response.ok) await throwRecoApiError(response, path, init.method);
	return readJsonOrEmpty<T>(response);
}

const createRequester = (baseUrl: string, fetchImpl: typeof fetch): Requester =>
	executeRequest.bind(null, { baseUrl, fetchImpl }) as Requester;

function buildRecommendationsPath(input: GetRecommendationsInput): string {
	const query = new URLSearchParams({ userId: input.userId });
	if (input.type) query.set("type", input.type);
	if (input.limit !== undefined) query.set("limit", String(input.limit));
	return `/recommendations?${query.toString()}`;
}

function buildScoreBreakdownPath(input: ScoreBreakdownInput): string {
	const query = new URLSearchParams({ groupBy: input.groupBy });
	if (input.limit !== undefined) query.set("limit", String(input.limit));
	return `/users/${encodeURIComponent(input.externalUserId)}/score-breakdown?${query.toString()}`;
}

function makeGetRecommendations(request: Requester): RecoClient["getRecommendations"] {
	return async (input) => {
		const result = await request<GetRecommendationsResult>(
			buildRecommendationsPath(input),
			{ method: "GET" },
		);
		return result as GetRecommendationsResult;
	};
}

function makeRecordEvent(request: Requester): RecoClient["recordEvent"] {
	return async (input) => {
		const result = await request<RecordedEvent>("/events", {
			method: "POST",
			body: JSON.stringify(input),
		});
		return result as RecordedEvent;
	};
}

function makeResetUser(request: Requester): RecoClient["resetUser"] {
	return async (externalUserId) => {
		await request<void>(`/users/${encodeURIComponent(externalUserId)}`, {
			method: "DELETE",
		});
	};
}

function makeGetScoreBreakdown(request: Requester): RecoClient["getScoreBreakdown"] {
	return async (input) => {
		const result = await request<ScoreBreakdownResult>(
			buildScoreBreakdownPath(input),
			{ method: "GET" },
		);
		return result as ScoreBreakdownResult;
	};
}

function makeBootstrapUser(request: Requester): RecoClient["bootstrapUser"] {
	return async (input) => {
		const path = `/users/${encodeURIComponent(input.externalUserId)}/bootstrap`;
		const raw = await request<unknown>(path, {
			method: "POST",
			body: buildBootstrapBody(input),
		});
		if (!isBootstrapResult(raw)) {
			throw new Error("Reco bootstrap response shape invalid");
		}
		return raw;
	};
}

export function createRecoClient(options: RecoClientOptions): RecoClient {
	const baseUrl = options.baseUrl.replace(/\/$/, "");
	const fetchImpl = options.fetch ?? globalThis.fetch;
	const request = createRequester(baseUrl, fetchImpl);
	return {
		getRecommendations: makeGetRecommendations(request),
		recordEvent: makeRecordEvent(request),
		resetUser: makeResetUser(request),
		getScoreBreakdown: makeGetScoreBreakdown(request),
		bootstrapUser: makeBootstrapUser(request),
	};
}
