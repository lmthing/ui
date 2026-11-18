// The only place model names live. `required` models gate every component (replayed in tests).
// Calls go to the Azure OpenAI v1 API: AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY from the environment.
// `samples`: calls per probe; a probe passes when a majority pass, so one unlucky reply does not fail it
// and a weak probe shows as "unstable" instead of being retried until it passes.
export type ProbeModel = {
  id: string;
  deployment: string;
  required: boolean;
  maxTokens: number;
  samples: number;
};

export const probeModels: ProbeModel[] = [
  // The light model the product leans on: every component must pass on it.
  { id: "deepseek-flash", deployment: "DeepSeek-V4-Flash-0731", required: true, maxTokens: 4000, samples: 3 },
];
