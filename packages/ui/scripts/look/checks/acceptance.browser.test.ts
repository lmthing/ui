import { afterAll, beforeAll, expect, it } from "vitest";
import type { Browser } from "playwright-core";
import { bundleChecks, launchChrome } from "..";
import type { LookIssue } from ".";

let browser: Browser;
let bundle: string;
beforeAll(async () => {
  bundle = await bundleChecks();
  browser = await launchChrome();
});
afterAll(async () => browser?.close());

const testId = (part: string) => `data-testid="screen/c1/${part}"`;
async function issues(kind: string, html: string, frame = "fixture_calm_light_0_filled", width = 390) {
  const page = await browser.newPage();
  try {
    await page.setContent(`<style>
        body { font: 16px/1.3 Arial; --accent: #3e6d30; --accentSoft: #bee8bb;
          --good: #137500; --goodSoft: #deffdd; --bad: #ac0000 }
        [data-look-frame] { width: ${width}px }
        p, h2, dl, dd, ul { margin: 0 }
      </style><main data-look-frame="${frame}">${html}</main>`);
    await page.addScriptTag({ content: bundle });
    const found: LookIssue[] = await page.evaluate(() => window.lookChecks.find());
    return found.filter((issue) => issue.kind === kind);
  } finally {
    await page.close();
  }
}

it("reports a label/value pair farther apart than the next group", async () => {
  const rows = (within: number) => `<div>
    <div ${testId("r1/label")}>Balance</div>
    <div ${testId("r1/value")} style="margin-top: ${within}px">52</div>
    <div ${testId("r2/label")} style="margin-top: 12px">Credit</div>
    <div ${testId("r2/value")}>28</div>
  </div>`;
  expect(await issues("group-rhythm", rows(20))).toMatchObject([
    { part: "r1/label", detail: expect.stringMatching(/r1\/label.*r1\/value.*20px.*12px.*r2\/label/) },
  ]);
  expect(await issues("group-rhythm", rows(8))).toEqual([]);
});

it("measures a nested shift time by its containing line box", async () => {
  const frame = "shift_calm_light_0_filled";
  const shift = (gap: number) => `<main>
    <div style="font-size:40px;line-height:40px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">
      <span ${testId("from")}>07:00</span>–<span>12:00</span>
    </div>
    <div ${testId("date")} style="margin-top:${gap}px">16 Nov</div>
    <div ${testId("role")} style="margin-top:8px">Morning care</div>
  </main>`;
  expect(await issues("group-rhythm", shift(12), frame)).toMatchObject([
    { part: "date", detail: expect.stringMatching(/date.*from.*12px.*8px.*role/) },
  ]);
  expect(await issues("group-rhythm", shift(4), frame)).toEqual([]);
  expect(await issues("clipped", shift(12), frame)).toEqual([]);
});

it("counts visible text sizes per item, including its action label", async () => {
  const item = (labelSize: number) => `<article ${testId("r1/root")}>
    <p ${testId("r1/title")} style="font-size:20px">Expense</p>
    <p ${testId("r1/amount")} style="font-size:17px">24</p>
    <p ${testId("r1/note")} style="font-size:16px">Receipt</p>
    <button ${testId("r1/approve")} style="font-size:${labelSize}px">Approve</button>
    <p style="opacity:0;font-size:40px">Hidden</p>
  </article><article ${testId("r2/root")} style="font-size:36px">Another item</article>`;
  expect(await issues("type-sizes", item(13))).toMatchObject([
    { part: "r1/approve", detail: expect.stringMatching(/4 type sizes.*title.*amount.*note.*approve/) },
  ]);
  expect(await issues("type-sizes", item(16))).toEqual([]);
});

it("compares the visible digit edges, not the edges of equal-width cells", async () => {
  const table = (
    align: string,
  ) => `<table style="width:100%;text-align:${align};font-variant-numeric:tabular-nums">
    <tr><th>Day</th><th>Hours</th><th>Pay</th></tr>
    <tr><th>Monday</th><td ${testId("r1/hours")}>7</td><td>$900</td></tr>
    <tr><th>Tuesday</th><td ${testId("r2/hours")}>10.5</td><td>$900</td></tr>
  </table>`;
  expect(await issues("numeric-align", table("center"))).toMatchObject([
    { part: "r1/hours", detail: expect.stringMatching(/column 2.*r1\/hours.*r2\/hours.*right edge/) },
  ]);
  expect(await issues("numeric-align", table("right"))).toEqual([]);
  expect(
    await issues("numeric-align", `<table><tr><td><span>7</span> / <span>10</span></td></tr></table>`),
  ).toEqual([]);
});

it("finds positive foreground or fill on a negative action, not on Approve", async () => {
  const actions = (foreground: string, background = "transparent") => `
    <button ${testId("r1/decline")} style="background:${background}">
      <span style="color:${foreground}" ${testId("r1/decline_label")}>Decline</span>
    </button><button ${testId("r1/approve")} style="color:var(--accent)">Approve</button>`;
  expect(await issues("action-tone", actions("var(--accent)"))).toMatchObject([
    { part: "r1/decline", detail: expect.stringMatching(/Decline.*positive accent color/) },
  ]);
  expect(await issues("action-tone", actions("black", "var(--goodSoft)"))).toMatchObject([
    { part: "r1/decline", detail: expect.stringMatching(/Decline.*positive goodSoft color/) },
  ]);
  expect(await issues("action-tone", actions("var(--bad)"))).toEqual([]);
});

