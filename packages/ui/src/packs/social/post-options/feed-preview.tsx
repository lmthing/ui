import type { ReactNode } from "react";
import { FeedRow } from "../../../kit/renderers";
import type { PostExtras } from "../copy";
import { PostDetails, PostExtrasFooter, PostVideo } from "./view";
import type { ThemeDensity } from "../../../catalog";
import * as kit from "../../../kit";
import { socialWordsFor } from "../lang";

type Preview = {
  name: string;
  photo: string;
  time: string;
  text: string;
  image?: string | undefined;
  goto: string;
};

// prettier-ignore
export function FeedPreview({ post, density }: { post: Preview; density: ThemeDensity }) {
  const { words: { feed } } = kit.useWords(socialWordsFor);
  const { name, photo, time, text, image, goto } = post;
  const excerpt = <kit.KitText part="text" lines={3} density={density}>{text}</kit.KitText>;
  return <kit.KitRow part="root" inline surface="plain" label={feed.open(name)} goto={goto} density={density}>
    <kit.KitContent density={density}>
      <kit.KitRow part={null} inline label="" lineRole="label" density={density}
        trailing={<kit.KitIcon name="chevron_right" tone="muted" decorative />}>
        <kit.KitContent density={density} leadingAlign="row"
          lead={<kit.KitPhoto photo={photo} part="photo" shape="round" label={name} />}>
          <kit.KitText part="name" role="label" tone="muted" lines={1} density={density}>{name}</kit.KitText>
          <kit.KitText part="time" role="caption" tone="muted" lines={1} density={density}>{time}</kit.KitText>
        </kit.KitContent>
      </kit.KitRow>
      <kit.KitContent group="response" density={density}>
        {image ? <kit.KitGrid fitLast density={density}>
          {excerpt}
          <kit.KitContent density={density} leadingAlign="row"
            lead={<kit.KitPhoto part="image" photo={image} shape="thumb" label={feed.image} />}>{null}</kit.KitContent>
        </kit.KitGrid> : excerpt}
      </kit.KitContent>
    </kit.KitContent>
  </kit.KitRow>;
}

// prettier-ignore
export function FeedLoading({ post, density }: { post: Preview; density: ThemeDensity }) {
  const { words: { feed } } = kit.useWords(socialWordsFor);
  const skeleton = feed.skeleton;
  const excerpt = <kit.KitSkeleton shape="figure" inset="none" density={density} content={[["body", skeleton.excerpt]]} />;
  return <>
    <kit.KitContent density={density} leadingAlign="row" lead={<kit.KitSkeleton shape="control" kind="secondary" />}>
      <kit.KitSkeleton shape="figure" inset="none" density={density}
        content={[["label", skeleton.author], ["caption", skeleton.time]]} />
    </kit.KitContent>
    <kit.KitContent group="response" density={density}>
      {post.image ? <kit.KitContent group="response" density={density}>
        <kit.KitGrid fitLast density={density}>
          {excerpt}
          <kit.KitSkeleton shape="figure" lead="box" inset="none" content={[]} density={density} />
        </kit.KitGrid>
      </kit.KitContent> : excerpt}
    </kit.KitContent>
    <kit.KitContent group={post.image ? "response" : "content"} density={density}>
      <kit.KitContent group="response" density={density} leadingAlign="row" lead={<kit.KitSkeleton shape="control" kind="secondary" />}>
        <kit.KitRow part={null} label="" inline density={density}>
          <kit.KitContent density={density} leadingAlign="row" lead={
            <kit.KitSkeleton shape="figure" inset="none" density={density} content={[["caption", skeleton.likes]]} />}>
            <kit.KitSkeleton shape="figure" inset="none" density={density} content={[["caption", skeleton.comments]]} />
          </kit.KitContent>
        </kit.KitRow>
      </kit.KitContent>
    </kit.KitContent>
  </>;
}

// prettier-ignore
export function FeedRecipe({ post, density, grid, response }: { post: Preview & PostExtras & { id: string }; density: ThemeDensity; grid: boolean; response: ReactNode }) {
  const { words: { feed } } = kit.useWords(socialWordsFor);
  const loading = kit.useComponentState() === "loading";
  const { id: item, name, photo, time, text, image, goto, video } = post;
  const preview = <FeedRow density={density} row={{
    item, label: feed.open(name), goto,
    ...(grid ? {} : { avatar: { photo, part: "photo", label: name } }),
    author: { text: name, part: "name", role: "meta", strong: true },
    time: { text: time, part: "time", role: "caption", tone: "muted" },
    body: { text, part: "text", lines: 3 },
    ...(image ? { media: { photo: image, part: "image", label: feed.image, shape: grid ? "square" : "thumb" } } : {}),
  }} />;
  const content = <>
    {grid && <kit.KitPhoto photo={photo} label={name} shape="round" part={loading ? null : "photo"} loading={loading} />}
    {preview}
    <PostDetails value={post} density={density} />
    {video && <PostVideo poster={video} density={density} />}
    {loading ? <kit.KitSkeleton shape="control" kind="secondary" /> : response}
    <PostExtrasFooter value={post} density={density} />
  </>;
  return <kit.KitState loading={content} density={density}>{content}</kit.KitState>;
}
