/// <reference types="google.maps" />
import { useState, useRef } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { getCategoryFromPrimaryType, CATEGORY_COLORS, type PlaceCategory } from '../lib/categories';

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
}

export default function SearchBar({ onAddPlace, adding }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const placesLib = useMapsLibrary('places');
  const [selected, setSelected] = useState<PlacePreview | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    
    if (!placesLib || !val.trim()) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: val,
      });
      setSuggestions(response.suggestions || []);
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = async (suggestion: google.maps.places.AutocompleteSuggestion) => {
    if (!placesLib || !suggestion.placePrediction) return;
    
    try {
      // Use the new Place class
      const place = new placesLib.Place({ id: suggestion.placePrediction.placeId });
      await place.fetchFields({ 
        fields: ['id', 'displayName', 'formattedAddress', 'location', 'primaryType', 'rating', 'userRatingCount'] 
      });
      
      setSelected({
        place_id: place.id,
        name: place.displayName ?? 'Unknown Place',
        address: place.formattedAddress ?? undefined,
        lat: place.location?.lat() ?? 0,
        lng: place.location?.lng() ?? 0,
        category: getCategoryFromPrimaryType(place.primaryType ?? undefined),
        rating: place.rating ?? undefined,
        review_count: place.userRatingCount ?? undefined
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

  return (
    <div className="relative w-full">
      <div className="relative flex items-center bg-surface-1/90 backdrop-blur-md rounded-xl border border-slate-700/50 shadow-lg overflow-hidden focus-within:border-indigo-500/50 transition-colors">
        <span className="pl-4 text-slate-400">🔍</span>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Search for places..."
          className="w-full px-3 py-3 text-sm bg-transparent text-white outline-none"
          disabled={adding}
        />
        {(selected || inputValue) && (
          <button onClick={handleClear} className="pr-4 text-slate-400 hover:text-white" disabled={adding}>
            ✕
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {suggestions.length > 0 && !selected && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-surface-1 rounded-xl shadow-xl border border-slate-700/50 z-50 overflow-hidden max-h-60 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => handleSuggestionClick(s)}
              className="w-full text-left px-4 py-3 text-sm hover:bg-slate-800/60 border-b border-slate-800/30 last:border-0 transition-colors"
            >
              <div className="text-white font-medium">{s.placePrediction?.text?.text}</div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-surface-1 rounded-xl p-4 shadow-xl border border-slate-700/50 z-50 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <h3 className="font-bold text-white text-sm leading-tight mb-1">{selected.name}</h3>
              <p className="text-slate-400 text-xs line-clamp-1">{selected.address}</p>
            </div>
            <span 
              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide flex-shrink-0"
              style={{ background: `${CATEGORY_COLORS[selected.category]}20`, color: CATEGORY_COLORS[selected.category] }}
            >
              {selected.category}
            </span>
          </div>
          
          <button 
            onClick={handleAdd}
            disabled={adding}
            className="w-full btn btn-primary text-xs py-2"
          >
            {adding ? <><span className="spinner w-3 h-3 border-2" /> Adding...</> : '✨ Add to Bucket'}
          </button>
        </div>
      )}
    </div>
  );
}
