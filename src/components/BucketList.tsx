import { useState, useEffect } from 'react';
import type { BucketLocation } from '../lib/types';
import { getCategoryColor, getCategoryIcon, ALL_CATEGORIES } from '../lib/categories';

interface BucketListProps {
  items: BucketLocation[];
  onRemove: (id: string) => void;
  onUpdateCategory?: (id: string, category: string) => void;
  isFiltered?: boolean;
  onClearFilter?: () => void;
}

export default function BucketList({ 
  items, 
  onRemove, 
  onUpdateCategory, 
  isFiltered, 
  onClearFilter 
}: BucketListProps) {
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = () => setOpenDropdownId(null);
    if (openDropdownId) {
      window.addEventListener('click', handleOutsideClick);
      return () => window.removeEventListener('click', handleOutsideClick);
    }
  }, [openDropdownId]);

  if (items.length === 0) {
    if (isFiltered) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500">
          <div className="text-3xl mb-2 opacity-60">🔍</div>
          <p className="text-sm text-slate-300 font-medium">No places in this category</p>
          <p className="text-xs mt-1 text-slate-400">Try selecting another category or clear the filter.</p>
          {onClearFilter && (
            <button
              onClick={onClearFilter}
              className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 font-semibold underline"
            >
              Show all places
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-500">
        <div className="text-3xl mb-3 opacity-50">🏝️</div>
        <p className="text-sm font-medium text-slate-400">Bucket list is empty.</p>
        <p className="text-xs mt-1 text-slate-500">Search for places to add them to your trip.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-slate-800/60">
      {items.map((item) => {
        const categoryColor = getCategoryColor(item.category);
        const categoryIcon = getCategoryIcon(item.category);
        const isDropdownOpen = openDropdownId === item.id;

        return (
          <div key={item.id} className="p-4 hover:bg-slate-800/30 transition-colors group relative">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span 
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm"
                    style={{ background: categoryColor }}
                  />
                  <h4 className="font-semibold text-white text-sm truncate">{item.name}</h4>
                </div>

                <p className="text-slate-400 text-xs truncate mb-2 pl-4">
                  {item.address}
                </p>

                <div className="flex items-center gap-2 pl-4 flex-wrap relative">
                  {/* Category Badge with in-place category switcher */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDropdownId(isDropdownOpen ? null : item.id);
                      }}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide border shadow-sm transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                      style={{ 
                        backgroundColor: `${categoryColor}18`,
                        color: categoryColor,
                        borderColor: `${categoryColor}40`
                      }}
                      title="Click to change category"
                    >
                      <span>{categoryIcon}</span>
                      <span>{item.category || 'Attraction'}</span>
                      <span className="text-[9px] opacity-60">▾</span>
                    </button>

                    {/* Popover to switch category */}
                    {isDropdownOpen && (
                      <div 
                        className="absolute left-0 top-full mt-1.5 z-40 bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl p-2 grid grid-cols-2 gap-1 w-60 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="col-span-2 px-1.5 py-0.5 text-[10px] text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800 mb-1">
                          Change Category
                        </div>
                        {ALL_CATEGORIES.map((cat) => {
                          const isCurrent = (item.category || 'Attraction') === cat;
                          const icon = getCategoryIcon(cat);
                          const color = getCategoryColor(cat);

                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => {
                                onUpdateCategory?.(item.id, cat);
                                setOpenDropdownId(null);
                              }}
                              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors ${
                                isCurrent 
                                  ? 'bg-indigo-600/30 text-white border border-indigo-500/40' 
                                  : 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
                              }`}
                            >
                              <span>{icon}</span>
                              <span className="truncate" style={{ color: isCurrent ? color : undefined }}>{cat}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {item.rating && (
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <span className="text-amber-400">★</span>
                      <span className="font-medium text-slate-300">{item.rating}</span>
                      <span className="text-slate-500 text-[11px]">({item.review_count})</span>
                    </div>
                  )}
                </div>
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
        );
      })}
    </div>
  );
}

