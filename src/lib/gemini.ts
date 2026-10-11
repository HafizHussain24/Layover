import type { PlaceCategory } from './categories';

export interface AISuggestion {
  place_name: string;
  category: PlaceCategory;
  description: string;
  search_query: string;
  highlight?: string;
}

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

const VALID_CATEGORIES: Set<PlaceCategory> = new Set([
  'Food',
  'Dessert',
  'Cafe',
  'Attraction',
  'Nature',
  'Shopping',
  'Nightlife',
  'Accommodation',
  'Transport',
]);

function normalizeCategory(rawCat?: string): PlaceCategory {
  if (!rawCat) return 'Attraction';
  if (VALID_CATEGORIES.has(rawCat as PlaceCategory)) return rawCat as PlaceCategory;
  const lower = rawCat.toLowerCase();
  if (lower.includes('food') || lower.includes('restaurant') || lower.includes('eat') || lower.includes('dining')) return 'Food';
  if (lower.includes('cafe') || lower.includes('coffee') || lower.includes('tea') || lower.includes('breakfast')) return 'Cafe';
  if (lower.includes('dessert') || lower.includes('bakery') || lower.includes('sweet') || lower.includes('cake') || lower.includes('ice cream')) return 'Dessert';
  if (lower.includes('nature') || lower.includes('trek') || lower.includes('hike') || lower.includes('park') || lower.includes('wildlife') || lower.includes('waterfall') || lower.includes('peak') || lower.includes('lake') || lower.includes('beach') || lower.includes('outdoor')) return 'Nature';
  if (lower.includes('shop') || lower.includes('market') || lower.includes('bazaar')) return 'Shopping';
  if (lower.includes('bar') || lower.includes('pub') || lower.includes('night') || lower.includes('club')) return 'Nightlife';
  if (lower.includes('hotel') || lower.includes('resort') || lower.includes('stay') || lower.includes('lodging')) return 'Accommodation';
  if (lower.includes('transport') || lower.includes('station') || lower.includes('travel')) return 'Transport';
  return 'Attraction';
}

function safeParseJsonArray(raw: string): any[] {
  let cleaned = raw.trim();

  // Strip markdown code fences if model ever prefixes them
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  }
  cleaned = cleaned.trim();

  // Extract substring between first '[' and last ']'
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    cleaned = cleaned.slice(firstBracket, lastBracket + 1);
  }

  // Remove trailing commas before } or ]
  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');

  try {
    const res = JSON.parse(cleaned);
    if (Array.isArray(res)) return res;
  } catch (initialErr) {
    console.warn('Initial JSON parse failed, attempting array recovery:', initialErr);
  }

  // Fallback recovery for truncated responses: slice to last closed object and close array
  try {
    const lastValidObj = cleaned.lastIndexOf('}');
    if (lastValidObj !== -1 && firstBracket !== -1) {
      const recovered = cleaned.slice(firstBracket, lastValidObj + 1) + ']';
      const res = JSON.parse(recovered.replace(/,\s*([\]}])/g, '$1'));
      if (Array.isArray(res) && res.length > 0) return res;
    }
  } catch (recoverErr) {
    console.error('JSON recovery failed:', recoverErr);
  }

  throw new Error('Could not parse travel recommendations. Please try submitting again.');
}

const DEMO_SUGGESTIONS: Record<string, AISuggestion[]> = {
  default: [
    {
      place_name: 'Meesapulimala',
      category: 'Nature',
      description: 'Second highest peak in the Western Ghats with breathtaking high-altitude grasslands and misty cloud valleys.',
      search_query: 'Meesapulimala trekking Munnar',
      highlight: 'High-altitude sunrise trek',
    },
    {
      place_name: 'Kolukkumalai Tea Estate',
      category: 'Attraction',
      description: "World's highest tea plantation reachable by a rugged 4x4 jeep safari, famous for panoramic sunrise views.",
      search_query: 'Kolukkumalai Tea Estate Munnar',
      highlight: 'Rugged 4x4 Jeep Safari',
    },
    {
      place_name: 'Rapsy Restaurant',
      category: 'Food',
      description: 'Iconic local eatery in Munnar town popular for hot Kerala parotta, beef roast, and spicy chicken curries.',
      search_query: 'Rapsy Restaurant Munnar',
      highlight: 'Famous local Kerala parotta',
    },
    {
      place_name: 'Kashi Art Cafe',
      category: 'Cafe',
      description: 'Charming gallery cafe serving artisanal coffees, fresh juices, and homemade chocolate cake amidst local art.',
      search_query: 'Kashi Art Cafe Fort Kochi',
      highlight: 'Art gallery & signature cakes',
    },
  ],
};

