import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { URL, fileURLToPath, pathToFileURL } from "node:url";
import type { Page } from "playwright-core";
import { artStyles, imageKinds } from "../../src/catalog";
import { launchChrome } from "../look";
import { chargeImageUsd } from "./budget";
import { comparisonStyles, routes, type ImageJob } from "./fixtures";

const shots = fileURLToPath(new URL("../../shots/images/", import.meta.url));
const samples = fileURLToPath(new URL("../../../../apps/gallery/public/art-styles/", import.meta.url));
const sampleSide = 440;
type Usage = {
  key: string;
  seconds: number;
  inputTokens: number | null;
  outputTokens: number | null;
  usd: number | null;
  reservedUsd?: number;
};
type Cell = { job: ImageJob; key: string; usage?: Usage | undefined };

const escape = (text: string) => text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
const jpegPath = (key: string) => `../outputs/${key}.jpg`;

async function measuredCells() {
  const matrix: Cell[] = JSON.parse(await readFile(join(shots, "matrix.json"), "utf8"));
  const log = await readFile(join(shots, "usage.jsonl"), "utf8");
  const attempts: Usage[] = log
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const usage = new Map(attempts.map((value) => [value.key, value]));
  return { matrix: matrix.map((cell) => ({ ...cell, usage: usage.get(cell.key) })), attempts };
}

function cellHtml({ job: { slot, world, route, theme }, key, usage }: Cell, headings: readonly string[]) {
  const label = headings.map(escape).join(" · ");
  const subject = escape(slot.subject);
  const telemetry = usage
    ? `${usage.seconds.toFixed(1)} s · ${usage.outputTokens ?? "?"} output tokens`
    : "No usable response";
  return `<figure>
    <div class="crop">${usage ? `<img src="${jpegPath(key)}" alt="${subject}">` : `<span>${telemetry}</span>`}</div>
    <figcaption><b>${label}</b><br>${subject}<br>${world} · ${route.id} · ${theme.artStyle}<br>${telemetry}</figcaption>
  </figure>`;
}

function sheet(count: number, title: string, cells: string) {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><title>${title}</title>
    <style>
      body { margin: 16px; background: Canvas; color: CanvasText; font: 14px system-ui }
      h1 { font-size: 22px; margin: 0 0 16px }
      main { display: grid; grid-template-columns: repeat(${count}, minmax(0, 1fr)); gap: 14px }
      figure { margin: 0; min-width: 0; background: Canvas }
      .crop { aspect-ratio: 5 / 4; background: color-mix(in srgb, Canvas, CanvasText 8%); display: grid; place-items: center }
      img { width: 100%; height: 100%; aspect-ratio: inherit; object-fit: contain }
      figcaption { padding: 8px }
    </style><h1>${title}</h1><main>${cells}</main></html>`;
}

async function captureSheet(page: Page, name: string, title: string, cells: string[], columns: number) {
  const folder = join(shots, "sheets");
  const htmlPath = join(folder, `${name}.html`);
  await writeFile(htmlPath, sheet(columns, title, cells.join("")));
  await page.setViewportSize({ width: columns * 240 + 32, height: 900 });
  await page.goto(pathToFileURL(htmlPath).href);
  await page.screenshot({ path: join(folder, `${name}.jpg`), fullPage: true, quality: 86 });
}

async function captureSheets(page: Page, matrix: Cell[]) {
  for (const kind of imageKinds) {
    const cells = matrix.filter(({ job }) => !job.sample && job.slot.kind === kind);
    await captureSheet(
      page,
      `kind-${kind}`,
      `Kind: ${kind}`,
      cells.map((cell) => cellHtml(cell, [cell.job.theme.artStyle, cell.job.route.id])),
      3,
    );
  }
  for (const style of artStyles) {
    const cells = matrix.filter(
      ({ job }) => job.theme.artStyle === style && (job.sample || job.route.id === "mini-medium"),
    );
    await captureSheet(
      page,
      `style-${style}`,
      `Style: ${style}`,
      cells.map((cell) => cellHtml(cell, [cell.job.slot.kind])),
      5,
    );
  }
  const chosen = matrix.filter(({ job }) => job.sample);
  await captureSheet(
    page,
    "gallery",
    "Ledge: the same six subjects in eight styles",
    chosen.map((cell) => cellHtml(cell, [cell.job.theme.artStyle, cell.job.slot.kind])),
    6,
  );
  await captureSheet(
    page,
    "gallery-empty-state",
    "Ledge: empty-state assets for all eight styles",
    chosen
      .filter(({ job }) => job.slot.kind === "empty_state")
      .map((cell) => cellHtml(cell, [cell.job.theme.artStyle])),
    4,
  );
}

async function sampleBuffer(page: Page, cell: Cell) {
  const jpeg = await readFile(join(shots, "outputs", `${cell.key}.jpg`));
  const base64 = await page.evaluate(
    async ({ source, side }) => {
      const image = new Image();
      image.src = `data:image/jpeg;base64,${source}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, side / Math.max(image.width, image.height));
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.79).split(",")[1]!;
    },
    { source: jpeg.toString("base64"), side: sampleSide },
  );
  return Buffer.from(base64, "base64");
}

