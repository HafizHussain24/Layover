/// <reference types="google.maps" />
import { useState, useRef } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { resolveCategory, CATEGORY_COLORS, type PlaceCategory } from '../lib/categories';
import { Search, X, Plus, Loader2, Star } from 'lucide-react';
import CategoryIcon from './CategoryIcon';
import { getCategoryIcon } from '../lib/categories';

export interface PlacePreview {
  place_id: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  category: PlaceCategory;
  rating?: number;
  review_count?: number;
}

interface SearchBarProps {
  onAddPlace: (place: PlacePreview) => void;
  adding: boolean;
  destination?: { lat: number; lng: number; name?: string | null } | null;
}

export default function SearchBar({ onAddPlace, adding, destination }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const placesLib = useMapsLibrary('places');
  const [selected, setSelected] = useState<PlacePreview | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (!placesLib || !val.trim()) { setSuggestions([]); return; }
    try {
      const request: any = { input: val };
      if (destination?.lat && destination?.lng) {
        request.locationBias = {
          center: { lat: destination.lat, lng: destination.lng },
          radius: 50000,
        };
      }
      const response = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
      setSuggestions(response.suggestions || []);
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = async (suggestion: google.maps.places.AutocompleteSuggestion) => {
    if (!placesLib || !suggestion.placePrediction) return;
    try {
      const place = new placesLib.Place({ id: suggestion.placePrediction.placeId });
      await place.fetchFields({
        fields: ['id', 'displayName', 'formattedAddress', 'location', 'primaryType', 'types', 'rating', 'userRatingCount'],
      });
      setSelected({
        place_id: place.id,
        name: place.displayName ?? 'Unknown Place',
        address: place.formattedAddress ?? undefined,
        lat: place.location?.lat() ?? 0,
        lng: place.location?.lng() ?? 0,
        category: resolveCategory(place.primaryType, place.types, place.displayName),
        rating: place.rating ?? undefined,
        review_count: place.userRatingCount ?? undefined,
      });
      setSuggestions([]);
      setInputValue(place.displayName ?? '');
    } catch (err) {
      console.error('Failed to fetch place details:', err);
    }
  };

  const handleClear = () => {
    setSelected(null);
    setInputValue('');
    setSuggestions([]);
  };

  const handleAdd = () => {
    if (selected) {
      onAddPlace(selected);
      handleClear();
    }
  };

  const placeholderText = destination?.name
    ? `Search in ${destination.name.split(',')[0]}…`
    : 'Search for places…';

  return (
    <div className="relative w-full">
      {/* Input row */}
      <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl transition-all"
           style={{
             background: 'var(--color-surface-3)',
             border: '1.5px solid rgba(255,255,255,0.08)',
           }}
           onFocus={() => {}}
      >
        <Search size={15} style={{ color: '#4a4a54', flexShrink: 0 }} />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholderText}
          className="flex-1 bg-transparent text-sm outline-none py-0.5"
          style={{ color: '#e8e8ec', border: 'none', boxShadow: 'none' }}
          disabled={adding}
        />
        {(selected || inputValue) && (
          <button onClick={handleClear} disabled={adding}
                  className="p-0.5 rounded transition-colors"
                  style={{ color: '#4a4a54' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#e8e8ec')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#4a4a54')}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Autocomplete dropdown */}
      {suggestions.length > 0 && !selected && (
        <div className="absolute top-full mt-2 left-0 right-0 autocomplete-dropdown z-50 max-h-64 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => handleSuggestionClick(s)}
                    className="autocomplete-item w-full text-left">
              <Search size={12} style={{ color: '#4a4a54', flexShrink: 0 }} />
              <div className="min-w-0">
                <div className="text-xs font-medium truncate" style={{ color: '#e8e8ec' }}>
                  {s.placePrediction?.mainText?.text || s.placePrediction?.text?.text}
                </div>
                {s.placePrediction?.secondaryText?.text && (
                  <div className="text-[11px] truncate" style={{ color: '#4a4a54' }}>
                    {s.placePrediction.secondaryText.text}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Selected place preview card */}
      {selected && (
        <div className="absolute top-full mt-2 left-0 right-0 z-50 rounded-xl p-4 shadow-2xl animate-in"
             style={{ background: 'var(--color-surface-2)', border: '1.5px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-sm leading-tight mb-0.5" style={{ color: '#e8e8ec' }}>
                {selected.name}
              </h3>
              <p className="text-xs line-clamp-1" style={{ color: '#4a4a54' }}>{selected.address}</p>
            </div>
            {/* Category badge */}
            <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold flex-shrink-0"
                  style={{
                    background: `${CATEGORY_COLORS[selected.category]}18`,
                    color: CATEGORY_COLORS[selected.category],
                    border: `1px solid ${CATEGORY_COLORS[selected.category]}35`,
                  }}>
              <CategoryIcon name={getCategoryIcon(selected.category)} size={10} />
              {selected.category}
            </span>
          </div>

          {selected.rating && (
            <div className="flex items-center gap-1.5 mb-3">
              <span className="flex items-center gap-1 text-xs font-bold" style={{ color: '#fbbf24' }}>
                <Star size={11} fill="#fbbf24" style={{ color: '#fbbf24' }} />
                {selected.rating}
              </span>
              <span className="text-[11px]" style={{ color: '#4a4a54' }}>({selected.review_count?.toLocaleString()} reviews)</span>
            </div>
          )}

          <button onClick={handleAdd} disabled={adding} className="btn btn-primary w-full text-xs py-2.5">
            {adding
              ? <><Loader2 size={13} className="animate-spin" /> Adding…</>
              : <><Plus size={13} /> Add to Bucket</>
            }
          </button>
        </div>
      )}
    </div>
  );
}
