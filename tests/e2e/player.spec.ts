import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function expectFocusedHeading(
  page: import("@playwright/test").Page,
  name: string | RegExp,
) {
  const heading = page.getByRole("heading", { level: 1, name });
  await expect(heading).toBeVisible();
  await expect(heading).toBeFocused();
  const box = await heading.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
}

async function expectNoAxeViolations(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations,
    results.violations.map((item) => `${item.id}: ${item.help}`).join("\n"),
  ).toEqual([]);
}

test("library to active-play fixture journey is keyboard operable", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /choose the world/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).focus();
  await page.keyboard.press("Enter");
  await expectFocusedHeading(page, /prepare your arrival/i);
  await page.getByRole("button", { name: "Back" }).click();
  await expectFocusedHeading(page, /choose the world/i);
  await page.getByRole("button", { name: "Continue" }).click();
  await expectFocusedHeading(page, /prepare your arrival/i);
  await page.getByLabel("Protagonist name").fill("Arden");
  await page.getByRole("button", { name: "Start story" }).click();
  await expectFocusedHeading(page, "The receiver wakes");
  if (page.viewportSize()!.width <= 1024) {
    await page.getByRole("button", { name: "Branch history" }).click();
  }
  await expect(
    page.getByRole("navigation", { name: "Branch history" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Undo to turn 13" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Retry as sibling branch" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Redo existing child" }),
  ).toBeVisible();
  const sizes = await page.locator("html").evaluate((node) => ({
    scroll: node.scrollWidth,
    client: node.clientWidth,
  }));
  expect(sizes.scroll).toBe(sizes.client);
  await page.screenshot({
    path: testInfo.outputPath("active-play.png"),
    fullPage: true,
  });
  if (page.viewportSize()!.width <= 1024) {
    await page.getByRole("button", { name: "Close branch history" }).click();
  }
  await page.getByRole("button", { name: "Settings" }).click();
  await expectFocusedHeading(page, /how this story responds/i);
  await page.getByRole("button", { name: "Wallet", exact: true }).click();
  await expectFocusedHeading(page, "84 credits");
  await page.getByRole("button", { name: "Current story" }).click();
  await expectFocusedHeading(page, "The receiver wakes");
  await page.getByRole("button", { name: "Library", exact: true }).click();
  await expectFocusedHeading(page, /choose the world/i);
});

test("settings and wallet expose fixture state language", async ({
  page,
}, testInfo) => {
  await page.goto("/settings");
  await expect(page.getByText("Inherited from your defaults")).toBeVisible();
  await page.getByLabel("Font family").selectOption("Atkinson Hyperlegible");
  await expect(page.getByText(/rain writes silver lines/i)).toHaveCSS(
    "font-family",
    /Atkinson/,
  );
  await page.screenshot({
    path: testInfo.outputPath("settings.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Wallet", exact: true }).click();
  await page
    .getByRole("button", { name: /review external checkout handoff/i })
    .click();
  await expect(page.getByText(/never grants credits by itself/i)).toBeVisible();
  await page
    .getByRole("button", { name: /continue to fake provider/i })
    .click();
  await expect(page.getByText(/verified provider webhook/i)).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("wallet-pending.png"),
    fullPage: true,
  });
});

test("async and quota states remain recoverable", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "empty" }).click();
  await expect(
    page.getByRole("heading", { name: /no scenarios match/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: /clear filters/i }).click();
  await page.getByRole("button", { name: "error" }).click();
  await expect(page.getByRole("alert")).toContainText("could not be refreshed");
  await page.goto("/play");
  await page.getByLabel("Do action").fill("Keep this exact browser draft.");
  await page.getByRole("button", { name: "streaming" }).click();
  await expect(page.getByRole("status")).toContainText("Generating");
  const partial = page.getByText(/coordinates just beyond the northern ridge/i);
  await expect(partial).toBeVisible();
  await page.getByRole("button", { name: "disconnect" }).click();
  await expect(partial).toBeVisible();
  await expect(page.getByLabel("Do action")).toHaveValue(
    "Keep this exact browser draft.",
  );
  await page.getByRole("button", { name: /resume generation/i }).click();
  await expect(partial).toBeVisible();
  await expect(page.getByLabel("Do action")).toHaveValue(
    "Keep this exact browser draft.",
  );
  await page.getByRole("button", { name: "quota" }).click();
  await expect(page.getByRole("status")).toContainText("credits required");
  await expect(
    page.getByRole("button", { name: /submit do action/i }),
  ).toBeDisabled();
});

test("settings reset and discard restore truthful inherited state", async ({
  page,
}) => {
  await page.goto("/settings");
  await page.getByLabel("Font family").selectOption("Atkinson Hyperlegible");
  await page.getByLabel(/font size/i).fill("26");
  await page.getByRole("checkbox", { name: /reduce motion/i }).uncheck();
  await page.getByLabel("Sliding window turns").fill("3");
  await page.getByRole("checkbox", { name: /override auto-summary/i }).check();
  await expect(page.getByText("Adventure override · unsaved")).toBeVisible();
  await expect(
    page.getByText(/enter −1 or a number from 5 to 100/i),
  ).toBeVisible();

  await page.getByRole("button", { name: "Reset to inherited" }).click();
  await expect(page.getByLabel("Sliding window turns")).toHaveValue("-1");
  await expect(
    page.getByRole("checkbox", { name: /override auto-summary/i }),
  ).not.toBeChecked();
  await expect(page.getByText("Inherited from your defaults")).toBeVisible();
  await expect(page.getByLabel("Font family")).toHaveValue(
    "Atkinson Hyperlegible",
  );
  await expect(page.getByLabel(/font size/i)).toHaveValue("26");

  await page.getByRole("button", { name: "Discard changes" }).click();
  await expect(page.getByLabel("Font family")).toHaveValue("Newsreader");
  await expect(page.getByLabel(/font size/i)).toHaveValue("18");
  await expect(
    page.getByRole("checkbox", { name: /reduce motion/i }),
  ).toBeChecked();
  await expect(page.getByLabel("Sliding window turns")).toHaveValue("-1");
  await expect(
    page.getByRole("checkbox", { name: /override auto-summary/i }),
  ).not.toBeChecked();
  await expect(page.getByText("Inherited from your defaults")).toBeVisible();
  await expect(page.getByText("Unsaved changes")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Save changes" }),
  ).toBeDisabled();
  await expect(page.getByText(/rain writes silver lines/i)).toHaveCSS(
    "font-family",
    /Newsreader/,
  );
  await expect(page.getByText(/rain writes silver lines/i)).toHaveCSS(
    "font-size",
    "18px",
  );
});

test("full document passes browser axe on every player route", async ({
  page,
}) => {
  for (const route of ["/", "/setup", "/play", "/settings", "/wallet"]) {
    await page.goto(route);
    await expect(page.locator("main")).toBeVisible();
    await expectNoAxeViolations(page);
  }
});
