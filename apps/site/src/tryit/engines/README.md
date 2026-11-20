# src/tryit/engines

Where the model runs, in four tiers behind one `Engine` type (`types.ts`):

1. `chrome-ai.ts`: Chrome's built-in Gemini Nano through the Prompt API, `responseConstraint` for structure.
2. `webllm.ts` + `webllm.worker.ts`: WebLLM in a Web Worker, only after an explicit download click.
3. `../openrouter/`: a free OpenRouter model on the visitor's own account, only after they connect it.
4. `replay.ts`: real recorded outputs, labelled with the model that wrote them.
   Each takes a prompt and a JSON Schema and streams text back. Only tier 3 leaves the page, with the
   visitor's key; the site has no server and no key of its own.
