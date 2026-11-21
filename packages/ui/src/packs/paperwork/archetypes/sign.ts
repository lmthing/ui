import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const sign = {
  id: "sign",
  job: "Review and sign one personal form",
  defaultLayout: "paperwork_sign",
  layouts: {
    paperwork_sign: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Steps"], required: true },
        { allow: ["Note"], required: true },
        { allow: ["Signature"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "s1", c: "Steps" },
        { id: "n1", c: "Note" },
        { id: "s2", c: "Signature" },
      ],
    },
    paperwork_signed: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Success"], required: true },
        { allow: ["Documents"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "s1", c: "Success" },
        { id: "d1", c: "Documents" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "sign",
    layout: "paperwork_sign",
    brief:
      "Show a back header titled Review and sign. Show step 1 of 2 labelled Review. Note that the original stays unchanged. Alex draws a signature for Office access form supplied as lib:trot_access. The drawing pad owns save; no extra button.",
  },
  {
    kind: "compose",
    archetype: "sign",
    layout: "paperwork_signed",
    brief:
      "After a successful local save, use a back header titled Signed copy and a confirmation saying Copy saved. File Alex's Office access copy as a form with supplied synthetic file lib:trot_access_copy and tag signed. Add a Back to vault button opening vault_all.",
  },
] satisfies ComposeProbe[];