export async function askGeminiTravelAssistant(
  userPrompt: string,
  destinationName?: string | null,
  existingPlaces: string[] = []
): Promise<AISuggestion[]> {
  const apiKey = GEMINI_API_KEY.trim();

  // If no API key or in offline demo without key
  if (!apiKey) {
    console.warn('VITE_GEMINI_API_KEY is not set. Using offline demo recommendations.');
    return DEMO_SUGGESTIONS.default;
  }

  const locationContext = destinationName?.trim()
    ? `The group is planning a trip to "${destinationName}". Focus recommendations specifically in or around ${destinationName}.`
    : 'The user has not specified a strict destination yet; infer the location from their query or suggest places suited to the requested region.';

  const existingList = existingPlaces.length > 0
    ? `Do NOT suggest these places as they are already in the group's bucket list: ${existingPlaces.join(', ')}.`
    : '';

  const systemPrompt = `You are WayMark Scout, an expert travel scout and local insider.
${locationContext}
${existingList}

User Query: "${userPrompt}"

Suggest 3 to 5 specific, REAL, highly-rated places that best fulfill their request.
CRITICAL RULES FOR RECOMMENDATIONS:
1. "place_name": MUST ALWAYS be the exact official name of a specific, individual venue, restaurant, cafe, shop, or named point of interest (e.g., "Beyondburg Inc.", "Burger Lounge", "The Burger Junction").
   - NEVER suggest a street, road, or avenue (e.g., NEVER "PT Usha Road" or "MG Road").
   - NEVER suggest a neighborhood, district, or the city itself (e.g., NEVER "Kozhikode", "Calicut", "Downtown").
   - If the user asks for food, burgers, cafes, or drinks, every single suggestion MUST be a specific commercial eatery.
2. "category": Must be one of ["Food", "Dessert", "Cafe", "Attraction", "Nature", "Shopping", "Nightlife", "Accommodation", "Transport"].
3. "description": 1 to 2 engaging, concise sentences explaining what it is and why they should visit.
4. "search_query": Format strictly as "<Exact Place Name> <City/Destination>" (e.g., "Burger Lounge Kozhikode", "Beyondburg Calicut").
   - DO NOT include street names, road names, or generic phrases (e.g., do NOT write "Burger Lounge PT Usha Road" or "burger spot in Kozhikode") as this causes map search to match the road instead of the restaurant.
5. "highlight": A 2-4 word punchy badge highlight (e.g., "Smash Burgers", "Scenic Viewpoint", "Artisanal Coffee").`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  place_name: { type: 'STRING' },
                  category: { type: 'STRING' },
                  description: { type: 'STRING' },
                  search_query: { type: 'STRING' },
                  highlight: { type: 'STRING' },
                },
                required: ['place_name', 'category', 'description', 'search_query'],
              },
            },
            temperature: 0.7,
            maxOutputTokens: 4000,
          },
        }),
      }
    );

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Gemini API error (Status ${res.status})`);
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error('No suggestions returned by Gemini');
    }

    const parsed = safeParseJsonArray(rawText);

    return parsed.map((item) => ({
      place_name: item.place_name || 'Recommended Spot',
      category: normalizeCategory(item.category),
      description: item.description || '',
      search_query: item.search_query || `${item.place_name} ${destinationName || ''}`.trim(),
      highlight: item.highlight || undefined,
    }));
  } catch (err) {
    console.error('Gemini request failed:', err);
    throw err;
  }
}
