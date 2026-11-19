export type Tier = 1 | 2 | 3;

export type RunInput = {
  prompt: string;
  /** JSON Schema the output must match; every engine enforces it its own way. */
  schema: object;
  signal: AbortSignal;
  /** Called with the full text so far, as it grows. */
  onText: (text: string) => void;
  onStatus: (status: string) => void;
};

export type Engine = {
  tier: Tier;
  /** "Chrome built-in AI", "WebLLM", "Recorded replay". */
  label: string;
  /** The model that wrote the output, as the visitor should read it. */
  model: string;
  run: (input: RunInput) => Promise<void>;
};
