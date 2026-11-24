import { fileURLToPath, URL } from "node:url";
import { afterAll, afterEach, beforeAll, expect, it } from "vitest";
import type { Browser, Locator, Page } from "playwright-core";
import type { Issue } from "@lmthing/ui/catalog";
import { createServer, type ViteDevServer } from "vite";
import { galleryConfig, launchChrome } from "../scripts/look";

const fixture = fileURLToPath(new URL("./data-view.fixture.tsx", import.meta.url));
let server: ViteDevServer, browser: Browser, page: Page;

beforeAll(async () => {
  server = await createServer({
    ...galleryConfig(0),
    plugins: [
      {
        name: "data-view-test",
        configureServer(vite) {
          vite.middlewares.use("/data-view-test", (_request, response) => {
            response.setHeader("Content-Type", "text/html");
            response.end(
              `<meta name="viewport" content="width=device-width, initial-scale=1"><body><script type="module" src="/@fs${fixture}"></script></body>`,
            );
          });
        },
      },
    ],
  });
  await server.listen();
  browser = await launchChrome();
}, 60000);
afterEach(async () => {
  await page?.close();
});
afterAll(async () => {
  await browser?.close();
  await server?.close();
});

async function open(example: string) {
  page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.addInitScript("globalThis.process ??= { env: {} }; globalThis.__name ??= (fn) => fn");
  await page.goto(`${server.resolvedUrls!.local[0]}data-view-test?example=${example}`);
  await page.waitForFunction(() => Boolean(window.__lmthingUI));
}

async function intactLabels(track: Locator) {
  return track.locator("[data-report-clipped]").evaluateAll((labels) =>
    labels
      .filter((label) => {
        const range = document.createRange();
        range.selectNodeContents(label);
        const box = label.getBoundingClientRect();
        return Array.from(range.getClientRects()).every(
          (run) => run.left >= box.left - 1 && run.right <= box.right + 1,
        );
      })
      .map((label) => label.textContent),
  );
}

async function clippedIssues() {
  const raw = await page.getByTestId("render-report").textContent();
  return (JSON.parse(raw!) as Issue[])
    .filter(({ code }) => code === "clipped_text")
    .map(({ address }) => address);
}

it("preserves short Field segments and fits the full Setpoint choices in a padded phone card", async () => {
  await open("choices");
  const short = page.getByRole("radiogroup", { name: "Walk length" });
  const shortLayout = await short.getByRole("radio").evaluateAll((nodes) =>
    nodes.map((node) => {
      const { top, width } = node.getBoundingClientRect();
      return `${top}/${Math.round(width)}`;
    }),
  );
  expect(new Set(shortLayout).size).toBe(1);
  const classes = page.getByRole("radiogroup", { name: "Class type" });
  const radios = classes.getByRole("radio");
  expect(await intactLabels(classes)).toEqual(["Strength circuit", "Spin express", "Mobility flow"]);
  expect(
    new Set(await radios.evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().top))).size,
  ).toBeGreaterThan(1);
  await classes.getByRole("radio", { name: "Spin express" }).click();
  await expect.poll(() => radios.nth(1).getAttribute("aria-checked")).toBe("true");
  expect(await clippedIssues()).toEqual([]);
});

it("keeps wrapped data-view tabs readable and keyboard-selectable", async () => {
  await open("long_tabs");
  const group = page.getByRole("tablist");
  const tabs = group.getByRole("tab");
  expect(await intactLabels(group)).toEqual([
    "All classes",
    "Strength work",
    "Cardio express",
    "Mobility flow",
  ]);
  const rows = await tabs.evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().top));
  expect(rows[0]).toBe(rows[1]);
  expect(rows[2]).toBe(rows[3]);
  expect(rows[0]!).toBeLessThan(rows[2]!);
  await tabs.first().focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => tabs.nth(2).getAttribute("aria-selected")).toBe("true");
  await page.getByText("Spin express", { exact: true }).waitFor();
  expect(await page.getByText("Strength circuit", { exact: true }).count()).toBe(0);
  expect(await clippedIssues()).toEqual([]);
});

it("reports ellipsized and masked track labels at the part address, then clears the resolved issues", async () => {
  await open("long_tabs");
  const id = "class_schedule/classes";
  const fault = await page.addStyleTag({
    content: `
    [data-testid="${id}/r2/label"] {
      white-space: nowrap; text-overflow: ellipsis; overflow: hidden; max-width: 30px;
    }
    [data-testid="${id}/r3/label"] {
      overflow: hidden; height: 6px;
    }
  `,
  });
  await expect.poll(clippedIssues).toEqual([`${id}/r2/label`, `${id}/r3/label`]);
  await fault.evaluate((el) => el.parentNode?.removeChild(el));
  await expect.poll(clippedIssues).toEqual([]);
});

