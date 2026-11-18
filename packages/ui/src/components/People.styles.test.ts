import { describe, expect, it } from "vitest";
import { affordancesOf, components, emptyLine, readComponent, stampItemIds } from "@lmthing/ui/catalog";
import { renderInstance } from "../../test/render";

const { props, meta, examples } = components.People;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

describe("People view and actions", () => {
  it("draws optional roles and round photos, and offers only linked member roots", () => {
    for (const role of [undefined, "Owner"]) {
      for (const photo of [undefined, "lib:people", "local:1"]) {
        for (const goto of [undefined, "anna", "back", "person_details"]) {
          const input = { members: [{ name: "Anna", role, photo, goto }] };
          const parsed = stampItemIds(meta, props.parse(input));
          expect(affordancesOf(meta, parsed, "p1")).toEqual(
            goto ? [{ address: "p1/r1", part: "root", action: "press", detail: `→${goto}` }] : [],
          );
          const html = renderInstance("People", input, "filled", theme);
          for (const part of ["root", "photo", "name"])
            expect(html.match(new RegExp(`data-testid="home/c1/r1/${part}"`, "g"))).toHaveLength(1);
          expect(html.includes('data-testid="home/c1/r1/role"')).toBe(Boolean(role));
          expect(html.includes('role="img"')).toBe(Boolean(photo));
          expect(html.includes('role="link"')).toBe(Boolean(goto));
          if (photo) expect(html).toContain('aria-label="Anna"');
          const read = readComponent(components.People, input, "p1").join("\n");
          expect(read).toContain('"Anna"');
          expect(read.includes(" press")).toBe(Boolean(goto));
          if (goto) expect(read).toContain(`[p1/r1 press→${goto} !needs-people]`);
          if (role) expect(read).toContain('"Owner"');
        }
      }
    }
  });
  it("hides stale members and links in the shared empty state", () => {
    const input = examples[1]!;
    const html = renderInstance("People", input, "empty", theme, "person");
    expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
    expect(html).toContain(emptyLine("person"));
    expect(html).not.toContain("Anna");
    expect(html).not.toContain("Clover");
    expect(html).not.toContain('role="link"');
    expect(html).not.toContain('data-testid="home/c1/r1/');
    expect(readComponent(components.People, input, "p1", "empty")).toEqual(["p1 People (empty)"]);
  });
});

describe("People stack", () => {
  it("makes a count of more people a stack that does not open anyone", () => {
    const parsed = props.parse({ more: 2, members: [{ name: "Anna", goto: "anna" }] });
    expect(parsed.style).toBe("stack");
    expect(parsed.members).toEqual([{ name: "Anna" }]);
    expect(affordancesOf(meta, parsed, "p1")).toEqual([]);
    expect(props.parse({ style: "stack", members: [{ name: "Ben", goto: "ben" }] }).members).toEqual([
      { name: "Ben" },
    ]);
  });
  it("draws overlapping avatars, one addressable item each, and a count of the rest", () => {
    const input = examples[2]!;
    const parsed = props.parse(input);
    const reads = readComponent(components.People, input, "p1").join("\n");
    expect(reads).toContain("+3");
    expect(affordancesOf(meta, parsed, "p1")).toEqual([]);
    const html = renderInstance("People", input, "filled", theme);
    for (const index of [1, 2, 3]) expect(html).toContain(`data-testid="home/c1/r${index}/root"`);
    expect(html).not.toContain('data-testid="home/c1/r4/root"');
    expect(html).toContain('data-testid="home/c1/more"');
    expect(html).toContain("+3");
  });
});
