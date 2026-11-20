import { describe, expect, it } from "vitest";
import { components, readComponent, readPrompt, type CastLike, type Definition } from "@lmthing/ui/catalog";

const contracts = [
  [components.GuestList, "People", "people", 3],
  [components.RSVP, "Choice", "people", 2],
  [components.Seating, "MapPins", "phone", 3],
  [components.Vendors, "List", "phone", 2],
  [components.Ticket, "KeyValue", "phone", 2],
  [components.Door, "Camera", "ok", 2],
  [components.Registry, "Checklist", "people", 3],
  [components.FindDate, "Calendar", "people", 3],
] as const;
const casts: CastLike[] = [
  { things: [], items: [] },
  {
    things: [{ type: "example", fields: ["name"] }],
    items: [{ id: "one", type: "example", name: "x".repeat(80), sample: true }],
  },
  { things: [], items: [{ id: "one", type: "example", name: 17, sample: true }] },
];

function verifiesProbes(def: Definition, miss: string) {
  const { meta, probes } = def;
  expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: meta.id }));
  expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: miss }));
  expect(probes).toContainEqual(expect.objectContaining({ kind: "write", expect: meta.id }));
  const reads = probes.filter((p) => p.kind === "read");
  if (meta.actions) expect(reads.length).toBeGreaterThan(0);
  for (const probe of reads) {
    const { address, action } = probe.expect;
    const prompt = readPrompt(def, probe.screen, address.split("/")[0]!, probe.task);
    expect(prompt).toMatch(new RegExp(`\\[${address} ${action}(?=[:→\\] ])`));
  }
}

describe("events component contracts", () => {
  it.each(contracts.map(([def, miss, tier, weight]) => ({ id: def.meta.id, def, miss, tier, weight })))(
    "$id parses its examples and fallback and declares reachable probes",
    ({ def, miss, tier, weight }) => {
      expect(def.props.safeParse({ ...def.examples[0], color: "#ffffff" }).success).toBe(false);
      expect(def.examples.length).toBeGreaterThanOrEqual(2);
      for (const example of def.examples) expect(def.props.safeParse(example).success).toBe(true);
      for (const cast of casts) expect(def.props.safeParse(def.fallback({ cast })).success).toBe(true);
      expect(def.meta).toMatchObject({ tier, weight, region: "body" });
      if (weight === 3) expect(def.meta).toHaveProperty("dense", true);
      if (def.meta.status === "draft") expect(def).not.toHaveProperty(def.meta.id);
      verifiesProbes(def, miss);
    },
  );

  it("rejects counts, dates, invalid choices and writer-owned guesses", () => {
    const invalid = {
      GuestList: [{ guests: [] }, { guests: [{ ...components.GuestList.examples[0]!.guests[0], plus: 5 }] }],
      RSVP: [
        { ...components.RSVP.examples[0], date: "2027-02-29" },
        { ...components.RSVP.examples[0], meals: Array(5).fill("Pasta") },
      ],
      Seating: [
        { tables: [{ label: "Oak", shape: "round", seats: 2, guests: ["A", "B", "C"] }], unseated: [] },
      ],
      Vendors: [{ vendors: [{ role: "hotel", name: "Hotel", cost: 1, paid: 0, booked: true }] }],
      Ticket: [
        { ...components.Ticket.examples[0], time: "24:00" },
        { ...components.Ticket.examples[0], number: "x".repeat(13) },
      ],
      Door: [{ hint: "x".repeat(41) }, { hint: "Scan here", arrivals: 17 }],
      Registry: [
        { gifts: [{ title: "Bowl", photo: "https://example.test/bowl", claimed: false }], host: false },
      ],
      FindDate: [
        { ...components.FindDate.examples[0], people: [{ name: "A", answers: ["yes", "no", "yes"] }] },
        { ...components.FindDate.examples[0], best: 1 },
      ],
    };
    for (const [id, inputs] of Object.entries(invalid))
      for (const input of inputs)
        expect(components[id as keyof typeof invalid].props.safeParse(input).success, id).toBe(false);
  });

  it("hides claimant names from the guest read and offers only the viewer's date cells", () => {
    const gift = { gifts: [{ title: "Bowl", claimed: true, by: "Private guest" }], host: false };
    expect(readComponent(components.Registry, gift, "g1").join("\n")).not.toContain("Private guest");
    const dates = readComponent(components.FindDate, components.FindDate.examples[0], "f1").join("\n");
    expect(dates).toContain("[f1/r1 select");
    expect(dates).toContain("[f1/r2 select");
    expect(dates).not.toContain("[f1/r3 select");
  });
});
