import type { z } from "zod";
import type { Meta, PackId } from "../meta";
import type { Axis, AxisValue, CastLike } from "../types";
import type { WriterFormat } from "../format";
import type { ScreenLike } from "../agent";

export type ChooseProbe = { kind: "choose"; need: string; expect: string };
type VariantExpectation = {
  [A in Axis]: { axis: A; value: AxisValue<A> | null; item?: number; itemTitles?: readonly string[] };
}[Axis];
export type ExpectedProp = string | number | boolean | null | readonly ExpectedProp[] | ExpectedProps;
export type ExpectedProps = { readonly [field: string]: ExpectedProp };
export type WriteProbe = {
  kind: "write";
  brief: string;
  expect: string;
  variant?: VariantExpectation;
  /** Authored values the sample must include, before schema defaults are applied. */
  expectProps?: ExpectedProps;
};
export type ReadProbe = {
  kind: "read";
  screen: number;
  task: string;
  /** Fixed host time in epoch milliseconds for a time-gated example. */
  at?: number;
  /** Parsed wire fixtures for sibling destinations or playback sources on this example screen. */
  siblings?: readonly ScreenLike["components"][number][];
  expect: { address: string; action: string };
};
export type PackProbe = {
  kind: "pack";
  idea: string;
  expect: readonly PackId[];
  allow?: readonly PackId[];
};
export type Probe = ChooseProbe | WriteProbe | ReadProbe;

export type FallbackInput = { cast: CastLike; lang?: string | undefined };

/** What every component file exports, minus its view. */
export type Definition = {
  meta: Meta;
  props: z.ZodObject;
  fallback: (input: FallbackInput) => unknown;
  examples: readonly unknown[];
  probes: readonly Probe[];
};

/** One model call. `sample` numbers repeated calls with the same prompt (0, 1, 2, …). */
export type CallModel = (prompt: string, sample?: number, format?: WriterFormat) => Promise<string>;

/** Offline identity for one probe, separate from the exact request sent to the model. */
export type ReplayProbe = {
  id: string;
  definition: unknown;
  localPrompt: string;
  /** Real component definitions can contain refinements and metadata functions. */
  sourceComponent?: string;
  samples?: number;
  /** When present, the other entries in this listing do not affect replay identity. */
  listing?: { ids: readonly string[] };
};

export type ProbeCall = (
  prompt: string,
  sample: number,
  format: WriterFormat | undefined,
  probe: ReplayProbe,
) => Promise<string>;

export type ProbeResult = {
  component: string;
  probe: Probe | PackProbe;
  status: "pass" | "fail" | "skipped";
  prompt: string;
  reply: string;
  detail: string;
  /** How many samples passed, of how many ran ("2/3"). */
  score?: string;
};
