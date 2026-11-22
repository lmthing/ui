import { clipKey, type ThemeDensity } from "../../../catalog";
import * as kit from "../../../kit";
import { learningWordsFor } from "../lang";

/** A separate target from the card flip or answer controls. The host resolves the active clip. */
export function PromptAudio({ density }: { density: ThemeDensity }) {
  const { screen, component, state } = kit.usePartContext();
  const playback = kit.useControlValue<boolean | "error">(
    `${screen}/${component}/${clipKey("audio")}`,
    false,
  );
  const {
    words: { promptAudio: words },
  } = kit.useWords(learningWordsFor);
  return (
    <kit.KitPlayback part="audio" style="compact" loading={state === "loading"}>
      <kit.KitActionFooter density={density}>
        <kit.KitAction
          part="audio"
          contentParts={{}}
          kind="secondary"
          icon={playback === true ? "pause" : "play"}
          label={playback === true ? words.pause : words.play}
          action={playback === true ? "pause" : "play"}
        />
      </kit.KitActionFooter>
      {playback === "error" && (
        <kit.KitLayoutText
          line={{ text: words.unavailable, part: "audio_status", role: "meta", tone: "bad" }}
        />
      )}
    </kit.KitPlayback>
  );
}
