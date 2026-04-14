import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, likes } from "@/db";
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

	console.log(`[like:POST] user=${profile.login} movie=${movieId} content=${contentId}`);

	const tDb = Date.now();
	await db
		.insert(likes)
		.values({ userId: profile.id, movieId })
		.onConflictDoNothing();
	console.log(`[like:POST]   demo.likes insert in ${Date.now() - tDb}ms`);

	const tReco = Date.now();
	await forwardEvent({
		userId: profile.id,
		contentId,
		eventType: "like",
		weight: 5,
	});
	console.log(`[like:POST]   reco.recordEvent in ${Date.now() - tReco}ms`);

	console.log(`[like:POST] done in ${Date.now() - t0}ms`);
	return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, ctx: RouteContext) {
	const t0 = Date.now();
	const profile = await getSessionProfile();
	if (!profile) return unauthorized();

	const { id: movieId } = await ctx.params;
	console.log(`[like:DELETE] user=${profile.login} movie=${movieId}`);
	await db
		.delete(likes)
		.where(and(eq(likes.userId, profile.id), eq(likes.movieId, movieId)));
	console.log(`[like:DELETE] done in ${Date.now() - t0}ms`);
	return NextResponse.json({ ok: true });
}

type ForwardEventArgs = {
	userId: string;
	contentId: string;
	eventType: "like" | "bookmark" | "dislike";
	weight: number;
};

async function forwardEvent(args: ForwardEventArgs): Promise<void> {
	try {
		await getRecoClient().recordEvent(args);
	} catch (error) {
		console.error("[like:POST]   reco.recordEvent failed", error);
	}
}

function unauthorized() {
	return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function badRequest(message: string) {
	return NextResponse.json({ error: message }, { status: 400 });
}
