import { type SupabaseClient } from "@supabase/supabase-js";
import { type User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { getDisplayName } from "@/shared/lib/get-display-name";
import { createClient } from "@/shared/lib/supabase-server";

async function upsertProfile(supabase: SupabaseClient, user: User) {
  await supabase.from("profiles").upsert(
    {
      id: user.id,
      display_name: getDisplayName(user),
      avatar_url: user.user_metadata.avatar_url || null,
    },
    { onConflict: "id" }
  );
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await upsertProfile(supabase, user);
      }

      return NextResponse.redirect(`${origin}/feed`);
    }
  }

  return NextResponse.redirect(`${origin}/auth`);
}
