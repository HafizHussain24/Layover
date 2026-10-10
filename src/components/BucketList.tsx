import { useState, useEffect } from 'react';
import type { BucketLocation } from '../lib/types';
import { getCategoryColor, getCategoryIcon, ALL_CATEGORIES } from '../lib/categories';
import { X, Star, ChevronDown } from 'lucide-react';
import CategoryIcon from './CategoryIcon';

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
  onClearFilter,
}: BucketListProps) {
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

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
        <div className="flex flex-col items-center justify-center p-10 text-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
               style={{ background: 'var(--color-surface-3)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Star size={20} style={{ color: '#4a4a54' }} />
          </div>
          <p className="text-sm font-semibold mb-1" style={{ color: '#c8c8d0' }}>No places in this filter</p>
          <p className="text-xs mb-4" style={{ color: '#4a4a54' }}>
            Try a different category or clear the filter.
          </p>
          {onClearFilter && (
            <button onClick={onClearFilter}
                    className="text-xs font-semibold transition-colors"
                    style={{ color: '#f95d0f' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#ff9a5c')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#f95d0f')}>
              Show all places
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full p-10 text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
             style={{ background: 'var(--color-surface-3)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <Star size={22} style={{ color: '#3a3a42' }} />
        </div>
        <p className="text-sm font-semibold mb-1.5" style={{ color: '#4a4a54' }}>Your bucket list is empty</p>
        <p className="text-xs" style={{ color: '#3a3a42' }}>
          Search for places above to add them to your trip.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {items.map((item) => {
        const categoryColor = getCategoryColor(item.category);
        const categoryIconName = getCategoryIcon(item.category);
        const isDropdownOpen = openDropdownId === item.id;

        return (
          <div key={item.id} className="place-item group relative">
            {/* Category color dot / left accent */}
            <div className="w-1 self-stretch rounded-full flex-shrink-0 mr-0.5"
                 style={{ background: categoryColor, opacity: 0.7, minHeight: 36 }} />

            <div className="flex-1 min-w-0">
              {/* Name row */}
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <h4 className="font-semibold text-sm leading-snug" style={{ color: '#e8e8ec' }}>
                  {item.name}
                </h4>
                {/* Remove button — visible on hover */}
                <button
                  onClick={() => onRemove(item.id)}
                  className="p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                  style={{ color: '#4a4a54' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#4a4a54'; e.currentTarget.style.background = ''; }}
                  title="Remove from bucket list"
                >
                  <X size={13} />
                </button>
              </div>

              {/* Address */}
              {item.address && (
                <p className="text-xs mb-2 truncate" style={{ color: '#4a4a54' }}>{item.address}</p>
              )}

              {/* Meta row: category badge + rating */}
              <div className="flex items-center gap-2 flex-wrap relative">
                {/* Category badge — clickable for switcher */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setOpenDropdownId(isDropdownOpen ? null : item.id); }}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all hover:scale-105 active:scale-95"
                    style={{
                      backgroundColor: `${categoryColor}14`,
                      color: categoryColor,
                      borderColor: `${categoryColor}35`,
                    }}
                    title="Click to change category"
                  >
                    <CategoryIcon name={categoryIconName} size={10} />
                    <span>{item.category || 'Attraction'}</span>
                    <ChevronDown size={9} style={{ opacity: 0.6 }} />
                  </button>

                  {/* Category popover */}
                  {isDropdownOpen && (
                    <div
                      className="absolute left-0 top-full mt-1.5 z-40 rounded-xl p-2 grid grid-cols-2 gap-1 w-56 animate-in"
                      style={{ background: 'var(--color-surface-2)', border: '1.5px solid rgba(255,255,255,0.09)', boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="col-span-2 section-label px-1.5 pb-1.5 border-b mb-1"
                           style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
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
                            onClick={() => { onUpdateCategory?.(item.id, cat); setOpenDropdownId(null); }}
                            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors"
                            style={
                              isCurrent
                                ? { background: `${color}20`, color: color, border: `1px solid ${color}40` }
                                : { color: '#6a6a76', border: '1px solid transparent' }
                            }
                            onMouseEnter={e => { if (!isCurrent) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#c8c8d0'; } }}
                            onMouseLeave={e => { if (!isCurrent) { e.currentTarget.style.background = ''; e.currentTarget.style.color = '#6a6a76'; } }}
                          >
                            <CategoryIcon name={icon} size={11} />
                            <span className="truncate">{cat}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Rating */}
                {item.rating && (
                  <div className="flex items-center gap-1 text-xs">
                    <Star size={11} fill="#fbbf24" style={{ color: '#fbbf24' }} />
                    <span className="font-semibold" style={{ color: '#e8e8ec' }}>{item.rating}</span>
                    <span style={{ color: '#4a4a54' }}>({item.review_count?.toLocaleString()})</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
