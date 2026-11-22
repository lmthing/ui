import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { expect, it } from "vitest";
import { createScreenController, KitProvider, Screen } from "@lmthing/ui/kit";
import { addressedElements, config, elementAt } from "../../render";
import { CollectionRuntimeFixture, defs, screen } from "./collections.fixture";

const address = (part: string) => `home/c1/${part}`;
const controllerOf = () => createScreenController({ defs, screen, requireMounted: true });
function render(controller: ReturnType<typeof controllerOf>) {
  return renderToStaticMarkup(
    <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss">
      <KitProvider theme={{ preset: "calm", mode: "light", accent: "moss" }} controller={controller}>
        <Screen controller={controller} renderers={{ CollectionRuntimeFixture }} />
      </KitProvider>
    </TamaguiProvider>,
  );
}

it("draws and addresses two independently actionable collections through the mounted dispatcher", () => {
  const controller = controllerOf();
  const targets = ["r_note_a/root", "r_note_b/root", "r_link_a/root", "r_note_a/move"];
  try {
    for (const part of targets) controller.registerPart(address(part));
    const initial = addressedElements(render(controller));
    for (const part of targets) expect(initial.get(address(part))?.attributes).toContain('role="button"');
    expect(initial.has(address("r_note_c/root"))).toBe(false);
    expect(initial.has(address("r_link_a/save"))).toBe(false);
    const steps = [
      { address: address("r_note_a/root"), action: "select" },
      { address: address("r_link_a/root"), action: "select" },
      { address: address("r_link_a/save"), action: "check" },
      { address: address("r_note_a/move"), action: "move", value: "r_note_b" },
    ];
    expect(controller.act(steps, { dryRun: true })).toMatchObject({ ok: true, dryRun: true });
    expect(controller.read()).not.toContain("check:done");
    expect(controller.act(steps)).toMatchObject({ ok: true });
    const html = render(controller);
    const drawn = addressedElements(html);
    expect([...drawn.keys()].filter((key) => /\/r_(note|link)_\w+\/root$/.test(key))).toEqual(
      ["r_note_b/root", "r_note_a/root", "r_link_a/root"].map(address),
    );
    for (const part of ["r_note_a/status", "r_link_a/status"])
      expect(drawn.get(address(part))?.text).toEqual(["Selected"]);
    expect(drawn.get(address("r_link_a/save"))?.attributes).toContain('aria-checked="true"');
    expect(controller.read()).toContain("[c1/r_link_a/save check:done]");
    expect(controller.snapshotScreen()).toEqual(screen);
  } finally {
    controller.dispose();
  }
});

it("keeps nested disabled controls and the agent's dispatcher in sync when capacity changes", () => {
  const controller = controllerOf();
  const part = (target: string) => address(`r1/${target}`);
  try {
    for (const target of ["pick_1", "pick_2", "choice_1", "open_2"]) controller.registerPart(part(target));
    expect(elementAt(render(controller), part("pick_2")).attributes).toContain('aria-disabled="true"');
    expect(controller.actionsAt(part("pick_2"))).toEqual([]);
    expect(controller.read()).not.toContain("pick_2");
    expect(controller.act({ address: part("pick_2"), action: "toggle" })).toMatchObject({
      ok: false,
      code: "max_active",
    });
    expect(
      controller.act([
        { address: part("pick_1"), action: "toggle" },
        { address: part("pick_2"), action: "toggle" },
        { address: part("choice_1"), action: "select", value: "b" },
        { address: part("open_2"), action: "press" },
      ]),
    ).toMatchObject({ ok: true });
    expect(elementAt(render(controller), part("pick_2")).attributes).toContain('aria-checked="true"');
    expect(controller.read()).toContain('[c1/r1/choice_1 select = "b"; choices ["a","b"]]');
    expect(controller.actionsAt(part("pick_1"))).toEqual([]);
  } finally {
    controller.dispose();
  }
});
