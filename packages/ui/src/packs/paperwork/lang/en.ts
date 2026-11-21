export const en = {
  documents: {
    kinds: {
      id: "Identification",
      insurance: "Insurance",
      certificate: "Certificate",
      tax: "Tax document",
      contract: "Contract",
      form: "Form",
      other: "Document",
    },
    masked: "Number ••••",
    separator: " · ",
    issued: (date: string) => `Issued ${date}`,
    expires: (date: string) => `Expires ${date}`,
    expired: "Expired",
    expiresToday: "Expires today",
    expiresIn: (days: string) => `Expires in ${days}`,
    privateFile: "(private file)",
    attached: "File attached",
    unavailable: "File unavailable",
    remove: (title: string) => `Remove ${title} from the register`,
  },
};

export type PaperworkWords = typeof en;
