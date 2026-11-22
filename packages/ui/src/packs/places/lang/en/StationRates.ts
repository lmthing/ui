export const words = {
  stationRates: {
    empty: "No rates reported for this station",
    error: "Station feed unavailable",
    success: "Cashback claimed",
    claim: "Claim offer",
    directions: "Directions",
    updated: (time: string) => `Updated ${time}`,
    rate: (price: string, unit: string) => `${price}/${unit}`,
    power: (value: string) => `${value} kW`,
    stalls: (open: string, total: string) => `${open} of ${total} open`,
    stallsLabel: "Charging stalls",
    cashback: (amount: string) => `${amount} cashback`,
    reading: (label: string, value: string) => `${JSON.stringify(label)}: ${value}`,
    connectorReading: (connector: string, power: string, stalls: string) =>
      `${JSON.stringify(connector)} · ${power}: ${stalls}`,
  },
};
