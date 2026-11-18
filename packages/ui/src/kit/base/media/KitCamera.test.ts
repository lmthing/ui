import { describe, expect, it } from "vitest";
import { components, presets, size, type ThemeChoice } from "@lmthing/ui/catalog";
import { elementAt, renderInstance, styleAt } from "../../../../test/render";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { KitPhoto, KitProvider, PartScope } from "@lmthing/ui/kit";
import { config } from "../../../../test/render";

function renderPhoto(
  props: Parameters<typeof KitPhoto>[0],
  theme: ThemeChoice = { preset: "calm", mode: "light", accent: "moss" },
  resolved = true,
) {
  return renderToStaticMarkup(
    createElement(
      TamaguiProvider,
      { config },
      createElement(
        KitProvider,
        {
          theme,
          children: null,
          resolvePhoto: () => (resolved ? "data:image/svg+xml,test" : undefined),
        },
        createElement(
          PartScope,
          { screen: "home", component: "c1", rev: 1, state: "filled", children: null },
          createElement(KitPhoto, props),
        ),
      ),
    ),
  );
}

// The media folder is at its twelve-file limit; photo coverage is grouped explicitly here.
describe("KitPhoto options (photo coverage in the shared media test file)", () => {
  it.each(presets)("uses a neutral raised placeholder and readable initials in $id", ({ id: preset }) => {
    for (const mode of ["light", "dark"] as const) {
      const theme = { preset, mode, accent: "moss" } as const;
      for (const props of [{ initials: "AB" }, { photo: "lib:caller_name" }]) {
        const html = renderPhoto(props, theme, false);
        expect(styleAt(html, "home/c1/icon")).toContain("var(--raised)");
        if ("initials" in props) {
          const text = elementAt(html, "home/c1/icon").children[0]!;
          expect(styleAt(html, text)).toContain("var(--text)");
        }
      }
    }
  });
  it.each(["none", "accent", "muted"] as const)("draws initials and the %s ring without a photo", (ring) => {
    for (const shape of ["thumb", "round", "wide", "square", "tall", "avatar"] as const) {
      const html = renderPhoto({ initials: "AB", ring, shape, label: "Caller name", part: "photo" });
      const node = elementAt(html, "home/c1/photo");
      expect(node.attributes).toContain('role="img"');
      expect(node.attributes).toContain('aria-label="Caller name"');
      expect(html).toContain("AB");
      expect(html).not.toContain("<img");
      expect(styleAt(html, node)).toContain(
        `width:${shape === "avatar" ? size.avatar.lg : size.avatar.md}px`,
      );
      expect(styleAt(html, node)).toContain("border-top-left-radius:999px");
      if (ring !== "none") expect(styleAt(html, node)).toContain(`var(--${ring})`);
      expect(html.match(/data-testid=/g)).toHaveLength(1);
    }
  });
  it("retains resolved photos, default labels and empty initials", () => {
    const html = renderPhoto({ photo: "lib:caller_name", initials: "AB" });
    expect(html).toContain("<img");
    expect(html).toContain('aria-label="caller name"');
    expect(html).not.toContain(">AB<");
    expect(renderPhoto({ initials: "AB" })).toContain('aria-label="AB"');
    expect(renderPhoto({})).not.toContain("<img");
  });
});

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