it("distinguishes canceling a booking from dismissing a dialog", async () => {
  const cancel = (copy: string) => `<button ${testId("cancel")} style="color:var(--accent)">${copy}</button>`;
  expect(await issues("action-tone", cancel("Cancel"))).toEqual([]);
  expect(await issues("action-tone", cancel("Cancel booking"))).toMatchObject([{ part: "cancel" }]);
  expect(await issues("action-tone", cancel("Cancel"), "appointment_calm_light_0_filled")).toMatchObject([
    { part: "cancel" },
  ]);
});

it("detects an ellipsis, line clamp and a partially visible scrolling label at 390px", async () => {
  const content = (clipped: boolean) => `<div ${testId("title")}
      style="overflow:hidden;white-space:nowrap;text-overflow:ellipsis;width:${clipped ? 70 : 350}px">
      The complete meaningful heading
    </div><div ${testId("summary")} style="width:120px;overflow:hidden;display:-webkit-box;
      -webkit-box-orient:vertical;-webkit-line-clamp:${clipped ? 1 : 5}">
      This summary wraps across several lines of readable text.
    </div><div style="overflow-x:auto;width:180px">
      <div style="display:flex;width:max-content">
        <div style="width:${clipped ? 160 : 180}px">Fully visible</div>
        <div style="width:150px" ${testId("next")}>Next scrolling item</div>
      </div>
    </div>`;
  expect(await issues("clipped", content(true))).toMatchObject([
    { part: "title", detail: expect.stringMatching(/title.*ellipsis.*390px/) },
    { part: "summary", detail: expect.stringMatching(/summary.*line clamp.*390px/) },
    { part: "next", detail: expect.stringMatching(/next.*clipped horizontally.*390px/) },
  ]);
  expect(await issues("clipped", content(false))).toEqual([]);
});

it("checks the phone edge and labels in zero-width boxes", async () => {
  const content = (clipped: boolean) => `<style>[data-look-frame] {height:${clipped ? 55 : 200}px}</style>
    <article style="margin-left:${clipped ? 350 : 100}px;white-space:nowrap">
      <div ${testId("edge")}>A label at the right edge</div>
    </article><div ${testId("collapsed")} style="overflow:hidden;white-space:nowrap;width:${clipped ? 0 : 200}px">
      Collapsed label
    </div><p style="padding-top:10px" ${testId("bottom")}>A label at the bottom edge</p>`;
  expect(await issues("clipped", content(true))).toMatchObject([
    { part: "edge", detail: expect.stringMatching(/clipped horizontally/) },
    { part: "collapsed", detail: expect.stringMatching(/clipped horizontally/) },
    { part: "bottom", detail: expect.stringMatching(/clipped vertically/) },
  ]);
  expect(await issues("clipped", content(false))).toEqual([]);
});

it("keeps the first named item near its heading", async () => {
  const group = (gap: number, heading = "r1/group") => `<div ${testId(heading)}>Care</div>
    <div ${testId("r1/root")} style="padding-top:${gap}px">
      <p ${testId("r1/name")}>Plant care visit</p>
    </div>`;
  expect(await issues("heading-gap", group(32))).toMatchObject([
    { part: "r1/group", detail: expect.stringMatching(/r1\/group.*32px.*r1\/root.*Plant care/) },
  ]);
  expect(await issues("heading-gap", group(24))).toEqual([]);
  expect(await issues("heading-gap", group(32, "heading"))).toMatchObject([
    { part: "heading", detail: expect.stringMatching(/32px.*r1\/root/) },
  ]);
  expect(await issues("heading-gap", group(24, "heading"))).toEqual([]);
  const semantic = (gap: number) => `<h2 ${testId("heading")}>Care</h2>
    <ul style="padding-top:${gap}px"><li>Plant care visit</li></ul>`;
  expect(await issues("heading-gap", semantic(32))).toMatchObject([
    { part: "heading", detail: expect.stringMatching(/32px.*Plant care/) },
  ]);
  expect(await issues("heading-gap", semantic(24))).toEqual([]);
});

it("checks neutral copy only in documented empty states", async () => {
  const line = (copy: string) => `<p ${testId("message")}>${copy}</p>`;
  expect(await issues("empty-copy", line("Nothing here yet"), "approval_calm_light_0_empty")).toMatchObject([
    { part: "message", detail: expect.stringMatching(/message.*neutral line.*requests waiting/) },
  ]);
  expect(
    await issues("empty-copy", line("No requests awaiting a decision"), "approval_calm_light_0_empty"),
  ).toEqual([]);
  expect(await issues("empty-copy", line("Nothing here yet"), "list_calm_light_0_empty")).toEqual([]);
  expect(await issues("empty-copy", line("Nothing here yet"), "approval_calm_light_0_success")).toEqual([]);
});
