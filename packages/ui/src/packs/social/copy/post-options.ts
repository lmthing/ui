import { numberLine, pluralForm } from "../../../catalog";
import { socialWordsFor } from "../lang";

export type PostExtras = {
  video?: string | undefined;
  reposts?: number | undefined;
  reposted?: boolean | undefined;
  saved?: boolean | undefined;
  quote?: string | undefined;
  vote?: "up" | "down" | undefined;
  tags?: readonly string[] | undefined;
  radiusKm?: number | undefined;
  alertTag?: string | undefined;
};

export function postFactLines(value: PostExtras, lang?: string) {
  const words = socialWordsFor(lang).postOptions;
  return [
    ...(value.alertTag
      ? [{ part: "alert_tag", text: words.alert(value.alertTag), tone: "warn" as const }]
      : []),
    ...(value.radiusKm !== undefined
      ? [{ part: "radius", text: words.radius(numberLine(value.radiusKm, lang)) }]
      : []),
    ...(value.tags?.length ? [{ part: "tags", text: words.tags(value.tags) }] : []),
  ];
}

export function postResponseLines(value: PostExtras, lang?: string) {
  const words = socialWordsFor(lang).postOptions;
  return [
    ...(value.reposts !== undefined
      ? [
          {
            part: "reposts",
            text: words.reposts(numberLine(value.reposts, lang), pluralForm(value.reposts, lang)),
          },
        ]
      : []),
    ...(value.vote ? [{ part: "vote", text: words.voted[value.vote] }] : []),
  ];
}

export function postExtraReading(value: PostExtras, showVideo: boolean, lang?: string) {
  const words = socialWordsFor(lang).postOptions;
  return [
    ...postFactLines(value, lang).map(({ text }) => text),
    ...(value.quote ? [`${words.quote}: ${value.quote}`] : []),
    ...(value.video && showVideo ? [words.poster] : []),
    ...postResponseLines(value, lang).map(({ text }) => text),
    ...(value.reposted !== undefined ? [words.repost(value.reposted)] : []),
    ...(value.saved !== undefined ? [words.save(value.saved)] : []),
  ];
}
