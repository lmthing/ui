import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import type { PartEntry } from "@lmthing/ui/kit";
import { galleryConfig } from "../scripts/look";
import { launchChrome } from "../scripts";
import { baselineMotionKit, contactSheet, motionEvidenceFolder, sampleMotionFrames } from "./motion-evidence";
import { releaseGallery } from "./release-gallery";

type MotionLabWindow = Window & { motionLabParts?: () => PartEntry[]; firstHeadingOpacity?: number };
const baseline = process.env.UI_MOTION_BASELINE === "1";
const changed = it.runIf(!baseline && !process.env.UI_MOTION_EVIDENCE && !process.env.UI_MOTION_PERF);
let server: Awaited<ReturnType<typeof releaseGallery>>, browser: Browser, page: Page;
let starting: Promise<void> | undefined;
const setup = new AbortController();
const errors: string[] = [];
beforeAll(() => (starting = startGallery()), 150000);
async function startGallery() {
  const config = { ...galleryConfig(0), plugins: baseline ? [baselineMotionKit()] : [] };
  server = await releaseGallery(config, setup.signal);
  setup.signal.throwIfAborted();
  browser = await launchChrome();
  setup.signal.throwIfAborted();
  page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.setDefaultTimeout(25000);
  page.on("pageerror", (error) => errors.push(error.message));
}
afterAll(async () => {
  setup.abort();
  await starting?.catch(() => undefined); // The setup hook reports errors; wait for its cleanup.
  try {
    await browser?.close();
  } finally {
    await server?.close();
  }
}, 150000);
beforeEach(async () => {
  errors.length = 0;
  await openLab();
}, 45000);

