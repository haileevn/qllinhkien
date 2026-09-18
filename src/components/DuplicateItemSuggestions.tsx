'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ExternalLink,
  Copy,
  Boxes,
  MapPin,
  Tag,
  Loader2,
  ChevronDown,
  ChevronUp,
  PackageCheck,
  PackageX,
  Info,
} from 'lucide-react';
import { clsx } from 'clsx';
import { removeVietnameseTones } from '@/lib/vietnamese';
import LocationBadgeWithToast from './LocationBadgeWithToast';

export interface MatchingItem {
  id: string;
  name: string;
  sku?: string | null;
  brand?: string | null;
  model?: string | null;
  quantity: number;
  unit: string;
  minimumQuantity: number;
  stockStatus: string;
  stockLabel: string;
  condition?: string;
  mainImage?: string | null;
  category?: { id: string; name: string } | null;
  location?: { id: string; name: string; code?: string } | null;
  locationPath?: string;
  container?: string | null;
  exactPosition?: string | null;
  supplier?: string | null;
  purchasePrice?: number | null;
}

interface DuplicateItemSuggestionsProps {
  queryName: string;
  excludeItemId?: string;
  onApplyDetails?: (item: MatchingItem) => void;
  className?: string;
}

export default function DuplicateItemSuggestions({
  queryName,
  excludeItemId,
  onApplyDetails,
  className,
}: DuplicateItemSuggestionsProps) {
  const [items, setItems] = useState<MatchingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [lastSearchedQuery, setLastSearchedQuery] = useState('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const trimmed = queryName.trim();

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (trimmed.length < 2) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        
        let filtered: MatchingItem[] = data.results || [];
        if (excludeItemId) {
          filtered = filtered.filter((it) => it.id !== excludeItemId);
        }

        // Sort exact match first, then by relevance
        const cleanQuery = removeVietnameseTones(trimmed.toLowerCase());
        filtered.sort((a, b) => {
          const aClean = removeVietnameseTones(a.name.toLowerCase());
          const bClean = removeVietnameseTones(b.name.toLowerCase());
          const aExact = aClean === cleanQuery ? 1 : 0;
          const bExact = bClean === cleanQuery ? 1 : 0;
          return bExact - aExact;
        });

        setItems(filtered);
        setLastSearchedQuery(trimmed);
      } catch (err) {
        console.error('Error fetching duplicate items:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [queryName, excludeItemId]);

  if (queryName.trim().length < 2 && items.length === 0) {
    return null;
  }

  if (!loading && items.length === 0 && lastSearchedQuery.length >= 2) {
    return null;
  }

  const cleanQuery = removeVietnameseTones(queryName.trim().toLowerCase());
  const hasExactMatch = items.some(
    (item) => removeVietnameseTones(item.name.toLowerCase()) === cleanQuery
  );

  return (
    <div
      className={clsx(
        'mt-2.5 rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs animate-fade-in',
        hasExactMatch
          ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/70'
          : 'bg-slate-50/90 dark:bg-slate-850/80 border-slate-200 dark:border-slate-800',
        className
      )}
    >
      {/* Header Bar */}
      <div className="px-3.5 py-2.5 flex items-center justify-between gap-2 border-b border-inherit">
        <div className="flex items-center gap-2 min-w-0">
          {loading ? (
            <Loader2 className="w-4 h-4 text-sky-500 animate-spin shrink-0" />
          ) : hasExactMatch ? (
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          ) : (
            <Boxes className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
          )}

          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
            {loading ? (
              <span className="text-slate-500 font-normal">Đang tìm vật tư tương tự trong kho...</span>
            ) : hasExactMatch ? (
              <span className="text-amber-800 dark:text-amber-300">
                ⚠️ Có <span className="underline decoration-amber-500 font-black">{items.length}</span> vật tư trùng hoặc tương tự tên trong kho:
              </span>
            ) : (
              <span>
                Tìm thấy <span className="text-sky-600 dark:text-sky-400 font-black">{items.length}</span> vật tư có tên tương tự:
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors text-xs flex items-center gap-1 cursor-pointer"
            title={collapsed ? 'Mở rộng gợi ý' : 'Thu gọn gợi ý'}
          >
            <span className="text-[11px] font-medium hidden sm:inline">
              {collapsed ? 'Hiện gợi ý' : 'Thu gọn'}
            </span>
            {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Item List Body */}
      {!collapsed && (
        <div className="divide-y divide-inherit max-h-72 overflow-y-auto">
          {items.map((item) => {
            const isItemExact =
              removeVietnameseTones(item.name.toLowerCase()) === cleanQuery;

            return (
              <div
                key={item.id}
                className={clsx(
                  'p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors hover:bg-white/70 dark:hover:bg-slate-900/60',
                  isItemExact && 'bg-amber-100/40 dark:bg-amber-900/20'
                )}
              >
                {/* Left: Thumbnail & Info */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {/* Thumbnail Image */}
                  <div className="w-11 h-11 rounded-xl bg-slate-200 dark:bg-slate-800 border border-slate-300/60 dark:border-slate-700/60 overflow-hidden shrink-0 flex items-center justify-center">
                    {item.mainImage ? (
                      <img
                        src={item.mainImage}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Boxes className="w-5 h-5 text-slate-400" />
                    )}
                  </div>

                  {/* Details */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center flex-wrap gap-1.5">
                      <span className="font-bold text-slate-900 dark:text-white truncate">
                        {item.name}
                      </span>

                      {isItemExact && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                          Trùng khớp 100%
                        </span>
                      )}

                      {/* Stock Quantity Badge - Prominently Displayed */}
                      <span
                        className={clsx(
                          'px-2 py-0.5 rounded-md text-[11px] font-black shrink-0 flex items-center gap-1 shadow-2xs',
                          item.quantity > (item.minimumQuantity || 0)
                            ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800'
                            : item.quantity > 0
                            ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800'
                            : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300/60 dark:border-rose-800'
                        )}
                      >
                        {item.quantity > 0 ? (
                          <PackageCheck className="w-3 h-3" />
                        ) : (
                          <PackageX className="w-3 h-3" />
                        )}
                        <span>
                          Tồn kho: <strong>{item.quantity}</strong> {item.unit}
                        </span>
                      </span>
                    </div>

                    {/* Metadata Sub-row */}
                    <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                      {/* Storage Location with Toast Tooltip */}
                      {(item.locationPath || item.location?.name || item.container) && (
                        <LocationBadgeWithToast
                          location={item.location}
                          locationPath={item.locationPath}
                          container={item.container}
                          exactPosition={item.exactPosition}
                          variant="compact"
                          showCopy={false}
                        />
                      )}

                      {/* Category */}
                      {item.category?.name && (
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{item.category.name}</span>
                        </span>
                      )}

                      {/* Brand / Model / SKU */}
                      {(item.brand || item.model || item.sku) && (
                        <span className="font-mono text-slate-500">
                          {[item.brand, item.model, item.sku].filter(Boolean).join(' • ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Quick Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pt-1 sm:pt-0">
                  {onApplyDetails && (
                    <button
                      type="button"
                      onClick={() => onApplyDetails(item)}
                      className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-950/50 border border-slate-300 dark:border-slate-700 hover:border-sky-300 text-slate-700 dark:text-slate-300 hover:text-sky-600 text-[11px] font-semibold flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
                      title="Lấy danh mục, vị trí, đơn vị, hãng từ vật tư này"
                    >
                      <Copy className="w-3 h-3 text-sky-500" />
                      <span>Sao chép thông số</span>
                    </button>
                  )}

                  <Link
                    href={`/items/${item.id}`}
                    target="_blank"
                    className="px-2.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs active:scale-95 transition-all"
                    title="Mở xem chi tiết vật tư này ở tab mới"
                  >
                    <span>Xem</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Helper Note */}
      {!collapsed && (
        <div className="px-3.5 py-2 bg-slate-100/70 dark:bg-slate-900/60 border-t border-inherit text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Info className="w-3 h-3 text-slate-400" />
            Nếu đây là vật tư đã có sẵn, bạn có thể bấm <strong>"Xem"</strong> để cộng dồn số lượng thay vì tạo mới.
          </span>
        </div>
      )}
    </div>
  );
}
