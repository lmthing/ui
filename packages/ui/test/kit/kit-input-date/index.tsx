import { z } from "zod";
import { type Definition, type ThemeChoice } from "@lmthing/ui/catalog";
import { KitInput, KitText } from "@lmthing/ui/kit";

const props = z.strictObject({ on: z.iso.date() });
const seed = { on: "2026-11-21" };
export const dateDefinition = {
  props,
  meta: {
    id: "DateFixture",
    group: "input",
    purpose: "Enter a date.",
    pick: "",
    region: "body",
    weight: 1,
    tier: "phone",
    realPath: "A date stored on the device.",
    parts: ["root", "date"],
    set: { date: { type: "date", prop: "on" } },
    actions: { parts: { date: ["set"] } },
    read: (input) => [`Date ${(input as z.output<typeof props>).on}`],
  },
  examples: [seed],
  fallback: () => seed,
  probes: [],
} satisfies Definition;

export const dateTheme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;
export const dateDefs = { DateFixture: dateDefinition };
export const dateScreen = { id: "home", components: [{ id: "c1", c: "DateFixture", ...seed }] };
export const dateAddress = "home/c1/date";

export function DateFixture({ on }: z.output<typeof props>) {
  return (
    <>
      <KitText part="root" role="label">
        Date
      </KitText>
      <KitInput part="date" kind="date" action="set" projected hint="YYYY-MM-DD" label="Date" value={on} />
    </>
  );
}
