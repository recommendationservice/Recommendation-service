import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { db, profiles } from "@/db";

const SESSION_COOKIE = "demo-session";

export async function POST(request: Request) {
  const { login } = await request.json();

  if (!login || typeof login !== "string" || !login.trim()) {
    return NextResponse.json({ error: "Login is required" }, { status: 400 });
  }

  const trimmedLogin = login.trim();

  let profile = await db.query.profiles.findFirst({
    where: eq(profiles.login, trimmedLogin),
  });

  if (!profile) {
    const [created] = await db
      .insert(profiles)
      .values({ login: trimmedLogin, displayName: trimmedLogin })
      .returning();
    profile = created;
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, profile.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({ ok: true });
}
