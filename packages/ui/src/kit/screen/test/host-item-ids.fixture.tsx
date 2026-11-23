import { useState } from "react";
import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { z } from "zod";
import { components, themeName, type Definition, type Issue, type ThemeChoice } from "@lmthing/ui/catalog";
import { KitRow, renderers as kitRenderers, useLiveControls } from "@lmthing/ui/kit";
import { config } from "../../../../../../apps/gallery";
import { PhoneScreen } from "../PhoneScreen";

const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;
const named = {
  ...components.Header,
  meta: {
    ...components.Header.meta,
    id: "NamedFixture",
    region: "body",
    collections: { entries: { key: "entries", identity: "key", prefix: "note", parts: ["root"] } },
  },
  props: z.strictObject({
    entries: z.array(z.strictObject({ key: z.string(), title: z.string() })),
  }),
} satisfies Definition;

function NamedFixture(props: Record<string, unknown>) {
  const { entries } = useLiveControls(named.meta, props) as { entries: { id: string; title: string }[] };
  return entries.map(({ id, title }) => (
    <KitRow key={id} item={id} label={title}>
      {title}
    </KitRow>
  ));
}

const defs = { List: components.List, NamedFixture: named };
const renderers = { List: kitRenderers.List, NamedFixture };
const alpha = { id: "r7", title: "Alpha", goto: "alpha" };
const bravo = { id: "r4", title: "Bravo" };
const charlie = { id: "r1", title: "Charlie", mark: "highlight" };
const first = { id: "r_note_saved", key: "a", title: "Note A" };
const second = { id: "r_note_mid", key: "b", title: "Note B" };
const last = { id: "r_note_other", key: "c", title: "Note C" };
const cases = [
  { rows: [alpha, bravo, charlie], entries: [first, second, last] },
  { rows: [charlie, bravo, alpha], entries: [last, second, first] },
  { rows: [charlie, alpha], entries: [last, first] },
  {
    rows: [
      { title: "New" },
      charlie,
      { id: "r7", title: "Lorem ipsum" },
      alpha,
      { id: "r_note_wrong", title: "Bad prefix" },
    ],
    entries: [
      { key: "saved", title: "New note" },
      first,
      { id: "r_note_saved", key: "again", title: "Duplicate note id" },
      { id: "r_else_bad", key: "wrong", title: "Lorem ipsum" },
    ],
  },
];
const screens = cases.map(({ rows, entries }) => ({
  id: "home",
  components: [
    { c: "List", id: "l1", rows },
    { c: "NamedFixture", id: "n1", entries },
  ],
}));

function App() {
  const [index, setIndex] = useState(0);
  const [report, setReport] = useState<Issue[]>([]);
  const [linked, setLinked] = useState("");
  return (
    <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
      <button onClick={() => setIndex(1)}>Reorder</button>
      <button onClick={() => setIndex(2)}>Delete middle</button>
      <button onClick={() => setIndex(3)}>Mix IDs</button>
      <output data-testid="report">{JSON.stringify(report)}</output>
      <output data-testid="linked">{linked}</output>
      <PhoneScreen
        {...{ defs, renderers, theme }}
        screen={screens[index]!}
        onReport={setReport}
        onLink={(goto, address) => setLinked(`${goto}:${address}`)}
        reduceMotion
      />
    </TamaguiProvider>
  );
}

const target = document.createElement("div");
document.body.append(target);
createRoot(target).render(<App />);
