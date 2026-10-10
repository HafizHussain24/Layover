/**
 * Maps Google Places API `primaryType` values to WanderRoom display categories.
 * Add more mappings as needed. Default is 'Attraction'.
 */

export type PlaceCategory =
  | 'Food'
  | 'Dessert'
  | 'Cafe'
  | 'Attraction'
  | 'Nature'
  | 'Shopping'
  | 'Nightlife'
  | 'Accommodation'
  | 'Transport';

const TYPE_MAP: Record<string, PlaceCategory> = {
  // Food & Drink
  restaurant: 'Food',
  food: 'Food',
  meal_takeaway: 'Food',
  meal_delivery: 'Food',
  fast_food_restaurant: 'Food',
  indian_restaurant: 'Food',
  chinese_restaurant: 'Food',
  seafood_restaurant: 'Food',
  bakery: 'Dessert',
  dessert_shop: 'Dessert',
  ice_cream_shop: 'Dessert',
  confectionery: 'Dessert',
  cafe: 'Cafe',
  coffee_shop: 'Cafe',
  tea_house: 'Cafe',
  bar: 'Nightlife',
  night_club: 'Nightlife',

  // Attractions
  tourist_attraction: 'Attraction',
  museum: 'Attraction',
  art_gallery: 'Attraction',
  historical_landmark: 'Attraction',
  monument: 'Attraction',
  amusement_park: 'Attraction',
  aquarium: 'Attraction',
  zoo: 'Attraction',
  stadium: 'Attraction',
  movie_theater: 'Attraction',
  temple: 'Attraction',
  church: 'Attraction',
  mosque: 'Attraction',
  hindu_temple: 'Attraction',

  // Nature
  park: 'Nature',
  national_park: 'Nature',
  beach: 'Nature',
  campground: 'Nature',
  botanical_garden: 'Nature',
  nature_reserve: 'Nature',
  wildlife_park: 'Nature',

  // Shopping
  shopping_mall: 'Shopping',
  market: 'Shopping',
  clothing_store: 'Shopping',
  jewelry_store: 'Shopping',
  book_store: 'Shopping',
  gift_shop: 'Shopping',

  // Accommodation
  lodging: 'Accommodation',
  hotel: 'Accommodation',
  hostel: 'Accommodation',
  resort_hotel: 'Accommodation',
  motel: 'Accommodation',

  // Transport
  airport: 'Transport',
  train_station: 'Transport',
  bus_station: 'Transport',
  ferry_terminal: 'Transport',
};

export function getCategoryFromPrimaryType(primaryType?: string): PlaceCategory {
  if (!primaryType) return 'Attraction';
  return TYPE_MAP[primaryType] ?? 'Attraction';
}

/** Color used for map markers, badge backgrounds etc. */
export const CATEGORY_COLORS: Record<PlaceCategory, string> = {
  Food: '#f97316',       // orange-500
  Dessert: '#ec4899',    // pink-500
  Cafe: '#a78bfa',       // violet-400
  Attraction: '#3b82f6', // blue-500
  Nature: '#22c55e',     // green-500
  Shopping: '#eab308',   // yellow-500
  Nightlife: '#8b5cf6',  // violet-500
  Accommodation: '#14b8a6', // teal-500
  Transport: '#6b7280',  // gray-500
};
