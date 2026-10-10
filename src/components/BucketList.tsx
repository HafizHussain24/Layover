import type { BucketLocation } from '../lib/types';
import { CATEGORY_COLORS, type PlaceCategory } from '../lib/categories';

interface BucketListProps {
  items: BucketLocation[];
  onRemove: (id: string) => void;
}

export default function BucketList({ items, onRemove }: BucketListProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-500">
        <div className="text-3xl mb-3 opacity-50">🏝️</div>
        <p className="text-sm">Bucket list is empty.</p>
        <p className="text-xs mt-1">Search for places to add them to your trip.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-slate-800/60">
      {items.map((item) => (
        <div key={item.id} className="p-4 hover:bg-slate-800/30 transition-colors group">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span 
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: CATEGORY_COLORS[item.category as PlaceCategory] ?? CATEGORY_COLORS.Attraction }}
                />
                <h4 className="font-semibold text-white text-sm truncate">{item.name}</h4>
              </div>
              <p className="text-slate-400 text-xs truncate mb-1 pl-4">
                {item.address}
              </p>
              {item.rating && (
                <div className="flex items-center gap-1 pl-4 text-xs text-slate-500">
                  <span className="text-amber-400">★</span>
                  <span>{item.rating}</span>
                  <span>({item.review_count})</span>
                </div>
              )}
            </div>
            
            <button
              onClick={() => onRemove(item.id)}
              className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
              title="Remove from bucket list"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
