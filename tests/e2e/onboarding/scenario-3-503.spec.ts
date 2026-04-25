import { expect, test } from "@playwright/test";

import {
  cleanup,
  readDemoOnboardedAt,
  seedUser,
  setSession,
  stubGeminiToFail,
  unstubGemini,
} from "../helpers/seed";

test.describe("E2E-3: Scenario 3 — Gemini upstream failure (503)", () => {
  let user: { id: string; login: string };

  test.beforeEach(async ({ request }) => {
    user = await seedUser({
      login: "demo-e2e-3",
      onboardedAt: null,
    });
    await setSession(request, user.id);
    await stubGeminiToFail();
  });

  test.afterEach(async () => {
    await unstubGemini();
    if (user) await cleanup(user.id);
  });

  test("Gemini 503 → inline alert + retry; onboarded_at NOT set (cohort-integrity)", async ({
    page,
  }) => {
    await page.goto("/onboarding");

    const text = "Триллери 90-х";
    await page.getByRole("textbox").fill(text);
    await page.getByRole("button", { name: /submit/i }).click();

    await expect(page.getByText(/temporarily unavailable/i)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: /retry/i })).toBeVisible();

    await expect(page.getByRole("textbox")).toHaveValue(text);

    expect(await readDemoOnboardedAt(user.id)).toBeNull();
  });

  test("Skip after fail → clean cold-start cohort (Scenario 6)", async ({
    page,
  }) => {
    await page.goto("/onboarding");
    await page.getByRole("textbox").fill("X");
    await page.getByRole("button", { name: /submit/i }).click();
    await expect(page.getByText(/temporarily unavailable/i)).toBeVisible();

    await page.getByLabel(/skip/i).click();
    await expect(page).toHaveURL(/\/feed/);

    expect(await readDemoOnboardedAt(user.id)).not.toBeNull();
  });
});
