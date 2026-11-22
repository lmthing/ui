export const words = {
  dice: {
    one: (count: string, sides: string) => `${count} die · ${sides} sides`,
    other: (count: string, sides: string) => `${count} dice · ${sides} sides`,
    roll: "Roll dice",
    reroll: "Roll again",
    unrolled: "Ready to roll",
    sum: (total: string) => `Total ${total}`,
    modifier: (value: string, positive: boolean) => `Modifier ${positive ? "+" : ""}${value}`,
    dropLow: "Drop lowest",
    dropHigh: "Drop highest",
    pool: "Dice pool",
    counted: "Counted",
    dropped: "Dropped",
    blankFace: (position: string) => `Die ${position}, not rolled`,
    face: (position: string, value: string) => `Die ${position}, showing ${value}`,
    heldFace: (position: string, value: string) => `Die ${position}, showing ${value}, held`,
  },
};
