'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Star,
  Copy,
  Check,
  Package,
  ShoppingCart,
  ExternalLink,
  Layers,
  Camera,
  Boxes,
  Sparkles,
  ArrowRight,
  ZoomIn,
  Maximize2,
} from 'lucide-react';
import { clsx } from 'clsx';
import QuantityModal from './QuantityModal';
import LocationBadgeWithToast from './LocationBadgeWithToast';
import ImageLightboxModal from './ImageLightboxModal';
import { detectShoppingPlatform } from '@/lib/shopping';

interface ItemCardProps {
  item: {
    id: string;
    name: string;
    slug?: string;
    sku?: string | null;
    brand?: string | null;
    model?: string | null;
    quantity: number;
    unit: string;
    minimumQuantity: number;
    condition?: string;
    purchaseUrl?: string | null;
    purchasePrice?: number | null;
    mainImage?: string | null;
    images?: { id?: string; url: string; isPrimary?: boolean }[];
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

const CONDITION_LABELS: Record<string, { label: string; color: string }> = {
  NEW: { label: 'Mới 100%', color: 'bg-emerald-500/90 text-white' },
  USED: { label: 'Đã dùng', color: 'bg-slate-700/90 text-white' },
  REFURBISHED: { label: 'Tân trang', color: 'bg-indigo-500/90 text-white' },
  DAMAGED: { label: 'Hỏng hóc', color: 'bg-rose-600/90 text-white' },
};

export default function ItemCard({ item, onItemUpdated }: ItemCardProps) {
  const [favorite, setFavorite] = useState(item.isFavorite ?? false);
  const [quantityModalOpen, setQuantityModalOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentQty, setCurrentQty] = useState(item.quantity);
  const [imgError, setImgError] = useState(false);

  // Normalize tags array
  const tagList = Array.isArray(item.tags)
    ? item.tags.map((t: any) => (typeof t === 'string' ? t : t.tag?.name)).filter(Boolean)
    : [];

  // Stock status badge configuration
  let stockBadge = {
    label: `Còn ${currentQty} ${item.unit}`,
    className:
      'bg-emerald-500/95 text-white shadow-emerald-500/20 border-emerald-400/30',
    dotClass: 'bg-emerald-300 animate-pulse',
  };

  if (currentQty === 0) {
    stockBadge = {
      label: 'Hết hàng (0)',
      className: 'bg-rose-600/95 text-white shadow-rose-600/20 border-rose-400/30',
      dotClass: 'bg-rose-300',
    };
  } else if (currentQty <= item.minimumQuantity) {
    stockBadge = {
      label: `Sắp hết (${currentQty} ${item.unit})`,
      className:
        'bg-amber-500/95 text-white shadow-amber-500/20 border-amber-400/30',
      dotClass: 'bg-amber-200 animate-pulse',
    };
  }

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

  const handleOpenLightbox = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (displayImage) {
      setLightboxOpen(true);
    }
  };

  const allImages = item.images && item.images.length > 0 ? item.images : [];
  const displayImage =
    !imgError &&
    (item.mainImage ||
      allImages.find((i) => i.isPrimary)?.url ||
      allImages[0]?.url ||
      null);

  const conditionInfo = item.condition ? CONDITION_LABELS[item.condition] : null;

  // Prepare images list for lightbox
  const lightboxImagesList = [
    item.mainImage,
    ...allImages.map((i) => i.url),
  ]
    .filter((u, idx, arr): u is string => !!u && arr.indexOf(u) === idx)
    .map((url) => ({ url, title: item.name }));

  return (
    <>
      <div className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 hover:border-sky-400 dark:hover:border-sky-500/80 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col justify-between">
        <div>
          {/* ========================================================= */}
          {/* 1. HERO IMAGE ON TOP (HIỂN THỊ ĐẦY ĐỦ ĐỒ VẬT + NÚT ZOOM) */}
          {/* ========================================================= */}
          <div className="relative aspect-[16/10] sm:aspect-[4/3] w-full bg-slate-100/90 dark:bg-slate-850 overflow-hidden flex items-center justify-center border-b border-slate-100 dark:border-slate-800/80">
            {displayImage ? (
              <>
                {/* Subtle atmosphere background blur */}
                <div
                  className="absolute inset-0 bg-center bg-cover opacity-20 dark:opacity-15 blur-xl scale-125 pointer-events-none"
                  style={{ backgroundImage: `url(${displayImage})` }}
                />

                {/* Main Full Item Image (OBJECT-CONTAIN ĐỂ NHẬN BIẾT ĐẦY ĐỦ ĐỒ VẬT TO/DÀI) */}
                <div
                  onClick={handleOpenLightbox}
                  className="relative z-1 w-full h-full p-3 sm:p-4 flex items-center justify-center cursor-zoom-in"
                  title="Nhấn để phóng to xem chi tiết ảnh"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={displayImage}
                    alt={item.name}
                    onError={() => setImgError(true)}
                    className="max-w-full max-h-full object-contain object-center drop-shadow-md group-hover:scale-105 transition-transform duration-300 ease-out select-none"
                  />
                </div>

                {/* Floating Quick Zoom Button on Hover */}
                <button
                  type="button"
                  onClick={handleOpenLightbox}
                  className="absolute top-2.5 right-11 z-10 w-8 h-8 rounded-full bg-black/60 hover:bg-sky-600 text-white backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 active:scale-95 shadow-md cursor-pointer"
                  title="Phóng to ảnh (Zoom)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </>
            ) : (
              <Link href={`/items/${item.id}`} className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 gap-1.5 p-4 select-none">
                <div className="w-12 h-12 rounded-2xl bg-white/70 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center shadow-xs">
                  <Package className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                </div>
                <span className="text-[11px] font-medium text-slate-400">Chưa có ảnh</span>
              </Link>
            )}

            {/* Top Left: Category Badge with Glassmorphism */}
            {item.category?.name && (
              <div className="absolute top-2.5 left-2.5 pointer-events-none z-10">
                <span className="px-2.5 py-1 rounded-xl bg-slate-900/75 dark:bg-black/80 text-white backdrop-blur-md text-[10px] sm:text-[11px] font-bold shadow-sm border border-white/15 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-sky-400" />
                  <span className="truncate max-w-[120px]">{item.category.name}</span>
                </span>
              </div>
            )}

            {/* Top Right: Favorite Button */}
            <div className="absolute top-2.5 right-2.5 z-10">
              <button
                type="button"
                onClick={handleToggleFavorite}
                className="w-8 h-8 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md flex items-center justify-center text-slate-400 hover:text-amber-500 shadow-sm border border-slate-200/50 dark:border-slate-700/50 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                title={favorite ? 'Bỏ yêu thích' : 'Đánh dấu yêu thích'}
              >
                <Star
                  className={clsx(
                    'w-4 h-4 transition-colors',
                    favorite
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-slate-400 dark:text-slate-500'
                  )}
                />
              </button>
            </div>

            {/* Bottom Left: Stock Quantity Pill */}
            <div className="absolute bottom-2.5 left-2.5 pointer-events-none z-10">
              <span
                className={clsx(
                  'px-2.5 py-1 rounded-xl backdrop-blur-md text-[11px] font-extrabold shadow-md border flex items-center gap-1.5',
                  stockBadge.className
                )}
              >
                <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', stockBadge.dotClass)} />
                <span>{stockBadge.label}</span>
              </span>
            </div>

            {/* Bottom Right: Condition or Image Count */}
            <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 pointer-events-none z-10">
              {conditionInfo && (
                <span
                  className={clsx(
                    'px-2 py-0.5 rounded-lg text-[10px] font-bold backdrop-blur-md shadow-xs border border-white/15',
                    conditionInfo.color
                  )}
                >
                  {conditionInfo.label}
                </span>
              )}

              {allImages.length > 1 && (
                <span className="px-1.5 py-0.5 rounded-lg bg-black/70 text-white backdrop-blur-md text-[10px] font-semibold border border-white/15 flex items-center gap-0.5">
                  <Camera className="w-2.5 h-2.5" />
                  <span>{allImages.length}</span>
                </span>
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* 2. BODY: ITEM NAME & SPECS (TÊN NẰM DƯỚI ẢNH) */}
          {/* ========================================================= */}
          <div className="p-4 sm:p-4.5 space-y-3">
            <div>
              <Link href={`/items/${item.id}`} className="block group/title">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base leading-snug group-hover/title:text-sky-600 dark:group-hover/title:text-sky-400 transition-colors line-clamp-2">
                  {item.name}
                </h3>
              </Link>

              {/* Brand, Model, SKU line */}
              {(item.brand || item.model || item.sku) && (
                <div className="flex items-center flex-wrap gap-1.5 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {item.brand && (
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {item.brand}
                    </span>
                  )}
                  {item.model && (
                    <>
                      {item.brand && <span>•</span>}
                      <span>{item.model}</span>
                    </>
                  )}
                  {item.sku && (
                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50">
                      SKU: {item.sku}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Price & Purchase source (if available) */}
            {item.purchasePrice ? (
              <div className="flex items-center justify-between text-xs pt-0.5">
                <span className="text-[11px] text-slate-400">Giá mua:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {item.purchasePrice.toLocaleString('vi-VN')} đ
                </span>
              </div>
            ) : null}

            {/* ========================================================= */}
            {/* 3. STORAGE LOCATION (TÊN VỊ TRÍ TRỰC TIẾP + TOAST TOOLTIP SƠ ĐỒ GỐC) */}
            {/* ========================================================= */}
            <LocationBadgeWithToast
              location={item.location}
              locationPath={item.locationPath}
              container={item.container}
              exactPosition={item.exactPosition}
              variant="card"
            />

            {/* Tags preview */}
            {tagList.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap pt-0.5">
                {tagList.slice(0, 3).map((tag, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md"
                  >
                    #{tag}
                  </span>
                ))}
                {tagList.length > 3 && (
                  <span className="text-[10px] text-slate-400 font-medium">
                    +{tagList.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4. FOOTER: FAST ACTIONS */}
        {/* ========================================================= */}
        <div className="px-4 pb-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 bg-slate-50/40 dark:bg-slate-900/40">
          <div className="flex items-center gap-2">
            <Link
              href={`/items/${item.id}`}
              className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 flex items-center gap-1 group/link"
            >
              <span>Chi tiết</span>
              <ArrowRight className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform" />
            </Link>

            {item.purchaseUrl && (
              (() => {
                const platform = detectShoppingPlatform(item.purchaseUrl);
                return (
                  <a
                    href={item.purchaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className={clsx(
                      'inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all hover:opacity-85 active:scale-95 shadow-2xs',
                      platform.badgeBg,
                      platform.textColor,
                      platform.borderColor
                    )}
                    title={`Mua trên ${platform.name}`}
                  >
                    <ShoppingCart className="w-3 h-3" />
                    <span className="hidden xs:inline">{platform.name}</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                  </a>
                );
              })()
            )}
          </div>

          <button
            type="button"
            onClick={() => setQuantityModalOpen(true)}
            className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/60 transition-all active:scale-95 cursor-pointer shadow-2xs"
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

      {/* Image Zoom Lightbox Modal */}
      {lightboxOpen && (
        <ImageLightboxModal
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          images={lightboxImagesList.length > 0 ? lightboxImagesList : (displayImage ? [displayImage] : [])}
          title={item.name}
        />
      )}
    </>
  );
}
