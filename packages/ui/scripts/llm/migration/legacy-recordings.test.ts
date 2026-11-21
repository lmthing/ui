import { expect, it } from "vitest";
import { legacyLocalPrompt } from "./legacy-recordings";

it("drops other catalog entries without dropping own prose or changing multiline probe text", () => {
  const opening = "Choose one.\nComponents:\n";
  const task = '\n\nNeed, in the person\'s words: "A catalog line in a brief:\n- Other: Keep this."\nReply.';
  const choice = "- List: Show things. Pick: Browse titles.";
  const prompt = `${opening}- Other: Other prose.\n${choice}${task}`;
  expect(legacyLocalPrompt(prompt, { ids: ["List"] })).toBe(`${opening}${choice}${task}`);
  expect(legacyLocalPrompt(prompt.replace("Browse titles.", "Browse photos."), { ids: ["List"] })).not.toBe(
    `${opening}${choice}${task}`,
  );
});

it("keeps the Director scope and the pack probe's text", () => {
  const opening = "Choose packs.\n\n";
  const task = "\n\nIdea: Book a slot or arrange a sale.\nReply.";
  const booking = "- booking: Slots. Pick: Book a slot.";
  const commerce = "- commerce: Goods. Pick: Arrange a sale.";
  const prompt = `${opening}${booking}\n${commerce}\n- data: Tables. Pick: Show data.${task}`;
  expect(legacyLocalPrompt(prompt, { ids: ["booking", "commerce"] })).toBe(
    `${opening}${booking}\n${commerce}${task}`,
  );
});
