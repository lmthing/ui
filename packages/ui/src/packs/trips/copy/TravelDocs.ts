import { appointmentDate } from "../../../catalog";
import { tripsWordsFor, type TripsWords } from "../lang";

type TravelDoc = {
  kind: keyof TripsWords["travelDocs"]["kinds"];
  who: string;
  number: string;
  expires: string;
};

const dayMs = 86_400_000;
const expiryWarningDays = 30;

function expiryWarning(expires: string, tripEnds: string | undefined, lang?: string) {
  if (!tripEnds) return;
  const words = tripsWordsFor(lang).travelDocs;
  const days = (Date.parse(expires) - Date.parse(tripEnds)) / dayMs;
  if (days < 0) return { tone: "bad", label: words.beforeTripEnd } as const;
  if (days === 0) return { tone: "warn", label: words.onTripEnd } as const;
  if (days <= expiryWarningDays) return { tone: "warn", label: words.soonAfterTrip } as const;
}

export function travelDocsTripEnd(tripEnds: string | undefined, lang?: string) {
  return tripEnds && tripsWordsFor(lang).travelDocs.tripEnds(appointmentDate(tripEnds, lang));
}

export function travelDocLines(doc: TravelDoc, tripEnds: string | undefined, lang?: string) {
  const words = tripsWordsFor(lang).travelDocs;
  return {
    kind: words.kinds[doc.kind],
    number: doc.number.trim() ? words.numberMasked : words.numberMissing,
    expires: words.expires(appointmentDate(doc.expires, lang)),
    warning: expiryWarning(doc.expires, tripEnds, lang),
  };
}

export function travelDocsReading(
  input: { docs: readonly TravelDoc[]; tripEnds?: string | undefined; detail?: "full" | "brief" },
  lang?: string,
): string[] {
  const trip = travelDocsTripEnd(input.tripEnds, lang);
  return [
    ...(trip ? [trip] : []),
    ...input.docs.map((doc, index) => {
      const { kind, number, expires, warning } = travelDocLines(doc, input.tripEnds, lang);
      const identity = `r${index + 1} ${JSON.stringify(doc.who)} ${doc.kind} ${doc.expires}`;
      return [identity, kind, input.detail !== "brief" && number, expires, warning?.label]
        .filter(Boolean)
        .join(" · ");
    }),
  ];
}
