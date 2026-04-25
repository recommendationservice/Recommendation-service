import { expect, test } from "@playwright/test";

import {
  cleanup,
  readDemoOnboardedAt,
  readRecoPreferenceVector,
  seedUser,
  setSession,
} from "../helpers/seed";

test.describe("E2E-1: Scenario 1 — Happy-path LLM onboarding", () => {
  let user: { id: string; login: string };

  test.beforeEach(async ({ request }) => {
    user = await seedUser({
      login: "demo-e2e-1",
      onboardedAt: null,
    });
    await setSession(request, user.id);
  });

  test.afterEach(async () => {
    if (user) await cleanup(user.id);
  });

  test("submits prompt → confirmation → /feed shows Personalized badge", async ({
    page,
  }) => {
    await page.goto("/onboarding");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await page
      .getByRole("textbox")
      .fill("Люблю напружені психологічні триллери 90-х");
    await page.getByRole("button", { name: /submit/i }).click();

    await expect(page.getByText(/thinking/i)).toBeVisible();

    await expect(page.getByText(/we understood you like/i)).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page).toHaveURL(/\/feed/);

    await expect(page.getByText(/personalized/i)).toBeVisible();

    expect(await readDemoOnboardedAt(user.id)).not.toBeNull();
    const vec = await readRecoPreferenceVector(user.id);
    expect(vec).not.toBeNull();
    expect(vec!.length).toBe(1536);
  });

  test("post-login of fresh user redirects to /onboarding", async ({
    page,
    request,
  }) => {
    const fresh = await seedUser({
      login: "post-login-fresh",
      onboardedAt: null,
    });
    await setSession(request, fresh.id);

    await page.goto("/feed");
    await expect(page).toHaveURL(/\/onboarding/);

    await cleanup(fresh.id);
  });
});
