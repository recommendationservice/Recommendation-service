import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db, profiles } from "@/db";
import { FeedContent } from "@/features/feed";

const SESSION_COOKIE = "demo-session";

export default async function FeedRoute() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionId) {
    redirect("/auth");
  }

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, sessionId),
  });

  if (!profile) {
    redirect("/auth");
  }

  return (
    <FeedContent
      displayName={profile.displayName}
      avatarUrl={profile.avatarUrl}
    />
  );
}
