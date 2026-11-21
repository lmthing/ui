import { parseArgs } from "node:util";
import { presets } from "../../../src/catalog";

const modes = ["light", "dark"] as const;
type Mode = (typeof modes)[number];
type Preset = (typeof presets)[number]["id"];
const presetIds = presets.map(({ id }) => id);

const usage =
  "Usage: pnpm look --component <Id> [--widths <px,...>] [--preset <id,...>] [--mode <light|dark,...>] [--all]";

function list<T>(values: string[], flag: string, parse: (value: string) => T | undefined): T[] {
  return [
    ...new Set(
      values.flatMap((value) =>
        value.split(",").map((entry) => {
          const parsed = parse(entry.trim());
          if (parsed === undefined) throw new Error(`Invalid ${flag} value: ${JSON.stringify(entry)}`);
          return parsed;
        }),
      ),
    ),
  ];
}

export type LookOptions = {
  id: string;
  widths: number[];
  modes: Mode[];
  presets: Preset[];
  all: boolean;
};

export function lookArgs(args: readonly string[]): LookOptions {
  const { values } = parseArgs({
    args: [...args],
    options: {
      component: { type: "string" },
      widths: { type: "string", multiple: true },
      preset: { type: "string", multiple: true },
      mode: { type: "string", multiple: true },
      all: { type: "boolean" },
    },
  });
  if (!values.component) throw new Error(usage);
  if (!/^[A-Z][A-Za-z0-9]*$/.test(values.component))
    throw new Error(`Invalid component id: ${values.component}`);
  const all = values.all ?? false;
  return {
    id: values.component,
    widths: values.widths
      ? list(values.widths, "--widths", (value) => {
          const width = Number(value);
          return /^\d+$/.test(value) && Number.isSafeInteger(width) && width > 0 ? width : undefined;
        })
      : all
        ? [320, 390, 430]
        : [390],
    modes: values.mode
      ? list(values.mode, "--mode", (value) => modes.find((id) => id === value))
      : all
        ? [...modes]
        : ["light"],
    presets: values.preset
      ? list(values.preset, "--preset", (value) => presetIds.find((id) => id === value))
      : all
        ? presetIds.slice()
        : ["calm"],
    all,
  };
}