async function exportSamples(page: Page, matrix: Cell[]) {
  const cells = matrix.filter(({ job }) => job.sample);
  if (cells.some(({ usage }) => !usage))
    throw new Error("Gallery images missing; refusing to export a partial sample");
  await mkdir(samples, { recursive: true });
  for (const cell of cells)
    await writeFile(join(samples, `${cell.job.id}.jpg`), await sampleBuffer(page, cell));
  const manifest = cells.map(({ job: { id, route, slot }, usage }) => ({
    file: `${id}.jpg`,
    model: route.model,
    quality: route.quality,
    ...slot,
    seconds: usage!.seconds,
    outputTokens: usage!.outputTokens,
    estimatedUsd: usage!.usd,
  }));
  await writeFile(join(samples, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
}

function summarize(cells: Cell[], attempts: readonly Usage[]) {
  const billed = [
    ...new Map(cells.filter((cell) => cell.usage).map((cell) => [cell.key, cell.usage!])).values(),
  ];
  const spend = billed.reduce((sum, { usd }) => sum + (usd ?? 0), 0);
  console.log(
    `${billed.length} unique measured images; estimated $${spend.toFixed(2)} across reported usage`,
  );
  const cumulative = attempts.reduce((sum, usage) => sum + chargeImageUsd(usage), 0);
  console.log(`All iterations: ${attempts.length} generation attempts; estimated $${cumulative.toFixed(2)}`);
  return routes.map((route) => {
    const outcomes = cells.filter(({ job }) => !job.sample && job.route.id === route.id);
    const values = outcomes.flatMap(({ usage }) => (usage ? [usage] : []));
    return {
      route: route.id,
      completed: values.length,
      expected: imageKinds.length * comparisonStyles.length,
      secondsMedian:
        values.map(({ seconds }) => seconds).sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? null,
      secondsMax: values.length ? Math.max(...values.map(({ seconds }) => seconds)) : null,
      outputTokens: [...new Set(values.map(({ outputTokens }) => outputTokens))],
      estimatedUsd: values.reduce((sum, { usd }) => sum + (usd ?? 0), 0),
    };
  });
}

export async function writeEvidence(publishSamples: boolean) {
  const { matrix, attempts } = await measuredCells();
  const summary = summarize(matrix, attempts);
  console.log(JSON.stringify(summary, null, 2));
  await mkdir(join(shots, "sheets"), { recursive: true });
  const browser = await launchChrome();
  try {
    const page = await browser.newPage();
    await captureSheets(page, matrix);
    if (publishSamples) await exportSamples(page, matrix);
  } finally {
    await browser.close();
  }
}
