import { vi } from "vitest";
import { z } from "zod";
import { text, type Definition, type DeviceData } from "@lmthing/ui/catalog";
import { createAgentAccess, createScreenController, type HostCommandResult } from "@lmthing/ui/kit";

const row = z.strictObject({ id: z.string(), domainId: z.string(), label: text(30) });
export const def = {
  meta: {
    id: "CommandsFixture",
    group: "action",
    purpose: "Run an operation.",
    pick: "Run a host operation.",
    region: "body",
    weight: 1,
    tier: "service",
    confirmParts: ["begin"],
    loadingActions: ["abort.stop", "refresh.press"],
    realPath: "An adapter acknowledges a request.",
    items: {
      key: "rows",
      parts: ["root", "abort"],
      deviceData: { schema: row, rows: (data) => data.targets ?? [] },
    },
    deviceData: ["targets"],
    actions: {
      parts: { begin: ["start"], abort: ["stop"], refresh: ["press"], local: ["press"] },
      items: { root: ["start"], abort: ["stop"] },
    },
    hostCommands: {
      identity: ({ row }) => (row ? String(row.domainId) : "session"),
      readFields: ["summary"],
      parts: {
        "begin.start": { kind: "command", name: "begin" },
        "abort.stop": { kind: "cancel" },
      },
      items: {
        "root.start": {
          kind: "command",
          name: "begin",
          input: ({ row }) => ({ key: String(row?.domainId) }),
        },
        "abort.stop": { kind: "cancel" },
      },
    },
  },
  props: z.strictObject({}),
  fallback: () => ({}),
  examples: [],
  probes: [],
} satisfies Definition;

export const begin = { address: "control/begin", action: "start" };
export const confirm = { address: "confirm/confirm", action: "press" };
export const stop = { address: "control/abort", action: "stop" };
export const r1 = { address: "control/r1", action: "start" };
export const r2 = { address: "control/r2", action: "start" };
export const initialRows = [
  { id: "r1", domainId: "first", label: "First" },
  { id: "r2", domainId: "second", label: "Second" },
];

export function fixture(state?: "loading") {
  let data: DeviceData = { targets: initialRows };
  const screen = { id: "home", components: [{ id: "control", c: def.meta.id, ...(state ? { state } : {}) }] };
  const defs = { [def.meta.id]: def };
  const allows = vi.fn(() => true);
  const calls: { signal: AbortSignal; resolve: (result: HostCommandResult) => void }[] = [];
  const host = {
    allows,
    run: vi.fn(
      (_request, { signal }: { signal: AbortSignal }) =>
        new Promise<HostCommandResult>((resolve) => calls.push({ signal, resolve })),
    ),
  };
  const onAction = vi.fn();
  const controller = createScreenController({
    screen,
    defs,
    get deviceData() {
      return data;
    },
    hostCommands: { commands: { begin: host } },
    requireMounted: true,
    onAction,
  });
  for (const part of ["begin", "abort", "refresh", "local", "r1", "r1/abort", "r2", "r2/abort"])
    controller.registerPart(`control/${part}`);
  const agent = createAgentAccess({
    defs,
    store: controller.store,
    current: () => screen,
    runtime: controller,
  });
  return {
    controller,
    calls,
    host,
    onAction,
    agent,
    setData: (next: DeviceData) => {
      data = next;
    },
  };
}
