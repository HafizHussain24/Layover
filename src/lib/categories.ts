/**
 * Maps Google Places API types to WanderRoom display categories.
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
  // Food & Restaurants
  restaurant: 'Food',
  food: 'Food',
  meal_takeaway: 'Food',
  meal_delivery: 'Food',
  fast_food_restaurant: 'Food',
  food_court: 'Food',
  sandwich_shop: 'Food',
  steak_house: 'Food',
  diner: 'Food',
  indian_restaurant: 'Food',
  chinese_restaurant: 'Food',
  seafood_restaurant: 'Food',
  european_restaurant: 'Food',
  american_restaurant: 'Food',
  asian_restaurant: 'Food',
  barbecue_restaurant: 'Food',
  brazilian_restaurant: 'Food',
  breakfast_restaurant: 'Food',
  brunch_restaurant: 'Food',
  buffet_restaurant: 'Food',
  french_restaurant: 'Food',
  greek_restaurant: 'Food',
  hamburger_restaurant: 'Food',
  indonesian_restaurant: 'Food',
  italian_restaurant: 'Food',
  japanese_restaurant: 'Food',
  korean_restaurant: 'Food',
  lebanese_restaurant: 'Food',
  mediterranean_restaurant: 'Food',
  mexican_restaurant: 'Food',
  middle_eastern_restaurant: 'Food',
  pizza_restaurant: 'Food',
  ramen_restaurant: 'Food',
  spanish_restaurant: 'Food',
  sushi_restaurant: 'Food',
  thai_restaurant: 'Food',
  turkish_restaurant: 'Food',
  vegan_restaurant: 'Food',
  vegetarian_restaurant: 'Food',
  vietnamese_restaurant: 'Food',

  // Bakery & Dessert
  bakery: 'Dessert',
  cake_shop: 'Dessert',
  dessert_shop: 'Dessert',
  dessert_restaurant: 'Dessert',
  ice_cream_shop: 'Dessert',
  confectionery: 'Dessert',
  candy_store: 'Dessert',
  chocolate_shop: 'Dessert',
  donut_shop: 'Dessert',
  pastry_shop: 'Dessert',
  sweet_shop: 'Dessert',
  frozen_dessert_shop: 'Dessert',

  // Cafe & Beverages
  cafe: 'Cafe',
  coffee_shop: 'Cafe',
  coffee_store: 'Cafe',
  espresso_bar: 'Cafe',
  tea_house: 'Cafe',
  tea_store: 'Cafe',
  juice_shop: 'Cafe',

  // Nightlife & Bars
  bar: 'Nightlife',
  night_club: 'Nightlife',
  pub: 'Nightlife',
  lounge: 'Nightlife',
  brewery: 'Nightlife',
  winery: 'Nightlife',
  distillery: 'Nightlife',
  cocktail_bar: 'Nightlife',
  wine_bar: 'Nightlife',
  sports_bar: 'Nightlife',
  karaoke: 'Nightlife',

  // Attractions & Culture
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
  synagogue: 'Attraction',
  shrine: 'Attraction',
  cultural_center: 'Attraction',
  performing_arts_theater: 'Attraction',
  event_venue: 'Attraction',
  planetarium: 'Attraction',

  // Nature & Outdoors
  park: 'Nature',
  national_park: 'Nature',
  beach: 'Nature',
  campground: 'Nature',
  botanical_garden: 'Nature',
  nature_reserve: 'Nature',
  wildlife_park: 'Nature',
  hiking_area: 'Nature',
  scenic_spot: 'Nature',
  state_park: 'Nature',

  // Shopping
  shopping_mall: 'Shopping',
  market: 'Shopping',
  flea_market: 'Shopping',
  supermarket: 'Shopping',
  grocery_store: 'Shopping',
  department_store: 'Shopping',
  convenience_store: 'Shopping',
  clothing_store: 'Shopping',
  jewelry_store: 'Shopping',
  book_store: 'Shopping',
  gift_shop: 'Shopping',
  store: 'Shopping',

  // Accommodation
  lodging: 'Accommodation',
  hotel: 'Accommodation',
  hostel: 'Accommodation',
  resort_hotel: 'Accommodation',
  motel: 'Accommodation',
  bed_and_breakfast: 'Accommodation',
  guest_house: 'Accommodation',
  extended_stay_hotel: 'Accommodation',
  cottage: 'Accommodation',

  // Transport
  airport: 'Transport',
  train_station: 'Transport',
  subway_station: 'Transport',
  transit_station: 'Transport',
  bus_station: 'Transport',
  ferry_terminal: 'Transport',
  taxi_stand: 'Transport',
};

/**
 * Multi-stage category resolution engine:
 * 1. Checks place name for unmistakable keywords (Cafe, Bakery, Restaurant, Beach, Mall...)
 * 2. Checks Google Places primaryType
 * 3. Inspects the full types[] array
 * 4. Defaults to 'Attraction' if no other category matches.
 */
