// OpenRouter's free text models, read live from its public model list (nothing here names a model).

export const modelsUrl = "https://openrouter.ai/api/v1/models";

/** How a model can be held to the screen's JSON Schema: strictly, as JSON only, or by instructions alone. */
export type Support = "schema" | "json" | "text";
export type FreeModel = { id: string; name: string; context: number; support: Support };

type Listed = {
  id: string;
  name?: string;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
  architecture?: { output_modalities?: string[] };
  supported_parameters?: string[];
};

const rank: Record<Support, number> = { schema: 0, json: 1, text: 2 };

const supportOf = (params: string[] = []): Support =>
  params.includes("structured_outputs") ? "schema" : params.includes("response_format") ? "json" : "text";

/** Free to call, writes text only (no music or image models), and marked free by OpenRouter. */
const isFreeText = (m: Listed) =>
  (m.id.endsWith(":free") || m.id === "openrouter/free") &&
  m.pricing?.prompt === "0" &&
  m.pricing?.completion === "0" &&
  (m.architecture?.output_modalities ?? []).every((o) => o === "text");

/** The free text models, schema-capable first, then by name. */
export function freeModels(listed: Listed[]): FreeModel[] {
  return listed
    .filter(isFreeText)
    .map((m) => ({
      id: m.id,
      name: m.name ?? m.id,
      context: m.context_length ?? 0,
      support: supportOf(m.supported_parameters),
    }))
    .sort((a, b) => rank[a.support] - rank[b.support] || a.name.localeCompare(b.name));
}

export async function fetchFreeModels(fetchImpl: typeof fetch = fetch): Promise<FreeModel[]> {
  const response = await fetchImpl(modelsUrl);
  if (!response.ok) throw new Error(`the model list answered HTTP ${response.status}`);
  return freeModels(((await response.json()) as { data: Listed[] }).data);
}

/** The default pick: the first concrete schema model (the free router may land on a model without schemas). */
export const defaultModel = (models: FreeModel[]) =>
  models.find((m) => m.support === "schema" && m.id !== "openrouter/free") ?? models[0];
