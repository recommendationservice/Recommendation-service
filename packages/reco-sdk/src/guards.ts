import type { BootstrapResult, ProfileState } from "./types";

export function isProfileState(value: unknown): value is ProfileState {
	if (!value || typeof value !== "object") return false;
	const c = value as Record<string, unknown>;
	return typeof c.hasPreferenceVector === "boolean";
}

export function isBootstrapResult(value: unknown): value is BootstrapResult {
	if (!value || typeof value !== "object") return false;
	const c = value as Record<string, unknown>;
	if (typeof c.preferenceVectorSet !== "boolean") return false;
	return c.enrichedText === undefined || typeof c.enrichedText === "string";
}
