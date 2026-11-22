export const words = {
  travelDocs: {
    empty: "No travel documents yet",
    kinds: {
      passport: "Passport",
      visa: "Visa",
      insurance: "Travel insurance",
      licence: "Driving licence",
      health: "Vaccination",
      other: "Document",
    },
    tripEnds: (date: string) => `Trip ends ${date}`,
    expires: (date: string) => `Expires ${date}`,
    numberMasked: "No. ••••",
    numberMissing: "No number added",
    beforeTripEnd: "Expires before trip ends",
    onTripEnd: "Expires on trip end date",
    soonAfterTrip: "Expires soon after trip",
    open: (kind: string, owner: string) => `${kind}, ${owner}`,
  },
};
