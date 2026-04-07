import { redirect } from "next/navigation";

import { FeedContent } from "@/features/feed";
import { getDisplayName } from "@/shared/lib/get-display-name";
import { createClient } from "@/shared/lib/supabase-server";

export default async function FeedRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  return (
    <FeedContent
      displayName={getDisplayName(user)}
      avatarUrl={user.user_metadata.avatar_url || null}
    />
  );
}
