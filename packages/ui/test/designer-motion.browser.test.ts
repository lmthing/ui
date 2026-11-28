import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import type { PartEntry } from "@lmthing/ui/kit";
import { galleryConfig } from "../scripts/look";
import { launchChrome } from "../scripts";
import {
  baselineMotionKit,
  contactSheet,
  motionEvidenceFolder,
  releaseGallery,
  sampleMotionFrames,
} from "./motion-evidence";

type MotionLabWindow = Window & { motionLabParts?: () => PartEntry[]; firstHeadingOpacity?: number };
const baseline = process.env.UI_MOTION_BASELINE === "1";
const changed = it.runIf(!baseline && !process.env.UI_MOTION_EVIDENCE && !process.env.UI_MOTION_PERF);
let server: Pick<ViteDevServer, "resolvedUrls" | "close">, browser: Browser, page: Page;
const errors: string[] = [];
beforeAll(async () => {
  const config = { ...galleryConfig(0), plugins: baseline ? [baselineMotionKit()] : [] };
  if (process.env.UI_MOTION_PERF || process.env.UI_MOTION_EVIDENCE || process.env.UI_MOTION_RELEASE)
    server = await releaseGallery(config, baseline);
  else {
    const dev = await createServer(config);
    await dev.listen();
    server = dev;
  }
  browser = await launchChrome();
  page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.setDefaultTimeout(25000);
  page.on("pageerror", (error) => errors.push(error.message));
}, 60000);
afterAll(async () => {
  await browser?.close();
  await server?.close();
});
beforeEach(async () => {
  errors.length = 0;
  await openLab();
}, 35000);

async function openLab(motion: "no-preference" | "reduce" = "no-preference") {
  await page.emulateMedia({ reducedMotion: motion });
  const profile = process.env.UI_MOTION_EVIDENCE || process.env.UI_MOTION_PERF ? "calm" : "lively";
  await page.goto(`${server.resolvedUrls!.local[0]}?motion-lab=${profile}`, { waitUntil: "commit" });
  await page
    .getByText("My garden")
    .waitFor()
    .catch((cause) => {
      throw new Error(`The motion gallery did not render: ${errors.join("; ")}`, { cause });
    });
  await page.waitForFunction(() => Boolean(window.__lmthingUI));
}

const part = (address: string) => page.getByTestId(address);
const tap = (address: string) => part(address).click({ force: true });
const styleOf = (address: string, property: "transform" | "opacity") =>
  part(address).evaluate((node, name) => getComputedStyle(node)[name], property);

async function focused(address: string) {
  return part(address).evaluate((node) => node === document.activeElement);
}

changed.each(["no-preference", "reduce"] as const)(
  "activates addressed rows and Back by keyboard, restoring the exact opener (%s)",
  async (preference) => {
    await openLab(preference);
    const opener = "garden/plants/r1/root";
    await part(opener).focus();
    const body = page.locator("[data-kit-screen-body]");
    await body.evaluate((node) => {
      node.scrollTop = 24;
    });
    await page.keyboard.press("Enter");
    await part("fern/heading/title").waitFor({ timeout: 2000 });
    await expect.poll(() => focused("fern/heading/title")).toBe(true);
    await part("fern/heading/back").focus();
    await page.keyboard.press("Space");
    await part("garden/heading/title").waitFor();
    await expect.poll(() => focused(opener)).toBe(true);
    expect(await body.evaluate((node) => node.scrollTop)).toBe(24);
  },
);

changed("gives the reduced-motion action a stationary pressed state", async () => {
  await openLab("reduce");
  await tap("garden/plants/r1/root");
  const action = part("fern/save/root");
  const pose = () =>
    action.evaluate((node) => {
      const { backgroundColor, transform } = getComputedStyle(node);
      return { backgroundColor, transform };
    });
  const idle = await pose();
  await action.hover();
  await page.mouse.down();
  try {
    await expect.poll(async () => (await pose()).backgroundColor).not.toBe(idle.backgroundColor);
    expect((await pose()).transform).toBe(idle.transform);
  } finally {
    await page.mouse.move(1, 1);
    await page.mouse.up();
  }
  await expect.poll(pose).toEqual(idle);
});

