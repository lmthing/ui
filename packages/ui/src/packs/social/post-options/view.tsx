import { clipKey, type ThemeDensity } from "../../../catalog";
import * as kit from "../../../kit";
import { postFactLines, postResponseLines, type PostExtras } from "../copy";
import { socialWordsFor } from "../lang";

type Options = { value: PostExtras; density: ThemeDensity };

export function PostDetails({ value, density }: Options) {
  const {
    lang,
    words: { postOptions },
  } = kit.useWords(socialWordsFor);
  const facts = postFactLines(value, lang);
  if (!facts.length && !value.quote) return null;
  return (
    <>
      {facts.length > 0 && (
        <kit.KitContent density={density}>
          {facts.map((fact) => (
            <kit.KitLayoutText
              key={fact.part}
              line={{ role: "caption", tone: "muted", ...fact }}
              density={density}
            />
          ))}
        </kit.KitContent>
      )}
      {value.quote && (
        <kit.KitContent group={facts.length ? "response" : "content"} density={density}>
          <kit.KitMetaLine
            title={{ text: postOptions.quote, role: "caption", tone: "muted", strong: true }}
            meta={{ text: value.quote, part: "quote", role: "caption", tone: "text" }}
            density={density}
          />
        </kit.KitContent>
      )}
    </>
  );
}

export function PostVideo({ poster, density }: { poster: string; density: ThemeDensity }) {
  const {
    words: { postOptions },
  } = kit.useWords(socialWordsFor);
  const {
    words: { mediaUnavailable },
  } = kit.useWords();
  const { screen, component, item } = kit.usePartContext();
  const target = item ? `${item}/video` : "video";
  const playback = kit.useControlValue<boolean | "error">(`${screen}/${component}/${clipKey(target)}`, false);
  const playing = playback === true;
  const loading = kit.useComponentState() === "loading";
  const control = (
    <kit.KitAction
      part={loading ? null : "video"}
      contentParts={{}}
      action={playing ? "pause" : "play"}
      icon={playing ? "pause" : "play"}
      a11y={playing ? postOptions.pause : postOptions.play}
    />
  );
  return (
    <kit.KitFigure
      density={density}
      media={
        <kit.KitPlayback part="video" style="video" overlay={control} loading={loading}>
          <kit.KitPhoto
            photo={poster}
            part={loading ? null : "video_poster"}
            shape="wide"
            label={postOptions.poster}
            loading={loading}
          />
        </kit.KitPlayback>
      }
      {...(playback === "error"
        ? {
            caption: (
              <kit.KitLayoutText
                line={{ text: mediaUnavailable, role: "caption", tone: "bad", part: "video_error" }}
              />
            ),
          }
        : {})}
    />
  );
}

function ExtraToggle({ part, on }: { part: "repost" | "save"; on: boolean }) {
  const {
    words: { postOptions },
  } = kit.useWords(socialWordsFor);
  const { testID } = kit.usePart(part, false);
  const active = kit.useControlValue(testID, on);
  const loading = kit.useComponentState() === "loading";
  if (part === "repost") {
    const label = postOptions.repost(active);
    return (
      <kit.KitRow part={loading ? null : part} role={loading ? "text" : "button"} label={label} inline>
        <kit.KitLayoutText
          line={{ text: label, role: "meta", tone: active ? "muted" : "text", strong: true }}
        />
      </kit.KitRow>
    );
  }
  return (
    <kit.KitAction
      part={loading ? null : part}
      contentParts={{}}
      action="toggle"
      icon="bookmark"
      kind={active ? "secondary" : "quiet"}
      a11y={postOptions[part](active)}
    />
  );
}

export function PostVote({ value, density }: Options) {
  const {
    words: { postOptions },
  } = kit.useWords(socialWordsFor);
  return value.vote ? (
    <kit.KitLayoutText
      line={{ part: "vote", text: postOptions.voted[value.vote], role: "caption", tone: "muted" }}
      density={density}
    />
  ) : null;
}

export function PostExtrasFooter({ value, density }: Options) {
  const { lang } = kit.useWords();
  const reposts = postResponseLines(value, lang).find((line) => line.part === "reposts");
  const count = reposts && (
    <kit.KitLayoutText line={{ ...reposts, role: "caption", tone: "muted" }} density={density} />
  );
  if (!count && value.reposted === undefined && value.saved === undefined) return null;
  return (
    <kit.KitGrid fitLast density={density}>
      <kit.KitActionFooter density={density}>
        {value.reposted !== undefined && <ExtraToggle part="repost" on={value.reposted} />}
        {count}
      </kit.KitActionFooter>
      {value.saved !== undefined ? <ExtraToggle part="save" on={value.saved} /> : null}
    </kit.KitGrid>
  );
}
