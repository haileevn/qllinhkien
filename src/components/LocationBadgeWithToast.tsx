'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Copy,
  Check,
  ChevronRight,
  FolderTree,
  Building,
  Folder,
  Box,
  Layers,
  Sparkles,
  Info,
  ExternalLink,
} from 'lucide-react';
import { clsx } from 'clsx';

interface LocationBadgeWithToastProps {
  location?: { id?: string; name: string; code?: string | null } | null;
  locationPath?: string | null;
  container?: string | null;
  exactPosition?: string | null;
  breadcrumbs?: Array<{ id?: string; name: string }>;
  variant?: 'card' | 'compact' | 'pill' | 'inline';
  className?: string;
  showCopy?: boolean;
}

export default function LocationBadgeWithToast({
  location,
  locationPath,
  container,
  exactPosition,
  breadcrumbs,
  variant = 'card',
  className,
  showCopy = true,
}: LocationBadgeWithToastProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Compute full hierarchical chain
  let rawPathSegments: string[] = [];

  if (locationPath && locationPath.trim()) {
    rawPathSegments = locationPath
      .split('→')
      .map((s) => s.trim())
      .filter(Boolean);
  } else if (breadcrumbs && breadcrumbs.length > 0) {
    rawPathSegments = breadcrumbs.map((b) => b.name.trim()).filter(Boolean);
  } else if (location?.name) {
    rawPathSegments = [location.name.trim()];
  }

  // Check if container or exactPosition should be appended to the chain
  if (container && container.trim() && !rawPathSegments.some((s) => s.toLowerCase() === container.trim().toLowerCase())) {
    rawPathSegments.push(container.trim());
  }

  if (exactPosition && exactPosition.trim() && !rawPathSegments.some((s) => s.toLowerCase() === exactPosition.trim().toLowerCase())) {
    rawPathSegments.push(exactPosition.trim());
  }

  const fullDisplayPath = rawPathSegments.length > 0 ? rawPathSegments.join(' → ') : 'Chưa phân vị trí';

  // Immediate storage location (Tên kho chứa trực tiếp / vị trí trực tiếp)
  const immediateLocation =
    rawPathSegments.length > 0
      ? rawPathSegments[rawPathSegments.length - 1]
      : location?.name || container || 'Chưa phân vị trí';

  // Parent path prefix (if more than 1 segment)
  const hasHierarchy = rawPathSegments.length > 1;
  const parentChain = hasHierarchy ? rawPathSegments.slice(0, -1).join(' → ') : null;

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(fullDisplayPath);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  // Icon helper based on hierarchy depth
  const getTierIcon = (index: number, total: number) => {
    if (index === 0 && total > 1) {
      return <Building className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    }
    if (index === total - 1) {
      return <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
    }
    if (index === total - 2 && total > 2) {
      return <Box className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
    }
    return <Folder className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
  };

  // Toast Tooltip Element
  const renderToastTooltip = () => {
    if (!isOpen) return null;

    return (
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-80 sm:w-96 p-4 rounded-3xl bg-slate-950/95 text-white backdrop-blur-2xl border border-slate-700/80 shadow-2xl z-50 text-xs animate-fade-in pointer-events-auto select-none"
        style={{
          boxShadow: '0 20px 35px -10px rgba(0, 0, 0, 0.6), 0 0 15px rgba(56, 189, 248, 0.15)',
        }}
      >
        {/* Toast Pointer Arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-solid border-t-slate-950/95 border-t-8 border-x-transparent border-x-8 border-b-0 pointer-events-none" />

        {/* Toast Header */}
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800">
          <div className="flex items-center gap-1.5 font-extrabold text-white text-[12px]">
            <FolderTree className="w-4 h-4 text-sky-400" />
            <span>Sơ đồ vị trí phân cấp từ gốc</span>
          </div>

          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-800/80">
            {rawPathSegments.length} cấp vị trí
          </span>
        </div>

        {/* Breadcrumbs Chain Nodes */}
        <div className="space-y-1.5 py-1">
          {rawPathSegments.map((segment, idx) => {
            const isTarget = idx === rawPathSegments.length - 1;

            return (
              <div key={idx} className="flex items-center gap-2">
                {/* Level indicator / connector */}
                <div className="flex items-center gap-1 shrink-0 w-5 justify-center">
                  {getTierIcon(idx, rawPathSegments.length)}
                </div>

                <div
                  className={clsx(
                    'flex-1 flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition-all',
                    isTarget
                      ? 'bg-sky-900/60 border-sky-500/80 text-white font-bold shadow-xs'
                      : 'bg-slate-900/80 border-slate-800 text-slate-300 font-medium'
                  )}
                >
                  <span className="truncate">{segment}</span>

                  {isTarget ? (
                    <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-sky-500 text-white shrink-0 ml-2 shadow-2xs">
                      Vị trí chứa
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                      Cấp {idx + 1}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Toast Footer & Copy Action */}
        <div className="mt-3 pt-2.5 border-t border-slate-800/90 flex items-center justify-between gap-2 text-[11px]">
          <span className="text-slate-400 truncate flex items-center gap-1">
            <Info className="w-3 h-3 text-sky-400 shrink-0" />
            <span>Toàn bộ chuỗi vị trí</span>
          </span>

          <button
            type="button"
            onClick={handleCopy}
            className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-sky-300 hover:text-white border border-slate-700 flex items-center gap-1 font-bold transition-all shrink-0 cursor-pointer shadow-xs"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Đã sao chép!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Sao chép chuỗi</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  // 1. Variant: CARD (Used in ItemCard)
  if (variant === 'card') {
    return (
      <div
        ref={containerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'relative p-2.5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800/80 hover:border-sky-300 dark:hover:border-sky-700/70 transition-all flex items-start justify-between gap-2 shadow-2xs group/loc cursor-pointer select-none',
          className
        )}
      >
        {/* Main Content */}
        <div className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 min-w-0 flex-1">
          <div className="w-6 h-6 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5 group-hover/loc:scale-105 transition-transform">
            <MapPin className="w-3.5 h-3.5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Vị trí lưu trữ
              </span>
              {hasHierarchy && (
                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-md bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/60 flex items-center gap-0.5">
                  <FolderTree className="w-2.5 h-2.5" />
                  <span>Sơ đồ gốc</span>
                </span>
              )}
            </div>

            {/* Direct Location Name First */}
            <div className="font-extrabold text-xs text-slate-900 dark:text-white truncate mt-0.5 group-hover/loc:text-sky-600 dark:group-hover/loc:text-sky-400 transition-colors">
              {immediateLocation}
            </div>

            {/* Subtle Parent Location Preview */}
            {parentChain && (
              <div className="text-[11px] text-slate-400 dark:text-slate-400 truncate mt-0.5 flex items-center gap-1">
                <span className="truncate">{parentChain}</span>
                <ChevronRight className="w-2.5 h-2.5 text-slate-400 shrink-0" />
              </div>
            )}
          </div>
        </div>

        {/* Copy Button */}
        {showCopy && (
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded-xl text-slate-400 hover:text-sky-600 hover:bg-white dark:hover:bg-slate-700 shrink-0 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-600 cursor-pointer"
            title="Sao chép toàn bộ đường dẫn vị trí"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        )}

        {/* Floating Toast Tooltip */}
        {renderToastTooltip()}
      </div>
    );
  }

  // 2. Variant: COMPACT / PILL / INLINE
  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => setIsOpen(!isOpen)}
      className={clsx(
        'relative inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer select-none',
        variant === 'pill' &&
          'px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-2xs hover:border-sky-400',
        className
      )}
    >
      <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
      <span className="truncate max-w-[200px] sm:max-w-xs">{immediateLocation}</span>

      {hasHierarchy && (
        <span className="text-[10px] text-slate-400 font-normal">
          ({rawPathSegments.length} cấp)
        </span>
      )}

      {/* Floating Toast Tooltip */}
      {renderToastTooltip()}
    </div>
  );
}
