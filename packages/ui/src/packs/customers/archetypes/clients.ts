import type { ArchetypeMeta } from "../../../catalog";

export const clients = {
  id: "clients",
  job: "All my clients",
  defaultLayout: "list",
  layouts: {
    list: {
      writeHints: [
        'Do not invent client categories or their assignments. Without supplied category data, use unbound Chips. Example: {"id":"c1","c":"Chips","style":"choose","lead":null,"filter":null,"items":[{"label":"All","on":true,"icon":null,"view":null},{"label":"Active","on":false,"icon":null,"view":null}]}. With filter:null, do not write any view objects.',
        'Only when the data assigns categories, set Chips.filter to {"list":"l1","field":"category"} (using the actual List id) and set each view to panel:null, a matching row category, and empty text. Use style "choose" if showing an All chip with match:null.',
      ],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Search"], required: true },
        { allow: ["Chips"], required: true },
        { allow: ["List"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Search" },
        { id: "c1", c: "Chips" },
        { id: "l1", c: "List" },
        { id: "b1", c: "Button" },
      ],
    },
    queue: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Segmented"], required: true },
        { allow: ["FollowUpQueue"], required: true },
        { allow: ["Note"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Segmented" },
        { id: "f1", c: "FollowUpQueue" },
        { id: "n1", c: "Note" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;
