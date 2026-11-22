import { components, type Definition } from "@lmthing/ui/catalog";
import { z } from "zod";

export const fixturePin = "020";
const fixtureDefinition = {
  ...components.Header,
  meta: {
    ...components.Header.meta,
    id: "PrivateFixture",
    parts: ["root", "pad", "value", "verify", "copy", "generated"],
    items: { key: "rows", parts: ["root"] },
    actions: {
      parts: { pad: ["type"], verify: ["press"], copy: ["copy"], generated: ["copy"] },
      items: { root: ["copy"] },
      authenticatedCopy: { parts: ["copy"], items: ["root"] },
      privateInput: { pad: { characters: "0123456789", maxLength: 3 } },
      privateVerify: { verify: "pad" },
    },
  },
  props: z.strictObject({ rows: z.array(z.strictObject({})) }),
} satisfies Definition;

export const defs = { PrivateFixture: fixtureDefinition };
export const screen = { id: "home", components: [{ id: "vault", c: fixtureDefinition.meta.id, rows: [{}] }] };
export const pad = "home/vault/pad";
export const copy = { address: "home/vault/copy", action: "copy" };
export const rowCopy = { address: "home/vault/r1/root", action: "copy" };
export const verify = { address: "home/vault/verify", action: "press" };
export const generated = { address: "home/vault/generated", action: "copy" };
