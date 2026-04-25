import { RecoApiError } from "./errors";

export type Requester = <T>(
	path: string,
	init: RequestInit,
) => Promise<T | undefined>;

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

async function readJsonOrEmpty<T>(
	response: Response,
): Promise<T | undefined> {
	if (response.status === 204) return undefined;
	return (await response.json()) as T;
}

type RequesterDeps = { baseUrl: string; fetchImpl: typeof fetch };

async function executeRequest<T>(
	deps: RequesterDeps,
	path: string,
	init: RequestInit,
): Promise<T | undefined> {
	const url = `${deps.baseUrl}${path}`;
	const response = await performFetch(deps.fetchImpl, url, init);
	if (!response.ok) await throwRecoApiError(response, path, init.method);
	return readJsonOrEmpty<T>(response);
}

export function createRequester(
	baseUrl: string,
	fetchImpl: typeof fetch,
): Requester {
	return executeRequest.bind(null, { baseUrl, fetchImpl }) as Requester;
}
