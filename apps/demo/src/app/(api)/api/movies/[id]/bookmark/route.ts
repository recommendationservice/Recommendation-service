import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, bookmarks } from "@/db";
import { getRecoClient } from "@/shared/lib/reco-client";
import { getSessionProfile } from "@/shared/lib/session";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: RouteContext) {
	const t0 = Date.now();
	const profile = await getSessionProfile();
	if (!profile) return unauthorized();

	const { id: movieId } = await ctx.params;
	const { contentId } = (await request.json()) as { contentId?: string };
	if (!contentId) return badRequest("contentId is required");

	console.log(`[bookmark:POST] user=${profile.login} movie=${movieId} content=${contentId}`);

	const tDb = Date.now();
	await db
		.insert(bookmarks)
		.values({ userId: profile.id, movieId })
		.onConflictDoNothing();
	console.log(`[bookmark:POST]   demo.bookmarks insert in ${Date.now() - tDb}ms`);

	const tReco = Date.now();
	try {
		await getRecoClient().recordEvent({
			userId: profile.id,
			contentId,
			eventType: "bookmark",
			weight: 3,
		});
		console.log(`[bookmark:POST]   reco.recordEvent in ${Date.now() - tReco}ms`);
	} catch (error) {
		console.error("[bookmark:POST]   reco.recordEvent failed", error);
	}

	console.log(`[bookmark:POST] done in ${Date.now() - t0}ms`);
	return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, ctx: RouteContext) {
	const t0 = Date.now();
	const profile = await getSessionProfile();
	if (!profile) return unauthorized();

	const { id: movieId } = await ctx.params;
	console.log(`[bookmark:DELETE] user=${profile.login} movie=${movieId}`);
	await db
		.delete(bookmarks)
		.where(
			and(eq(bookmarks.userId, profile.id), eq(bookmarks.movieId, movieId)),
		);
	console.log(`[bookmark:DELETE] done in ${Date.now() - t0}ms`);
	return NextResponse.json({ ok: true });
}

function unauthorized() {
	return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function badRequest(message: string) {
	return NextResponse.json({ error: message }, { status: 400 });
}