it("switches Segmented panels by keyboard, reads the empty option and returns to the original addresses", async () => {
  await open("dashboard");
  const summary = page.getByTestId("walk_dashboard/summary/r1/label");
  const goal = page.getByText("Weekly walk goal", { exact: true });
  const results = page.getByTestId("walk_dashboard/view/results");
  const tabs = page.getByRole("tab");
  await tabs.first().focus();
  await summary.waitFor();
  await expect.poll(() => goal.count()).toBe(0);
  await page.keyboard.press("ArrowRight");
  await goal.waitFor();
  expect(await tabs.nth(1).getAttribute("aria-selected")).toBe("true");
  expect(await summary.count()).toBe(0);
  await page.keyboard.press("End");
  await results.waitFor();
  expect(await results.textContent()).toBe("No walks logged last week");
  expect(await goal.count()).toBe(0);
  await page.keyboard.press("Home");
  await summary.waitFor();
  expect(await results.count()).toBe(0);
  expect(await tabs.first().getAttribute("aria-selected")).toBe("true");
});

it("scrolls many Chips on one line and filters by keyboard, including empty and restored rows", async () => {
  await open("list");
  const chips = page.getByRole("checkbox");
  const fern = page.getByTestId("plant_list/plants/r1/title");
  const basil = page.getByTestId("plant_list/plants/r2/title");
  const results = page.getByTestId("plant_list/plants/results");
  await fern.waitFor();
  expect(await chips.count()).toBe(6);
  const geometry = await chips.evaluateAll((nodes) => {
    const track = nodes[0]!.parentElement!;
    const scroll = track.parentElement!.parentElement!;
    return {
      tops: nodes.map((node) => node.getBoundingClientRect().top),
      overflowing: scroll.scrollWidth > scroll.clientWidth,
    };
  });
  expect(new Set(geometry.tops).size).toBe(1);
  expect(geometry.overflowing).toBe(true);
  expect(await clippedIssues()).toEqual([]);
  const lastChipFits = () =>
    chips.last().evaluate((node) => {
      const bounds = node.getBoundingClientRect();
      const viewport = node.parentElement!.parentElement!.parentElement!.getBoundingClientRect();
      return bounds.left >= viewport.left && bounds.right <= viewport.right;
    });
  await chips.first().hover();
  await page.mouse.wheel(400, 0);
  await expect.poll(lastChipFits).toBe(true);
  await chips.first().press("Space");
  await fern.waitFor({ state: "detached" });
  expect(await basil.textContent()).toBe("Basil");
  await chips.first().press("Space");
  await fern.waitFor();
  await chips.last().focus();
  await expect.poll(lastChipFits).toBe(true);
  await page.keyboard.press("Enter");
  await results.waitFor();
  expect(await results.textContent()).toBe("No plants in the bedroom");
  expect(await basil.count()).toBe(0);
  await page.keyboard.press("Enter");
  await basil.waitFor();
  expect(await results.count()).toBe(0);
});

it("filters the named browse shelf without changing the independent care-plan shelf", async () => {
  await open("browse");
  const inInventory = page.getByTestId("browse_plants/inventory/r2/title");
  const inCare = page.getByTestId("browse_plants/care/r2/title");
  await inInventory.waitFor();
  await page.getByRole("checkbox", { name: "Kitchen" }).click();
  await inInventory.waitFor({ state: "detached" });
  expect(await inCare.textContent()).toBe("Fern");
});

it("updates the visible and readable message for a List already in the empty state", async () => {
  await open("empty");
  const message = page.getByTestId("plant_list/plants/results");
  const generic = page.getByText("Nothing here yet");
  const bathroom = page.getByRole("checkbox", { name: "Bathroom" });
  await generic.waitFor();
  expect(await message.count()).toBe(0);
  await bathroom.click();
  await expect.poll(() => message.textContent()).toBe("No plants in the bathroom");
  expect(await page.evaluate(() => window.__lmthingUI!.read())).toContain(
    'plants List (empty) "No plants in the bathroom"',
  );
  await bathroom.click();
  await generic.waitFor();
  expect(await message.count()).toBe(0);
  const read = await page.evaluate(() => window.__lmthingUI!.read());
  expect(read).toContain("plants List (empty)");
  expect(read).not.toMatch(/No plants in the bathroom|No plants in the kitchen|plants\/r1 press/);
});
