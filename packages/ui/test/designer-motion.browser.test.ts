import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import type { PartEntry } from "@lmthing/ui/kit";
import { galleryConfig } from "../scripts/look";
import { launchChrome } from "../scripts";
import { baselineMotionKit, contactSheet, releaseGallery, sampleMotionFrames } from "./motion-evidence";

type MotionLabWindow = Window & { motionLabParts?: () => PartEntry[] };
const baseline = process.env.UI_MOTION_BASELINE === "1";
const changed = it.runIf(!baseline && !process.env.UI_MOTION_EVIDENCE && !process.env.UI_MOTION_PERF);
let server: Pick<ViteDevServer, "resolvedUrls" | "close">, browser: Browser, page: Page;
const errors: string[] = [];
beforeAll(async () => {
  const config = { ...galleryConfig(0), plugins: baseline ? [baselineMotionKit()] : [] };
  if (process.env.UI_MOTION_PERF) server = await releaseGallery(config, baseline);
  else {
    const dev = await createServer(config);
    await dev.listen();
    server = dev;
  }
  browser = await launchChrome();
  page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.setDefaultTimeout(5000);
  page.on("pageerror", (error) => errors.push(error.message));
}, 60000);
afterAll(async () => {
  await browser?.close();
  await server?.close();
});
beforeEach(async () => {
  errors.length = 0;
  await openLab();
}, 30000);

async function openLab(
  motion: "no-preference" | "reduce" = "no-preference",
  profile: "calm" | "lively" = "lively",
) {
  await page.emulateMedia({ reducedMotion: motion });
  await page.goto(`${server.resolvedUrls!.local[0]}?motion-lab=${profile}`, {
    waitUntil: "domcontentloaded",
    timeout: 20000,
  });
  await page
    .getByText("My garden")
    .waitFor({ timeout: 15000 })
    .catch((cause) => {
      throw new Error(`The motion gallery did not render: ${errors.join("; ")}`, { cause });
    });
  await page.waitForFunction(() => Boolean(window.__lmthingUI));
}

const part = (address: string) => page.getByTestId(address);
const tap = (address: string) => part(address).click({ force: true });
const styleOf = (address: string, property: "transform" | "opacity") =>
  part(address).evaluate((node, name) => getComputedStyle(node)[name], property);
const scrollTopOf = (address: string, next?: number) =>
  part(address).evaluate((node, value) => {
    for (let frame = node.parentElement; frame; frame = frame.parentElement) {
      if (["auto", "scroll"].includes(getComputedStyle(frame).overflowY)) {
        if (value !== undefined) frame.scrollTop = value;
        return frame.scrollTop;
      }
    }
  }, next);

async function openRecord(preference: "no-preference" | "reduce") {
  await openMotion(preference, "record_arrive");
}

async function openMotion(preference: "no-preference" | "reduce", fixture: string) {
  await page.emulateMedia({ reducedMotion: preference });
  await page.goto(`${server.resolvedUrls!.local[0]}?motion=${fixture}`, {
    waitUntil: "domcontentloaded",
    timeout: 20000,
  });
  await part("dispatch/receipt/reference").waitFor({ timeout: 15000 });
  await page.waitForFunction(() => Boolean(window.__lmthingUI));
}

changed.each(["no-preference", "reduce"] as const)(
  "plays an explicit transition across remounted trees in %s",
  async (preference) => {
    await openMotion(preference, "navigation");
    await page.setViewportSize({ width: 390, height: 385 });
    try {
      await checkCrossTree(preference);
    } finally {
      await page.setViewportSize({ width: 390, height: 844 });
    }
  },
);

