import { fileURLToPath, URL } from "node:url";
import { expect, it } from "vitest";
import { createServer } from "vite";
import type { Page } from "playwright-core";
import { galleryConfig, launchChrome } from "../../../../scripts/look";

const fixture = fileURLToPath(new URL("./host-item-ids.fixture.tsx", import.meta.url));
const report = (page: Page) => page.getByTestId("report");
const rows = (page: Page, component: string) =>
  page
    .locator(
      `[data-testid^="home/${component}/r"][data-testid$="/root"]:not([data-testid="home/${component}/root"])`,
    )
    .evaluateAll((nodes) =>
      nodes.map((node) => [node.getAttribute("data-testid")!.split("/")[2], node.textContent]),
    );

it("draws and reports host row ids across reordering, deletion, and repairs", async () => {
  const config = galleryConfig(0);
  const server = await createServer({
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      {
        name: "host-items-browser-test",
        configureServer(server) {
          server.middlewares.use("/host-items-test", (_request, response) => {
            response.setHeader("Content-Type", "text/html");
            response.end(`<body><script type="module" src="/@fs${fixture}"></script></body>`);
          });
        },
      },
    ],
  });
  try {
    await server.listen();
    const browser = await launchChrome();
    try {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.addInitScript("globalThis.process ??= { env: {} };");
      await page.goto(`${server.resolvedUrls!.local[0]}host-items-test`);
      await page
        .getByTestId("home/l1/r7/title")
        .waitFor({ timeout: 5000 })
        .catch((error: unknown) => {
          if (errors.length) throw new Error(errors.join("\n"));
          throw error;
        });
      await checkStableRows(page);
      await checkRepairs(page);
      expect(errors).toEqual([]);
    } finally {
      await browser.close();
    }
  } finally {
    await server.close();
  }
});

async function checkStableRows(page: Page) {
  expect(await rows(page, "l1")).toEqual([
    ["r7", "Alpha"],
    ["r4", "Bravo"],
    ["r1", "Charlie"],
  ]);
  expect(await rows(page, "n1")).toEqual([
    ["r_note_saved", "Note A"],
    ["r_note_mid", "Note B"],
    ["r_note_other", "Note C"],
  ]);
  await page.getByRole("button", { name: "Reorder" }).click();
  expect(await rows(page, "l1")).toEqual([
    ["r1", "Charlie"],
    ["r4", "Bravo"],
    ["r7", "Alpha"],
  ]);
  expect(await rows(page, "n1")).toEqual([
    ["r_note_other", "Note C"],
    ["r_note_mid", "Note B"],
    ["r_note_saved", "Note A"],
  ]);
  await page.getByRole("button", { name: "Delete middle" }).click();
  expect(await rows(page, "l1")).toEqual([
    ["r1", "Charlie"],
    ["r7", "Alpha"],
  ]);
  expect(await rows(page, "n1")).toEqual([
    ["r_note_other", "Note C"],
    ["r_note_saved", "Note A"],
  ]);
  await page.getByTestId("home/l1/r7/root").click();
  await page.getByTestId("linked").filter({ hasText: "alpha:home/l1/r7" }).waitFor();
  await report(page).filter({ hasText: "home/l1/r1/root" }).waitFor();
  expect(await report(page).textContent()).not.toContain("S.props");
}

async function checkRepairs(page: Page) {
  await page.getByRole("button", { name: "Mix IDs" }).click();
  expect(await rows(page, "l1")).toEqual([
    ["r2", "New"],
    ["r1", "Charlie"],
    ["r7", "Lorem ipsum"],
    ["r4", "Alpha"],
    ["r5", "Bad prefix"],
  ]);
  expect(await rows(page, "n1")).toEqual([
    ["r_note_1", "New note"],
    ["r_note_saved", "Note A"],
    ["r_note_again", "Duplicate note id"],
    ["r_note_wrong", "Lorem ipsum"],
  ]);
  await report(page).filter({ hasText: "R2.strip" }).waitFor();
  const issues = JSON.parse((await report(page).textContent())!);
  expect(issues.filter(({ code }: { code: string }) => code === "S.props")).toEqual([]);
  expect(
    issues
      .filter(({ code }: { code: string }) => code === "R2.strip")
      .map(({ address }: { address: string }) => address),
  ).toEqual(["home/l1/r4/root", "home/l1/r5/root", "home/n1/r_note_again/root", "home/n1/r_note_wrong/root"]);
  expect(
    issues
      .filter(({ code }: { code: string }) => code === "S.placeholder")
      .map(({ address }: { address: string }) => address),
  ).toEqual(["home/l1/r7/title", "home/n1/r_note_wrong/root"]);
}
