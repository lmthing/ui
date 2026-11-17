// The only place model names live. `required` models gate every component (replayed in tests).
// Calls go to the Azure OpenAI v1 API: AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY from the environment.
export type ProbeModel = { id: string; deployment: string; required: boolean; maxTokens: number };

export const probeModels: ProbeModel[] = [
  // The light model the product leans on. Not deployed on the resource yet: required once it is.
  { id: "deepseek-flash", deployment: "DeepSeek-V4.1-Flash", required: false, maxTokens: 4000 },
  { id: "gpt-6-astra-2", deployment: "gpt-6-astra-2", required: true, maxTokens: 4000 },
];