changed.each(["no-preference", "reduce"] as const)(
  "paints the working screen at full opacity on its first frame (%s)",
  async (preference) => {
    await page.addInitScript(() => {
      const first = () => {
        const title = document.querySelector<HTMLElement>('[data-testid="garden/heading/title"]');
        if (!title) return void requestAnimationFrame(first);
        let opacity = 1;
        for (let node: HTMLElement | null = title; node; node = node.parentElement)
          opacity *= Number(getComputedStyle(node).opacity);
        (window as MotionLabWindow).firstHeadingOpacity = opacity;
      };
      requestAnimationFrame(first);
    });
    await openLab(preference);
    await expect.poll(() => page.evaluate(() => (window as MotionLabWindow).firstHeadingOpacity)).toBe(1);
  },
);

async function openAccess(reducedMotion: "no-preference" | "reduce") {
  await page.emulateMedia({ reducedMotion });
  await openControls("access");
  await part("controls/meds/r1/skip").waitFor();
}

async function openControls(kind: string) {
  await page.goto(`${server.resolvedUrls!.local[0]}?controls=${kind}`, { waitUntil: "commit" });
  await page.waitForFunction(() => Boolean(window.__lmthingUI));
}

changed.each(["no-preference", "reduce"] as const)(
  "names a dose action, cancels to its opener and moves focus to its accepted status (%s)",
  async (preference) => {
    await openAccess(preference);
    const skip = "controls/meds/r2/skip";
    const button = page.getByRole("button", { name: /Skip: Magnesium/ });
    expect(await button.getAttribute("data-testid")).toBe(skip);
    await button.focus();
    await page.keyboard.press("Enter");
    const confirmation = page.getByRole("dialog", { name: /Skip Magnesium.*1 capsule/ });
    await confirmation.waitFor();
    expect(await confirmation.evaluate((node) => getComputedStyle(node).opacity)).toBe("1");
    await page.keyboard.press("Escape");
    await expect.poll(() => focused(skip)).toBe(true);
    await page.keyboard.press("Space");
    await confirmation.getByRole("button", { name: "Skip", exact: true }).focus();
    await page.keyboard.press("Enter");
    const status = "controls/meds/r2/status";
    await expect.poll(() => part(status).textContent()).toBe("Skipped");
    await expect.poll(() => focused(status)).toBe(true);
    expect(await part("controls/meds/r1/status").textContent()).toBe("Due");
  },
);

const largeTextParts = ["controls/button/root_label", "controls/list/r1/title", "controls/t1/r2/label"];
function enlargeText() {
  return page.addStyleTag({
    content:
      largeTextParts.map((id) => `[data-testid="${id}"]`).join(",") +
      "{font-size: 36px !important; line-height: 44px !important;}",
  });
}

changed("wraps the action, row and five-tab labels at larger type", async () => {
  await openAccess("reduce");
  await enlargeText();
  for (const id of largeTextParts) {
    const box = await part(id).boundingBox();
    expect(box?.height).toBeGreaterThan(44);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  }
  for (const id of ["controls/button/root", "controls/list/r1/root", "controls/t1/r2/root"]) {
    const box = await part(id).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
    expect(box?.width).toBeGreaterThanOrEqual(44);
  }
  const selected = page.getByRole("tab", { selected: true });
  expect(await selected.getByText("Selected").count()).toBe(1);
  expect(await selected.locator("svg").count()).toBeGreaterThan(1);
  const warning = part("controls/list/r1/root");
  expect(await warning.getByText("Warning").count()).toBe(1);
  expect(await warning.locator("svg").count()).toBeGreaterThan(1);
});

