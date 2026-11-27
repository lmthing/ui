import { describe, expect, test } from "vitest";
import { flowTemplateRegistryOf, flowTemplateSchema, type FlowTemplate } from "../index";

const lookups = {
  component: (id: string) => id === "List",
  archetype: (id: string) => id === "form",
};

function fixture(): FlowTemplate {
  return {
    id: "send_item",
    purpose: "Pass an item to someone.",
    pick: "Someone needs to send an item to a recipient.",
    avoid: "Someone is updating an item for themselves.",
    nameSlots: ["recipient"],
    recordShape: { title: "string", count: "number", received: "boolean" },
    journeys: [
      {
        role: "sender",
        id: "send",
        name: "Send to {name.recipient}",
        goal: "Send {record.title}",
        steps: [
          {
            id: "draft",
            see: "An empty item form",
            do: "Type {record.title} in the title field",
            layout: { archetype: "form" },
            states: ["empty", "error"],
            optional: true,
          },
          {
            id: "share",
            see: "{record.title}, ready to send",
            do: "Tap Send",
            hands_off_to: { role: "recipient", step: "inbox" },
            layout: { archetype: "form" },
            states: ["waiting", "error"],
          },
        ],
      },
      {
        role: "recipient",
        id: "receive",
        name: "Receive an item",
        goal: "See the new item",
        steps: [
          {
            id: "inbox",
            see: "{record.title} at the top of the inbox",
            layout: { components: ["List"] },
            states: ["success"],
          },
        ],
      },
    ],
    examples: [
      { id: "notes", names: { recipient: "Alex" }, record: { title: "Notes", count: 1, received: true } },
      { id: "files", names: { recipient: "Sam" }, record: { title: "Files", count: 2, received: false } },
    ],
    probes: {
      pick: [
        { request: "Let me pass a draft to a colleague.", expect: "send_item" },
        { request: "Let me rename my own draft.", expect: null },
      ],
      fill: [{ request: "Let me send an item to Sam." }],
    },
  };
}

describe("flow template catalog contract", () => {
  test("looks up scoped journeys in definition order, preserving a shared typed record", () => {
    const template = fixture();
    const other = fixture();
    other.id = "forward_item";
    other.probes.pick[0]!.expect = other.id;
    template.probes.pick[1]!.expect = other.id;
    const registry = flowTemplateRegistryOf([template, other], lookups);
    expect(registry.list).toEqual([template, other]);
    expect(registry.get("send_item")).toBe(registry.list[0]);
    expect(registry.get("send_item")?.examples[0]?.record).toEqual({
      title: "Notes",
      count: 1,
      received: true,
    });
    expect(registry.get("not_a_template")).toBeUndefined();
    expect(registry.get("constructor")).toBeUndefined();
  });

  test("rejects malformed wire shapes, ambiguous layouts and out-of-contract states", () => {
    const template = fixture();
    expect(flowTemplateSchema.safeParse({ ...template, purpose: "" }).success).toBe(false);
    expect(flowTemplateSchema.safeParse({ ...template, brand: "Extra" }).success).toBe(false);
    const step = template.journeys[0]!.steps[0]!;
    step.layout = { archetype: "form", components: ["List"] };
    expect(flowTemplateSchema.safeParse(template).success).toBe(false);
    step.layout = { archetype: "form" };
    step.states.push("empty");
    expect(flowTemplateSchema.safeParse(template).success).toBe(false);
    expect(flowTemplateSchema.safeParse({ ...template, journeys: [] }).success).toBe(false);
  });

  test("rejects unresolved slots, layout ids and hand-offs", () => {
    const template = fixture();
    template.journeys[0]!.goal = "Send {record.unknown} to {name.unknown}";
    template.journeys[0]!.steps[0]!.layout = { archetype: "missing" };
    template.journeys[0]!.steps[1]!.hands_off_to = { role: "recipient", step: "none" };
    template.journeys[1]!.steps[0]!.layout = { components: ["Missing"] };
    expect(() => flowTemplateRegistryOf([template], lookups)).toThrow(
      [
        "send_item: Undeclared slot: {record.unknown}",
        "send_item: Undeclared slot: {name.unknown}",
        "send_item: Unknown archetype: missing",
        "send_item: Invalid hand-off: sender/share -> recipient/none",
        "send_item: Unknown component: Missing",
      ].join("\n"),
    );
  });

  test("requires a hand-off destination that remains if optional steps are dropped", () => {
    const template = fixture();
    template.journeys[1]!.steps[0]!.optional = true;
    delete template.journeys[0]!.steps[0]!.do;
    expect(() => flowTemplateRegistryOf([template], lookups)).toThrow(
      "Missing action or hand-off: sender/draft",
    );
    expect(() => flowTemplateRegistryOf([template], lookups)).toThrow(
      "Invalid hand-off: sender/share -> recipient/inbox",
    );
  });

  test("checks sample field names, types and completeness", () => {
    const template = fixture();
    template.examples[0]!.record = { title: true, count: 1, extra: "Unexpected" };
    template.examples[0]!.names = {};
    expect(() => flowTemplateRegistryOf([template], lookups)).toThrow(
      [
        "send_item: notes: Missing name slot recipient",
        "send_item: notes: Record field title must be string",
        "send_item: notes: Record field received must be boolean",
        "send_item: notes: Unknown record field extra",
      ].join("\n"),
    );
  });

  test("rejects duplicate definitions and roles, and requires valid probe expectations", () => {
    const template = fixture();
    expect(() => flowTemplateRegistryOf([template, template], lookups)).toThrow("Duplicate template id");
    template.journeys[1]!.role = template.journeys[0]!.role;
    template.probes.pick[0]!.expect = "not_in_registry";
    expect(() => flowTemplateRegistryOf([template], lookups)).toThrow("Duplicate role slot: sender");
    expect(() => flowTemplateRegistryOf([template], lookups)).toThrow(
      "Pick probes must include a match and a near miss",
    );
    expect(() => flowTemplateRegistryOf([template], lookups)).toThrow(
      "Unknown pick probe result: not_in_registry",
    );
  });
});
