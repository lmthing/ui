import { postCountParts, type PostExtras } from "../copy";
import type { IconName, ThemeDensity } from "../../../catalog";
import * as kit from "../../../kit";
import { socialWordsFor } from "../lang";
import * as postView from "./view";

type Author = { name: string; photo: string; time: string };

// prettier-ignore
export function PostIconAction({ part, icon, label, density }: {
  part: "share" | "more"; icon: IconName; label: string; density: ThemeDensity;
}) {
  const { controller, interactive } = kit.useKit();
  const { testID } = kit.usePart(part, false);
  if (interactive && controller && !controller.canPress(testID))
    return <kit.KitAction part={part} icon={icon} kind="quiet" a11y={label} disabled />;
  const leading = <kit.KitIcon name={icon} part={`${part}_icon`} tone="muted" />;
  return <kit.KitRow part={part} role="button" label={label} inline density={density}
    leadingWidth="avatar" leadingAlign="row" leading={leading}>{null}</kit.KitRow>;
}

// prettier-ignore
export function PostHeader({ input, density, loading }: { input: Author; density: ThemeDensity; loading: boolean }) {
  const { words: { post } } = kit.useWords(socialWordsFor);
  const { name, photo, time } = input;
  return <kit.KitGrid fitLast density={density}>
    <kit.KitContent density={density} leadingAlign="row" lead={loading ?
      <kit.KitSkeleton shape="control" kind="secondary" /> :
      <kit.KitPhoto part="photo" photo={photo} shape="round" label={name} />}>
      {loading ? <kit.KitSkeleton shape="figure" inset="none" density={density}
        content={[["label", name], ["caption", time]]} /> : <>
          <kit.KitText part="name" role="label" lines={1} density={density}>{name}</kit.KitText>
          <kit.KitText part="time" role="caption" tone="muted" lines={1} density={density}>{time}</kit.KitText>
        </>}
    </kit.KitContent>
    {loading ? <kit.KitSkeleton shape="control" kind="quiet" /> :
      <PostIconAction part="more" icon="more" label={post.more} density={density} />}
  </kit.KitGrid>;
}

type Finish = { density: ThemeDensity; loading: boolean };
type Counts = { name: string; likes: number; comments: number; liked: boolean };

// prettier-ignore
function PostCountAction({ part, count, label, on, density, loading }: Finish & {
  part: "like" | "comment"; count: string; label: string; on?: boolean;
}) {
  const target = loading ? null : part;
  const { words } = kit.useWords();
  const icon = loading ? <kit.KitSkeleton shape="figure" inset="none" density={density} content={[["heading", words.placeholderValue.repeat(2)]]} /> :
    <kit.KitIcon name={part === "like" ? "heart" : "message"} part={`${part}_icon`} tone={on ? "accent" : "muted"} />;
  return <kit.KitRow part={target} role={loading ? "text" : "button"} label={label} inline density={density}>
    <kit.KitContent inset="md" density={density}>
      <kit.KitRow part={null} role={loading ? "text" : "group"} label={label} inline leading={icon} density={density}>
        {loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["number", count, "start", "compact"]]} density={density} /> :
          <kit.KitText part={part === "like" ? "likes" : "comments"} role="number" numberScale="compact"
            tone={on ? "accent" : "muted"} tabular lines={1} density={density}>{count}</kit.KitText>}
      </kit.KitRow>
    </kit.KitContent>
  </kit.KitRow>;
}

// prettier-ignore
export function PostReactions({ input, density, loading }: Finish & { input: Counts & PostExtras }) {
  const { lang, words: { feed, post } } = kit.useWords(socialWordsFor);
  const { testID } = kit.usePart("like", false);
  const liked = kit.useControlValue(testID, input.liked);
  const [likes, comments] = postCountParts(input, lang);
  const like = <PostCountAction part="like" count={likes.count} on={liked}
    label={post.withCount(feed.reaction(input.name, liked), likes.line)} {...{ density, loading }} />;
  const comment = <PostCountAction part="comment" count={comments.count}
    label={post.withCount(post.comment, comments.line)} {...{ density, loading }} />;
  return <kit.KitGrid fitLast density={density}>
    <kit.KitContent density={density} leadingAlign="row" lead={like}>
      <kit.KitContent density={density} leadingAlign="row" lead={comment}><postView.PostVote value={input} density={density} /></kit.KitContent>
    </kit.KitContent>
    {loading ? <kit.KitSkeleton shape="control" kind="quiet" /> :
      <PostIconAction part="share" icon="share" label={post.share} density={density} />}
  </kit.KitGrid>;
}
