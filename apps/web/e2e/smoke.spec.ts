import { expect, test } from "@playwright/test";

// Assumes a seeded database (`pnpm db:setup` from the repo root).

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("olivia@acme-dispatch.example");
  await page.getByLabel("Password").fill("dispatch123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Dispatch board" })).toBeVisible();
}

test("signs in and sees the board", async ({ page }) => {
  await signIn(page);
  await expect(page.getByText("requested")).toBeVisible();
  await expect(page.getByRole("link", { name: "Jobs" })).toBeVisible();
});

test("browses the job list and opens a detail page", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: "Jobs" }).first().click();
  await expect(page.getByRole("heading", { name: "Jobs" })).toBeVisible();
  await page.locator("tbody tr td a").first().click();
  await expect(page.getByRole("heading", { name: /#\d+ ·/ })).toBeVisible();
});

test("creates a customer", async ({ page }) => {
  await signIn(page);
  await page.goto("/customers/new");
  const name = `Smoke Test Bakery ${Date.now()}`;
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Service address").fill("12 Test Lane");
  await page.getByRole("button", { name: "Create customer" }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
});
