import { expect, it, vi } from "vitest";
import {
  checkScreen,
  createRegistry,
  packOf,
  packs,
  runComposeProbes,
  scoreComposition,
  type PackScreenValidator,
  type ScreenLike,
} from "@lmthing/ui/catalog";

const cast = { things: [], items: [] };
const layout = "upcoming";
const registry = createRegistry({ packs: ["booking", "health"], includeDrafts: true });
const screenOf = () => registry.defaultLines("appointments", layout, cast);
const issue = {
  code: "S.inconsistent_schedule",
  address: "appointments/a1/root",
  message: "Appointment does not match the schedule",
};

function fixture() {
  const active = vi.fn<PackScreenValidator>(() => [issue]);
  const second = vi.fn<PackScreenValidator>(() => []);
  const inactive = vi.fn<PackScreenValidator>(() => []);
  const packContext = {
    packOf,
    packs: {
      ...packs,
      booking: { ...packs.booking, screenValidators: [active, second] },
      health: { ...packs.health, screenValidators: [inactive] },
    },
  };
  return { active, second, inactive, packContext };
}

it("validates each used pack once and reports its issues after the built-in checks", () => {
  const { active, second, inactive, packContext } = fixture();
  const screen = screenOf();
  const appointment = screen.components.find(({ c }) => c === "Appointment")!;
  screen.components.push({ ...appointment, id: "a2", c: "appointment" });
  const before = structuredClone(screen);
  const baseline = checkScreen(screen, registry);

  expect(checkScreen(screen, registry, { packContext })).toEqual([...baseline, issue]);
  expect(active).toHaveBeenCalledExactlyOnceWith({
    ...screen,
    components: [...screen.components.slice(0, -1), { ...appointment, id: "a2" }],
  });
  expect(second).toHaveBeenCalledTimes(1);
  expect(inactive).not.toHaveBeenCalled();
  expect(screen).toEqual(before);
});

it("does not run validators for core-only screens or pass them invalid component input", () => {
  const { active, inactive, packContext } = fixture();
  const core = registry.defaultLines("appointments", "history", cast);
  expect(checkScreen(core, registry, { packContext })).toEqual(checkScreen(core, registry));

  const invalid: ScreenLike = screenOf();
  invalid.components.find(({ c }) => c === "Appointment")!.service = 123;
  expect(checkScreen(invalid, registry, { packContext })).toEqual(
    expect.arrayContaining([expect.objectContaining({ code: "S.props" })]),
  );
  expect(active).not.toHaveBeenCalled();
  expect(inactive).not.toHaveBeenCalled();
});

it("counts pack issues in composition scoring and the compose-probe majority", async () => {
  const { packContext } = fixture();
  const screen = screenOf();
  const defs = Object.fromEntries(registry.defs.map((def) => [def.meta.id, def]));
  const meta = registry.archetypes.appointments!.meta;
  const reply = JSON.stringify(screen);
  const detail = `${issue.code}: ${issue.message}`;

  expect(checkScreen(screen, registry, { packContext: { packOf, packs } })).toEqual([]);
  expect(scoreComposition(reply, meta, layout, defs, { packContext: { packOf, packs } }).issues).toEqual([]);
  expect(scoreComposition(reply, meta, layout, defs, { packContext })).toEqual({ issues: [detail] });
  const results = await runComposeProbes({
    archetypes: [meta],
    only: [`${meta.id}/${layout}`],
    defs,
    packContext,
    cast,
    samples: 1,
    callModel: async () => reply,
  });
  expect(results).toMatchObject([{ status: "fail", score: "0/1", detail }]);
});
