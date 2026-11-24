import { composeProbes, createMeta, type ArchetypeMeta } from "../recipe";

const recipe = createMeta(
  "verify",
  "Verify an account with a one-time code",
  { code: "Header Note Field:code Button Button" },
  {
    code: [
      'Use the Header "Check your email" (or "Check your phone" for SMS). In the Note say where the code went, without inventing a person’s address or number.',
      'Show a blank Verification code Field, six digits unless the brief specifies another permitted length. Use one primary "Verify" Button for the member home.',
      'The final Button says "Resend code", has emphasis "quiet", and links to the mock code resend screen. It sits in the body, not beside the pinned primary Button. Sending and checking real codes need an outside service.',
    ],
  },
);
export const meta = {
  ...recipe,
  tier: "service",
  defaults: {
    code: [
      { c: "Header", example: { title: "Check your email" } },
      { c: "Note", example: { text: "We sent a code to your email address." } },
      { c: "Field", variant: "code", example: { label: "Verification code", length: 6 } },
      { c: "Button", example: { label: "Verify", goto: "member_home" } },
      { c: "Button", seed: { emphasis: "quiet" }, example: { label: "Resend code", goto: "resend_code" } },
    ],
  },
} satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);
