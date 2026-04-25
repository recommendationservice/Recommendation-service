import { redirect } from "next/navigation";

import { FeedContent } from "@/features/feed";
import { userIsOnboarded } from "@/shared/lib/onboarding-gate";
import { getSessionProfile } from "@/shared/lib/session";

export default async function FeedRoute() {
	const profile = await getSessionProfile();
	if (!profile) {
		redirect("/auth");
	}
	if (!(await userIsOnboarded(profile))) {
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
