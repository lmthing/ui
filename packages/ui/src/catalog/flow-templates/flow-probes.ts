import { z } from "zod";
import type { JsonSchema, WriterFormat } from "../format";
import type { ProbeCall } from "../probes";
import type { RegistryLike } from "../rules";
import { fillFlow, optionalFlowSteps } from "./fill-flow";
import { checkFlowPreview, flowPreviewScreen } from "./preview-screen";
import type { FlowTemplateSource } from "./registry";

type Probe = {
  kind: "pick" | "fill";
  request: string;
  prompt: string;
  format: WriterFormat;
  score: (reply: string) => void;
  definition: unknown;
};

function object(properties: Record<string, JsonSchema>): JsonSchema {
  return { type: "object", properties, required: Object.keys(properties), additionalProperties: false };
}

function format(kind: string, properties: Record<string, JsonSchema>): WriterFormat {
  return { type: "json_schema", json_schema: { name: kind, strict: true, schema: object(properties) } };
}

function pickProbes(template: FlowTemplateSource, menu: readonly FlowTemplateSource[]): Probe[] {
  const ids = menu.map(({ id }) => id);
  const options = menu.map(({ id, purpose, pick, avoid }) => `${id}: ${purpose} ${pick} ${avoid}`);
  return template.probes.pick.map(({ request, expect }) => ({
    kind: "pick",
    request,
    prompt: [
      "Pick the single journey template that best fits the person's full job, not a step within it.",
      "Use null if no template fits. Return only JSON with a template field.",
      ...options,
      `Request: ${request}`,
    ].join("\n"),
    format: format("flow_pick", { template: { type: ["string", "null"], enum: [...ids, null] } }),
    score(reply) {
      const answer = z.strictObject({ template: z.string().nullable() }).parse(JSON.parse(reply)).template;
      if (answer !== expect) throw new Error(`Expected ${expect}, got ${answer}`);
    },
    definition: { request, expect, options },
  }));
}

function fillProbes(template: FlowTemplateSource, defs: RegistryLike): Probe[] {
  const optional = optionalFlowSteps(template);
  const names = object(Object.fromEntries(template.nameSlots.map((name) => [name, { type: "string" }])));
  const record = object(
    Object.fromEntries(Object.entries(template.recordShape).map(([field, type]) => [field, { type }])),
  );
  return template.probes.fill.map(({ request, expect }) => ({
    kind: "fill",
    request,
    prompt: [
      "Fill the template's name slots and its single shared record. Copy supplied values verbatim.",
      "List only optional step addresses to omit, or use an empty array if none need omitting.",
      "Return only JSON with names, record and omit. Do not write screens.",
      template.purpose,
      ...(template.writeHints ?? []),
      `Name slots: ${template.nameSlots.join(", ")}.`,
      `Record shape: ${JSON.stringify(template.recordShape)}.`,
      `Optional step addresses: ${optional.join(", ") || "none"}.`,
      `Request: ${request}`,
    ].join("\n"),
    format: format("flow_fill", { names, record, omit: { type: "array", items: { type: "string" } } }),
    score(reply) {
      const input = JSON.parse(reply);
      const flow = fillFlow(template, input);
      for (const group of ["names", "record"] as const)
        for (const [key, value] of Object.entries(expect?.[group] ?? {}))
          if (input[group][key] !== value) throw new Error(`Did not preserve the requested ${group}.${key}`);
      for (const [index, frame] of flow.frames.entries()) {
        const issues = checkFlowPreview(flowPreviewScreen(flow, index), defs);
        if (issues.length)
          throw new Error(`${frame.key}: ${issues.map(({ message }) => message).join("; ")}`);
      }
    },
    definition: { request, expect, optional, shape: template.recordShape, steps: template.journeys },
  }));
}

async function checkProbe(probe: Probe, id: string, call: ProbeCall, samples: number) {
  const results: { reply?: string; error?: string }[] = [];
  for (let sample = 0; sample < samples; sample++) {
    let reply: string | undefined;
    try {
      reply = await call(probe.prompt, sample, probe.format, {
        id,
        definition: probe.definition,
        localPrompt: probe.request,
        samples,
      });
      probe.score(reply);
      results.push({ reply });
    } catch (error) {
      results.push({ ...(reply === undefined ? {} : { reply }), error: (error as Error).message });
    }
  }
  const passed = results.filter((result) => !result.error).length;
  return {
    id,
    kind: probe.kind,
    request: probe.request,
    passed: passed > samples / 2,
    score: `${passed}/${samples}`,
    samples: results,
  };
}

export function runFlowProbes(
  template: FlowTemplateSource,
  menu: readonly FlowTemplateSource[],
  defs: RegistryLike,
  call: ProbeCall,
  samples: number,
  only?: string,
) {
  const probes = [
    ...pickProbes(template, menu).map((probe, i) => ({ key: `pick_${i + 1}`, probe })),
    ...fillProbes(template, defs).map((probe, i) => ({ key: `fill_${i + 1}`, probe })),
  ].filter(({ key }) => !only || key === only);
  if (!probes.length) throw new Error(`Unknown probe for ${template.id}: ${only}`);
  return Promise.all(
    probes.map(({ key, probe }) => checkProbe(probe, `${template.id}/${key}`, call, samples)),
  );
}
