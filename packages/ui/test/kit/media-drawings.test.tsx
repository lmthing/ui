import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { expect, it, vi } from "vitest";
import { component, size, space, themeName, variants } from "@lmthing/ui/catalog";
import { KitAvatarStack, KitCard, KitPhoto, KitProvider, KitText, PartScope } from "@lmthing/ui/kit";
import { config, elementAt, styleAt } from "../render";

function render(children: ReactNode, resolvePhoto?: (ref: string) => string | undefined) {
  const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
  return renderToStaticMarkup(
    <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
      <KitProvider theme={theme} {...(resolvePhoto ? { resolvePhoto } : {})}>
        <PartScope screen="home" component="c1" rev={1} state="filled">
          {children}
        </PartScope>
      </KitProvider>
    </TamaguiProvider>,
  );
}

it("lets a full-bleed card own the photo corners while retaining the crop and address in loading", () => {
  for (const loading of [false, true]) {
    const photo = <KitPhoto shape="wide" part="photo" loading={loading} />;
    const styled = (markup: string) => styleAt(markup, "home/c1/photo");
    const edgeMarkup = render(
      <KitCard bleed="edge" clip>
        {photo}
      </KitCard>,
    );
    const edge = styled(edgeMarkup);
    const inset = styled(
      render(
        <KitCard bleed="edge" padded>
          <KitPhoto photo="lib:unresolved" shape="wide" part="photo" loading={loading} />
        </KitCard>,
      ),
    );
    for (const css of [edge, inset]) expect(css).toContain(`aspect-ratio:${variants.aspect.wide}`);
    expect(edge).toContain("border-top-left-radius:0px");
    expect(styleAt(edgeMarkup, "home/c1/root")).toContain("padding-left:0px");
    expect(styleAt(edgeMarkup, "home/c1/root")).toContain("padding-top:0px");
    expect(inset).toMatch(/border-top-left-radius:[1-9]\d*px/);
  }
});

it("keeps an unresolved portrait's address, label and supplied initials without resolving while loading", () => {
  const resolve = vi.fn(() => undefined);
  const props = {
    photo: "lib:portrait",
    shape: "round",
    part: "photo",
    label: "Bea Gray",
    initials: "BG",
  } as const;
  const filled = render(<KitPhoto {...props} />, resolve);
  expect(elementAt(filled, "home/c1/photo").attributes).toContain('aria-label="Bea Gray"');
  expect(filled).toContain(">BG<");
  expect(resolve).toHaveBeenCalledExactlyOnceWith("lib:portrait");
  const loading = render(<KitPhoto {...props} loading />, resolve);
  expect(loading).not.toMatch(/Bea Gray|>BG</);
  expect(resolve).toHaveBeenCalledTimes(1);
});

it("draws distinguishable overlapping avatars, preserves their addresses, and keeps loading inert", () => {
  const members = [
    { id: "r1", label: "Ari Shah", mark: "new" },
    { id: "r2", label: "Bea Gray", mark: "highlight" },
    { id: "r3", label: "Cam Cole", mark: "muted" },
  ] as const;
  const draw = (loading: boolean) =>
    render(
      <KitCard part="frame">
        <KitAvatarStack members={members} loading={loading}>
          <KitText part="count">3 guests</KitText>
        </KitAvatarStack>
      </KitCard>,
    );
  const filled = draw(false);
  expect(filled).toMatch(/>AS<.*>BG<.*>CC</s);
  for (const { id } of members) expect(elementAt(filled, `home/c1/${id}/photo`)).toBeDefined();
  expect(styleAt(filled, "home/c1/r2/photo")).toContain("border-left-color:var(--accent)");
  expect(styleAt(filled, "home/c1/r3/root")).toContain(`opacity:${component.base.disabledOpacity}`);
  const skeleton = draw(true);
  expect(skeleton).not.toMatch(/home\/c1\/(?:r\d|count)|3 guests|Ari Shah|Bea Gray|Cam Cole/);
  const [stack] = elementAt(skeleton, "home/c1/frame").children;
  expect(stack!.children).toHaveLength(members.length);
  for (const avatar of stack!.children) {
    expect(styleAt(skeleton, avatar)).toContain(`margin-left:-${space.md}px`);
    expect(styleAt(skeleton, avatar.children[0]!)).toContain(`width:${size.avatar.md}px`);
  }
});
