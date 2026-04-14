import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, bookmarks, likes } from "@/db";
import { getRecoClient } from "@/shared/lib/reco-client";
import { getSessionProfile } from "@/shared/lib/session";

export async function POST(request: Request) {
	const profile = await getSessionProfile();
	if (!profile) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const body = (await request.json().catch(() => ({}))) as {
		confirmLogin?: string;
	};
	if (!body.confirmLogin || body.confirmLogin !== profile.login) {
		return NextResponse.json(
			{ error: "Login confirmation does not match" },
			{ status: 400 },
		);
	}

	await db.delete(likes).where(eq(likes.userId, profile.id));
	await db.delete(bookmarks).where(eq(bookmarks.userId, profile.id));

	try {
		await getRecoClient().resetUser(profile.id);
	} catch (error) {
		console.error("[reco] resetUser failed", error);
	}

	return NextResponse.json({ ok: true });
}
