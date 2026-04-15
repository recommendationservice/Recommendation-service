import { NextResponse } from "next/server";

import { getRecoClient } from "@/shared/lib/reco-client";
import { getSessionProfile } from "@/shared/lib/session";

const GROUP_BY_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/;

export async function GET(request: Request) {
	const profile = await getSessionProfile();
	if (!profile) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const url = new URL(request.url);
	const groupBy = url.searchParams.get("groupBy");
	if (!groupBy || !GROUP_BY_REGEX.test(groupBy)) {
		return NextResponse.json({ error: "invalid groupBy" }, { status: 400 });
	}

	const limit = parseLimit(url.searchParams.get("limit"));

	try {
		const result = await getRecoClient().getScoreBreakdown({
			externalUserId: profile.id,
			groupBy,
			limit,
		});
		return NextResponse.json(result);
	} catch (err) {
		console.error("[score-breakdown:GET] reco error", err);
		return NextResponse.json(
			{ error: "score-breakdown failed" },
			{ status: 500 },
		);
	}
}

function parseLimit(raw: string | null): number | undefined {
	if (!raw) return undefined;
	const parsed = Number.parseInt(raw, 10);
	if (Number.isNaN(parsed) || parsed < 1) return undefined;
	return Math.min(parsed, 100);
}