export function resolveCategory(
  primaryType?: string | null,
  types?: string[] | null,
  name?: string | null
): PlaceCategory {
  // 1. High-confidence Name Heuristics (handles places Google labels as 'premise' or generic)
  if (name) {
    const lower = name.toLowerCase();

    // Cafe keywords
    if (/\b(cafe|café|coffee|roastery|brew|tea house|chai|espresso|starbucks)\b/i.test(lower)) {
      return 'Cafe';
    }

    // Bakery & Dessert keywords
    if (/\b(bakery|baker|bake|bakes|cake|cakes|pastry|pastries|dessert|desserts|ice cream|gelato|waffle|waffles|sweets|confectionery|sugar)\b/i.test(lower)) {
      return 'Dessert';
    }

    // Food & Restaurant keywords
    if (/\b(restaurant|bistro|diner|kitchen|eatery|grill|biriyani|biryani|dhaba|mess|canteen|barbeque|bbq|pizza|pizzeria|burger|shawarma|tandoor|hotel|curry|tiffin|meals|food court|fast food)\b/i.test(lower)) {
      return 'Food';
    }

    // Nightlife keywords
    if (/\b(bar|pub|brewery|lounge|tavern|club|cocktail|wine)\b/i.test(lower)) {
      return 'Nightlife';
    }

    // Nature keywords
    if (/\b(beach|falls|waterfall|lake|park|garden|gardens|forest|hill|peak|valley|viewpoint|sanctuary|river|dam|island)\b/i.test(lower)) {
      return 'Nature';
    }

    // Shopping keywords
    if (/\b(mall|market|bazaar|bazar|theruvu|street|store|supermarket|hypermarket|plaza|mart|textiles|silks)\b/i.test(lower)) {
      return 'Shopping';
    }

    // Accommodation keywords
    if (/\b(resort|inn|stay|homestay|hostel|lodge|villas|suites|cottage|retreat)\b/i.test(lower)) {
      return 'Accommodation';
    }

    // Transport keywords
    if (/\b(airport|railway station|railway|bus stand|bus stop|ferry|terminal|metro station)\b/i.test(lower)) {
      return 'Transport';
    }

    // Attraction keywords
    if (/\b(museum|fort|palace|temple|church|mosque|cathedral|monument|memorial|lighthouse|planetarium|aquarium|zoo)\b/i.test(lower)) {
      return 'Attraction';
    }
  }

  // 2. Check primaryType directly
  if (primaryType && TYPE_MAP[primaryType]) {
    return TYPE_MAP[primaryType];
  }

  // Check wildcard / suffix patterns on primaryType
  if (primaryType) {
    if (primaryType.endsWith('_restaurant') || primaryType.includes('restaurant')) return 'Food';
    if (primaryType.includes('cafe') || primaryType.includes('coffee') || primaryType.includes('tea')) return 'Cafe';
    if (primaryType.includes('bakery') || primaryType.includes('cake') || primaryType.includes('dessert') || primaryType.includes('ice_cream')) return 'Dessert';
    if (primaryType.includes('bar') || primaryType.includes('pub') || primaryType.includes('club') || primaryType.includes('lounge')) return 'Nightlife';
    if (primaryType.includes('hotel') || primaryType.includes('lodging') || primaryType.includes('resort')) return 'Accommodation';
    if (primaryType.includes('park') || primaryType.includes('beach') || primaryType.includes('garden')) return 'Nature';
    if (primaryType.includes('store') || primaryType.includes('shop') || primaryType.includes('mall') || primaryType.includes('market')) return 'Shopping';
  }

  // 3. Inspect full types[] array in priority order
  if (types && types.length > 0) {
    for (const t of types) {
      if (t === 'cafe' || t === 'coffee_shop' || t === 'tea_house' || t === 'coffee_store' || t === 'espresso_bar') return 'Cafe';
    }
    for (const t of types) {
      if (t === 'bakery' || t === 'cake_shop' || t === 'dessert_shop' || t === 'ice_cream_shop' || t === 'confectionery') return 'Dessert';
    }
    for (const t of types) {
      if (t === 'restaurant' || t.endsWith('_restaurant') || t === 'food' || t === 'meal_takeaway' || t === 'meal_delivery' || t === 'food_court') return 'Food';
    }
    for (const t of types) {
      if (t === 'bar' || t === 'pub' || t === 'night_club' || t === 'lounge' || t === 'brewery') return 'Nightlife';
    }
    for (const t of types) {
      if (t === 'beach' || t === 'national_park' || t === 'nature_reserve' || t === 'campground' || t === 'botanical_garden' || t === 'hiking_area') return 'Nature';
    }
    for (const t of types) {
      if (t === 'shopping_mall' || t === 'market' || t === 'flea_market' || t === 'supermarket' || t === 'clothing_store' || t === 'gift_shop') return 'Shopping';
    }
    for (const t of types) {
      if (t === 'hotel' || t === 'lodging' || t === 'hostel' || t === 'resort_hotel' || t === 'motel' || t === 'bed_and_breakfast') return 'Accommodation';
    }
    for (const t of types) {
      if (t === 'airport' || t === 'train_station' || t === 'bus_station' || t === 'ferry_terminal' || t === 'transit_station') return 'Transport';
    }
    for (const t of types) {
      if (t === 'museum' || t === 'tourist_attraction' || t === 'art_gallery' || t === 'historical_landmark' || t === 'monument' || t === 'temple' || t === 'church' || t === 'mosque') return 'Attraction';
    }
  }

  return 'Attraction';
}

export function getCategoryFromPrimaryType(primaryType?: string | null): PlaceCategory {
  return resolveCategory(primaryType, null, null);
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

export const CATEGORY_ICONS: Record<PlaceCategory, string> = {
  Food: '🍽️',
  Dessert: '🍨',
  Cafe: '☕',
  Attraction: '🏛️',
  Nature: '🌲',
  Shopping: '🛍️',
  Nightlife: '🍸',
  Accommodation: '🏨',
  Transport: '🚆',
};

export const ALL_CATEGORIES: PlaceCategory[] = [
  'Food',
  'Dessert',
  'Cafe',
  'Attraction',
  'Nature',
  'Shopping',
  'Nightlife',
  'Accommodation',
  'Transport',
];

export function getCategoryIcon(category?: string | null): string {
  if (!category) return '📍';
  return CATEGORY_ICONS[category as PlaceCategory] ?? '📍';
}

export function getCategoryColor(category?: string | null): string {
  if (!category) return '#3b82f6';
  return CATEGORY_COLORS[category as PlaceCategory] ?? '#3b82f6';
}


