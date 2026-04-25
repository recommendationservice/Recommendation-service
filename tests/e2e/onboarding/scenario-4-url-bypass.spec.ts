import { expect, test } from "@playwright/test";

import {
  cleanup,
  seedRecoProfile,
  seedUser,
  setSession,
} from "../helpers/seed";

test.describe("E2E-4: Scenario 4 — URL bar bypass after onboarded", () => {
  let user: { id: string; login: string };

  test.beforeEach(async ({ request }) => {
    user = await seedUser({
      login: "demo-e2e-4",
      onboardedAt: new Date("2026-04-20T10:00:00Z"),
    });
    await seedRecoProfile({
      externalUserId: user.id,
      preferenceVector: new Array(1536).fill(0.1),
      events: 20,
    });
    await setSession(request, user.id);
  });

  test.afterEach(async () => {
    if (user) await cleanup(user.id);
  });

  test("manual /onboarding navigation redirects to /feed (server-side guard)", async ({
    page,
  }) => {
    const response = await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/feed/);
    expect(response?.status() ?? 200).toBeLessThan(400);
    await expect(page.getByRole("textbox")).toHaveCount(0);
  });
});
