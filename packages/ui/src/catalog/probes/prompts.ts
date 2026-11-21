import { z } from "zod";
import type { Definition } from "./types";
import {
  atDeviceTime,
  driveTarget,
  planAct,
  readComponent,
  readScreen,
  selectionBindingFor,
  type ActStep,
  type DeviceData,
  type ScreenLike,
} from "../agent";
import {
  buildBlock,
  buildEntry,
  variantVocabulary,
  writerFigures,
  writerItemTone,
  writerVariants,
} from "../prompt";
import { media, text } from "../props";
import { exampleDeviceData, selectionFixture, type ReadProbeFixture } from "./fixtures";

export function choosePrompt(defs: readonly Definition[], need: string): string {
  return [
    "You choose the one UI component that best fits a need on a phone app screen.",
    "Components:",
    // Preserve the choice order used by recordings; standalone blocks sort by group then id.
    defs
      .map((def) => buildBlock({ defs: [def], packOf: {} }, "core"))
      .filter(Boolean)
      .join("\n"),
    "",
    `Need, in the person's words: "${need}"`,
    "Reply with only the component id, nothing else.",
  ].join("\n");
}

export function writePrompt(def: Definition, brief: string): string {
  const hasVariants = def.meta.variants || def.meta.items?.variants;
  const hasFiguresAndDensity = def.meta.variants?.density && def.meta.variants.figures;
  return [
    "You write one UI component of a phone app as a single JSON line.",
    "Use only the listed props. Respect every limit (≤N is a maximum length, [a..b] an item count).",
    "Use null for an optional prop (name?) when you have nothing for it: never write an empty string.",
    ...(hasVariants ? [variantVocabulary] : []),
    buildEntry(def),
    "",
    ...(hasVariants
      ? [
          def.meta.variants?.density
            ? writerVariants
            : "Each variant is independent. Use JSON null for every unrequested component or row variant, even if a different variant was requested. Do not fill in defaults.",
        ]
      : []),
    ...(hasFiguresAndDensity ? [writerFigures] : []),
    ...(hasFiguresAndDensity && def.meta.items?.variants?.tone ? [writerItemTone] : []),
    `Brief: ${brief}`,
  ].join("\n");
}

function mountSelectionSource(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  def: Definition,
  instance: string,
  data?: DeviceData,
): ActStep | undefined {
  const binding = def.meta.selectionBinding;
  if (!binding) return;
  const { component: c, check: part } = binding;
  const id = binding.source ?? (instance === "source" ? "source2" : "source");
  const {
    defs: { Table },
    tableEntry,
  } = selectionFixture();
  if (id === instance || c === def.meta.id)
    throw new Error(`Conflicting selection source for ${def.meta.id} read fixture`);
  defs[c] = {
    ...Table,
    meta: {
      ...Table.meta,
      id: c,
      items: { ...Table.meta.items!, parts: [part] },
      live: { checks: { [part]: "checked" } },
      actions: {
        ...Table.meta.actions,
        items: { root: ["press"], [part]: ["check"] },
        when: { [part]: { selectable: true } },
      },
    },
  };
  screen.components.unshift({ rows: tableEntry.rows, id, c });
  const check = selectionBindingFor(screen, defs, def.meta, instance, {}, data)?.checks[0];
  if (!check) throw new Error(`No selectable ${c} rows for ${def.meta.id} read fixture`);
  return { address: check.address, action: "check", value: true };
}

/** Read fixtures are data-only. A drive target must offer seek and cover the example's offsets. */
function mountSeekTarget(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  def: Definition,
  input: object,
  data?: DeviceData,
) {
  const c = def.meta.drives;
  if (c === undefined) return;
  if (Object.hasOwn(defs, c)) throw new Error(`Conflicting seek target for ${def.meta.id} read fixture`);
  let id = "target";
  for (let n = 2; screen.components.some((entry) => entry.id === id); n++) id = `target${n}`;
  const parsed = def.props.parse(input) as Record<string, unknown>;
  const rows = parsed[def.meta.items?.key ?? ""];
  const seconds = Math.max(1, ...(Array.isArray(rows) ? rows.map((row) => Number(row.at) || 0) : []));
  const wire = { media: "lib:fixture", title: "Recording", seconds };
  defs[c] = {
    meta: {
      id: c,
      group: "content",
      purpose: "Play one recording.",
      pick: "Seek target for a read fixture.",
      region: "body",
      weight: 1,
      tier: "phone",
      realPath: "Read a recording on this device.",
      parts: ["scrubber"],
      actions: { parts: { scrubber: ["seek"] } },
    },
    props: z.strictObject({ media, title: text(40), seconds: z.int().positive() }),
    fallback: () => wire,
    examples: [wire],
    probes: [],
  };
  screen.components.unshift({ ...wire, id, c });
  if (!driveTarget(def.meta, screen, defs, {}, data))
    throw new Error(`No seek offer for ${c} in ${def.meta.id} read fixture`);
}

function readAfterSetup(
  def: Definition,
  input: unknown,
  instance: string,
  lang: string | undefined,
  fixture?: ReadProbeFixture,
  deviceData?: DeviceData,
): string {
  const id = "home",
    c = def.meta.id;
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error(`Missing example props for ${c} read fixture`);
  const screen: ScreenLike = { id, components: [{ ...input, c, id: instance }] };
  const defs: Record<string, Definition> = { [c]: def };
  const check = mountSelectionSource(screen, defs, def, instance, deviceData);
  mountSeekTarget(screen, defs, def, input, deviceData);
  const steps = check ? [check] : [];
  if (fixture) {
    const { part, ...step } = fixture;
    steps.push({ ...step, address: `${instance}/${part}` });
  }
  // Plan with deterministic fixture entropy so live sampling and replay use the same screen.
  const result = planAct(screen, defs, {}, steps, null, "planner", deviceData);
  if (!result.ok) throw new Error(`Could not set up ${c} read fixture: ${result.code}`);
  return readScreen(screen, defs, result.values, lang, deviceData);
}

/** The screen as the model reads it, then a task: reply with where to act and how. */
export function readPrompt(
  def: Definition,
  screen: number,
  instance: string,
  task: string,
  lang?: string,
  fixture?: ReadProbeFixture,
  at?: number,
): string {
  const input = def.examples[screen];
  const { meta } = def;
  const records =
    meta.deviceData?.length && meta.previewDeviceData
      ? exampleDeviceData(meta, def.props.parse(input) as Record<string, unknown>, "filled")
      : undefined;
  const deviceData = at === undefined ? records : atDeviceTime(records, at);
  const reading =
    fixture || meta.selectionBinding || meta.drives
      ? readAfterSetup(def, input, instance, lang, fixture, deviceData)
      : ["screen home", ...readComponent(def, input, instance, undefined, undefined, lang, deviceData)].join(
          "\n",
        );
  return [
    "You operate a phone app for a person. You see the screen as text: one line per component,",
    "items indented. Text in quotes is content. Each action is in square brackets and starts with its",
    "address: [l1/r2/trail toggle:off] means address l1/r2/trail, action toggle. Copy the address",
    "exactly. The action is the word written in that bracket (type, select, increment, press, …),",
    "never a different action and never the → or : part.",
    "",
    reading,
    "",
    `Task: ${task}`,
    'Reply with only JSON: {"address": "<address>", "action": "<action>"}',
  ].join("\n");
}
