import { afterAll, beforeAll, expect, it } from "vitest";
import { fileURLToPath, URL } from "node:url";
import { createServer, type ViteDevServer } from "vite";
import type { Browser, Page } from "playwright-core";
import type { Definition } from "@lmthing/ui/catalog";
import { galleryConfig, launchChrome } from "../index";

let server: ViteDevServer, browser: Browser;

beforeAll(async () => {
  server = await createServer(galleryConfig(0));
  await server.listen();
  browser = await launchChrome();
});

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

it.each([
  ["the look sheet", "w=390&mode=light", '[data-look-frame="dice_calm_light_0'],
  ["the gallery grid", "preset=calm&mode=light", '[data-testid="preview_dice_calm_light_0'],
])("renders identical seeded draws on separate visits to %s", async (_name, query, prefix) => {
  async function shoot() {
    const page = await browser.newPage({ viewport: { width: 1290, height: 900 } });
    try {
      await page.goto(`${server.resolvedUrls!.local[0]}?c=Dice&${query}`, { waitUntil: "networkidle" });
      const drawn = page.locator(`${prefix}_drawn"]`);
      const unrolled = page.locator(`${prefix}_filled"]`);
      expect(await unrolled.innerText()).toContain("Ready to roll");
      expect(await unrolled.locator('[aria-pressed="true"]').count()).toBe(0);
      expect(await drawn.getByTestId("dice_calm_light_0_drawn/c1/sum").innerText()).toBe("Total 9");
      const held = drawn.locator('[aria-pressed="true"]');
      expect(await held.count()).toBe(1);
      expect(await held.getAttribute("data-testid")).toBe("dice_calm_light_0_drawn/c1/r1/hold");
      expect(await drawn.getByRole("button", { name: "Roll again" }).count()).toBe(1);
      await page.evaluate(() => document.fonts.ready);
      return await drawn.screenshot();
    } finally {
      await page.close();
    }
  }
  expect((await shoot()).equals(await shoot())).toBe(true);
});

async function seedOutcomes(page: Page, catalog: string) {
  return page.evaluate(
    async ({ catalog }) => {
      // These paths resolve in the gallery page, not in Vitest's Node module graph.
      const load = new Function("path", "return import(path)");
      const { components, drawState } = (await load(
        `/@fs${catalog}`,
      )) as typeof import("@lmthing/ui/catalog");
      const { createSeededDraw, previewComponent } = await load("/app/draw/index.ts");
      function outcome(def: Definition, seed?: number, screen = "drawn") {
        const input = def.props.parse(def.examples[0]) as Record<string, unknown>;
        const preview = createSeededDraw(def, input, screen, seed);
        return drawState(def.meta, input, (part) =>
          preview.store.get(`${screen}/${previewComponent}/${part}`),
        );
      }
      const pick = {
        ...components.Spinner,
        meta: {
          ...components.Spinner.meta,
          draw: { kind: "pick", press: "spin", pool: "options", repeat: "repeat" },
        },
      } satisfies Definition;
      const teams = {
        ...components.TeamPicker,
        meta: {
          ...components.TeamPicker.meta,
          draw: { kind: "partition", press: "make", players: "players", teams: "teams", locked: "team" },
        },
      } satisfies Definition;
      const dice = {
        ...components.Dice,
        meta: {
          ...components.Dice.meta,
          id: "ChanceFixture",
          items: { ...components.Dice.meta.items, prefix: "die" },
          actions: { parts: { go: ["press"] }, items: { keep: ["toggle"] } },
          draw: { ...components.Dice.meta.draw, press: "go", hold: "keep" },
        },
      } satisfies Definition;
      return {
        pick: outcome(pick),
        split: outcome(teams),
        replay: outcome(teams, undefined, "replay"),
        dice: outcome(dice),
        different: outcome(dice, 1),
      };
    },
    { catalog },
  );
}

it("seeds declared picks, partitions and custom hold addresses without component-id branches", async () => {
  const page = await browser.newPage();
  const catalog = fileURLToPath(new URL("../../../src/entry/catalog.ts", import.meta.url));
  try {
    await page.goto(`${server.resolvedUrls!.local[0]}?c=Dice&preset=calm&mode=light`);
    const results = await seedOutcomes(page, catalog);
    expect(results.pick).toMatchObject({ kind: "pick", index: 2 });
    expect(results.split).toEqual({ kind: "partition", teams: [0, 0, 1, 2, 2, 1] });
    expect(results.replay).toEqual(results.split);
    expect(results.dice).toEqual({ kind: "faces", faces: [3, 6], held: [true, false] });
    expect(results.different).not.toEqual(results.dice);
  } finally {
    await page.close();
  }
});
