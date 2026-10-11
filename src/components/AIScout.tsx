/// <reference types="google.maps" />
import { useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { askGeminiTravelAssistant, type AISuggestion } from '../lib/gemini';
import { resolveCategory, getCategoryColor, getCategoryIcon } from '../lib/categories';
import type { BucketLocation } from '../lib/types';
import type { PlacePreview } from './SearchBar';
import CategoryIcon from './CategoryIcon';
import {
  Sparkles, Search, Plus, Check, ExternalLink, Star,
  Loader2, Compass, AlertCircle, RefreshCw, MapPin, X, SlidersHorizontal,
} from 'lucide-react';

interface AIScoutProps {
  roomId?: string;
  destination?: { lat: number; lng: number; name?: string | null } | null;
  bucketItems: BucketLocation[];
  onAddPlace: (place: PlacePreview) => Promise<void> | void;
  addingPlace: boolean;
}

interface GroundedSuggestion extends AISuggestion {
  resolvedPlace?: PlacePreview;
  isResolving?: boolean;
}

const QUICK_PROMPTS = [
  'Adventurous outdoor activities and scenic viewpoints',
  'Best local food specialties and must-try restaurants',
  'Aesthetic cafes and quiet breakfast spots',
  'Hidden gems and offbeat spots away from tourist crowds',
  'Best street food and dessert places',
];

export default function AIScout({
  roomId,
  destination,
  bucketItems,
  onAddPlace,
  addingPlace,
}: AIScoutProps) {
  const storageKey = `waymark_ai_scout_${roomId || 'default'}`;

  // Persistent query & suggestions from sessionStorage
  const [query, setQuery] = useState<string>(() => {
    try {
      return sessionStorage.getItem(`${storageKey}_query`) || '';
    } catch {
      return '';
    }
  });

  const [suggestions, setSuggestions] = useState<GroundedSuggestion[]>(() => {
    try {
      const saved = sessionStorage.getItem(`${storageKey}_suggestions`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [minRating, setMinRating] = useState<number>(0);
  const [reviewFilter, setReviewFilter] = useState<'ALL' | '<500' | '<1000' | '1000+'>('ALL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [addingCardName, setAddingCardName] = useState<string | null>(null);

  const placesLib = useMapsLibrary('places');

  const existingNames = bucketItems.map(b => b.name);
  const destinationLabel = destination?.name ? destination.name.split(',')[0].trim() : null;

  const saveToStorage = (newQuery: string, newSuggestions: GroundedSuggestion[]) => {
    try {
      sessionStorage.setItem(`${storageKey}_query`, newQuery);
      sessionStorage.setItem(`${storageKey}_suggestions`, JSON.stringify(newSuggestions));
    } catch {}
  };

  const handleClearChat = () => {
    setQuery('');
    setSuggestions([]);
    setError(null);
    try {
      sessionStorage.removeItem(`${storageKey}_query`);
      sessionStorage.removeItem(`${storageKey}_suggestions`);
    } catch {}
  };

  // Helper to detect generic roads, streets, cities, and administrative regions
  const isGeocodeOrRegion = (types?: string[], primaryType?: string): boolean => {
    const regionTypes = new Set([
      'route',
      'street_address',
      'locality',
      'sublocality',
      'political',
      'administrative_area_level_1',
      'administrative_area_level_2',
      'administrative_area_level_3',
      'country',
      'postal_code',
      'intersection',
    ]);
    if (primaryType && regionTypes.has(primaryType)) return true;
    if (types && types.length > 0) {
      const isEstablishment = types.includes('establishment') || types.includes('point_of_interest');
      if (!isEstablishment && types.some(t => regionTypes.has(t))) return true;
    }
    return false;
  };

  // Resolve an AI suggestion against Google Places API to extract place_id, lat, lng, rating
  const groundPlaceWithGoogle = async (
    sugg: AISuggestion
  ): Promise<PlacePreview | null> => {
    if (!placesLib) return null;
    try {
      // Prioritize clean venue name + destination city to avoid road/street names overriding establishment
      const cleanVenueQuery = `${sugg.place_name} ${destinationLabel || ''}`.trim();
      const queriesToTry = [cleanVenueQuery];
      if (sugg.search_query && sugg.search_query.toLowerCase() !== cleanVenueQuery.toLowerCase()) {
        queriesToTry.push(sugg.search_query.trim());
      }

      let validPrediction: any = null;

      for (const inputQuery of queriesToTry) {
        const request: any = { input: inputQuery };
        if (destination?.lat && destination?.lng) {
          request.locationBias = {
            center: { lat: destination.lat, lng: destination.lng },
            radius: 50000,
          };
        }

        const res = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
        const suggestions = res.suggestions || [];

        // Find the first suggestion that is an actual establishment/venue, NOT a street or city
        const matchingSugg = suggestions.find(s => {
          const types = s.placePrediction?.types;
          return !isGeocodeOrRegion(types);
        });

        if (matchingSugg?.placePrediction?.placeId) {
          validPrediction = matchingSugg.placePrediction;
          break;
        }
      }

      if (!validPrediction?.placeId) return null;

      const place = new placesLib.Place({ id: validPrediction.placeId });
      await place.fetchFields({
        fields: ['id', 'displayName', 'formattedAddress', 'location', 'primaryType', 'types', 'rating', 'userRatingCount'],
      });

      // Guard: Double check the fetched place is not a generic street or city
      if (isGeocodeOrRegion(place.types, place.primaryType || undefined)) {
        return null;
      }

      const resolvedCat = resolveCategory(place.primaryType, place.types, place.displayName);
      // If resolvedCat is fallback 'Attraction' but Gemini had specific 'Food', 'Cafe', etc., preserve Gemini's category
      const category = (resolvedCat === 'Attraction' && sugg.category !== 'Attraction')
        ? sugg.category
        : (resolvedCat || sugg.category);

      return {
        place_id: place.id,
        name: place.displayName ?? sugg.place_name,
        address: place.formattedAddress ?? undefined,
        lat: place.location?.lat() ?? (destination?.lat ?? 0),
        lng: place.location?.lng() ?? (destination?.lng ?? 0),
        category,
        rating: place.rating ?? undefined,
        review_count: place.userRatingCount ?? undefined,
      };
    } catch (err) {
      console.warn('Could not ground place with Google Places:', sugg.place_name, err);
      return null;
    }
  };

  const handleSearch = async (promptText: string) => {
    const textToSearch = promptText.trim();
    if (!textToSearch) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Ask Gemini
      const rawSuggestions = await askGeminiTravelAssistant(
        textToSearch,
        destinationLabel,
        existingNames
      );

      // Initialize with ungrounded list
      const initialGrounded: GroundedSuggestion[] = rawSuggestions.map(s => ({
        ...s,
        isResolving: true,
      }));
      setSuggestions(initialGrounded);

      // 2. Ground each suggestion in parallel using Google Places API
      const groundedResults = await Promise.all(
        rawSuggestions.map(async (s) => {
          const resolved = await groundPlaceWithGoogle(s);
          return {
            ...s,
            resolvedPlace: resolved || undefined,
            isResolving: false,
          };
        })
      );

      setSuggestions(groundedResults);
      saveToStorage(textToSearch, groundedResults);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const handleAddSuggestionToBucket = async (item: GroundedSuggestion) => {
    const resolved = item.resolvedPlace;
    setAddingCardName(item.place_name);

    try {
      if (resolved) {
        await onAddPlace(resolved);
        setAddedIds(prev => new Set(prev).add(resolved.place_id).add(item.place_name));
      } else {
        // Fallback: If Places autocomplete did not ground it, search directly on click
        let fallbackPlace = await groundPlaceWithGoogle(item);
        if (!fallbackPlace && destination) {
          fallbackPlace = {
            place_id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: item.place_name,
            address: destinationLabel ? `${item.place_name}, ${destinationLabel}` : item.place_name,
            lat: destination.lat,
            lng: destination.lng,
            category: item.category,
          };
        }
        if (fallbackPlace) {
          await onAddPlace(fallbackPlace);
          setAddedIds(prev => new Set(prev).add(fallbackPlace.place_id).add(item.place_name));
        }
      }
    } catch (err) {
      console.error('Failed to add AI suggestion to bucket:', err);
    } finally {
      setAddingCardName(null);
    }
  };

  const isAlreadyInBucket = (item: GroundedSuggestion) => {
    if (addedIds.has(item.place_name)) return true;
    if (item.resolvedPlace && addedIds.has(item.resolvedPlace.place_id)) return true;
    return bucketItems.some(
      b => b.name.toLowerCase() === item.place_name.toLowerCase() ||
           (item.resolvedPlace && (b.place_id === item.resolvedPlace.place_id || b.id === item.resolvedPlace.place_id))
    );
  };

  const getGoogleMapsUrl = (item: GroundedSuggestion) => {
    if (item.resolvedPlace?.place_id) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.resolvedPlace.name)}&query_place_id=${item.resolvedPlace.place_id}`;
    }
    const q = item.search_query || `${item.place_name} ${destinationLabel || ''}`.trim();
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  };

  const filteredSuggestions = suggestions.filter((item) => {
    if (item.isResolving) return true;

    const rating = item.resolvedPlace?.rating;
    const reviewCount = item.resolvedPlace?.review_count;

    // Rating filter
    if (minRating > 0) {
      if (typeof rating !== 'number' || rating < minRating) {
        return false;
      }
    }

    // Review count filter
    if (reviewFilter === '<500') {
      if (typeof reviewCount !== 'number' || reviewCount >= 500) {
        return false;
      }
    } else if (reviewFilter === '<1000') {
      if (typeof reviewCount !== 'number' || reviewCount >= 1000) {
        return false;
      }
    } else if (reviewFilter === '1000+') {
      if (typeof reviewCount !== 'number' || reviewCount < 1000) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-4">
      {/* ── Header Banner ── */}
      <div className="p-3.5 rounded-xl border relative overflow-hidden"
           style={{
             background: 'linear-gradient(135deg, rgba(249,93,15,0.08) 0%, rgba(139,92,246,0.08) 100%)',
             borderColor: 'rgba(249,93,15,0.2)'
           }}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #ff7a38, #f95d0f)' }}>
            <Sparkles size={13} color="white" />
          </div>
          <h3 className="font-display font-bold text-sm" style={{ color: '#e8e8ec' }}>
            WayMark Scout
          </h3>
          {destinationLabel && (
            <span className="badge ml-auto"
                  style={{ background: 'rgba(249,93,15,0.15)', color: '#ff9a5c', borderColor: 'rgba(249,93,15,0.3)' }}>
              <MapPin size={9} />
              {destinationLabel}
            </span>
          )}
        </div>
        <p className="text-xs" style={{ color: '#8a8a96' }}>
          Ask AI for activities, hidden spots, or food recommendations in {destinationLabel || 'your destination'}.
        </p>
      </div>

      {/* ── Search Input Form ── */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              const val = e.target.value;
              setQuery(val);
              try { sessionStorage.setItem(`${storageKey}_query`, val); } catch {}
            }}
            placeholder={destinationLabel ? `What are you looking for in ${destinationLabel}?` : "e.g., Adventurous hiking spots & good food..."}
            className="w-full pl-9 pr-8 py-2.5 text-xs rounded-xl"
            disabled={loading}
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#6a6a76' }}>
            <Search size={14} />
          </div>
          {query && !loading && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                try { sessionStorage.removeItem(`${storageKey}_query`); } catch {}
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-200"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="btn btn-primary !py-2 text-xs w-full gap-2"
        >
          {loading ? (
            <><Loader2 size={13} className="animate-spin" /> Scouting places with Gemini…</>
          ) : (
            <><Sparkles size={13} /> Ask AI Scout</>
          )}
        </button>
      </form>

      {/* ── Quick Prompt Chips ── */}
      <div className="flex flex-col gap-1.5">
        <span className="section-label">Quick Ideas</span>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((promptText) => (
            <button
              key={promptText}
              type="button"
              onClick={() => {
                setQuery(promptText);
                try { sessionStorage.setItem(`${storageKey}_query`, promptText); } catch {}
                handleSearch(promptText);
              }}
              disabled={loading}
              className="text-[11px] px-2.5 py-1.5 rounded-lg border text-left transition-all"
              style={{
                background: 'var(--color-surface-3)',
                borderColor: 'rgba(255,255,255,0.06)',
                color: '#8a8a96'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = '#e8e8ec';
                e.currentTarget.style.borderColor = 'rgba(249,93,15,0.3)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = '#8a8a96';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
              }}
            >
              {promptText}
            </button>
          ))}
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl text-xs"
             style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
          <AlertCircle size={14} className="shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => handleSearch(query)} className="underline hover:text-white">
            <RefreshCw size={12} />
          </button>
        </div>
      )}

      {/* ── Loading Skeletons ── */}
      {loading && suggestions.length === 0 && (
        <div className="flex flex-col gap-3 py-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="p-3.5 rounded-xl border animate-pulse flex flex-col gap-2"
                 style={{ background: 'var(--color-surface-2)', borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between">
                <div className="h-4 w-1/3 rounded bg-white/5" />
                <div className="h-4 w-16 rounded bg-white/5" />
              </div>
              <div className="h-3 w-3/4 rounded bg-white/5" />
              <div className="h-8 w-full rounded bg-white/5 mt-1" />
            </div>
          ))}
        </div>
      )}

      {/* ── Recommendations List ── */}
      {suggestions.length > 0 && (
        <div className="flex flex-col gap-3 pb-4">
          <div className="flex items-center justify-between">
            <span className="section-label">Suggested Spots ({suggestions.length})</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px]" style={{ color: '#10b981' }}>Verified with Google Places</span>
              <button
                type="button"
                onClick={handleClearChat}
                className="text-[10px] px-2 py-0.5 rounded transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)', color: '#8a8a96', border: '1px solid rgba(255,255,255,0.08)' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#8a8a96'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                title="Clear current suggestions"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Filters Bar: Rating & Review Count */}
          <div className="flex flex-col gap-2 p-2.5 rounded-xl border"
               style={{ background: 'var(--color-surface-3)', borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: '#ff9a5c' }}>
                <SlidersHorizontal size={12} />
                Filter Places
                {(minRating > 0 || reviewFilter !== 'ALL') && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1"
                        style={{ background: 'rgba(249,93,15,0.2)', color: '#ff9a5c' }}>
                    {filteredSuggestions.length} of {suggestions.length}
                  </span>
                )}
              </span>
              {(minRating > 0 || reviewFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => { setMinRating(0); setReviewFilter('ALL'); }}
                  className="text-[10px] font-medium transition-colors hover:underline"
                  style={{ color: '#f95d0f' }}
                >
                  Clear filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Rating filter dropdown */}
              <div>
                <label className="text-[10px] block mb-1 font-medium" style={{ color: '#6a6a76' }}>
                  Rating Range
                </label>
                <select
                  value={minRating}
                  onChange={(e) => setMinRating(Number(e.target.value))}
                  className="w-full text-xs px-2 py-1.5 rounded-lg border cursor-pointer font-medium"
                  style={{
                    background: 'var(--color-surface-2)',
                    borderColor: minRating > 0 ? 'rgba(249,93,15,0.4)' : 'rgba(255,255,255,0.08)',
                    color: minRating > 0 ? '#ff9a5c' : '#e8e8ec',
                  }}
                >
                  <option value={0}>Any Rating</option>
                  <option value={4.0}>★ 4.0+ Stars</option>
                  <option value={4.3}>★ 4.3+ Stars</option>
                  <option value={4.5}>★ 4.5+ Stars</option>
                  <option value={4.7}>★ 4.7+ Stars</option>
                </select>
              </div>

              {/* Review count filter dropdown */}
              <div>
                <label className="text-[10px] block mb-1 font-medium" style={{ color: '#6a6a76' }}>
                  Review Count
                </label>
                <select
                  value={reviewFilter}
                  onChange={(e) => setReviewFilter(e.target.value as any)}
                  className="w-full text-xs px-2 py-1.5 rounded-lg border cursor-pointer font-medium"
                  style={{
                    background: 'var(--color-surface-2)',
                    borderColor: reviewFilter !== 'ALL' ? 'rgba(249,93,15,0.4)' : 'rgba(255,255,255,0.08)',
                    color: reviewFilter !== 'ALL' ? '#ff9a5c' : '#e8e8ec',
                  }}
                >
                  <option value="ALL">Any Review Count</option>
                  <option value="<500">&lt; 500 Reviews (Offbeat)</option>
                  <option value="<1000">&lt; 1,000 Reviews</option>
                  <option value="1000+">1,000+ Reviews (Popular)</option>
                </select>
              </div>
            </div>
          </div>

          {filteredSuggestions.length === 0 ? (
            <div className="p-4 rounded-xl text-center border flex flex-col items-center gap-1.5"
                 style={{ background: 'var(--color-surface-2)', borderColor: 'rgba(255,255,255,0.06)' }}>
              <p className="text-xs font-semibold" style={{ color: '#e8e8ec' }}>No places match selected filters</p>
              <p className="text-[11px]" style={{ color: '#6a6a76' }}>
                None of the {suggestions.length} places meet {minRating > 0 ? `★ ${minRating}+ rating` : ''} {minRating > 0 && reviewFilter !== 'ALL' ? 'and ' : ''} {reviewFilter !== 'ALL' ? `${reviewFilter} reviews` : ''}.
              </p>
              <button
                type="button"
                onClick={() => { setMinRating(0); setReviewFilter('ALL'); }}
                className="btn btn-secondary !py-1 !px-3 text-xs mt-1"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            filteredSuggestions.map((item, idx) => {
            const inBucket = isAlreadyInBucket(item);
            const isAdding = addingPlace && addingCardName === item.place_name;
            const category = item.resolvedPlace?.category || item.category;
            const catColor = getCategoryColor(category);
            const catIcon = getCategoryIcon(category);
            const rating = item.resolvedPlace?.rating;
            const reviewCount = item.resolvedPlace?.review_count;
            const address = item.resolvedPlace?.address;

            return (
              <div
                key={`${item.place_name}-${idx}`}
                className="p-3.5 rounded-xl border flex flex-col gap-2.5 transition-all"
                style={{
                  background: 'var(--color-surface-2)',
                  borderColor: inBucket ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.07)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                }}
              >
                {/* Header row: Category + Highlight badge */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold"
                    style={{
                      background: `${catColor}18`,
                      color: catColor,
                      border: `1px solid ${catColor}35`,
                    }}
                  >
                    <CategoryIcon name={catIcon} size={10} />
                    {category}
                  </span>

                  {item.highlight && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(255,255,255,0.04)', color: '#a1a1aa', border: '1px solid rgba(255,255,255,0.06)' }}>
                      ⚡ {item.highlight}
                    </span>
                  )}
                </div>

                {/* Place Title */}
                <div>
                  <h4 className="font-semibold text-sm leading-snug" style={{ color: '#f4f4f6' }}>
                    {item.resolvedPlace?.name || item.place_name}
                  </h4>
                  {address && (
                    <p className="text-[11px] truncate mt-0.5" style={{ color: '#71717a' }}>
                      {address}
                    </p>
                  )}
                </div>

                {/* AI Insight Description */}
                <p className="text-xs leading-relaxed" style={{ color: '#a1a1aa' }}>
                  {item.description}
                </p>

                {/* Meta stats: Rating & Reviews if resolved */}
                {rating && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="flex items-center gap-1 font-bold text-amber-400">
                      <Star size={11} fill="#fbbf24" style={{ color: '#fbbf24' }} />
                      {rating}
                    </span>
                    {reviewCount !== undefined && (
                      <span className="text-[11px]" style={{ color: '#52525b' }}>
                        ({reviewCount.toLocaleString()} reviews)
                      </span>
                    )}
                  </div>
                )}

                {/* Actions row */}
                <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <a
                    href={getGoogleMapsUrl(item)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary !py-1.5 !px-2.5 text-xs gap-1.5"
                    title="Open in Google Maps"
                  >
                    <span>Maps</span>
                    <ExternalLink size={11} />
                  </a>

                  <button
                    type="button"
                    onClick={() => handleAddSuggestionToBucket(item)}
                    disabled={inBucket || isAdding}
                    className="btn !py-1.5 !px-3 text-xs flex-1 gap-1.5 transition-all"
                    style={inBucket ? {
                      background: 'rgba(16,185,129,0.15)',
                      color: '#6ee7b7',
                      border: '1px solid rgba(16,185,129,0.3)',
                      cursor: 'default',
                    } : {
                      background: 'linear-gradient(135deg, #ff7a38, #f95d0f)',
                      color: 'white',
                      boxShadow: '0 2px 10px rgba(249,93,15,0.3)',
                    }}
                  >
                    {isAdding ? (
                      <><Loader2 size={12} className="animate-spin" /> Adding…</>
                    ) : inBucket ? (
                      <><Check size={12} /> Added to Bucket</>
                    ) : (
                      <><Plus size={12} /> Add to Bucket</>
                    )}
                  </button>
                </div>
              </div>
            );
          }))}
        </div>
      )}

      {/* ── Empty State ── */}
      {!loading && suggestions.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center p-8 text-center rounded-2xl border"
             style={{ background: 'var(--color-surface-2)', borderColor: 'rgba(255,255,255,0.05)' }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
               style={{ background: 'var(--color-surface-3)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Compass size={22} style={{ color: '#4a4a54' }} />
          </div>
          <h4 className="font-semibold text-xs mb-1" style={{ color: '#e8e8ec' }}>
            Looking for ideas?
          </h4>
          <p className="text-[11px] max-w-[220px]" style={{ color: '#6a6a76' }}>
            Type what you feel like doing or click any quick idea above to explore {destinationLabel || 'places'}.
          </p>
        </div>
      )}
    </div>
  );
}
