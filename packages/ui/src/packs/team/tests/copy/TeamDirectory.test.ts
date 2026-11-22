import { expect, it } from "vitest";
import { directoryGroups, directoryInitials, projectDirectory } from "../../copy";

const members = [
  { id: "r1", name: "Zoë", role: "Staff", department: "East", availability: "off" },
  { id: "r2", name: "Áda", role: "Team lead", department: "West", availability: "on_shift" },
  { id: "r3", name: "Bert", role: "Staff", availability: "break" },
] as const;

it("filters accent-insensitively with multiple terms without changing addresses", () => {
  const result = projectDirectory({ members, query: "  ZOE east ", detail: "full" });
  expect(result.members).toEqual([{ ...members[0], $detail: "full" }]);
  expect(directoryInitials("Áda Rivera")).toBe("ÁR");
});

it("uses declared department order and switches to a flat alphabetical list", () => {
  const input = { departments: ["West", "East", "Empty"], members: [...members] };
  expect(directoryGroups({ ...input, detail: "full" }).map(({ department }) => department)).toEqual([
    "West",
    "East",
    "Other teammates",
  ]);
  expect(directoryGroups({ ...input, detail: "brief" })[0]?.members.map(({ id }) => id)).toEqual([
    "r2",
    "r3",
    "r1",
  ]);
});
