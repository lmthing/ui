import { useEffect, useMemo } from "react";
import { z } from "zod";
import type { Definition } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";

const meta = {
  group: "input",
  purpose: "Exercise keys",
  pick: "Use the test keys",
  region: "body",
  weight: 1,
  tier: "phone",
  realPath: "Local fixture",
} as const;
const props = z.strictObject({
  ready: z.boolean(),
  keys: z.array(z.strictObject({ label: z.string() })).optional(),
});
const definition = { props, fallback: () => ({ ready: true }), examples: [], probes: [] };
const defs = {
  Calc: {
    ...definition,
    meta: {
      ...meta,
      id: "Calc",
      parts: ["root", "keys"],
      actions: {
        parts: { root: ["type"], keys: ["type"] },
        when: { root: { ready: true }, keys: { ready: true } },
      },
    },
  },
  Letters: {
    ...definition,
    meta: {
      ...meta,
      id: "Letters",
      parts: ["root"],
      items: { key: "keys", parts: ["root", "letter"] },
      actions: {
        parts: { root: ["press"] },
        items: { root: ["press"], letter: ["press"] },
        when: { root: { ready: true }, letter: { ready: true } },
      },
    },
  },
  Orb: {
    ...definition,
    meta: {
      ...meta,
      id: "Orb",
      parts: ["root", "orb"],
      actions: {
        parts: { root: ["toggle"], orb: ["toggle"] },
        when: { root: { ready: true }, orb: { ready: true } },
      },
    },
  },
} satisfies Record<string, Definition>;

export function useFixtureController(
  ready: boolean,
  keys: readonly { label: string }[],
  record: (value: string) => void,
) {
  const controller = useMemo(
    () =>
      createScreenController({
        defs,
        requireMounted: true,
        screen: {
          id: "home",
          components: [
            { id: "calc", c: "Calc", ready },
            { id: "letters", c: "Letters", ready, keys: keys.map(({ label }) => ({ label })) },
            { id: "voice", c: "Orb", ready },
          ],
        },
        onAction: (step) => record(JSON.stringify(step)),
      }),
    [ready, keys, record],
  );
  useEffect(() => () => controller.dispose(), [controller]);
  return controller;
}
