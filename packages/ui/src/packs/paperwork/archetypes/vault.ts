import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const vault = {
  id: "vault",
  job: "Keep and open private life-admin files",
  defaultLayout: "vault_all",
  layouts: {
    vault_all: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Search"], required: true },
        { allow: ["Chips"], required: true },
        { allow: ["Documents"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Search" },
        { id: "c1", c: "Chips" },
        { id: "d1", c: "Documents" },
        { id: "b1", c: "Button" },
      ],
    },
    vault_record: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["KeyValue"], required: true },
        { allow: ["Documents"], required: true },
        { allow: ["Note"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "k1", c: "KeyValue" },
        { id: "d1", c: "Documents" },
        { id: "n1", c: "Note" },
      ],
    },
    vault_capture: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Camera"], required: true, variant: "scan" },
        { allow: ["Note"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "c1", c: "Camera", kind: "scan" },
        { id: "n1", c: "Note" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "vault",
    layout: "vault_all",
    brief:
      "Title Private vault. Search by document name and filter with All and Insurance chips. List Alex's insurance policy with synthetic file lib:trot_policy, expiry 2027-02-01 and tag insurance. Add a Scan file button going to vault_capture.",
  },
  {
    kind: "compose",
    archetype: "vault",
    layout: "vault_record",
    brief:
      "Make a back header titled Liability policy. Show two facts, Owner: Alex and Issuer: Moor Mutual. Include the private insurance record for Alex with supplied attachment lib:trot_policy, expires 2027-02-01 and tag insurance. Add a note: The original stays on this device.",
  },
  {
    kind: "compose",
    archetype: "vault",
    layout: "vault_capture",
    brief:
      "Title Scan a document. Use the camera in scan mode with hint Keep the page in frame. Show a note saying Check the edges before saving. Add a File scan button opening vault_all.",
  },
] satisfies ComposeProbe[];