async function openLab(
  motion: "no-preference" | "reduce" = "no-preference",
  profile: "calm" | "lively" = process.env.UI_MOTION_EVIDENCE || process.env.UI_MOTION_PERF
    ? "calm"
    : "lively",
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

changed.each(["no-preference", "reduce"] as const)(
  "plays every scripted kind inside one phone in %s",
  async (preference) => {
    await openMotion(preference, "journey");
    const phone = page.locator("[data-journey-phone]");
    const keys = await phone.evaluateHandle((node) => node.firstElementChild);
    const step = (name: string) => page.getByRole("button", { name, exact: true }).click({ force: true });
    await watchJourney();
    await step("Open walk notes");
    await part("walk_notes/header/sub").waitFor();
    expect(await part("walk_notes/header/back").count()).toBe(0);
    await page.getByRole("button", { name: "Show route sheet", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect.poll(() => page.getByRole("dialog", { name: "Canal route details" }).count()).toBe(1);
    expect(await page.getByRole("dialog").getByRole("button").count()).toBe(0);
    expect(await page.evaluate(() => window.__lmthingUI === undefined)).toBe(true);
    expect(await page.evaluate(() => document.activeElement?.textContent)).toBe("Close route sheet");
    await step("Close route sheet");
    expect(await page.getByRole("dialog").count()).toBe(0);
    await step("Back to outbox");
    await part("dispatch/receipt/reference").waitFor();
    await step("Switch to inbox");
    await part("inbox/receipt/reference").waitFor();
    await step("Show review dialog");
    await expect.poll(() => page.getByRole("dialog", { name: "Review TROT-92 handoff" }).count()).toBe(1);
    await step("Dismiss review dialog");
    expect(await page.getByRole("dialog").count()).toBe(0);
    await step("Acknowledge TROT-92");
    expect(await part("receiving/receipt/reference").textContent()).toBe("TROT-92");
    expect(await part("receiving/receipt/phase").textContent()).toBe("Received");
    expect(await phone.evaluate((node, first) => node.firstElementChild === first, keys)).toBe(true);
    const marks = await page.locator("body").getAttribute("data-journey-marks");
    const animated = [
      "data-screen-overlay-exiting:sheet",
      "data-screen-overlay-exiting:modal",
      "data-kit-outgoing-tab:",
      "data-record-arrival:",
    ];
    for (const mark of animated)
      if (preference === "reduce") expect(marks).not.toContain(mark);
      else expect(marks).toContain(mark);
    expect(await page.locator("body").getAttribute("data-active-ghost")).toBeNull();
    expect(errors).toEqual([]);
  },
);

function watchJourney() {
  return page.evaluate(() => {
    const seen = new Set<string>();
    const tags = [
      "data-screen-overlay",
      "data-screen-overlay-exiting",
      "data-kit-outgoing-tab",
      "data-record-arrival",
    ];
    new MutationObserver((changes) => {
      for (const change of changes) {
        for (const node of change.type === "attributes" ? [change.target] : Array.from(change.addedNodes)) {
          if (!(node instanceof Element)) continue;
          for (const tag of tags) {
            const marked = node.hasAttribute(tag) ? node : node.querySelector(`[${tag}]`);
            if (marked) seen.add(`${tag}:${marked.getAttribute(tag)}`);
            if (
              marked &&
              tag === "data-screen-overlay-exiting" &&
              (!marked.hasAttribute("inert") || marked.querySelector("[data-testid]:not([data-testid=''])"))
            )
              document.body.dataset.activeGhost = "true";
          }
        }
      }
      document.body.dataset.journeyMarks = [...seen].join(";");
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: tags });
  });
}

changed("reverses a half-open scripted sheet from its current pose", async () => {
  await openMotion("no-preference", "journey");
  const click = (name: string) =>
    page.getByRole("button", { name, exact: true }).evaluate((button) => (button as HTMLElement).click());
  await click("Open walk notes");
  await part("walk_notes/header/sub").waitFor();
  await page.clock.install({ time: 10000 });
  await page.clock.pauseAt(11000);
  try {
    await click("Show route sheet");
    await page.clock.runFor(48);
    const before = Number(await page.getByRole("dialog").evaluate((node) => getComputedStyle(node).opacity));
    expect(before).toBeGreaterThan(0);
    expect(before).toBeLessThan(1);
    await click("Close route sheet");
    const visual = page.locator("[data-screen-overlay-exiting=sheet] > :last-child");
    const pose = async () => Number(await visual.evaluate((node) => getComputedStyle(node).opacity));
    expect(await pose()).toBeCloseTo(before, 3);
    await page.clock.runFor(48);
    expect(await pose()).toBeLessThan(before);
    await page.clock.runFor(150);
    expect(await visual.count()).toBe(0);
  } finally {
    await page.clock.resume();
  }
});

async function openMotion(preference: "no-preference" | "reduce", fixture: string) {
  await page.emulateMedia({ reducedMotion: preference });
  await page.goto(`${server.resolvedUrls!.local[0]}?motion=${fixture}`, {
    waitUntil: "domcontentloaded",
    timeout: 20000,
  });
  await part("dispatch/receipt/reference").waitFor({ timeout: 15000 });
  if (fixture !== "journey") await page.waitForFunction(() => Boolean(window.__lmthingUI));
}

changed("cuts round-two screen navigation without suppressing human Back press feedback", async () => {
  await page.goto(`${server.resolvedUrls!.local[0]}?nav-shell=round2_record`);
  await part("round2_record/detail/root").click();
  const back = part("round2_record_staff/h1/back");
  const bounds = (await back.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  try {
    await expect
      .poll(() => back.evaluate((node) => new DOMMatrix(getComputedStyle(node).transform).a))
      .toBeLessThan(1);
  } finally {
    await page.mouse.up();
  }
  await part("round2_record/detail/root").waitFor();
});

changed.each(["no-preference", "reduce"] as const)(
  "plays an explicit transition across remounted trees in %s",
  async (preference) => {
    await openMotion(preference, "navigation");
    await page.setViewportSize({ width: 390, height: 340 });
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
  const reference = "dispatch/receipt/reference";
  await part("dispatch/next/root").evaluate((button) => {
    const receipt = document.querySelector('[data-testid="dispatch/receipt/reference"]');
    let viewport = receipt?.parentElement;
    while (viewport && !["auto", "scroll"].includes(getComputedStyle(viewport).overflowY))
      viewport = viewport.parentElement;
    if (!viewport) throw new Error("No source viewport");
    viewport.scrollTop = 36;
    if (viewport.scrollTop !== 36) throw new Error("The test did not scroll the source viewport");
    (button as HTMLElement).click();
  });
  await part("walk_notes/header/sub").waitFor();
  await expect.poll(moves).toBe(preference === "reduce" ? null : "|translateX(20px)");
  const x = Number(await page.locator("body").getAttribute("data-first-scripted-x"));
  if (preference === "reduce") expect(x).toBe(0);
  else expect(x).toBeGreaterThan(0);
  expect(await part("walk_notes/header/sub").textContent()).toBe("TROT-92");
  expect(await part("walk_notes/header/back").evaluate((node) => node === document.activeElement)).toBe(true);
  await page.keyboard.press("Enter");
  await part(reference).waitFor();
  await expect.poll(moves).toBe(preference === "reduce" ? null : "|translateX(20px)|translateX(-20px)");
  expect(await part(reference).textContent()).toBe("TROT-92");
  expect(await scrollTopOf(reference)).toBe(36);
  await expect
    .poll(() => part("dispatch/next/root").evaluate((node) => node === document.activeElement))
    .toBe(true);
  expect(errors).toEqual([]);
}

changed("restores the same control on two scripted returns to an already mounted phone", async () => {
  await openMotion("no-preference", "navigation_mounted");
  const next = part("dispatch/next/root");
  const node = await next.elementHandle();
  for (let index = 0; index < 2; index++) {
    await next.focus();
    await page.keyboard.press("Enter");
    expect(await part("walk_notes/header/back").evaluate((back) => back === document.activeElement)).toBe(
      true,
    );
    await page.keyboard.press("Enter");
    await expect.poll(() => node!.evaluate((button) => button === document.activeElement)).toBe(true);
  }
});

changed("does not restore scripted agent focus on a later render", async () => {
  await openMotion("no-preference", "navigation_agent");
  await tap("dispatch/next/root");
  expect(await part("walk_notes/header/back").evaluate((node) => node === document.activeElement)).toBe(
    false,
  );
  await tap("walk_notes/header/back");
  await part("dispatch/receipt/reference").waitFor();
  await page.evaluate(async () => {
    window.dispatchEvent(new Event("resize"));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
});

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
  expect(await part("pickup_time/add/root").textContent()).toBe("Send 13:43 UTC pickup");
  await tap("pickup_time/add/root");
  expect(await part("dispatch/receipt/phase").textContent()).toBe("Awaiting receipt");
  expect(await part("dispatch/receipt/summary").textContent()).toContain("13:43 UTC");
  expect(await part("dispatch/receipt/time").textContent()).toContain("2:21 PM UTC");
  expect(await page.locator("[data-record-arrival]").count()).toBe(0);
  await tap("dispatch/next/root");
  expect(await part("dispatch/receipt/phase").textContent()).toBe("Received");
  expect(await part("dispatch/receipt/summary").textContent()).toContain("13:43 UTC");
  expect(await part("dispatch/receipt/time").textContent()).toContain("2:25 PM UTC");
  await tap("dispatch/next/root");
  expect(await part("walk_notes/header/sub").textContent()).toBe("TROT-92");
  expect(await page.getByText("13:43 UTC", { exact: true }).textContent()).toBe("13:43 UTC");
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
  await page.waitForFunction(() => Boolean(window.__lmthingUI), { timeout: 20000 });
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
  await expectWholeTabWords();
});

async function expectWholeTabWords() {
  const labels = page.getByRole("tab").locator('[data-testid$="/label"]');
  expect(
    await labels.evaluateAll((nodes) =>
      nodes.flatMap((node) => {
        const text = node.firstChild;
        if (!text || text.nodeType !== Node.TEXT_NODE) throw new Error("Expected a tab label");
        return [...(text.textContent ?? "").matchAll(/\S+/g)].flatMap((word) => {
          const range = document.createRange();
          range.setStart(text, word.index);
          range.setEnd(text, word.index + word[0].length);
          return range.getClientRects().length === 1 ? [] : [word[0]];
        });
      }),
    ),
  ).toEqual([]);
}

changed("reflows the tab rail when all five labels use large text", async () => {
  await openAccess("reduce");
  await page.addStyleTag({
    content:
      '[role="tab"] [data-testid$="/label"] {font-size: 36px !important; line-height: 44px !important;}',
  });
  await expectWholeTabWords();
  const tabs = page.getByRole("tab");
  const rects = await tabs.evaluateAll((nodes) =>
    nodes.map((node) => {
      const { x, y, width, height } = node.getBoundingClientRect();
      return { x, y, width, height };
    }),
  );
  expect(new Set(rects.map(({ y }) => y)).size).toBeGreaterThan(1);
  for (const { x, width, height } of rects) {
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x + width).toBeLessThanOrEqual(390);
    expect(Math.min(width, height)).toBeGreaterThanOrEqual(44);
  }
  const save = part("controls/button/root");
  await save.scrollIntoViewIfNeeded();
  expect((await save.boundingBox())!.y + (await save.boundingBox())!.height).toBeLessThanOrEqual(
    (await page.getByRole("tablist").boundingBox())!.y,
  );
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
  const complete = page.getByRole("status").filter({ hasText: "No cards left to review" });
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
  expect(await page.getByText("Make your choice.").count()).toBe(0);
});

async function turnCarousel(label: "Next" | "Previous", key: string) {
  const trigger = page.getByRole("button", { name: label, exact: true });
  const frame = await trigger.evaluateHandle((node) => {
    const gallery = node.closest('[data-testid="controls/photos/root"]');
    const strip = gallery?.querySelector<HTMLElement>('[style*="scroll-snap-type"]');
    const previous = gallery?.querySelector('[aria-label="Previous"]');
    const next = gallery?.querySelector('[aria-label="Next"]');
    if (!strip || !previous || !next) throw new Error("Expected the interactive photo strip");
    const initial = strip.scrollLeft;
    const first = new Promise<{ previousDisabled: boolean; nextDisabled: boolean }>((resolve) => {
      node.addEventListener(
        "keydown",
        () => {
          function sample() {
            if (Math.abs(strip!.scrollLeft - initial) < 1) return void requestAnimationFrame(sample);
            resolve({
              previousDisabled: previous?.getAttribute("aria-disabled") === "true",
              nextDisabled: next?.getAttribute("aria-disabled") === "true",
            });
          }
          requestAnimationFrame(sample);
        },
        { once: true },
      );
    });
    return { first };
  });
  try {
    await trigger.press(key);
    return await frame.evaluate(({ first }) => first);
  } finally {
    await frame.dispose();
  }
}

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
    expect(await turnCarousel("Next", "Enter")).toEqual({ previousDisabled: false, nextDisabled: true });
    await expect.poll(() => next.getAttribute("aria-disabled")).toBe("true");
    expect(await turnCarousel("Previous", "Space")).toEqual({ previousDisabled: true, nextDisabled: false });
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
  await row.evaluate((node) => {
    const original = node.animate;
    node.animate = function (frames, options) {
      this.setAttribute("data-test-flight", JSON.stringify(frames));
      return original.call(this, frames, options);
    };
    document.querySelector<HTMLElement>('[data-testid="garden/today/link"]')!.click();
  });
  const delta = resized.top - (await layout()).top;
  expect(await row.getAttribute("data-test-flight")).toContain(`translateY(${delta}px)`);
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
    await part("fern/save/root").getByRole("progressbar", { name: "Loading" }).waitFor();
    await part("fern/done/title").waitFor();
    expect(await part("fern/done/title").textContent()).toBe("Watering logged");
    const check = part("fern/done/icon").locator("path");
    await expect.poll(() => check.getAttribute("stroke-dashoffset")).toBe(null);
    expect(errors).toEqual([]);
  },
);

changed.each(["no-preference", "reduce"] as const)(
  "withholds the pending save and focuses its receipt (%s)",
  async (preference) => {
    await openLab(preference);
    await tap("garden/plants/r1/root");
    await part("fern/save/root").press("Enter");
    const pending = part("fern/save/root");
    await pending.getByRole("progressbar", { name: "Loading" }).waitFor();
    expect(await pending.getByRole("button").count()).toBe(0);
    expect(
      await page.evaluate(
        () => window.__lmthingUI!.act({ address: "fern/save/root", action: "press" }, { dryRun: true }).ok,
      ),
    ).toBe(false);
    await part("fern/done/title").waitFor();
    await expect.poll(() => focused("fern/done/title")).toBe(true);
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
  await part("controls/button/root").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${motionEvidenceFolder}/${prefix}-access-large.png` });
  await styling.evaluate((node) => node.parentNode?.removeChild(node));
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
