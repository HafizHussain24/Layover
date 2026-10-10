import { AdvancedMarker } from '@vis.gl/react-google-maps';
import type { BucketLocation } from '../lib/types';
import { CATEGORY_COLORS, type PlaceCategory } from '../lib/categories';

export default function PlaceMarker({ item }: { item: BucketLocation }) {
  const color = CATEGORY_COLORS[item.category as PlaceCategory] ?? CATEGORY_COLORS.Attraction;
  
  return (
    <AdvancedMarker position={{ lat: item.lat, lng: item.lng }} title={item.name}>
      <div 
        className="text-white px-2 py-1 rounded-lg shadow-lg text-sm font-semibold whitespace-nowrap border-2 border-white/20 transition-transform hover:scale-110"
        style={{ background: color }}
      >
        {item.name}
      </div>
    </AdvancedMarker>
  );
}
