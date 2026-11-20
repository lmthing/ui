import { expect, it, vi } from "vitest";
import { components, type DeviceData, type ScreenLike } from "@lmthing/ui/catalog";
import { createScreenController } from "../index";

const visible = { records: [{}] };
const hidden = { records: [] };
const gate = {
  deviceData: ["records"],
  deviceDataVisible: (data: DeviceData) => Boolean(data.records?.length),
};
const press = (address: string) => ({ address, action: "press" });

it("does not stage a hidden sheet when an opener is pressed", () => {
  let deviceData: DeviceData = hidden;
  const screen: ScreenLike = {
    id: "home",
    components: [
      { id: "opener", c: "Button", label: "Open", goto: "sheet" },
      { id: "sheet", c: "Sheet", ...components.Sheet.examples[0] },
    ],
  };
  const def = components.Sheet;
  const runtime = createScreenController({
    screen,
    defs: { ...components, Sheet: { ...def, meta: { ...def.meta, ...gate } } },
    get deviceData() {
      return deviceData;
    },
  });
  expect(runtime.act(press("opener"))).toMatchObject({ ok: false, code: "not_actionable" });
  expect(runtime.store.get("home/$sheet")).toBeUndefined();
  deviceData = visible;
  expect(runtime.read()).not.toContain("sheet Sheet");
  expect(runtime.act(press("opener"))).toMatchObject({ ok: true });
  expect(runtime.store.get("home/$sheet")).toBe("sheet");
  runtime.dispose();
});

it("discards a hidden confirmation rather than reviving it after a rejected press", () => {
  let deviceData: DeviceData = visible;
  const screen: ScreenLike = {
    id: "home",
    components: [{ id: "go", c: "Button", label: "Open", confirm: "Open?", goto: "detail" }],
  };
  const onLink = vi.fn();
  const def = components.Button;
  const runtime = createScreenController({
    screen,
    defs: { Button: { ...def, meta: { ...def.meta, ...gate } } },
    onLink,
    get deviceData() {
      return deviceData;
    },
  });
  const confirm = press("confirm/confirm");
  expect(runtime.act(press("go"))).toMatchObject({ ok: true });
  expect(runtime.confirmation).toBeDefined();
  deviceData = hidden;
  expect(runtime.act(confirm)).toMatchObject({ ok: false, code: "not_actionable" });
  deviceData = visible;
  expect(runtime.confirmation).toBeUndefined();
  expect(runtime.act(confirm)).toMatchObject({ ok: false, code: "not_actionable" });
  expect(onLink).not.toHaveBeenCalled();
  runtime.dispose();
});
