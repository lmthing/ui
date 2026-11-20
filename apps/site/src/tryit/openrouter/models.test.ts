import { describe, expect, it } from "vitest";
import { defaultModel, freeModels } from "./models";

const free = { prompt: "0", completion: "0" };
const text = { output_modalities: ["text"] };
const listed = [
  { id: "a/paid", name: "Paid", pricing: { prompt: "0.1", completion: "0.2" }, architecture: text },
  {
    id: "google/lyria:free",
    name: "Lyria",
    pricing: free,
    architecture: { output_modalities: ["text", "audio"] },
  },
  { id: "b/plain:free", name: "Plain", pricing: free, architecture: text, supported_parameters: [] },
  {
    id: "c/json:free",
    name: "Json",
    pricing: free,
    architecture: text,
    supported_parameters: ["response_format"],
  },
  {
    id: "openrouter/free",
    name: "Router",
    pricing: free,
    architecture: text,
    supported_parameters: ["structured_outputs"],
  },
  {
    id: "d/strict:free",
    name: "Strict",
    pricing: free,
    architecture: text,
    supported_parameters: ["structured_outputs"],
  },
];

describe("freeModels", () => {
  it("keeps free text models, strict schema first", () => {
    const models = freeModels(listed);
    expect(models.map((m) => m.id)).toEqual([
      "openrouter/free",
      "d/strict:free",
      "c/json:free",
      "b/plain:free",
    ]);
    expect(models.map((m) => m.support)).toEqual(["schema", "schema", "json", "text"]);
  });
  it("defaults to a concrete strict model over the router", () => {
    expect(defaultModel(freeModels(listed))?.id).toBe("d/strict:free");
    expect(defaultModel([])).toBeUndefined();
  });
});