changed("offers visible, keyboard-operable alternatives to swiping and restores terminal focus", async () => {
  await openControls("swipe");
  const skip = page.getByRole("button", { name: "Skip", exact: true });
  await skip.focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => focused("controls/s1/r2/root")).toBe(true);
  const keep = page.getByRole("button", { name: "Keep", exact: true });
  await keep.focus();
  await page.keyboard.press("Space");
  await expect.poll(() => focused("controls/s1/r3/root")).toBe(true);
  await page.keyboard.press("ArrowLeft");
  const complete = page.getByRole("status").filter({ hasText: "All cards reviewed" });
  await expect
    .poll(() =>
      complete.evaluate((node) => {
        const active = document.activeElement;
        return active === node
          ? "terminal"
          : `${active?.tagName}:${active?.getAttribute("role")}:${active?.getAttribute("data-testid")} (terminal tabindex ${node.getAttribute("tabindex")}, inert ${Boolean(node.closest("[inert]"))})`;
      }),
    )
    .toBe("terminal");
  expect(await skip.count()).toBe(0);
  expect(await keep.count()).toBe(0);
});

changed.each(["ltr", "rtl"] as const)(
  "advances and reverses the %s gallery carousel with visible keyboard controls",
  async (direction) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openControls("carousel");
    await page.evaluate((dir) => {
      document.documentElement.dir = dir;
    }, direction);
    const next = page.getByRole("button", { name: "Next", exact: true });
    const previous = page.getByRole("button", { name: "Previous", exact: true });
    await expect.poll(() => previous.getAttribute("aria-disabled")).toBe("true");
    await next.focus();
    await page.keyboard.press("Enter");
    await expect.poll(() => next.getAttribute("aria-disabled")).toBe("true");
    await previous.focus();
    await page.keyboard.press("Space");
    await expect.poll(() => previous.getAttribute("aria-disabled")).toBe("true");
  },
);

async function transforms(address: string) {
  return part(address).evaluate((node) =>
    node.getAnimations().flatMap((animation) => {
      const effect = animation.effect as KeyframeEffect;
      return effect.getKeyframes().map((frame) => frame.transform);
    }),
  );
}

