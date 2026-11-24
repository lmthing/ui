import { createMeta, composeProbes, type ArchetypeMeta } from "../recipe";

const recipe = createMeta(
  "signin",
  "Log in to an existing account",
  { credentials: "Header|Hero Field:email Field:password Button Note|Button SignInOptions?" },
  {
    credentials: [
      'Use a "Log in" heading with a short subtitle explaining to use the email and password for the existing account, e.g. "Use your account email and password." Add blank Email address and Password fields, then the single primary Button labelled "Log in" linked to the signed-in home.',
      'Use a quiet Button labelled "Forgot password?" linked to the mock password reset screen. A Note is only for recovery guidance that does not invite a tap. Quiet Buttons belong to the body, not beside the pinned primary Button.',
      "Include SignInOptions only if the brief names alternative providers. All destinations are mock screens; real sign-in needs an outside service.",
    ],
  },
);
export const meta = {
  ...recipe,
  tier: "service",
  defaults: {
    credentials: [
      { c: "Header", example: { title: "Log in", sub: "Use your account email and password." } },
      { c: "Field", variant: "email", example: { label: "Email address" } },
      { c: "Field", variant: "password", example: { label: "Password" } },
      { c: "Button", example: { label: "Log in", goto: "member_home" } },
      {
        c: "Button",
        seed: { emphasis: "quiet" },
        example: { label: "Forgot password?", goto: "reset_password" },
      },
    ],
  },
} satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);
