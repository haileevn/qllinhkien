'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MapPin, Star, Copy, Check, Plus, Minus, Package, Tag as TagIcon } from 'lucide-react';
import { clsx } from 'clsx';
import QuantityModal from './QuantityModal';

interface ItemCardProps {
  item: {
    id: string;
    name: string;
    slug: string;
    sku?: string | null;
    brand?: string | null;
    model?: string | null;
    quantity: number;
    unit: string;
    minimumQuantity: number;
    condition?: string;
    mainImage?: string | null;
    category?: { id: string; name: string } | null;
    location?: { id: string; name: string; code?: string | null } | null;
    locationPath?: string;
    container?: string | null;
    exactPosition?: string | null;
    tags?: string[] | { tag: { name: string } }[];
    isFavorite?: boolean;
  };
  onItemUpdated?: (updated: any) => void;
}

export default function ItemCard({ item, onItemUpdated }: ItemCardProps) {
  const [copied, setCopied] = useState(false);
  const [favorite, setFavorite] = useState(item.isFavorite ?? false);
  const [quantityModalOpen, setQuantityModalOpen] = useState(false);
  const [currentQty, setCurrentQty] = useState(item.quantity);

  // Normalize tags array
  const tagList = Array.isArray(item.tags)
    ? item.tags.map((t: any) => (typeof t === 'string' ? t : t.tag?.name)).filter(Boolean)
    : [];

  // Determine full location text
  const locationDisplay =
    item.locationPath ||
    [item.location?.name, item.container, item.exactPosition].filter(Boolean).join(' → ') ||
    'Chưa phân vị trí';

  // Stock status badge
  let stockBadge = {
    label: `Còn ${currentQty} ${item.unit}`,
    className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  };

  if (currentQty === 0) {
    stockBadge = {
      label: 'Hết hàng',
      className: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    };
  } else if (currentQty <= item.minimumQuantity) {
    stockBadge = {
      label: `Sắp hết (${currentQty} ${item.unit})`,
      className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    };
  }

  const handleCopyLocation = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(locationDisplay);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newFav = !favorite;
    setFavorite(newFav);

    try {
      await fetch(`/api/items/${item.id}/favorite`, { method: 'POST' });
      if (onItemUpdated) {
        onItemUpdated({ ...item, isFavorite: newFav });
      }
    } catch {
      setFavorite(!newFav);
    }
  };

  return (
    <>
      <div className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-800 p-3.5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
        <div>
          {/* Top Row: Category, Favorite & Stock Badge */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {item.category && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {item.category.name}
                </span>
              )}
              <span
                className={clsx(
                  'text-[11px] font-bold px-2 py-0.5 rounded-md border',
                  stockBadge.className
                )}
              >
                {stockBadge.label}
              </span>
            </div>

            <button
              onClick={handleToggleFavorite}
              className="p-1 text-slate-400 hover:text-amber-500 transition-colors"
              title="Đánh dấu yêu thích"
            >
              <Star
                className={clsx(
                  'w-4 h-4 transition-colors',
                  favorite ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-600'
                )}
              />
            </button>
          </div>

          {/* Main info row: Image & Name */}
          <Link href={`/items/${item.id}`} className="flex gap-3 items-start block">
            {/* Image Thumbnail */}
            <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
              {item.mainImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.mainImage}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              ) : (
                <Package className="w-7 h-7 text-slate-400" />
              )}
            </div>

            {/* Name, Brand, SKU */}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm leading-snug group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors line-clamp-2">
                {item.name}
              </h3>
              {(item.brand || item.model || item.sku) && (
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {[item.brand, item.model, item.sku && `SKU: ${item.sku}`].filter(Boolean).join(' • ')}
                </p>
              )}
            </div>
          </Link>

          {/* Prominent Storage Location Path */}
          <div className="mt-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800/80 flex items-start justify-between gap-1.5">
            <div className="flex items-start gap-1.5 text-xs text-slate-700 dark:text-slate-300 min-w-0">
              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
              <span className="font-medium leading-snug line-clamp-2 text-[11px] sm:text-xs">
                {locationDisplay}
              </span>
            </div>

            <button
              onClick={handleCopyLocation}
              className="p-1 rounded-md text-slate-400 hover:text-sky-600 hover:bg-white dark:hover:bg-slate-700 shrink-0 transition-colors"
              title="Sao chép vị trí"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Tags */}
          {tagList.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap mt-2.5">
              {tagList.slice(0, 3).map((tag, i) => (
                <span
                  key={i}
                  className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded"
                >
                  #{tag}
                </span>
              ))}
              {tagList.length > 3 && (
                <span className="text-[10px] text-slate-400">+{tagList.length - 3}</span>
              )}
            </div>
          )}
        </div>

        {/* Bottom Fast Adjust Action */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <Link
            href={`/items/${item.id}`}
            className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline"
          >
            Chi tiết →
          </Link>

          <button
            onClick={() => setQuantityModalOpen(true)}
            className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-950/50 hover:text-sky-600 dark:hover:text-sky-400 text-slate-700 dark:text-slate-300 transition-colors"
          >
            <span>Đổi số lượng</span>
          </button>
        </div>
      </div>

      {/* Quantity Adjustment Modal */}
      {quantityModalOpen && (
        <QuantityModal
          isOpen={quantityModalOpen}
          onClose={() => setQuantityModalOpen(false)}
          itemId={item.id}
          itemName={item.name}
          currentQuantity={currentQty}
          unit={item.unit}
          onSuccess={(updated) => {
            setCurrentQty(updated.quantity);
            if (onItemUpdated) onItemUpdated(updated);
          }}
        />
      )}
    </>
  );
}
