export const words = {
  passCard: {
    invalid: "This code can’t be read",
    qr: "Pass QR code",
    copy: "Copy code",
    copied: "Code copied",
    reveal: "Show member ID",
    hide: "Hide member ID",
    mask: (tail: string) => `••••${tail ? ` ${tail}` : ""}`,
    expiry: (date: string) => `Expires ${date}`,
    balance: "Balance",
    ready: "Ready to scan",
    used: "Used",
  },
};
