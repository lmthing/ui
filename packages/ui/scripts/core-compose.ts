import type { CallModel, WriterFormat } from "@lmthing/ui/catalog";
import type { ProbeModel } from "./llm.config";
import { keyOf, readBook, writeBook, replayCall } from "./recordings";
import type * as Catalog from "../src/entry/catalog";
import type { CastLike } from "../src/catalog/types";
const { archetypes, components, runComposeProbes } = (await import(
  new URL("../dist/catalog.js", import.meta.url).href
)) as typeof Catalog;
const cast: CastLike = {
  things: [{ type: "plant", fields: ["name", "room", "care"] }],
  items: [
    {
      id: "fern",
      type: "plant",
      sample: true,
      name: "Fern",
      room: "Bathroom",
      care: "Water every seven days",
      photo: "lib:plants",
    },
    {
      id: "basil",
      type: "plant",
      sample: true,
      name: "Basil",
      room: "Kitchen",
      care: "Water every three days",
      photo: "lib:plants",
    },
    {
      id: "monstera",
      type: "plant",
      sample: true,
      name: "Monstera",
      room: "Living room",
      care: "Water every ten days",
      photo: "lib:plants",
    },
  ],
};
const castOf = (id: string): CastLike =>
  id === "plans"
    ? {
        things: [{ type: "plan", fields: ["name", "description", "price"] }],
        items: [
          {
            id: "single",
            type: "plan",
            sample: true,
            name: "Single walk",
            description: "One walk when needed",
            price: "£18",
          },
          {
            id: "weekly",
            type: "plan",
            sample: true,
            name: "Weekly pack",
            description: "Five walks every week",
            price: "£65",
          },
        ],
      }
    : id === "chat"
      ? {
          things: [{ type: "message", fields: ["sender", "text"] }],
          items: [
            {
              id: "anna",
              type: "message",
              sample: true,
              sender: "Anna",
              text: "Can Clover's walk start at 09:30?",
            },
            { id: "reply", type: "message", sample: true, sender: "Me", text: "09:30 works, see you then." },
          ],
        }
      : cast;
export async function checkCoreComposition(
  model: ProbeModel,
  liveCall: (prompt: string, format?: WriterFormat) => Promise<string>,
  replay = false,
) {
  const book = readBook("Archetypes", model.id);
  const call: CallModel = replay
    ? replayCall("Archetypes", model.id)
    : async (prompt, sample = 0, format) => {
        const reply = await liveCall(prompt, format),
          key = keyOf(model.id, prompt, format);
        const replies = sample === 0 ? [] : [...(book[key]?.replies ?? [])];
        replies[sample] = reply;
        book[key] = { prompt, ...(format ? { format } : {}), reply: replies[0]!, replies };
        return reply;
      };
  const results = await runComposeProbes({
    archetypes: Object.values(archetypes).map((def) => def.meta),
    defs: components,
    cast: castOf,
    callModel: call,
    samples: model.samples,
    rubric: true,
  });
  if (!replay) writeBook("Archetypes", model.id, book);
  for (const result of results)
    console.log(
      `${result.status.toUpperCase()} ${result.score} ${result.archetype}/${result.layout}: ${result.detail}${result.rubric ? " " + JSON.stringify(result.rubric) : ""}`,
    );
  return results.filter((result) => result.status === "fail").length;
}
