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
    <kit.KitContent density={density}>
      {facts.map((fact) => (
        <kit.KitLayoutText
          key={fact.part}
          line={{ role: "caption", tone: "muted", ...fact }}
          density={density}
        />
      ))}
      {value.quote && (
        <kit.KitMetaLine
          title={{ text: postOptions.quote, role: "caption", tone: "muted" }}
          meta={{ text: value.quote, part: "quote", role: "body", tone: "text" }}
          density={density}
        />
      )}
    </kit.KitContent>
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
  return (
    <kit.KitAction
      part={loading ? null : part}
      contentParts={{}}
      action="toggle"
      icon={part === "repost" ? "share" : "bookmark"}
      kind={active ? "secondary" : "quiet"}
      a11y={postOptions[part](active)}
    />
  );
}

export function PostExtrasFooter({ value, density }: Options) {
  const { lang } = kit.useWords();
  const summary = postResponseLines(value, lang);
  const hasControls = value.reposted !== undefined || value.saved !== undefined;
  if (!summary.length && !hasControls) return null;
  return (
    <kit.KitContent density={density}>
      {summary.map((line) => (
        <kit.KitLayoutText
          key={line.part}
          line={{ ...line, role: "caption", tone: "muted" }}
          density={density}
        />
      ))}
      {hasControls && (
        <kit.KitActionFooter density={density}>
          {value.reposted !== undefined && <ExtraToggle part="repost" on={value.reposted} />}
          {value.saved !== undefined && <ExtraToggle part="save" on={value.saved} />}
        </kit.KitActionFooter>
      )}
    </kit.KitContent>
  );
}