async function checkCrossTree(preference: "no-preference" | "reduce") {
  await page.evaluate(() => {
    const original = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      if (Array.isArray(frames) && frames[0] && "transform" in frames[0])
        document.body.dataset.transitions = `${document.body.dataset.transitions ?? ""}|${frames[0].transform}`;
      return original.call(this, frames, options);
    };
    const observer = new MutationObserver(() => {
      const title = document.querySelector('[data-testid="walk_notes/header/title"]');
      if (!title) return;
      observer.disconnect();
      let x = 0;
      for (let node: Element | null = title; node; node = node.parentElement) {
        const t = getComputedStyle(node).transform;
        if (t !== "none") x += new DOMMatrixReadOnly(t).m41;
      }
      document.body.dataset.firstScriptedX = String(x);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
  const moves = () => page.locator("body").getAttribute("data-transitions");
  const forward = preference === "reduce" ? "none" : "translateX(20px)";
  const reverse = preference === "reduce" ? "none" : "translateX(-20px)";
  const reference = "dispatch/receipt/reference";
  expect(await scrollTopOf(reference, 36)).toBe(36);
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  await tap("dispatch/next/root");
  await expect.poll(moves).toBe(`|${forward}`);
  const x = Number(await page.locator("body").getAttribute("data-first-scripted-x"));
  if (preference === "reduce") expect(x).toBe(0);
  else expect(x).toBeGreaterThan(0);
  expect(await part("walk_notes/header/sub").textContent()).toBe("TROT-92");
  await part("walk_notes/header/back").focus();
  await page.keyboard.press("Enter");
  await expect.poll(moves).toBe(`|${forward}|${reverse}`);
  expect(await part(reference).textContent()).toBe("TROT-92");
  expect(await scrollTopOf(reference)).toBe(36);
  await expect
    .poll(() => part("dispatch/next/root").evaluate((node) => node === document.activeElement))
    .toBe(true);
  expect(errors).toEqual([]);
}

changed("accents only an acknowledged handoff, without delaying the receipt or nav", async () => {
  await openRecord("no-preference");
  const phase = part("dispatch/receipt/phase");
  const ref = part("dispatch/receipt/reference");
  const next = part("dispatch/next/root");
  const mark = page.locator("[data-record-arrival]");
  expect(await phase.textContent()).toBe("Awaiting receipt");
  expect(await mark.count()).toBe(0);
  const origin = await ref.boundingBox();
  await page.evaluate(() => {
    const observer = new MutationObserver((changes) => {
      const added = changes.some((change) =>
        Array.from(change.addedNodes).some(
          (node) => node instanceof Element && node.matches("[data-record-arrival]"),
        ),
      );
      if (!added) return;
      document.body.dataset.recordArrived = "true";
      observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
  await next.focus();
  await page.keyboard.press("Enter");
  expect(await phase.textContent()).toBe("Received");
  expect(await ref.textContent()).toBe("TROT-92");
  expect(await ref.boundingBox()).toEqual(origin);
  expect(await page.locator("body").getAttribute("data-record-arrived")).toBe("true");
  expect(await next.evaluate((node) => document.activeElement === node)).toBe(true);
  await page.keyboard.press("Enter");
  await part("walk_notes/header/sub").waitFor();
  await tap("walk_notes/header/back");
  expect(await phase.textContent()).toBe("Received");
  expect(await mark.count()).toBe(0);
});

changed("cuts the arrival in reduced motion and leaves a returned record quiet", async () => {
  await openRecord("reduce");
  await tap("dispatch/next/root");
  expect(await part("dispatch/receipt/phase").textContent()).toBe("Received");
  expect(await page.locator("[data-record-arrival]").count()).toBe(0);
  await openRecord("no-preference");
  await tap("dispatch/return/root");
  expect(await part("dispatch/receipt/phase").textContent()).toBe("Returned");
  expect(await page.locator("[data-record-arrival]").count()).toBe(0);
  await tap("dispatch/next/root");
  expect(await part("pickup_time/header/sub").textContent()).toContain("TROT-92");
  await tap("pickup_time/add/root");
  expect(await part("dispatch/receipt/phase").textContent()).toBe("Awaiting receipt");
  expect(await part("dispatch/receipt/summary").textContent()).toContain("13:43 UTC");
  expect(await page.locator("[data-record-arrival]").count()).toBe(0);
});

changed.each(["calm", "lively"] as const)("paints the first working frame in %s", async (profile) => {
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      const title = document.querySelector('[data-testid="garden/heading/title"]');
      const button = document.querySelector('[data-testid="garden/nav/r2/root"]');
      if (!title || !button) return;
      observer.disconnect();
      const opacity = (node: Element) => {
        let alpha = 1;
        for (let parent: Element | null = node; parent; parent = parent.parentElement)
          alpha *= Number(getComputedStyle(parent).opacity);
        return alpha;
      };
      document.body.dataset.firstMotionFrame = JSON.stringify([opacity(title), opacity(button)]);
    });
    observer.observe(document, { subtree: true, childList: true });
  });
  for (const preference of ["no-preference", "reduce"] as const) {
    await openLab(preference, profile);
    expect(await page.locator("body").getAttribute("data-first-motion-frame")).toBe("[1,1]");
  }
});

changed("does not replay or arm insertion when a mounted group crosses the stagger cutoff", async () => {
  await page.goto(`${server.resolvedUrls!.local[0]}?motion=insertions`, { timeout: 20000 });
  const control = part("route_notes/advance/root");
  await page.waitForFunction(() => Boolean(window.__lmthingUI));
  const firstFrame = () =>
    control.evaluate(async (button) => {
      (button as HTMLElement).click();
      await new Promise(requestAnimationFrame);
      const offset = (id: string) => {
        let y = 0;
        const text = document.querySelector(`[data-testid="route_notes/${id}/text"]`);
        for (let node = text; node; node = node.parentElement) {
          const transform = getComputedStyle(node).transform;
          if (transform !== "none") y += new DOMMatrixReadOnly(transform).m42;
        }
        return y;
      };
      return [offset("early"), offset("late")];
    });
  const [early, late] = await firstFrame();
  expect(early).toBeGreaterThan(0);
  expect(late).toBe(0);
  await page.waitForTimeout(750);
  expect(await firstFrame()).toEqual([0, 0]);
  expect(await firstFrame()).toEqual([0, 0]);
});

changed("restores keyboard focus on Back even while the push is still running", async () => {
  const origin = part("garden/plants/r1/root");
  const top = (next?: number) => scrollTopOf("garden/plants/r1/root", next);
  await origin.focus();
  expect(await top(36)).toBe(36);
  await page.waitForTimeout(60); // Deliver the native scroll event, then interrupt Back rather than the scroll.
  await tap("garden/plants/r1/root");
  const back = part("fern/heading/back");
  await back.focus();
  await page.keyboard.press("Enter");
  await expect
    .poll(() => origin.evaluate((node) => document.activeElement === node), { timeout: 6000 })
    .toBe(true);
  expect(await top()).toBe(36);
  expect(await page.locator("[data-kit-outgoing-tab]").count()).toBe(0);
});

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

changed("connects a matching row to its header, shows a rising dialog, and returns back", async () => {
  await tap("garden/plants/r1/root");
  await part("fern/heading/title").waitFor();
  expect((await transforms("fern/heading/title")).some((value) => String(value).includes("translate("))).toBe(
    true,
  );
  await tap("fern/heading/action");
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  expect(await dialog.evaluate((node) => getComputedStyle(node).transform)).not.toBe("none");
  await expect
    .poll(
      () =>
        dialog.evaluate((node) => {
          const transform = getComputedStyle(node).transform;
          return transform === "none" || new DOMMatrixReadOnly(transform).m42 === 0;
        }),
      { timeout: 6000 },
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
});

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
    await page.mouse.wheel(0, -900);
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
  await expect.poll(() => part("garden/plants/r2/trail").getAttribute("aria-checked")).toBe("true");
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

it.runIf(Boolean(process.env.UI_MOTION_EVIDENCE))("renders contact sheets of each motion", async () => {
  for (const [label, action] of scenes) {
    await contactSheet(browser, page, `${baseline ? "before" : "after"}-${label}`, action);
  }
  expect(errors).toEqual([]);
});

it.runIf(Boolean(process.env.UI_MOTION_EVIDENCE))(
  "captures normal and reduced handoff evidence",
  async () => {
    const prefix = baseline ? "before" : "after";
    for (const preference of ["no-preference", "reduce"] as const) {
      const mode = preference === "reduce" ? "reduced" : "normal";
      await openRecord(preference);
      await contactSheet(browser, page, `${prefix}-handoff-${mode}-acknowledge`, async () => {
        if (baseline) return tap("dispatch/next/root");
        await part("dispatch/next/root").focus();
        await page.keyboard.press("Enter");
      });
      await contactSheet(browser, page, `${prefix}-handoff-${mode}-review`, () => tap("dispatch/next/root"));
      await contactSheet(browser, page, `${prefix}-handoff-${mode}-back`, () =>
        tap("walk_notes/header/back"),
      );
      await openRecord(preference);
      await contactSheet(browser, page, `${prefix}-handoff-${mode}-return`, () =>
        tap("dispatch/return/root"),
      );
      await contactSheet(browser, page, `${prefix}-handoff-${mode}-pickup`, () => tap("dispatch/next/root"));
      await contactSheet(browser, page, `${prefix}-handoff-${mode}-resubmit`, () =>
        tap("pickup_time/add/root"),
      );
      await openMotion(preference, "navigation");
      await contactSheet(browser, page, `${prefix}-cross-tree-${mode}-push`, () => tap("dispatch/next/root"));
      await contactSheet(browser, page, `${prefix}-cross-tree-${mode}-back`, () =>
        tap("walk_notes/header/back"),
      );
    }
    expect(errors).toEqual([]);
  },
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
