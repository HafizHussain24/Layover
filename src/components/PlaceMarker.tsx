import { AdvancedMarker } from '@vis.gl/react-google-maps';
import type { BucketLocation } from '../lib/types';
import { getCategoryColor, getCategoryIcon } from '../lib/categories';
import CategoryIcon from './CategoryIcon';

export default function PlaceMarker({ item, sequenceNumber }: { item: BucketLocation; sequenceNumber?: number }) {
  const color = getCategoryColor(item.category);
  const iconName = getCategoryIcon(item.category);

  return (
    <AdvancedMarker position={{ lat: item.lat, lng: item.lng }} title={item.name}>
      <div
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl shadow-xl text-xs font-semibold whitespace-nowrap text-white transition-transform hover:scale-105 relative"
        style={{
          background: sequenceNumber !== undefined ? '#141416' : color,
          border: sequenceNumber !== undefined ? `2px solid ${color}` : '2px solid rgba(255,255,255,0.2)',
          boxShadow: `0 4px 14px ${color}55, 0 1px 3px rgba(0,0,0,0.4)`,
        }}
      >
        {sequenceNumber !== undefined ? (
          <span
            className="w-5 h-5 rounded-full font-extrabold text-[11px] flex items-center justify-center shadow-sm flex-shrink-0"
            style={{ background: color, color: 'white' }}
          >
            {sequenceNumber}
          </span>
        ) : (
          <CategoryIcon name={iconName} size={11} color="white" />
        )}
        <span className="drop-shadow-sm">{item.name}</span>
      </div>
    </AdvancedMarker>
  );
}