async function pressSave() {
  const button = await part("fern/save/root").boundingBox();
  if (!button) throw new Error("Submit is not on screen");
  await page.mouse.move(button.x + button.width / 2, button.y + button.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(80);
  await page.mouse.up();
}

const stickyTop = (address: string) =>
  part(address).evaluate((node) => {
    let sticky: HTMLElement | undefined;
    for (let ancestor = node.parentElement; ancestor; ancestor = ancestor.parentElement) {
      const style = getComputedStyle(ancestor);
      if (style.position === "sticky") sticky = ancestor;
      if (sticky && ["auto", "scroll"].includes(style.overflowY))
        return sticky.getBoundingClientRect().top - ancestor.getBoundingClientRect().top;
    }
    throw new Error("Section has no sticky wrapper");
  });

changed(
  "keeps a distant title in the destination rail, shows a readable rising dialog and returns back",
  async () => {
    await tap("garden/plants/r1/root");
    await part("fern/heading/title").waitFor();
    expect(await transforms("fern/heading/title")).toEqual([]);
    await tap("fern/heading/action");
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    expect(await dialog.evaluate((node) => getComputedStyle(node).opacity)).toBe("1");
    expect(await dialog.evaluate((node) => getComputedStyle(node).transform)).not.toBe("none");
    await expect
      .poll(() =>
        dialog.evaluate((node) => {
          const transform = getComputedStyle(node).transform;
          return transform === "none" || new DOMMatrixReadOnly(transform).m42 === 0;
        }),
      )
      .toBe(true);
    const close = part("fern/details/close");
    await expect
      .poll(() =>
        close.evaluate((node) => {
          const rect = node.getBoundingClientRect();
          const lab = window as MotionLabWindow;
          const entry = lab.motionLabParts?.().find(({ address }) => address === "fern/details/close");
          return entry ? Math.abs(entry.rect.y - rect.y) : Infinity;
        }),
      )
      .toBeLessThan(1);
    await page.keyboard.press("Escape");
    await expect.poll(() => dialog.count()).toBe(0);
    await tap("fern/heading/back");
    await part("garden/heading/title").waitFor();
    expect(errors).toEqual([]);
  },
);

changed(
  "updates the switch and checkbox, reorders stable rows and keeps section headers visible",
  async () => {
    await tap("garden/plants/r2/trail");
    expect(await part("garden/plants/r2/trail").getAttribute("aria-checked")).toBe("true");
    await tap("garden/tasks/r1/check");
    expect(await part("garden/tasks/r1/check").getAttribute("aria-checked")).toBe("true");
    await tap("garden/today/link");
    await expect.poll(() => part("garden/plants/r4/root").count()).toBe(1);
    expect(await part("garden/plants/r2/trail").getAttribute("aria-checked")).toBe("true");
    const fern = part("garden/plants/r1/root");
    const basil = part("garden/plants/r2/root");
    await expect.poll(async () => (await basil.boundingBox())!.y < (await fern.boundingBox())!.y).toBe(true);
    await tap("garden/today/link");
    await expect.poll(() => basil.count()).toBe(0);
    await expect.poll(() => page.locator("[data-list-exiting]").count()).toBe(0);
    const row = fern.locator("xpath=ancestor::*[@data-list-motion][1]");
    const position = () => row.evaluate((node: HTMLElement) => node.offsetTop);
    const oldTop = await position();
    await tap("garden/today/link");
    const delta = oldTop - (await position());
    expect(delta).toBeLessThan(0);
    expect(
      await row.evaluate((node) =>
        node
          .getAnimations()
          .flatMap((animation) =>
            (animation.effect as KeyframeEffect).getKeyframes().map((frame) => frame.transform),
          ),
      ),
    ).toContain(`translateY(${delta}px)`);
    await page.mouse.move(180, 360);
    await page.mouse.wheel(0, 180);
    await expect.poll(() => part("garden/heading/sub").count()).toBe(0);
    await expect.poll(() => part("garden/heading/title").isVisible()).toBe(true);
    await expect.poll(() => stickyTop("garden/today/text")).toBeCloseTo(0);
    await page.mouse.wheel(0, 80);
    await expect.poll(() => stickyTop("garden/today/text")).toBeCloseTo(0);
    await page.mouse.wheel(0, 450);
    await expect.poll(() => stickyTop("garden/all/text")).toBeCloseTo(0);
    await page.mouse.wheel(0, -2000);
    await expect.poll(() => part("garden/heading/sub").count()).toBe(1);
    expect(errors).toEqual([]);
  },
);

changed("keeps only a visual row during removal, without live addresses or hit bounds", async () => {
  await tap("garden/today/link");
  const prefix = "garden/plants/r2/";
  await expect
    .poll(() =>
      page.evaluate(
        (key) =>
          (window as MotionLabWindow).motionLabParts?.().some(({ address }) => address.startsWith(key)),
        prefix,
      ),
    )
    .toBe(true);
  const exit = await part("garden/today/link").evaluate(
    (update, key) =>
      new Promise((resolve) => {
        const observer = new MutationObserver(() => {
          const ghost = document.querySelector("[data-list-exiting]");
          if (!ghost) return;
          observer.disconnect();
          resolve({
            title: ghost.textContent?.includes("Basil"),
            inert: ghost.hasAttribute("inert"),
            liveIds: document.querySelectorAll(`[data-testid^="${key}"]`).length,
            liveBounds: (window as MotionLabWindow)
              .motionLabParts?.()
              .filter(({ address }) => address.startsWith(key)).length,
            fading: ghost.getAnimations().some((flight) => flight.playState === "running"),
          });
        });
        observer.observe(document.body, {
          subtree: true,
          attributes: true,
          attributeFilter: ["data-list-exiting"],
        });
        (update as HTMLElement).click();
      }),
    prefix,
  );
  expect(exit).toEqual({ title: true, inert: true, liveIds: 0, liveBounds: 0, fading: true });
});

changed("keeps input focus when a heading is removed", async () => {
  const input = part("garden/memo/field");
  await input.fill("Keep this");
  expect(await input.evaluate((node) => node === document.activeElement)).toBe(true);
  await page.evaluate(() => window.__lmthingUI!.act({ address: "today/link", action: "press" }));
  await expect.poll(() => part("garden/care/text").count()).toBe(0);
  expect(await input.evaluate((node) => node === document.activeElement)).toBe(true);
  expect(await input.inputValue()).toBe("Keep this");
  expect(errors).toEqual([]);
});

changed("does not replay an agent reorder on the next human input", async () => {
  await page.evaluate(() => window.__lmthingUI!.act({ address: "today/link", action: "press" }));
  await part("garden/plants/r4/root").waitFor();
  await tap("garden/plants/r2/trail");
  expect(await part("garden/plants/r2/trail").getAttribute("aria-checked")).toBe("true");
  expect(
    await page
      .locator("[data-list-motion]")
      .evaluateAll((nodes) => nodes.flatMap((node) => node.getAnimations()).length),
  ).toBe(0);
});

changed("refreshes reorder origins after height-neutral row edits", async () => {
  const row = part("garden/plants/r2/root").locator("xpath=ancestor::*[@data-list-motion][1]");
  const layout = () =>
    row.evaluate((node: HTMLElement) => ({
      top: node.offsetTop,
      height: node.parentElement!.offsetHeight,
    }));
  const old = await layout();
  await tap("garden/heading/action");
  await part("garden/plants/r3/badge").waitFor();
  const resized = await layout();
  expect(resized.height).toBe(old.height);
  expect(resized.top).toBeLessThan(old.top);
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  await tap("garden/today/link");
  const delta = resized.top - (await layout()).top;
  expect(
    await row.evaluate((node) =>
      node
        .getAnimations()
        .flatMap((animation) =>
          (animation.effect as KeyframeEffect).getKeyframes().map((frame) => frame.transform),
        ),
    ),
  ).toContain(`translateY(${delta}px)`);
});

changed("replaces tabs with an inert outgoing picture during the cross-fade", async () => {
  await tap("garden/nav/r2/root");
  const outgoing = page.locator("[data-kit-outgoing-tab]");
  expect(await outgoing.getAttribute("inert")).not.toBeNull();
  expect(await outgoing.textContent()).toContain("My garden");
  expect(await outgoing.locator("[data-testid]").count()).toBe(0);
  expect(await part("activity/heading/title").textContent()).toBe("Activity");
  await expect.poll(() => outgoing.count()).toBe(0);
  expect(errors).toEqual([]);
});

changed(
  "reflects real gallery loading, error and completion states and animates progress updates",
  async () => {
    await tap("garden/nav/r2/root");
    await part("activity/heading/title").waitFor();
    await tap("activity/week/link");
    await expect.poll(() => part("activity/total/title").count()).toBe(0);
    await expect.poll(() => part("activity/total/title").textContent()).toBe("2");
    await tap("activity/advance/root");
    await expect.poll(() => part("activity/total/title").textContent()).toBe("5");
    await tap("activity/nav/r1/root");
    await tap("garden/plants/r1/root");
    await tap("fern/error/root");
    await expect.poll(() => part("fern/plant_photo/photo").count()).toBe(0);
    await tap("fern/save/root");
    await expect.poll(() => part("fern/save/root").textContent()).toContain("Saving");
    await part("fern/done/title").waitFor();
    expect(await part("fern/done/title").textContent()).toBe("Watering logged");
    const check = part("fern/done/icon").locator("path");
    await expect.poll(() => check.getAttribute("stroke-dashoffset")).toBe(null);
    expect(errors).toEqual([]);
  },
);

changed(
  "shows the same end states without position flights in reduced motion and with agent actions",
  async () => {
    await openLab("reduce");
    await tap("garden/plants/r1/root");
    expect(await transforms("fern/heading/title")).toEqual([]);
    await tap("fern/heading/action");
    expect(await page.getByRole("dialog").evaluate((node) => getComputedStyle(node).transform)).not.toContain(
      ", 40)",
    );
    await openLab();
    await page.evaluate(() => window.__lmthingUI!.act({ address: "plants/r1/root", action: "press" }));
    await part("fern/heading/title").waitFor();
    expect(await transforms("fern/heading/title")).toEqual([]);
    expect(await styleOf("fern/heading/title", "opacity")).toBe("1");
    expect(errors).toEqual([]);
  },
);

const scenes = [
  ["toggle", () => tap("garden/plants/r2/trail")],
  ["check", () => tap("garden/tasks/r1/check")],
  ["reorder-insert-status", () => tap("garden/today/link")],
  ["remove", () => tap("garden/today/link")],
  ["reorder-after-remove", () => tap("garden/today/link")],
  [
    "scroll",
    async () => {
      await page.mouse.move(180, 360);
      await page.mouse.wheel(0, 450);
    },
  ],
  ["scroll-back", () => page.mouse.wheel(0, -900)],
  ["push", () => tap("garden/plants/r1/root")],
  ["sheet", () => tap("fern/heading/action")],
  ["sheet-dismiss", () => page.keyboard.press("Escape")],
  ["error", () => tap("fern/error/root")],
  ["submit-working-success", pressSave],
  ["back", () => tap("fern/heading/back")],
  ["tab", () => tap("garden/nav/r2/root")],
  ["roll-progress", () => tap("activity/advance/root")],
  ["loading-resolve", () => tap("activity/week/link")],
] as const;

async function captureDose(prefix: string, preference: "no-preference" | "reduce") {
  await openAccess(preference);
  await page.screenshot({ path: `${motionEvidenceFolder}/${prefix}-access.png` });
  const styling = await enlargeText();
  await page.screenshot({ path: `${motionEvidenceFolder}/${prefix}-access-large.png` });
  await styling.evaluate((node) => node.remove());
  await part("controls/meds/r2/skip").focus();
  await contactSheet(browser, page, `${prefix}-confirm-dose`, () => page.keyboard.press("Enter"));
  await contactSheet(browser, page, `${prefix}-cancel-dose`, () => page.keyboard.press("Escape"));
  await part("controls/meds/r2/skip").focus();
  await page.keyboard.press("Space");
  await part("controls/confirm/confirm").focus();
  await contactSheet(browser, page, `${prefix}-log-dose`, () => page.keyboard.press("Enter"));
}

async function captureCollections(prefix: string) {
  await openControls("carousel");
  await page.getByRole("button", { name: "Next", exact: true }).focus();
  await contactSheet(browser, page, `${prefix}-carousel`, () => page.keyboard.press("Enter"));
  await page.getByRole("button", { name: "Previous", exact: true }).focus();
  await contactSheet(browser, page, `${prefix}-carousel-return`, () => page.keyboard.press("Space"));
  await openControls("swipe");
  const skip = page.getByRole("button", { name: "Skip", exact: true });
  await skip.focus();
  await page.keyboard.press("Enter");
  await part("controls/s1/r2/root").waitFor();
  await skip.focus();
  await page.keyboard.press("Enter");
  await part("controls/s1/r3/root").waitFor();
  await skip.focus();
  await contactSheet(browser, page, `${prefix}-swipe-terminal`, () => page.keyboard.press("Enter"));
}

it.runIf(Boolean(process.env.UI_MOTION_EVIDENCE))(
  "renders contact sheets of each motion",
  async () => {
    for (const preference of ["no-preference", "reduce"] as const) {
      await openLab(preference);
      const prefix = `${baseline ? "before" : "after"}-${preference === "reduce" ? "reduced" : "normal"}`;
      for (const [label, action] of scenes) {
        if (!baseline && label === "push") {
          await part("garden/plants/r1/root").focus();
          await contactSheet(browser, page, `${prefix}-${label}`, () => page.keyboard.press("Enter"));
        } else if (!baseline && label === "back") {
          await part("fern/heading/back").focus();
          await contactSheet(browser, page, `${prefix}-${label}`, () => page.keyboard.press("Space"));
        } else {
          await contactSheet(browser, page, `${prefix}-${label}`, action);
        }
      }
      if (!baseline) {
        await captureDose(prefix, preference);
        await captureCollections(prefix);
      }
    }
    expect(errors).toEqual([]);
  },
  180000,
);

it.runIf(Boolean(process.env.UI_MOTION_PERF))(
  "measures 390px frame cadence across the gallery journey",
  async () => {
    const samples = [];
    for (const [label, action] of scenes) {
      const { frames, droppedPercent } = await sampleMotionFrames(
        page,
        action,
        label === "submit-working-success" ? 1300 : 550,
      );
      samples.push({ label, frames, droppedPercent });
    }
    const worst = Math.max(...samples.map((sample) => sample.droppedPercent));
    console.log(JSON.stringify({ source: baseline ? "main" : "change", width: 390, worst, samples }));
    expect(errors).toEqual([]);
  },
);
