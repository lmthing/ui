import { createMeta, composeProbes, type ArchetypeMeta } from "../recipe";

const recipe = createMeta(
  "signin",
  "Log in to an existing account",
  { credentials: "Header|Hero Field:email Field:password Button Note|Button SignInOptions?" },
  {
    credentials: [
      'Use a "Log in" heading, blank Email address and Password fields, then the single primary Button labelled "Log in". The button goes to the signed-in home.',
      'The recovery slot says "Forgot password?" Use a Note, or a quiet Button linked to the password reset screen if requested. Quiet Buttons belong to the body, not beside the pinned primary Button.',
      "Include SignInOptions only if the brief names alternative providers. All destinations are mock screens; real sign-in needs an outside service.",
    ],
  },
);
export const meta = {
  ...recipe,
  tier: "service",
  defaults: {
    credentials: [
      { c: "Header", example: { title: "Log in" } },
      { c: "Field", variant: "email", example: { label: "Email address" } },
      { c: "Field", variant: "password", example: { label: "Password" } },
      { c: "Button", example: { label: "Log in", goto: "member_home" } },
      { c: "Note", example: { text: "Forgot password?" } },
    ],
  },
} satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);
