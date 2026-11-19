# src/tryit/engines

Where the model runs, in three tiers behind one `Engine` type (`types.ts`):

1. `chrome-ai.ts`: Chrome's built-in Gemini Nano through the Prompt API, `responseConstraint` for structure.
2. `webllm.ts` + `webllm.worker.ts`: WebLLM in a Web Worker, only after an explicit download click.
3. `replay.ts`: real recorded outputs, labelled with the model that wrote them.
   Each takes a prompt and a JSON Schema and streams text back; nothing needs a server or a key.
