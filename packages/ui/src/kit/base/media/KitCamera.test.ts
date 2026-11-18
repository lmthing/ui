import { describe, expect, it } from "vitest";
import { components, presets, size } from "@lmthing/ui/catalog";
import { elementAt, renderInstance, styleAt } from "../../../../test/render";

describe("KitViewfinder marks", () => {
  it.each(presets)("uses a light foreground on the dark frame in $id", ({ id: preset }) => {
    for (const mode of ["light", "dark"] as const) {
      for (const kind of ["photo", "scan"] as const) {
        const html = renderInstance("Camera", { kind, hint: "Frame the subject" }, "filled", {
          preset,
          mode,
          accent: "moss",
        });
        const frame = elementAt(html, "home/c1/viewfinder");
        const foreground = mode === "dark" ? "text" : "bg";
        const background = mode === "dark" ? "raised" : "text";
        expect(styleAt(html, frame)).toContain(`var(--${background})`);
        const marks = kind === "scan" ? frame.children[0]!.children : frame.children.slice(0, 4);
        expect(marks).toHaveLength(4);
        for (const mark of marks) {
          expect(styleAt(html, mark)).toContain(`var(--${foreground})`);
          expect(styleAt(html, mark)).not.toContain("var(--onAccent)");
        }
      }
    }
  });
});

describe("People mixed leads", () => {
  it.each(presets)("reserves the same photo width in $id", ({ id: preset }) => {
    const html = renderInstance("People", components.People.examples[1], "filled", {
      preset,
      mode: "light",
      accent: "moss",
    });
    for (const item of ["r1", "r2"]) {
      const lead = elementAt(html, `home/c1/${item}/root`).children[0]!.children[0]!;
      expect(styleAt(html, lead)).toContain(`width:${size.avatar.md}px`);
    }
  });
});

describe("KitAvatarStack inline count", () => {
  it.each([1, 3, 6])("keeps the count beside %s addressed avatars", (count) => {
    for (const more of [undefined, 3, 999]) {
      const html = renderInstance(
        "People",
        {
          style: "stack",
          more,
          members: Array.from({ length: count }, (_, index) => ({
            name: `Person ${index + 1}`,
            ...(index % 2 ? {} : { photo: "lib:people" }),
          })),
        },
        "filled",
        { preset: "calm", mode: "dark", accent: "moss" },
      );
      const stack = elementAt(html, "home/c1/root").children[0]!;
      expect(styleAt(html, stack)).toContain("flex-direction:row");
      expect(styleAt(html, stack)).toContain("align-items:center");
      expect(stack.children).toHaveLength(count + (more ? 1 : 0));
      if (more) {
        expect(stack.children.at(-1)!.children[0]!.attributes).toContain('data-testid="home/c1/more"');
      }
      for (let index = 1; index <= count; index++) {
        expect(html).toContain(`data-testid="home/c1/r${index}/photo"`);
      }
    }
  });
});
