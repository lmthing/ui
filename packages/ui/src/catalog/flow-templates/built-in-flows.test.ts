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
};

test("the full catalog exposes the eight named templates", () => {
  expect(flowTemplates.list.map(({ id }) => id)).toEqual(Object.keys(outcomes));
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
