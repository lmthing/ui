import { expect, it } from "vitest";
import { nativeTextIssue } from "./clipped-text";

const label = "Strength circuit";
const address = "slot/choice/field";
const line = { x: 0, y: 0, width: 80, height: 18 };
const issue = { code: "clipped_text", address, message: "Choice label does not fit" };

it("reports native line caps whether the platform returns truncated or full line data", () => {
  expect(nativeTextIssue({ lines: [{ ...line, text: "Strength ci…" }] }, label, address, 1)).toEqual(issue);
  expect(
    nativeTextIssue(
      {
        lines: [
          { ...line, text: "Strength " },
          { ...line, y: 18, text: "circuit" },
        ],
      },
      label,
      address,
      1,
    ),
  ).toEqual(issue);
  expect(nativeTextIssue({ lines: [{ ...line, text: "Strength circu…" }] }, label, address, 1)).toEqual(
    issue,
  );
});

it("reports a too-narrow or too-short native text box, and clears intact wrapped text", () => {
  const lines = [
    { ...line, text: "Strength " },
    { ...line, y: 18, text: "circuit" },
  ];
  expect(nativeTextIssue({ box: { width: 60, height: 36 }, lines }, label, address)).toEqual(issue);
  expect(nativeTextIssue({ box: { width: 90, height: 18 }, lines }, label, address)).toEqual(issue);
  expect(nativeTextIssue({ box: { width: 90, height: 36 }, lines }, label, address)).toBeUndefined();
  expect(nativeTextIssue({ lines: [{ ...line, text: "Waiting…" }] }, "Waiting…", address, 1)).toBeUndefined();
});
