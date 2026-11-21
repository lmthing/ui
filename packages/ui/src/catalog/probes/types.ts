import type { z } from "zod";
import type { Meta, PackId } from "../meta";
import type { Axis, AxisValue, CastLike } from "../types";
import type { WriterFormat } from "../format";

export type ChooseProbe = { kind: "choose"; need: string; expect: string };
type VariantExpectation = {
  [A in Axis]: { axis: A; value: AxisValue<A> | null; item?: number; itemTitles?: readonly string[] };
}[Axis];
export type WriteProbe = {
  kind: "write";
  brief: string;
  expect: string;
  variant?: VariantExpectation;
  /** Exact values at dot-separated wire paths, with zero-based indexes for arrays. */
  fields?: Readonly<Record<string, string | number | boolean>>;
};
export type ReadProbe = {
  kind: "read";
  screen: number;
  task: string;
  /** Fixed host time in epoch milliseconds for a time-gated example. */
  at?: number;
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
