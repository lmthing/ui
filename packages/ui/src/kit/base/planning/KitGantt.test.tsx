import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { expect, it } from "vitest";
import { size, themeName } from "@lmthing/ui/catalog";
import { KitGantt, KitProvider, PartScope } from "@lmthing/ui/kit";
import { config, elementAt, styleAt } from "../../../../test/render";

const columns = [
  { id: "mon", label: "Mon" },
  { id: "tue", label: "Tue" },
  { id: "wed", label: "Wed" },
];
const rows = [
  { id: "r1", label: "Research", start: 0, end: 0.65, clippedStart: true, target: { part: "bar" } },
  {
    id: "r2",
    label: "Draft",
    start: 0.35,
    end: 1,
    clippedEnd: true,
    conflict: true,
    target: { part: "bar" },
  },
  { id: "r3", label: "Proof", start: 0.75, end: 0.8 },
];
const gates = [{ id: "r4", label: "Signoff", at: 1, target: { item: "r3", part: "gate" } }];
const links = [
  { from: "r1", to: "r2" },
  { from: "r2", to: "r4" },
  { from: "r2", to: "missing" },
];

function render(props: Parameters<typeof KitGantt>[0]) {
  const theme = { preset: "calm", mode: "dark", accent: "moss" } as const;
  return renderToStaticMarkup(
    <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
      <KitProvider theme={theme}>
        <PartScope screen="home" component="c1" rev={1} state="filled">
          <KitGantt {...props} />
        </PartScope>
      </KitProvider>
    </TamaguiProvider>,
  );
}

it("keeps labels outside the scrolling timeline and addresses only requested range and gate targets", () => {
  const html = render({ columns, rows, gates, links, part: "schedule" });
  const board = elementAt(html, "home/c1/schedule").children[0]!;
  expect(board.children).toHaveLength(2);
  expect(board.children[0]!.children).toHaveLength(1 + rows.length + gates.length);
  expect(html).toContain('aria-label="Mon, Tue, Wed"');
  for (const [address, label] of [
    ["r1/bar", "Research"],
    ["r2/bar", "Draft"],
    ["r3/gate", "Signoff"],
  ]) {
    const node = elementAt(html, `home/c1/${address}`);
    expect(node.attributes).toContain('role="button"');
    expect(node.attributes).toContain(`aria-label="${label}"`);
    expect(styleAt(html, node)).toContain(`height:${size.control.md}px`);
  }
  expect(styleAt(html, "home/c1/r3/gate")).toContain(`width:${size.control.md}px`);
  expect(html).toContain("Proof");
  expect(html).not.toContain("home/c1/r3/bar");
  expect(config.getCSS()).toMatch(/border(?:-top)?-style:dashed/);
  expect(html.match(/<path[^>]+d="M[\d.]+ [\d.]+ V[\d.]+ H/g)).toHaveLength(2);
});

it("keeps range, gate and dependency geometry in loading while dropping all controls and copy", () => {
  const html = render({ columns, rows, gates, links, loading: true });
  const board = elementAt(html, "home/c1/root").children[0]!;
  expect(board.children[0]!.children).toHaveLength(1 + rows.length + gates.length);
  expect(html).toContain('aria-busy="true"');
  expect(html).not.toMatch(/Research|Signoff|role="button"|home\/c1\/r\d/);
  expect(html.match(/<path[^>]+d="M[\d.]+ [\d.]+ V[\d.]+ H/g)).toHaveLength(2);
  expect(render({ columns: [], rows: [], gates: [], links: [] })).toContain("<svg");
  expect(render({ columns: [], rows: [], gates: [], links: [], loading: true })).toContain("aria-busy");
});
