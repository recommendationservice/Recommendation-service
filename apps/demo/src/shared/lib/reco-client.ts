import { createRecoClient, type RecoClient } from "@sp/reco-sdk";

let cached: RecoClient | null = null;

export function getRecoClient(): RecoClient {
	if (cached) return cached;
	const baseUrl = process.env.RECO_API_URL;
	if (!baseUrl) {
		throw new Error("RECO_API_URL env var is required");
	}
	cached = createRecoClient({ baseUrl });
	return cached;
}
