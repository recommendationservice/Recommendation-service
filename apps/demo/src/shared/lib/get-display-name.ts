import type { User } from "@supabase/supabase-js";

const DEFAULT_DISPLAY_NAME = "User";

export function getDisplayName(user: User): string {
  return (
    user.user_metadata.full_name ||
    user.email?.split("@")[0] ||
    DEFAULT_DISPLAY_NAME
  );
}
