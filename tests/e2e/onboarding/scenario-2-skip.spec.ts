import { expect, test } from "@playwright/test";

import {
  cleanup,
  readDemoOnboardedAt,
  readRecoPreferenceVector,
  seedUser,
  setSession,
} from "../helpers/seed";

test.describe("E2E-2: Scenario 2 — Skip path (cold-start cohort)", () => {
  let user: { id: string; login: string };

  test.beforeEach(async ({ request }) => {
    user = await seedUser({
      login: "demo-e2e-2",
      onboardedAt: null,
    });
    await setSession(request, user.id);
  });

  test.afterEach(async () => {
    if (user) await cleanup(user.id);
  });

  test("× skip → /feed cold-start, no reco profile created (skip-semantics)", async ({
    page,
  }) => {
    await page.goto("/onboarding");

    await page.getByLabel(/skip/i).click();
    await expect(page).toHaveURL(/\/feed/);

    await expect(page.getByText(/0\s*\/\s*5/)).toBeVisible();

    expect(await readDemoOnboardedAt(user.id)).not.toBeNull();
    expect(await readRecoPreferenceVector(user.id)).toBeNull();
  });
});
