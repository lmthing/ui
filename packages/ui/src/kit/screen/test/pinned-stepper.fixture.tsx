import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createTamagui, createTokens, TamaguiProvider } from "tamagui";
import { z } from "zod";
import { themeName, type Definition, type ThemeChoice } from "../../../catalog";
import {
  KitAction,
  KitPinnedBottom,
  KitRow,
  KitStepper,
  KitText,
  KitTrail,
  PhoneScreen,
  kitFonts,
  kitThemes,
  kitTokens,
} from "../../index";
import type { NativeHost } from "../../provider";

const fixture = {
  meta: {
    id: "Fixture",
    group: "content",
    purpose: "Test a pinned part.",
    pick: "Browser fixture.",
    region: "body",
    weight: 1,
    tier: "phone",
    realPath: "Local",
    parts: ["hide", "detail", "last"],
    items: {
      key: "rows",
      parts: ["root", "qty", "trail"],
      adjust: {
        "qty.increment": { prop: "qty", delta: 1, max: 3 },
        "qty.decrement": { prop: "qty", delta: -1, min: 1 },
      },
    },
    actions: {
      parts: { hide: ["press"] },
      items: { qty: ["increment", "decrement"], trail: ["toggle"] },
      noGoto: { parts: ["hide"] },
    },
  },
  props: z.strictObject({
    pinned: z.boolean(),
    details: z.boolean(),
    rows: z.array(z.strictObject({ qty: z.number() })),
  }),
  fallback: () => ({}),
  examples: [],
  probes: [],
} satisfies Definition;

type FixtureProps = {
  pinned: boolean;
  details: boolean;
  rows: { id: string; qty: number }[];
};

function FixturePins({ pinned, details, rows }: FixtureProps) {
  const [disabled, setDisabled] = useState(false);
  const [reverse, setReverse] = useState(false);
  useEffect(() => {
    const update = (event: Event) => setDisabled((event as CustomEvent<boolean>).detail);
    const reorder = () => setReverse((value) => !value);
    window.addEventListener("fixture-disabled", update);
    window.addEventListener("fixture-row-order", reorder);
    return () => {
      window.removeEventListener("fixture-disabled", update);
      window.removeEventListener("fixture-row-order", reorder);
    };
  }, []);
  return (reverse ? [...rows].reverse() : rows).map(({ id, qty }, index) => (
    <KitRow key={id} item={id} label="Row switch">
      {pinned && (
        <KitPinnedBottom order={index}>
          <KitStepper part="qty" value={qty} min={1} max={2} disabled={disabled} />
          {details && id === "r1" && <KitTrail kind="toggle" />}
        </KitPinnedBottom>
      )}
    </KitRow>
  ));
}

function FixtureView(props: FixtureProps) {
  const { details } = props;
  return (
    <>
      {details && <KitAction label="Hide bar" part="hide" />}
      {details && <KitText part="detail">First detail</KitText>}
      <FixturePins {...props} />
      {details &&
        Array.from({ length: 45 }, (_, index) => (
          <KitText key={index} part={null}>
            Detail {index + 1}
          </KitText>
        ))}
      {details && <KitText part="last">Last detail</KitText>}
    </>
  );
}

const footer = {
  meta: {
    id: "FixtureFooter",
    group: "action",
    purpose: "Test an existing bottom component.",
    pick: "Browser fixture.",
    region: "bottom",
    weight: 1,
    tier: "phone",
    realPath: "Local",
    parts: ["root"],
    actions: { parts: { root: ["press"] } },
  },
  props: z.strictObject({ goto: z.string() }),
  fallback: () => ({}),
  examples: [],
  probes: [],
} satisfies Definition;

function FooterView() {
  return <KitAction label="Existing footer" full />;
}

const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;
const scheme = kitThemes.kit_calm_light_moss;
const config = createTamagui({
  tokens: createTokens(kitTokens),
  fonts: kitFonts,
  defaultFont: "humanist",
  themes: { light: scheme, [themeName(theme)]: scheme },
});
const defs = { Fixture: fixture, FixtureFooter: footer };
const renderers = { Fixture: FixtureView, FixtureFooter: FooterView };
const nativeHost: NativeHost = {
  snapshot: () => ({
    insets: { top: 0, bottom: 32, left: 28, right: 36 },
    keyboardHeight: 0,
    reduceMotion: true,
  }),
  subscribe: () => () => {},
};

function App() {
  const [pinned, setPinned] = useState(true);
  const [order, setOrder] = useState(["d1", "d2"]);
  useEffect(() => {
    const update = (event: Event) => setOrder((event as CustomEvent<string[]>).detail);
    const show = () => setPinned(true);
    window.addEventListener("fixture-order", update);
    window.addEventListener("fixture-show", show);
    return () => {
      window.removeEventListener("fixture-order", update);
      window.removeEventListener("fixture-show", show);
    };
  }, []);
  const screen = useMemo(
    () => ({
      id: "fixture",
      components: [
        ...order.map((id) => ({
          id,
          c: "Fixture",
          details: id === "d1",
          pinned: id !== "d1" || pinned,
          rows: id === "d1" ? [{ qty: 1 }, { qty: 2 }] : [{ qty: 3 }],
        })),
        { id: "b1", c: "FixtureFooter", goto: "other" },
      ],
    }),
    [pinned, order],
  );
  return (
    <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
      <PhoneScreen
        {...{ defs, renderers, screen, theme, nativeHost }}
        onAction={({ address }) => {
          if (address === "fixture/d1/hide") setPinned(false);
        }}
      />
    </TamaguiProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
