import { describe, expect, it } from "vitest";
import { components } from "@lmthing/ui/catalog";
import { inspectionDisplay, inspectionEditPath, inspectionProgress, inspectionSummary } from "../../copy";

const { props, examples } = components.Inspections;
const [draft, signed] = examples;

describe("inspection copy and projection", () => {
  it("counts across the whole report and treats not applicable as recorded", () => {
    const rooms = [
      {
        ...draft!.rooms[0]!,
        checks: [{ ...draft!.rooms[0]!.checks[0]!, condition: "not_applicable" as const }],
      },
      {
        ...signed!.rooms[0]!,
        checks: [{ ...signed!.rooms[0]!.checks[0]!, condition: "unrecorded" as const }],
      },
    ];
    expect(inspectionProgress({ rooms })).toEqual({ recorded: 1, total: 2, complete: false });
  });

  it("keeps room-qualified wire paths when check references repeat between rooms", () => {
    const room = draft!.rooms[0]!;
    const other = { ...room, roomRef: "other" };
    const wire = { ...draft!, rooms: [room, other] };
    const parsed = props.parse(wire);
    const projected = inspectionDisplay({ ...parsed, roomRef: other.roomRef });
    expect(projected.entries).toMatchObject([
      { visible: true },
      { visible: false },
      { visible: true },
      { visible: true },
    ]);
    expect(inspectionEditPath(parsed.entries[3]!, wire)).toEqual(["rooms", 1, "checks", 0]);
    expect(inspectionEditPath(parsed.entries[2]!, wire)).toBeUndefined();
  });

  it("formats dates, counts and the optional comparison reference through pack copy", () => {
    expect(inspectionSummary(props.parse(signed), "en-GB")).toEqual({
      date: "17 Nov 2026",
      kind: "Move-out",
      completion: "2 of 2 checks recorded",
      previous: "Previous report: cabin_move_in",
      signed: "Signed off 17 Nov 2026 at 11:15",
    });
    expect(inspectionSummary(props.parse({ ...signed, detail: "brief" })).previous).toBeUndefined();
  });
});
