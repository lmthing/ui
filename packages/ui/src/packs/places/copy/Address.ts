import { placesWordsFor } from "../lang";

export function addressReading(
  { lines, phone }: { lines: string[]; phone?: string | undefined },
  lang?: string,
) {
  const words = placesWordsFor(lang);
  return [
    ...lines.map((line) => JSON.stringify(line)),
    words.addressDirections,
    words.addressCopy,
    ...(phone ? [JSON.stringify(words.addressCall(phone))] : []),
  ];
}
