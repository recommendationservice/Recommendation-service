import { isBootstrapResult, isProfileState } from "./guards";
import {
	buildBootstrapBody,
	buildBootstrapPath,
	buildProfileStatePath,
	buildRecommendationsPath,
	buildResetUserPath,
	buildScoreBreakdownPath,
} from "./paths";
import { type Requester, createRequester } from "./request";
import type {
	BootstrapInput,
	BootstrapResult,
	GetRecommendationsInput,
	GetRecommendationsResult,
	ProfileState,
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
	getProfileState: (externalUserId: string) => Promise<ProfileState>;
};

function makeGetRecommendations(
	request: Requester,
): RecoClient["getRecommendations"] {
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
		await request<void>(buildResetUserPath(externalUserId), {
			method: "DELETE",
		});
	};
}

function makeGetScoreBreakdown(
	request: Requester,
): RecoClient["getScoreBreakdown"] {
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
		const raw = await request<unknown>(buildBootstrapPath(input), {
			method: "POST",
			body: buildBootstrapBody(input),
		});
		if (!isBootstrapResult(raw)) {
			throw new Error("Reco bootstrap response shape invalid");
		}
		return raw;
	};
}

function makeGetProfileState(request: Requester): RecoClient["getProfileState"] {
	return async (externalUserId) => {
		const raw = await request<unknown>(buildProfileStatePath(externalUserId), {
			method: "GET",
		});
		if (!isProfileState(raw)) {
			throw new Error("Reco profile-state response shape invalid");
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
		getProfileState: makeGetProfileState(request),
	};
}
