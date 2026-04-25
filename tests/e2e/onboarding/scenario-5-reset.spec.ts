import { expect, test } from "@playwright/test";

import {
  cleanup,
  readDemoOnboardedAt,
  readRecoPreferenceVector,
  seedRecoProfile,
  seedUser,
  setSession,
} from "../helpers/seed";

test.describe("E2E-5: Scenario 5 — Reset cycle returns to /onboarding", () => {
  let user: { id: string; login: string };

  test.beforeEach(async ({ request }) => {
    user = await seedUser({
      login: "demo-e2e-5",
      onboardedAt: new Date("2026-04-20"),
    });
    await seedRecoProfile({
      externalUserId: user.id,
      preferenceVector: new Array(1536).fill(0.2),
      events: 10,
    });
    await setSession(request, user.id);
  });

  test.afterEach(async () => {
    if (user) await cleanup(user.id);
  });

  test("ResetDemoButton → onboarded_at NULL + reco profile deleted + /feed redirects to /onboarding", async ({
    page,
  }) => {
    await page.goto("/feed");

    await page.getByRole("button", { name: /reset/i }).click();

    await page.getByRole("textbox").fill(user.login);
    await page.getByRole("button", { name: /confirm/i }).click();

    await expect(page).toHaveURL(/\/onboarding/);

    expect(await readDemoOnboardedAt(user.id)).toBeNull();
    expect(await readRecoPreferenceVector(user.id)).toBeNull();

    await expect(page.getByRole("textbox")).toBeVisible();
    await expect(page.getByRole("textbox")).toHaveValue("");
  });

  test("post-reset, navigating to /feed directly redirects to /onboarding", async ({
    page,
  }) => {
    await page.goto("/feed");
    await page.getByRole("button", { name: /reset/i }).click();
    await page.getByRole("textbox").fill(user.login);
    await page.getByRole("button", { name: /confirm/i }).click();
    await expect(page).toHaveURL(/\/onboarding/);

    await page.goto("/feed");
    await expect(page).toHaveURL(/\/onboarding/);
  });
});
