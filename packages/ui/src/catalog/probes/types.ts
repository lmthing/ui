import type { z } from "zod";
import type { Meta, PackId } from "../meta";
import type { CastLike } from "../types";

export type ChooseProbe = { kind: "choose"; need: string; expect: string };
export type WriteProbe = { kind: "write"; brief: string; expect: string };
export type ReadProbe = {
  kind: "read";
  screen: number;
  task: string;
  expect: { address: string; action: string };
};
export type PackProbe = { kind: "pack"; idea: string; expect: readonly PackId[] };
export type Probe = ChooseProbe | WriteProbe | ReadProbe;

/** What every component file exports, minus its view. */
export type Definition = {
  meta: Meta;
  props: z.ZodObject;
  fallback: (input: { cast: CastLike }) => unknown;
  examples: readonly unknown[];
  probes: readonly Probe[];
};

/** One model call. `sample` numbers repeated calls with the same prompt (0, 1, 2, …). */
export type CallModel = (prompt: string, sample?: number) => Promise<string>;

export type ProbeResult = {
  component: string;
  probe: Probe;
  status: "pass" | "fail" | "skipped";
  prompt: string;
  reply: string;
  detail: string;
  /** How many samples passed, of how many ran ("2/3"). */
  score?: string;
};
