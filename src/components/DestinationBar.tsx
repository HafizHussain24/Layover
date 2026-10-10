/// <reference types="google.maps" />
import { useState, useRef, useEffect } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

interface DestinationBarProps {
  currentDestination?: {
    name?: string | null;
    lat?: number | null;
    lng?: number | null;
  } | null;
  bucketCount?: number;
  hasBucketItems?: boolean;
  onSetDestination: (dest: { name: string; lat: number; lng: number } | null) => Promise<void> | void;
}

export default function DestinationBar({
  currentDestination,
  bucketCount = 0,
  hasBucketItems = false,
  onSetDestination,
}: DestinationBarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const placesLib = useMapsLibrary('places');

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleQueryChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (!placesLib || !val.trim()) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: val,
        // Boost cities, towns, and regions
        includedPrimaryTypes: [
          'locality',
          'administrative_area_level_1',
          'administrative_area_level_2',
          'country',
          'postal_town'
        ],
      });
      setSuggestions(response.suggestions || []);
    } catch (err) {
      console.error('Failed to fetch destination suggestions:', err);
      // Fallback without primary type restrictions in case of special regions
      try {
        const fallback = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: val,
        });
        setSuggestions(fallback.suggestions || []);
      } catch (_) {
        setSuggestions([]);
      }
    }
  };

  const handleSelectSuggestion = async (suggestion: google.maps.places.AutocompleteSuggestion) => {
    if (!placesLib || !suggestion.placePrediction) return;
    setIsSaving(true);
    try {
      const place = new placesLib.Place({ id: suggestion.placePrediction.placeId });
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location'],
      });

      const name = place.displayName || suggestion.placePrediction.text.text;
      const lat = place.location?.lat();
      const lng = place.location?.lng();

      if (typeof lat === 'number' && typeof lng === 'number') {
        await onSetDestination({ name, lat, lng });
      }

      setIsEditing(false);
      setQuery('');
      setSuggestions([]);
    } catch (err) {
      console.error('Failed to set destination:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setQuery('');
    setSuggestions([]);
  };

  if (isEditing) {
    return (
      <div className="relative flex flex-col gap-1 z-30">
        <div className="flex items-center gap-1.5 bg-slate-900 border border-indigo-500 rounded-xl p-1.5 shadow-xl">
          <span className="pl-2 text-sm">📍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="Enter city or region (e.g. Kyoto, Paris)..."
            disabled={isSaving}
            className="flex-1 bg-transparent px-2 py-1 text-xs text-white placeholder-slate-500 outline-none"
          />
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="px-2 py-1 text-xs text-slate-400 hover:text-white rounded"
          >
            ✕
          </button>
        </div>

        {/* City Autocomplete Dropdown */}
        {suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-700/80 shadow-2xl overflow-hidden z-40 max-h-56 overflow-y-auto">
            {suggestions.map((s, idx) => (
              <button
                key={s.placePrediction?.placeId || idx}
                type="button"
                onClick={() => handleSelectSuggestion(s)}
                className="w-full text-left px-3 py-2.5 hover:bg-indigo-600/20 border-b border-slate-800/80 last:border-b-0 transition-colors flex items-center gap-2.5 text-xs group"
              >
                <span className="text-sm opacity-60 group-hover:opacity-100">🏙️</span>
                <div className="min-w-0 flex-1">
                  <div className="text-white font-semibold truncate">
                    {s.placePrediction?.mainText?.text || s.placePrediction?.text.text}
                  </div>
                  {s.placePrediction?.secondaryText?.text && (
                    <div className="text-[10px] text-slate-400 truncate">
                      {s.placePrediction.secondaryText.text}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // When a destination is explicitly configured
  if (currentDestination?.name) {
    return (
      <div className="flex items-center justify-between bg-indigo-950/40 border border-indigo-500/30 rounded-xl px-3 py-2 text-xs shadow-sm">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base">📍</span>
          <div className="min-w-0">
            <div className="text-[10px] text-indigo-300 font-semibold uppercase tracking-wider">
              Trip Destination
            </div>
            <div className="text-white font-bold truncate">
              {currentDestination.name}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="px-2 py-1 text-[11px] text-indigo-300 hover:text-white bg-indigo-500/20 hover:bg-indigo-500/30 rounded border border-indigo-500/30 transition-colors font-medium"
          >
            Change
          </button>
          <button
            type="button"
            onClick={() => onSetDestination(null)}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors text-xs"
            title="Clear destination"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  // When no destination is configured but places exist in the bucket list (Auto-focus active)
  if (hasBucketItems && bucketCount > 0) {
    return (
      <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800/80 rounded-xl px-3 py-2 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base">🎯</span>
          <div className="min-w-0">
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              Auto-Focus Active
            </div>
            <div className="text-slate-300 font-medium truncate">
              Biased to {bucketCount} saved place{bucketCount > 1 ? 's' : ''}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="px-2 py-1 text-[11px] text-indigo-400 hover:text-indigo-300 underline font-medium shrink-0"
        >
          Set city
        </button>
      </div>
    );
  }

  // Unconfigured empty room state
  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className="w-full flex items-center justify-between p-2.5 bg-indigo-950/20 hover:bg-indigo-950/40 border border-dashed border-indigo-500/40 rounded-xl text-xs text-indigo-300 hover:text-white transition-all text-left group"
    >
      <div className="flex items-center gap-2">
        <span className="text-base group-hover:scale-110 transition-transform">📍</span>
        <span className="font-medium">Set trip destination to focus search</span>
      </div>
      <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30">
        + Set City
      </span>
    </button>
  );
}
