import type { z } from "zod";
import type { Meta } from "../meta";
import type { CastLike } from "../types";

export type ChooseProbe = { kind: "choose"; need: string; expect: string };
export type WriteProbe = { kind: "write"; brief: string; expect: string };
export type ReadProbe = {
  kind: "read";
  screen: number;
  task: string;
  expect: { address: string; action: string };
};
export type Probe = ChooseProbe | WriteProbe | ReadProbe;

/** What every component file exports, minus its view. */
export type Definition = {
  meta: Meta;
  props: z.ZodObject;
  fallback: (input: { cast: CastLike }) => unknown;
  examples: readonly unknown[];
  probes: readonly Probe[];
};

export type CallModel = (prompt: string) => Promise<string>;

export type ProbeResult = {
  component: string;
  probe: Probe;
  status: "pass" | "fail" | "skipped";
  prompt: string;
  reply: string;
  detail: string;
};
