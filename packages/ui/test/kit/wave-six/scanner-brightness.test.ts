import { expect, it, vi } from "vitest";
import { components, planAct } from "@lmthing/ui/catalog";
import { createAgentAccess, createScreenController, type ScannerBrightnessAdapter } from "@lmthing/ui/kit";
import { createPreviewController } from "../../../../../apps/gallery/app/draw";

const def = components.PassCard;
const defs = { PassCard: def };
const input = { issuer: "Demo", title: "Pickup", code: "05120764", codeKind: "barcode", bright: true };
const screen = { id: "home", components: [{ ...input, id: "c1", c: "PassCard" }] };
const address = "home/c1/bright";
const step = { address, action: "toggle" };

function setup(initial?: ScannerBrightnessAdapter) {
  let host = initial;
  const controller = createScreenController({
    defs,
    screen,
    requireMounted: true,
    get hostCommands() {
      return host ? { scannerBrightness: host } : undefined;
    },
  });
  return {
    controller,
    agent: createAgentAccess({ defs, current: () => screen, store: controller.store, runtime: controller }),
    replace(adapter?: ScannerBrightnessAdapter) {
      host = adapter;
      controller.discardHiddenConfirmation();
    },
  };
}

it("leases brightness only for one mounted local toggle, never for a plan or agent", () => {
  let level = 0.4;
  const adapter = vi.fn<ScannerBrightnessAdapter>(({ signal }) => {
    const previous = level;
    level = 1;
    signal.addEventListener(
      "abort",
      () => {
        level = previous;
      },
      { once: true },
    );
    return true;
  });
  const { controller, agent } = setup(adapter);
  try {
    expect(controller.press(address).ok).toBe(false);
    controller.registerPart(address);
    expect(agent.read()).toContain("[c1/bright toggle !needs-ok]");
    expect(agent.read()).not.toContain(input.code);
    expect(agent.act(step, { agent: false }).ok).toBe(false);
    expect(planAct(screen, defs, {}, [step]).ok).toBe(false);
    expect(controller.act([step, step]).ok).toBe(false);
    expect(controller.act({ ...step, value: true }).ok).toBe(false);
    expect(controller.act(step, { dryRun: true })).toMatchObject({ ok: true, dryRun: true });
    expect(adapter).not.toHaveBeenCalled();
    expect(controller.press(address).ok).toBe(true);
    expect(adapter).toHaveBeenCalledExactlyOnceWith({ address, tier: "ok", signal: expect.any(AbortSignal) });
    expect(controller.scannerBrightnessStatus(address)).toBe("on");
    expect(level).toBe(1);
    expect(controller.store.snapshot()).toEqual({});
    expect(controller.snapshotScreen().components[0]).toMatchObject({ bright: true });
    expect(controller.press(address).ok).toBe(true);
    expect(controller.scannerBrightnessStatus(address)).toBe("off");
    expect(level).toBe(0.4);
  } finally {
    controller.dispose();
  }
});

it.each(["unmount", "replace", "disable", "reset", "dispose", "second tap", "host replacement"])(
  "aborts pending brightness on %s and ignores late acknowledgement",
  async (when) => {
    let resolve!: (accepted: boolean) => void;
    const adapter = vi.fn<ScannerBrightnessAdapter>(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const { controller, replace } = setup(adapter);
    try {
      const unmount = controller.registerPart(address);
      expect(controller.press(address).ok).toBe(true);
      expect(controller.scannerBrightnessStatus(address)).toBe("pending");
      const signal = adapter.mock.calls[0]![0].signal;
      if (when === "unmount") unmount();
      if (when === "replace") controller.registerPart(address);
      if (when === "disable") controller.registerDisabledPart(address);
      if (when === "reset") controller.reset();
      if (when === "dispose") controller.dispose();
      if (when === "second tap") expect(controller.press(address).ok).toBe(true);
      if (when === "host replacement") replace(() => true);
      expect(signal.aborted).toBe(true);
      resolve(true);
      await Promise.resolve();
      expect(controller.scannerBrightnessStatus(address)).toBe("off");
      expect(controller.store.get(address)).toBeUndefined();
    } finally {
      controller.dispose();
    }
  },
);

it("stays unzoomed without a host or after a rejection and allows a retry", async () => {
  const { controller, replace } = setup();
  try {
    controller.registerPart(address);
    expect(controller.press(address).ok).toBe(false);
    replace(async () => {
      throw new Error("Denied");
    });
    expect(controller.press(address).ok).toBe(true);
    await Promise.resolve();
    expect(controller.scannerBrightnessStatus(address)).toBe("failed");
    replace(() => true);
    expect(controller.press(address).ok).toBe(true);
    expect(controller.scannerBrightnessStatus(address)).toBe("on");
  } finally {
    controller.dispose();
  }
});

it("uses a deterministic, reversible fake in both normal and seeded gallery cells", () => {
  for (const active of [false, true]) {
    const runtime = createPreviewController(def, def.props.parse(input), "home", {
      state: "filled",
      ...(active ? { scanner: true } : {}),
    })!;
    try {
      expect(runtime.scannerBrightnessStatus(address)).toBe(active ? "on" : "off");
      expect(runtime.press(address).ok).toBe(true);
      expect(runtime.scannerBrightnessStatus(address)).toBe(active ? "off" : "on");
    } finally {
      runtime.dispose();
    }
  }
});
