export const en = {
  closed: "Closed",
  rating: (value: string) => `Rating ${value} out of 5`,
  priceLevel: (value: string) => `Price level ${value} out of 4`,
  deliveryStep: {
    preparing: "Preparing",
    picked_up: "Picked up",
    on_the_way: "On the way",
    nearby: "Nearby",
    delivered: "Delivered",
  },
};

export type PlacesWords = typeof en;
