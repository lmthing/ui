export const words = {
  storage: {
    path: "Storage path",
    spots: "Storage spots",
    here: "Stored here",
    emptyHere: "Nothing stored here",
    code: (code: string) => `Box code: ${code}`,
    qr: (code: string) => `QR code for box ${code}`,
    fragile: "Fragile",
    boxSeparator: " — ",
    status: { packing: "Packing", sealed: "Sealed", in_transit: "In transit", unpacked: "Unpacked" },
    countUnit: (form: Intl.LDMLPluralRule) => (form === "one" ? " item" : " items"),
  },
};
