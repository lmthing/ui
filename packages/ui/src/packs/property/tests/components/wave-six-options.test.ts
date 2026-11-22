import { expect, it, vi } from "vitest";
import { components, planAct, readComponent } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const { RentRoll, Inspections } = components;
const tenant = RentRoll.examples[3]!;
const inspection = Inspections.examples[2]!;
const controls = (c: string, input: Record<string, unknown>) => {
  const screen = { id: "home", components: [{ ...input, c, id: "c1" }] };
  const onAction = vi.fn();
  const controller = createScreenController({ screen, defs: components, onAction });
  return { controller, onAction, screen };
};
const press = (address: string) => ({ address: `c1/${address}`, action: "press" });

it("keeps tenant totals, receipts and payment scoped to the supplied lease", () => {
  const charge = tenant.charges[0]!;
  const receipt = tenant.receipts[0]!;
  const hostOnly = ["r1/record", "r1/remind", "r2/void"];
  const { controller, onAction, screen } = controls("RentRoll", tenant);
  const html = renderInstance("RentRoll", tenant, "filled", theme);
  const parts = addressedElements(html);
  expect(parts.get("home/c1/outstanding")?.text).toEqual(["$600"]);
  expect(parts.get("home/c1/r1/outstanding")?.text).toEqual(["$600"]);
  expect(parts.get("home/c1/r2/amount")?.text).toEqual(["$500"]);
  expect(html).toContain("Autopay off");
  expect(controller.read()).toContain("[c1/r1/pay press !needs-service]");
  for (const part of hostOnly) {
    expect(parts.has(`home/c1/${part}`)).toBe(false);
    expect(planAct(screen, components, {}, [press(part)]).ok).toBe(false);
  }
  expect(controller.press("c1/r1/pay").ok).toBe(true);
  expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: "home/c1/r1/pay", action: "press" });
  expect(controller.snapshotScreen().components[0]?.receipts).toEqual(tenant.receipts);
  controller.dispose();
  for (const change of [
    { tenantLetRef: undefined },
    { charges: [charge, { ...charge, chargeRef: "other", letRef: "other_let" }] },
    { receipts: [{ ...receipt, chargeRef: "other" }] },
    { style: "ledger" },
  ])
    expect(RentRoll.props.safeParse({ ...tenant, ...change }).success).toBe(false);
});

it("does not offer payment on settled, legacy or inactive tenant rows", () => {
  const settled = { ...tenant, receipts: [{ ...tenant.receipts[0]!, amount: 1100 }] };
  for (const [input, state] of [
    [settled, "filled"],
    [RentRoll.examples[0]!, "filled"],
    [tenant, "loading"],
    [tenant, "success"],
    [tenant, "error"],
    [tenant, "empty"],
  ] as const) {
    const view = renderInstance("RentRoll", input, state, theme);
    expect(addressedElements(view).has("home/c1/r1/pay")).toBe(false);
    expect(readComponent(RentRoll, input, "c1", state).join("\n")).not.toContain("pay press");
    const { controller } = controls("RentRoll", { ...input, state });
    expect(controller.press("c1/r1/pay").ok).toBe(false);
    controller.dispose();
  }
  const withoutAutopay = { ...tenant, autopay: undefined };
  expect(renderInstance("RentRoll", withoutAutopay, "filled", theme)).not.toContain("Autopay");
});

it("updates dispute comments by stable check address and gates co-signing on that check alone", () => {
  const { controller, onAction } = controls("Inspections", inspection);
  const dispute = (value: string) => ({ address: "c1/r2/dispute", action: "type", value });
  expect(controller.read()).toContain("[c1/r2/sign press !needs-people]");
  expect(controller.press("c1/r3/sign").ok).toBe(false);
  expect(controller.act(dispute("Paint is chipped")).ok).toBe(true);
  expect(controller.press("c1/r2/sign").ok).toBe(false);
  expect(controller.read()).toContain("Tenant dispute: Paint is chipped");
  expect(controller.read()).toContain("Tenant dispute: There is a crack behind the door.");
  expect(controller.act(dispute("x".repeat(101))).ok).toBe(false);
  expect(controller.act(dispute("")).ok).toBe(true);
  expect(controller.press("c1/r2/sign").ok).toBe(true);
  expect(onAction).toHaveBeenLastCalledWith({ address: "home/c1/r2/sign", action: "press" });
  expect(controller.read()).toContain("[c1/r2/sign press !needs-people]");
  controller.dispose();
});

it("retains co-sign evidence without any check edits after co-signing or finalisation", () => {
  const room = inspection.rooms[0]!;
  const [door, wall] = room.checks;
  const signed = {
    ...inspection,
    rooms: [{ ...room, checks: [{ ...door!, tenantSignoff: "signed" }, wall!] }],
  };
  const finalised = { ...signed, style: "report", finalisedAt: "2026-11-18T18:00:00Z" };
  const parts = addressedElements(renderInstance("Inspections", finalised, "filled", theme));
  expect(parts.get("home/c1/r2/co_signed")?.text).toEqual(["Tenant co-signed"]);
  expect(parts.get("home/c1/r3/dispute")?.text).toEqual([
    "Tenant dispute: There is a crack behind the door.",
  ]);
  const { controller } = controls("Inspections", signed);
  expect(controller.act({ address: "c1/r2/note", action: "type", value: "New note" }).ok).toBe(false);
  expect(controller.press("c1/r2/sign").ok).toBe(false);
  controller.dispose();
  const read = readComponent(Inspections, finalised, "c1").join("\n");
  expect(read).not.toMatch(/\/(?:sign press|dispute type)/);
  expect(read).toContain("Tenant co-signed");
  expect(
    Inspections.props.safeParse({
      ...signed,
      rooms: [{ ...room, checks: [{ ...door, tenantSignoff: "signed", disputeComment: "Disputed" }] }],
    }).success,
  ).toBe(false);
});
