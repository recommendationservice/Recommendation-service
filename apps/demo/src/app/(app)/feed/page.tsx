import { redirect } from "next/navigation";

import { FeedContent } from "@/features/feed";
import { getSessionProfile } from "@/shared/lib/session";

export default async function FeedRoute() {
	const profile = await getSessionProfile();
	if (!profile) {
		redirect("/auth");
	}
	if (!profile.onboardedAt) {
		redirect("/onboarding");
	}

	return (
		<FeedContent
			displayName={profile.displayName}
			avatarUrl={profile.avatarUrl}
			login={profile.login}
		/>
	);
}
