import { AdvancedMarker } from '@vis.gl/react-google-maps';
import type { BucketLocation } from '../lib/types';
import { getCategoryColor, getCategoryIcon } from '../lib/categories';

export default function PlaceMarker({ item, sequenceNumber }: { item: BucketLocation; sequenceNumber?: number }) {
  const color = getCategoryColor(item.category);
  const icon = getCategoryIcon(item.category);
  
  return (
    <AdvancedMarker position={{ lat: item.lat, lng: item.lng }} title={item.name}>
      <div 
        className="text-white px-2.5 py-1 rounded-lg shadow-lg text-xs font-semibold whitespace-nowrap border-2 border-white/20 transition-transform hover:scale-110 flex items-center gap-1.5"
        style={{ background: color }}
      >
        {sequenceNumber !== undefined ? (
          <span className="w-5 h-5 rounded-full bg-white text-slate-900 font-extrabold text-[11px] flex items-center justify-center shadow-md shrink-0">
            {sequenceNumber}
          </span>
        ) : (
          <span className="text-xs shrink-0 drop-shadow-sm">{icon}</span>
        )}
        <span className="drop-shadow-sm">{item.name}</span>
      </div>
    </AdvancedMarker>
  );
}

