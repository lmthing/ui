import { components, secret, type Definition } from "@lmthing/ui/catalog";
import { z } from "zod";

export const fakeSecret = "synthetic-reveal-value";
const def = {
  ...components.Header,
  meta: {
    ...components.Header.meta,
    id: "RevealFixture",
    tier: "service",
    parts: ["root", "reveal", "band"],
    items: { key: "rows", parts: ["root", "reveal"] },
    actions: {
      parts: { reveal: ["press"] },
      items: { reveal: ["press"] },
      reveal: { parts: ["reveal"], items: ["reveal"] },
    },
    read: (props) => [String((props as { code?: string }).code)],
  },
  props: z.strictObject({
    code: secret(32).optional(),
    goto: z.string().optional(),
    rows: z.array(z.strictObject({ code: secret(32) })).max(1),
  }),
} satisfies Definition;
export const defs = { RevealFixture: def, Button: components.Button };
export const entry = {
  id: "f1",
  c: def.meta.id,
  code: fakeSecret,
  goto: "elsewhere",
  rows: [{ code: fakeSecret }],
};
export const screen = {
  id: "home",
  components: [entry, { id: "b1", c: "Button", label: "Open overlay", confirm: "Open?", goto: "other" }],
};
export const revealStep = { address: "home/f1/reveal", action: "press" };
