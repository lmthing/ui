import { expect, test } from "vitest";
import {
  checkFlowPreview,
  components,
  fillFlow,
  flowPreviewScreen,
  flowTemplates,
} from "@lmthing/ui/catalog";

const outcomes = {
  book_slot: ["guest/rescheduled", "guest/cancelled"],
  invite_accept: ["inviter/joined"],
  request_approve: ["requester/approved", "requester/rejected"],
  order_track: ["customer/delivered"],
  report_issue: ["reporter/resolved"],
  check_in: ["attendee/arrived"],
  pay_receipt: ["payer/receipt"],
  signup_onboard: ["member/ready"],
  login_recovery: ["member/signed_in"],
  class_waitlist: ["member/booked", "member/left"],
  assign_work_order: ["requester/closed"],
  lead_to_client: ["owner/client", "prospect/declined"],
};

test("the full catalog exposes the named core and pack templates", () => {
  expect(flowTemplates.list.map(({ id }) => id)).toEqual(Object.keys(outcomes));
});

test("a released class spot has just the Waitlist review link and loses it when expired", () => {
  const template = flowTemplates.get("class_waitlist")!;
  const flow = fillFlow(template, {
    names: template.examples[0]!.names,
    record: template.examples[0]!.record,
  });
  const offer = flow.frames.findIndex(({ key }) => key === "member/offer");
  const review = flow.frames.findIndex(({ key }) => key === "member/review");
  const screen = flowPreviewScreen(flow, offer);
  expect(screen.components.filter(({ goto }) => goto)).toMatchObject([
    { c: "Waitlist", respondBy: "Thu at 5:00 PM", goto: flowPreviewScreen(flow, review).id },
  ]);
  const expired = flowPreviewScreen(flow, offer, "error");
  expect(expired.components.some(({ c, goto }) => c === "Waitlist" || goto)).toBe(false);
  expect(expired.components).toContainEqual(
    expect.objectContaining({ text: "This offer expired. You have not been booked." }),
  );
});

test("the proposal hand-off keeps the same record and only accepted proposals reach conversion", () => {
  const template = flowTemplates.get("lead_to_client")!;
  const flow = fillFlow(template, {
    names: template.examples[0]!.names,
    record: template.examples[0]!.record,
  });
  const frame = (key: string) => flow.frames.find((step) => step.key === key)!;
  expect(frame("owner/proposal").forward[0]?.target).toBe("prospect/review");
  expect(frame("prospect/accept").forward[0]?.target).toBe("owner/convert");
  expect(frame("prospect/decline").forward[0]?.target).toBe("prospect/declined");
  expect(frame("prospect/declined").forward).toEqual([]);
  for (const key of ["owner/proposal", "prospect/review", "owner/convert", "owner/client"])
    expect(frame(key).see).toContain(String(flow.record.reference));
});

test("login and password recovery require verification, never bind secrets, and end at member content", () => {
  const template = flowTemplates.get("login_recovery")!;
  const { id: _id, ...sample } = template.examples[0]!;
  const flow = fillFlow(template, sample);
  const targets = (key: string) =>
    flow.frames.find((frame) => frame.key === `member/${key}`)!.forward.map(({ target }) => target);
  expect(targets("login")).toEqual(["member/verify", "member/recover"]);
  expect(targets("recover")).toEqual(["member/recovery_verify"]);
  expect(targets("recovery_verify")).toEqual(["member/reset"]);
  expect(targets("reset")).toEqual(["member/login_after_reset"]);
  expect(targets("login_after_reset")).toEqual(["member/verify"]);
  expect(targets("verify")).toEqual(["member/signed_in"]);
  expect(flow.journeys[0]!.steps.every(({ tier }) => tier === "service")).toBe(true);
  expect(Object.keys(flow.record)).toEqual(["account_email", "member_area", "next_up"]);
  expect(() => fillFlow(template, { ...sample, record: { ...sample.record, code: "000000" } })).toThrow(
    "Unknown record field code",
  );
  for (const [index, frame] of flow.frames.entries()) {
    const fields = flowPreviewScreen(flow, index).components.filter(({ c }) => c === "Field");
    expect(fields.every(({ id, value }) => id.startsWith("demo_") && value === undefined)).toBe(true);
    if (frame.states.includes("error")) {
      expect(flowPreviewScreen(flow, index, "error").components.some(({ goto }) => goto)).toBe(false);
    }
  }
  const login = flowPreviewScreen(flow, 0);
  expect(login.components.filter(({ c }) => c === "Button")).toMatchObject([
    { label: "Log in" },
    { label: "Forgot password?", emphasis: "quiet" },
  ]);
  const home = flowPreviewScreen(flow, flow.frames.length - 1);
  expect(home).toMatchObject({
    title: "Class schedule",
    components: expect.arrayContaining([
      { id: "facts", c: "KeyValue", pairs: [{ label: "Next up", value: "Tuesday pottery" }] },
    ]),
  });
});

test.each(flowTemplates.list)(
  "$id examples reach all required outcomes and render valid screens",
  (template) => {
    const expected = outcomes[template.id as keyof typeof outcomes];
    for (const { id: _id, ...sample } of template.examples) {
      const flow = fillFlow(template, sample);
      expect(flow.ends).toEqual(expected);
      expect(flow.record).toEqual(sample.record);
      for (const [index, frame] of flow.frames.entries()) {
        expect(frame.see).not.toMatch(/\{(?:record|name)\./);
        for (const state of [undefined, ...frame.states]) {
          const screen = flowPreviewScreen(flow, index, state);
          expect(checkFlowPreview(screen, components), `${frame.key} ${state ?? "play"}`).toEqual([]);
        }
      }
    }
  },
);

test("optional steps can be skipped, but declared hand-offs still resolve", () => {
  const template = flowTemplates.get("report_issue")!;
  const { id: _id, ...sample } = template.examples[0]!;
  const skipped = fillFlow(template, { ...sample, omit: ["reporter/add_context"] });
  expect(skipped.frames.map(({ key }) => key)).not.toContain("reporter/add_context");
  expect(skipped.frames[0]!.forward[0]!.target).toBe("reporter/submit");
  expect(skipped.frames[1]!.forward[0]!.target).toBe("resolver/triage");
  expect(skipped.ends).toEqual(["reporter/resolved"]);
  expect(() => fillFlow(template, { ...sample, omit: ["resolver/triage"] })).toThrow("Cannot omit");
});
