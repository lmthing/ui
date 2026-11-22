import { z } from "zod";
import type { Definition, ScreenLike } from "@lmthing/ui/catalog";

export const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
export const scope = { screen: "test", rev: 1, state: "filled" } as const;
export const defs = {
  ControlsFixture: {
    meta: {
      id: "ControlsFixture",
      group: "input",
      purpose: "Test the base controls.",
      pick: "Test the base controls.",
      region: "body",
      tier: "phone",
      realPath: "Test only.",
      weight: 1,
      partTiers: { record: "ok", root: "ok" },
      actions: {
        parts: {
          hold: ["press"],
          record: ["start", "stop"],
          record_other: ["start", "stop"],
          root: ["start", "stop"],
          ok: ["press"],
          up: ["press"],
          down: ["press"],
          left: ["press"],
          right: ["press"],
          back: ["press"],
          home: ["press"],
          voice: ["press"],
          play: ["play", "pause"],
          volume_down: ["decrement"],
          volume_up: ["increment"],
          mute: ["toggle"],
        },
      },
    },
    props: z.strictObject({}),
    examples: [],
    fallback: () => ({}),
    probes: [],
  },
} satisfies Record<string, Definition>;
export const screen: ScreenLike = {
  id: scope.screen,
  components: ["hold", "remote", "mic"].map((id) => ({ id, c: "ControlsFixture" })),
};
