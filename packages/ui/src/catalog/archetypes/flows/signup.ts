import { createMeta, composeProbes, type ArchetypeMeta } from "../recipe";

const recipe = createMeta(
  "signup",
  "Create a new account",
  { credentials: "Header Field:text Field:email Field:password Note Button SignInOptions? Button" },
  {
    credentials: [
      'Use a "Create an account" Header and blank Name, Email address and Password fields. Never put cast records into the inputs. In the Note, name the Terms of Service and Privacy Policy and say that creating an account means agreeing to them.',
      'Use one primary "Create account" Button linked to verification. The last Button has emphasis "quiet", says "Log in" and links to signin; it sits in the body, not beside the pinned primary Button.',
      "Include SignInOptions only if the brief names alternative providers. All destinations are mock screens; real accounts need an outside service.",
    ],
  },
);
export const meta = {
  ...recipe,
  tier: "service",
  defaults: {
    credentials: [
      { c: "Header", example: { title: "Create an account" } },
      { c: "Field", variant: "text", example: { label: "Name" } },
      { c: "Field", variant: "email", example: { label: "Email address" } },
      { c: "Field", variant: "password", example: { label: "Password" } },
      {
        c: "Note",
        example: { text: "By creating an account, you agree to the Terms of Service and Privacy Policy." },
      },
      { c: "Button", example: { label: "Create account", goto: "verify" } },
      { c: "Button", seed: { emphasis: "quiet" }, example: { label: "Log in", goto: "signin" } },
    ],
  },
} satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);
