import { useMemo, useState } from "react";
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
      parts: ["root", "qty"],
      adjust: {
        "qty.increment": { prop: "qty", delta: 1, max: 3 },
        "qty.decrement": { prop: "qty", delta: -1, min: 1 },
      },
    },
    actions: {
      parts: { hide: ["press"] },
      items: { qty: ["increment", "decrement"] },
      noGoto: { parts: ["hide"] },
    },
  },
  props: z.strictObject({
    pinned: z.boolean(),
    rows: z.array(z.strictObject({ qty: z.number() })),
  }),
  fallback: () => ({}),
  examples: [],
  probes: [],
} satisfies Definition;

function FixtureView({ pinned, rows }: { pinned: boolean; rows: { id: string; qty: number }[] }) {
  return (
    <>
      <KitAction label="Hide bar" part="hide" />
      <KitText part="detail">First detail</KitText>
      {rows.map(({ id, qty }) => (
        <KitRow key={id} item={id} label={id}>
          <KitPinnedBottom>{pinned && <KitStepper part="qty" value={qty} min={1} max={3} />}</KitPinnedBottom>
        </KitRow>
      ))}
      {Array.from({ length: 45 }, (_, index) => (
        <KitText key={index} part={null}>
          Detail {index + 1}
        </KitText>
      ))}
      <KitText part="last">Last detail</KitText>
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
  const screen = useMemo(
    () => ({
      id: "fixture",
      components: [
        { id: "d1", c: "Fixture", pinned, rows: [{ qty: 1 }, { qty: 3 }] },
        { id: "b1", c: "FixtureFooter", goto: "other" },
      ],
    }),
    [pinned],
  );
  return (
    <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
      <PhoneScreen
        {...{ defs, renderers, screen, theme, nativeHost }}
        agentMode
        onAction={({ address }) => {
          if (address === "fixture/d1/hide") setPinned(false);
        }}
      />
    </TamaguiProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
