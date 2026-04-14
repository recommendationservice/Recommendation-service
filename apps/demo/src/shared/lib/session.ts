import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

import { db, profiles } from "@/db";

export const SESSION_COOKIE = "demo-session";

export type SessionProfile = typeof profiles.$inferSelect;

export async function getSessionProfile(): Promise<SessionProfile | null> {
	const cookieStore = await cookies();
	const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
	if (!sessionId) return null;

	const profile = await db.query.profiles.findFirst({
		where: eq(profiles.id, sessionId),
	});
	return profile ?? null;
}
