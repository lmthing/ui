import { describe, expect, it, vi } from "vitest";
import { components, readComponent } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";
import { memberDirectoryKind, signUpRecordKind, voteRecordKind } from "../../copy";

const { Dues, Members, Minutes, Vote, SignUpSheet } = components;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const room = { component: "c1" };
const screen = (c: string, input: Record<string, unknown>) => ({
  id: "home",
  components: [{ ...input, c, id: "c1" }],
});

describe("optional community fields", () => {
  it("groups assessments and their receipts without restamping, and makes a waived payment credit", () => {
    const input = Dues.examples[2]!;
    const waivedPayment = { ...input.receipts[0]!, id: "receipt_5", assessmentId: "jo_april" };
    const receipts = [...input.receipts, waivedPayment];
    const raw = { ...input, receipts };
    const html = renderInstance("Dues", raw, "filled", theme, room);
    const parts = addressedElements(html);
    const prefix = "home/c1/";
    for (const [part, copy] of [
      ["cadence", "Monthly dues"],
      ["r1/household", "Household: River lane"],
      ["r2/status", "Waived"],
      ["r2/credit", "$10 credit"],
      ["r3/household", "Individual assessments"],
      ["assessed", "$50"],
      ["outstanding", "$40"],
      ["collected", "$20"],
    ] as const)
      expect(parts.get(prefix + part)?.text).toEqual([copy]);
    expect([...parts.keys()].indexOf(prefix + "r5/root")).toBeLessThan(
      [...parts.keys()].indexOf(prefix + "r3/root"),
    );
    const runtime = createScreenController({ screen: screen("Dues", raw), defs: { Dues } });
    try {
      expect(runtime.press("c1/r2/record").ok).toBe(false);
      expect(runtime.press("c1/r5/void").ok).toBe(true);
      expect(runtime.confirmation).toBeDefined();
      expect(runtime.snapshotScreen().components[0]?.receipts).toEqual(receipts);
    } finally {
      runtime.dispose();
    }
  });

  it("keeps author badges and committee tags in brief and full registers", () => {
    const [row] = Members.examples[0]!.members;
    const members = [{ ...row!, badge: "Verified Member", committee: "Communications Committee" }];
    for (const detail of ["full", "brief"] as const) {
      const input = { members, detail };
      expect(Members.props.safeParse(input).success).toBe(true);
      const parts = addressedElements(renderInstance("Members", input, "filled", theme, room));
      expect(parts.get("home/c1/r1/badge")?.text).toEqual(["Verified Member"]);
      expect(parts.get("home/c1/r1/committee")?.text).toEqual(["Committee: Communications Committee"]);
      expect(readComponent(Members, input, "c1").join("\n")).toContain("Verified Member");
      expect(parts.has("home/c1/r1/joined")).toBe(detail === "full");
    }
    expect(Members.props.safeParse({ members: [{ ...members[0], badge: "x".repeat(17) }] }).success).toBe(
      false,
    );
  });

  it("looks up attendance against the register and never prints unresolved or ambiguous ids", () => {
    const base = Minutes.examples[0]!;
    const attendance = { presentIds: ["ana", "private_id"], apologiesIds: ["lee"] };
    const input = { ...base, attendance };
    const deviceData = {
      [memberDirectoryKind]: [
        { id: "ana", name: "Ana Reed" },
        { id: "lee", name: "Lee Ortiz" },
        { id: "lee", name: "Lee Bell" },
      ],
    };
    const html = renderInstance("Minutes", input, "filled", theme, { ...room, deviceData });
    const parts = addressedElements(html);
    expect(parts.get("home/c1/present")?.text.join("")).toContain(
      "Ana Reed and 1 member not in the register",
    );
    expect(parts.get("home/c1/apologies")?.text).toEqual(["Apologies: 1 member not in the register"]);
    const reading = readComponent(Minutes, input, "c1", "filled", {}, undefined, deviceData).join("\n");
    expect(reading).toContain("Present: Ana Reed and 1 member not in the register");
    expect(reading).not.toMatch(/private_id|Lee Bell|Lee Ortiz/);
    expect(renderInstance("Minutes", base, "filled", theme, { ...room, deviceData })).not.toContain(
      "Present:",
    );
    for (const apologiesIds of [["ana"], ["lee", "lee"], ["not-valid"]])
      expect(Minutes.props.safeParse({ ...input, attendance: { ...attendance, apologiesIds } }).success).toBe(
        false,
      );
  });
});

describe("trusted Community actions", () => {
  it("dispatches an addressed election selection and never offers a full or ineligible ballot another choice", () => {
    const input = Vote.examples[4]!;
    const opens = Date.parse(input.opens);
    const actions = vi.fn();
    for (const [viewer, limit] of [
      ["cal", false],
      ["outside", false],
      ["ana", true],
    ] as const) {
      const deviceData = {
        [voteRecordKind]: [
          {
            ...input,
            viewer,
            chair: "ana",
            eligible: ["cal", "ana"],
            ballots: [...input.ballots, { memberId: "ana", choice: ["ana", "lee"] }],
          },
        ],
      };
      const runtime = createScreenController({
        screen: screen("Vote", input),
        defs: { Vote },
        now: () => opens,
        deviceData,
        onAction: actions,
      });
      try {
        expect(runtime.press("c1/for").ok).toBe(false);
        expect(runtime.act({ address: "c1/r2", action: "select", value: "jo" }).ok).toBe(false);
        expect(runtime.press("c1/r3").ok).toBe(viewer === "cal" && !limit);
        if (viewer === "cal")
          expect(actions).toHaveBeenLastCalledWith({ address: "home/c1/r3", action: "select", value: "jo" });
        expect(runtime.press("c1/r1").ok).toBe(viewer !== "outside");
        expect(runtime.snapshotScreen().components[0]?.ballots).toEqual(input.ballots);
        const reading = runtime.read();
        expect(reading).not.toMatch(/Ana Reed: \d|Election results|memberId|outside/);
      } finally {
        runtime.dispose();
      }
    }
  });

  it("only retries the viewer's allowed failure and preserves confirmation for release", () => {
    const input = SignUpSheet.examples[0]!;
    const onAction = vi.fn();
    const retry = { slotId: "sign", memberId: "lee", action: "release" };
    const deviceData = {
      [signUpRecordKind]: [
        {
          instance: "c1",
          viewer: "lee",
          claims: input.claims,
          members: [
            { id: "lee", name: "Lee", active: true },
            { id: "ana", name: "Ana", active: true },
          ],
          retry,
        },
      ],
    };
    const options = { screen: screen("SignUpSheet", { ...input, state: "error" }), defs: { SignUpSheet } };
    const runtime = createScreenController({ ...options, onAction, deviceData });
    try {
      expect(runtime.press("c1/r1/retry_claim").ok).toBe(false);
      expect(runtime.press("c1/r2/release").ok).toBe(false);
      expect(runtime.press("c1/r2/retry_release").ok).toBe(true);
      expect(onAction).not.toHaveBeenCalled();
      expect(runtime.press("confirm/confirm").ok).toBe(true);
      expect(onAction).toHaveBeenLastCalledWith({ address: "home/c1/r2/retry_release", action: "press" });
    } finally {
      runtime.dispose();
    }
  });
});
