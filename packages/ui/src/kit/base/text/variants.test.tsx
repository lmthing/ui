import type { ComponentProps, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { expect, expectTypeOf, it } from "vitest";
import { size, space, themeName, type as typography, variants, type ThemeChoice } from "@lmthing/ui/catalog";
import {
  KitCard,
  KitGrid,
  KitListItem,
  KitPhoto,
  KitProvider,
  KitRow,
  KitText,
  PartScope,
  useKit,
  useVariant,
} from "@lmthing/ui/kit";
import { config, elementAt, styleAt } from "../../../../test/render";

const theme = { preset: "calm", accent: "moss", mode: "light" } as const;
const compact = { ...theme, density: "compact" } satisfies ThemeChoice;
type ProviderOptions = Pick<ComponentProps<typeof KitProvider>, "environment" | "nativeHost">;

function render(children: ReactNode, choice: ThemeChoice = theme, options: ProviderOptions = {}) {
  return renderToStaticMarkup(
    <TamaguiProvider config={config} defaultTheme={themeName(choice)}>
      <KitProvider theme={choice} {...options}>
        <PartScope screen="home" component="base" rev={1} state="filled">
          {children}
        </PartScope>
      </KitProvider>
    </TamaguiProvider>,
  );
}

function Preferences() {
  const { density, motion, environment } = useKit();
  const inherited = useVariant("density", ["comfortable", "compact"]);
  const override = useVariant("density", ["comfortable", "compact"], "comfortable");
  const local = useVariant("emphasis", ["normal", "hero"]);
  return <output>{[density, inherited, override, local, motion, environment.reduceMotion].join("/")}</output>;
}

it("resolves the theme, component value, and declared default through the public hook", () => {
  expect(render(<Preferences />)).toContain("comfortable/comfortable/comfortable/normal/calm/false");
  expect(render(<Preferences />, { ...compact, motion: "lively" })).toContain(
    "compact/compact/comfortable/normal/lively/false",
  );
});

it("suppresses lively motion with native reduced motion and with a reduced-motion environment", () => {
  const choice = { ...compact, motion: "lively" } as const;
  const insets = { top: 0, right: 0, bottom: 0, left: 0 };
  const reduced = { reduceMotion: true, insets, keyboardHeight: 0 };
  const nativeHost = { snapshot: () => reduced, subscribe: () => () => {} };
  for (const options of [{ nativeHost }, { environment: { ...reduced, agentMode: false } }]) {
    expect(render(<Preferences />, choice, options)).toContain(
      "compact/compact/comfortable/normal/calm/true",
    );
  }
});

it("changes row spacing and text step without changing addresses or target minimums", () => {
  function sample(density?: "comfortable") {
    return (
      <KitRow
        item="r1"
        label="Entry"
        role="button"
        density={density}
        leading={<KitText part={null}>•</KitText>}
      >
        <KitText part="title" density={density}>
          Entry
        </KitText>
      </KitRow>
    );
  }
  const compactHtml = render(sample(), compact);
  const reset = render(sample("comfortable"), compact);
  const root = "home/base/r1/root";
  const title = "home/base/r1/title";
  expect(styleAt(compactHtml, root)).toContain(`padding-top:${space.sm}px`);
  expect(styleAt(compactHtml, root)).toContain(`min-height:${size.control.md}px`);
  expect(styleAt(compactHtml, title)).toContain(`font-size:${typography.label.size}px`);
  expect(styleAt(compactHtml, elementAt(compactHtml, root).children[0]!.children[0]!)).toContain(
    `height:${typography.label.lineHeight}px`,
  );
  expect(styleAt(reset, root)).toBe(styleAt(render(sample()), root));
  expect(styleAt(reset, title)).toBe(styleAt(render(sample()), title));
});

it("supports all card finishes and lets card and text alignment change without new parts", () => {
  const renderCard = (surface: "plain" | "card" | "tinted" | "outlined") =>
    render(
      <KitCard surface={surface} tone="good" align="center" bleed="edge" padded>
        <KitText part="title" role="heading" emphasis="hero" align="center">
          Entry
        </KitText>
      </KitCard>,
    );
  for (const [surface, expected] of [
    ["plain", "align-items:center"],
    ["card", "var(--surface)"],
    ["tinted", "var(--goodSoft)"],
    ["outlined", "var(--line)"],
  ] as const) {
    const html = renderCard(surface);
    const root = styleAt(html, "home/base/root");
    expect(root).toContain(expected);
    expect(root).toContain(`margin-left:-${space.gutter}px`);
    expect(styleAt(html, "home/base/title")).toContain(`font-size:${typography.title.size}px`);
    expect(styleAt(html, "home/base/title")).toContain("text-align:center");
  }
  expect(styleAt(renderCard("plain"), "home/base/root")).not.toContain("var(--surface)");
});

it("changes the frame aspect but keeps the media part when its photo is unresolved", () => {
  for (const aspect of ["wide", "tall", "square"] as const) {
    const html = render(<KitPhoto aspect={aspect} part="photo" label="Image" />);
    expect(styleAt(html, "home/base/photo")).toContain(`aspect-ratio:${variants.aspect[aspect]}`);
  }
  const auto = render(<KitPhoto aspect="auto" shape="tall" part="photo" photo="lib:sample" />);
  expect(styleAt(auto, "home/base/photo")).toContain(`aspect-ratio:${variants.aspect.tall}`);
});

it("arranges the same addressed cells as rows, grid or strip", () => {
  const content = [
    <KitText key="one" part="one">
      One
    </KitText>,
    <KitText key="two" part="two">
      Two
    </KitText>,
  ];
  const addresses = (html: string) => [...html.matchAll(/data-testid="([^"]*)"/g)].map((part) => part[1]);
  const layouts = (["rows", "grid", "strip"] as const).map((arrange) =>
    render(<KitGrid arrange={arrange}>{content}</KitGrid>),
  );
  expect(new Set(layouts).size).toBe(3);
  type Page<A> = { arrange: A; overflow: "page"; children: null };
  type Grid = Parameters<typeof KitGrid>[0];
  expectTypeOf<Page<"rows">>().not.toExtend<Grid>();
  expectTypeOf<Page<"strip">>().toExtend<Grid>();
  for (const html of layouts) expect(addresses(html)).toEqual(["home/base/one", "home/base/two"]);
});

it("groups the same items beneath the caller's headings without rewriting their addresses", () => {
  const children = <KitText part="one">Entry</KitText>;
  const groups = [{ id: "one", heading: "First section", children }];
  for (const group of ["sections", "dates"] as const) {
    const html = render(
      <KitGrid group={group} groups={groups} arrange="rows">
        {children}
      </KitGrid>,
    );
    expect(html).toContain("First section");
    expect(html.match(/data-testid="home\/base\/one"/g)).toHaveLength(1);
  }
  expect(render(<KitGrid groups={groups}>{children}</KitGrid>)).not.toContain("First section");
});

it("keeps shelf and expanded accessory choices, including the component's density", () => {
  const row = { id: "r1", title: "Entry", body: "Details", photo: "lib:sample", value: "12" };
  const shelf = render(
    <KitListItem row={row} style="shelf" index={0} lead="none" trail="value" density="comfortable" />,
    compact,
  );
  expect(shelf).not.toContain("home/base/r1/icon");
  const trail = elementAt(shelf, "home/base/r1/trail");
  expect(styleAt(shelf, trail.children[0]!.children[0]!.children[0]!)).toContain(
    `font-size:${typography.body.size}px`,
  );
  const expanded = render(<KitListItem row={row} style="expand" index={0} lead="number" trail="badge" />);
  expect(expanded).toContain('data-testid="home/base/r1/trail"');
  expect(expanded).toContain('data-testid="home/base/r1/rank"');
  const photo = render(<KitListItem row={row} style="shelf" index={0} lead="avatar" />, compact);
  const lead = elementAt(photo, "home/base/r1/root").children[0]!.children[0]!;
  expect(styleAt(photo, lead)).toContain("align-self:center");
  const cover = render(<KitListItem row={row} style="shelf" index={0} trail="value" />);
  expect(elementAt(cover, "home/base/r1/root").children[0]!.children).toHaveLength(1);
});

it("applies list detail, lead and trail choices at their original part addresses", () => {
  const row = { id: "r1", title: "Entry", meta: "Detail", done: true } as const;
  const base = { row, style: "plain", index: 0 } as const;
  const html = render(
    <KitListItem {...base} detail="brief" lead="number" trail="toggle" tone="good" mark="highlight" />,
  );
  expect(html).not.toContain("home/base/r1/meta");
  expect(html).toContain("home/base/r1/rank");
  expect(elementAt(html, "home/base/r1/trail").attributes).toContain('role="switch"');
  expect(elementAt(html, "home/base/r1/root").attributes).not.toContain("aria-current");
  const override = render(
    <KitListItem {...base} row={{ ...row, trail: "none" }} lead="check" trail="toggle" />,
  );
  expect(override).not.toContain("home/base/r1/trail");
  expect(override).toContain("home/base/r1/icon");
  expect(override).toContain("home/base/r1/meta");
});
