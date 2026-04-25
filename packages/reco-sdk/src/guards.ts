import type { BootstrapResult, Enrichment, ProfileState } from "./types";

export function isProfileState(value: unknown): value is ProfileState {
	if (!value || typeof value !== "object") return false;
	const c = value as Record<string, unknown>;
	return typeof c.hasPreferenceVector === "boolean";
}

function isEnrichment(value: unknown): value is Enrichment {
	if (!value || typeof value !== "object") return false;
	const e = value as Record<string, unknown>;
	if (typeof e.paragraph !== "string") return false;
	if (!Array.isArray(e.genres)) return false;
	return Array.isArray(e.similarTitles);
}

export function isBootstrapResult(value: unknown): value is BootstrapResult {
	if (!value || typeof value !== "object") return false;
	const c = value as Record<string, unknown>;
	if (typeof c.preferenceVectorSet !== "boolean") return false;
	return c.enrichment === undefined || isEnrichment(c.enrichment);
}
