/// <reference types="google.maps" />
import { useState, useRef, useEffect } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { MapPin, X, Globe, Loader2, Navigation, ChevronRight } from 'lucide-react';

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
    if (isEditing && inputRef.current) inputRef.current.focus();
  }, [isEditing]);

  const handleQueryChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (!placesLib || !val.trim()) { setSuggestions([]); return; }
    try {
      const response = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: val,
        includedPrimaryTypes: ['locality', 'administrative_area_level_1', 'administrative_area_level_2', 'country', 'postal_town'],
      });
      setSuggestions(response.suggestions || []);
    } catch {
      try {
        const fb = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({ input: val });
        setSuggestions(fb.suggestions || []);
      } catch { setSuggestions([]); }
    }
  };

  const handleSelectSuggestion = async (suggestion: google.maps.places.AutocompleteSuggestion) => {
    if (!placesLib || !suggestion.placePrediction) return;
    setIsSaving(true);
    try {
      const place = new placesLib.Place({ id: suggestion.placePrediction.placeId });
      await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });
      const name = place.displayName || suggestion.placePrediction.text.text;
      const lat = place.location?.lat();
      const lng = place.location?.lng();
      if (typeof lat === 'number' && typeof lng === 'number') await onSetDestination({ name, lat, lng });
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

  /* ── Editing state ── */
  if (isEditing) {
    return (
      <div className="relative flex flex-col gap-1 z-30">
        <div className="flex items-center gap-2 rounded-xl p-2.5 pr-1"
             style={{ background: 'var(--color-surface-3)', border: '1.5px solid rgba(249,93,15,0.4)' }}>
          {isSaving
            ? <Loader2 size={14} className="animate-spin ml-1" style={{ color: '#f95d0f', flexShrink: 0 }} />
            : <MapPin size={14} className="ml-1" style={{ color: '#f95d0f', flexShrink: 0 }} />
          }
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="Enter city or region — e.g. Kyoto, Paris…"
            disabled={isSaving}
            className="flex-1 bg-transparent px-1 py-0.5 text-xs outline-none"
            style={{ color: '#e8e8ec', border: 'none', boxShadow: 'none' }}
          />
          <button type="button" onClick={handleCancel} disabled={isSaving}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: '#4a4a54' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#e8e8ec')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#4a4a54')}>
            <X size={13} />
          </button>
        </div>

        {suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 autocomplete-dropdown z-40 max-h-56 overflow-y-auto">
            {suggestions.map((s, idx) => (
              <button key={s.placePrediction?.placeId || idx} type="button"
                      onClick={() => handleSelectSuggestion(s)}
                      className="autocomplete-item w-full text-left">
                <Globe size={12} style={{ color: '#4a4a54', flexShrink: 0 }} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold truncate" style={{ color: '#e8e8ec' }}>
                    {s.placePrediction?.mainText?.text || s.placePrediction?.text.text}
                  </div>
                  {s.placePrediction?.secondaryText?.text && (
                    <div className="text-[10px] truncate" style={{ color: '#4a4a54' }}>
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

  /* ── Destination set ── */
  if (currentDestination?.name) {
    return (
      <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl"
           style={{ background: 'rgba(249,93,15,0.08)', border: '1.5px solid rgba(249,93,15,0.2)' }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <MapPin size={13} style={{ color: '#f95d0f', flexShrink: 0 }} />
          <div className="min-w-0">
            <div className="section-label mb-0.5">Trip Destination</div>
            <div className="text-xs font-bold truncate" style={{ color: '#e8e8ec' }}>
              {currentDestination.name}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button type="button" onClick={() => setIsEditing(true)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors"
                  style={{ background: 'rgba(249,93,15,0.15)', color: '#ff9a5c', border: '1px solid rgba(249,93,15,0.25)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(249,93,15,0.25)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(249,93,15,0.15)'; }}>
            Change
          </button>
          <button type="button" onClick={() => onSetDestination(null)}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: '#4a4a54' }}
                  title="Clear destination"
                  onMouseEnter={e => (e.currentTarget.style.color = '#e8e8ec')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#4a4a54')}>
            <X size={13} />
          </button>
        </div>
      </div>
    );
  }

  /* ── Auto-focus active (places exist but no explicit destination) ── */
  if (hasBucketItems && bucketCount > 0) {
    return (
      <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl"
           style={{ background: 'var(--color-surface-3)', border: '1.5px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <Navigation size={13} style={{ color: '#6a6a76', flexShrink: 0 }} />
          <div className="min-w-0">
            <div className="section-label mb-0.5">Auto-Focus Active</div>
            <div className="text-xs truncate" style={{ color: '#8a8a96' }}>
              Biased to {bucketCount} saved place{bucketCount > 1 ? 's' : ''}
            </div>
          </div>
        </div>
        <button type="button" onClick={() => setIsEditing(true)}
                className="text-[11px] font-semibold shrink-0 transition-colors px-2.5 py-1 rounded-lg"
                style={{ color: '#6a6a76', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#e8e8ec'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#6a6a76'; }}>
          Set city
        </button>
      </div>
    );
  }

  /* ── Empty / unset state ── */
  return (
    <button type="button" onClick={() => setIsEditing(true)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-all group"
            style={{ background: 'var(--color-surface-3)', border: '1.5px dashed rgba(255,255,255,0.07)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(249,93,15,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}>
      <div className="flex items-center gap-2.5">
        <MapPin size={13} style={{ color: '#4a4a54' }} className="group-hover:text-orange-400 transition-colors" />
        <span className="text-xs font-medium" style={{ color: '#6a6a76' }}>
          Set a destination to focus your search
        </span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-[11px] font-semibold" style={{ color: '#f95d0f' }}>Set City</span>
        <ChevronRight size={12} style={{ color: '#f95d0f' }} />
      </div>
    </button>
  );
}
