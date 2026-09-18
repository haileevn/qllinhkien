'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Maximize2,
  Minimize2,
} from 'lucide-react';

export interface LightboxImage {
  url: string;
  alt?: string;
  title?: string;
}

interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: (string | LightboxImage)[];
  initialIndex?: number;
  title?: string;
}

export default function ImageLightboxModal({
  isOpen,
  onClose,
  images,
  initialIndex = 0,
  title,
}: ImageLightboxModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Normalize images
  const normalizedImages: LightboxImage[] = images
    .map((img) => (typeof img === 'string' ? { url: img, alt: title, title } : img))
    .filter((img) => img && img.url);

  // Sync initialIndex
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.max(0, Math.min(initialIndex, normalizedImages.length - 1)));
      setZoomLevel(1);
      setPanPosition({ x: 0, y: 0 });
    }
  }, [isOpen, initialIndex, normalizedImages.length]);

  const currentImage = normalizedImages[currentIndex];

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => {
      const next = Math.max(prev - 0.5, 1);
      if (next === 1) setPanPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };

  const handleNext = useCallback(() => {
    if (normalizedImages.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % normalizedImages.length);
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  }, [normalizedImages.length]);

  const handlePrev = useCallback(() => {
    if (normalizedImages.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + normalizedImages.length) % normalizedImages.length);
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  }, [normalizedImages.length]);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        handleZoomOut();
      } else if (e.key === '0') {
        handleResetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose]);

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoomLevel((prev) => Math.min(prev + 0.25, 4));
    } else {
      setZoomLevel((prev) => {
        const next = Math.max(prev - 0.25, 1);
        if (next === 1) setPanPosition({ x: 0, y: 0 });
        return next;
      });
    }
  };

  // Mouse pan / drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoomLevel <= 1) return;
    setPanPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Double click to zoom in/out
  const handleDoubleClick = () => {
    if (zoomLevel > 1) {
      handleResetZoom();
    } else {
      setZoomLevel(2.5);
    }
  };

  if (!isOpen || !currentImage) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-md text-white select-none animate-in fade-in duration-200"
      onWheel={handleWheel}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Top Controls Bar */}
      <div className="p-3 sm:p-4 flex items-center justify-between gap-3 border-b border-white/10 bg-black/40 backdrop-blur-md shrink-0 z-20">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="min-w-0">
            <h3 className="font-bold text-sm sm:text-base text-white truncate max-w-[240px] sm:max-w-md">
              {currentImage.title || title || 'Chi tiết hình ảnh'}
            </h3>
            {normalizedImages.length > 1 && (
              <p className="text-xs text-slate-400">
                Ảnh {currentIndex + 1} trên {normalizedImages.length}
              </p>
            )}
          </div>
        </div>

        {/* Toolbar Buttons */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Zoom controls */}
          <div className="flex items-center bg-white/10 rounded-xl p-0.5 border border-white/10">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 1}
              className="p-1.5 sm:p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              title="Thu nhỏ (-)"
            >
              <ZoomOut className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>

            <span className="px-2 text-xs font-mono font-bold text-slate-300 min-w-[44px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>

            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 4}
              className="p-1.5 sm:p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              title="Phóng to (+)"
            >
              <ZoomIn className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>

            {zoomLevel > 1 && (
              <button
                type="button"
                onClick={handleResetZoom}
                className="p-1.5 sm:p-2 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-white/10 transition-all"
                title="Đặt lại kích thước gốc"
              >
                <RotateCcw className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>
            )}
          </div>

          {/* Fullscreen button */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white border border-white/10 transition-all hidden sm:flex items-center justify-center"
            title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>

          {/* Open Original / Download */}
          <a
            href={currentImage.url}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white border border-white/10 transition-all flex items-center justify-center"
            title="Mở ảnh gốc trong tab mới / Tải về"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 hover:text-white border border-rose-500/30 transition-all flex items-center justify-center ml-1 cursor-pointer"
            title="Đóng (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Viewport */}
      <div
        className={`flex-1 relative overflow-hidden flex items-center justify-center p-2 sm:p-6 ${
          zoomLevel > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onDoubleClick={handleDoubleClick}
      >
        {/* Previous Button */}
        {normalizedImages.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-30 p-2.5 sm:p-3.5 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/20 transition-all hover:scale-110 active:scale-95 shadow-xl cursor-pointer"
            title="Ảnh trước (Mũi tên trái)"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}

        {/* Image Element */}
        <div
          className="relative max-w-full max-h-full flex items-center justify-center transition-transform duration-100 ease-out"
          style={{
            transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomLevel})`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={currentImage.url}
            alt={currentImage.alt || title || 'Chi tiết vật tư'}
            draggable={false}
            className="max-w-[92vw] max-h-[80vh] sm:max-h-[82vh] object-contain rounded-xl sm:rounded-2xl shadow-2xl transition-all select-none"
          />
        </div>

        {/* Next Button */}
        {normalizedImages.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-30 p-2.5 sm:p-3.5 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/20 transition-all hover:scale-110 active:scale-95 shadow-xl cursor-pointer"
            title="Ảnh tiếp theo (Mũi tên phải)"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnails Strip (if multiple images) */}
      {normalizedImages.length > 1 && (
        <div className="p-3 bg-black/50 backdrop-blur-md border-t border-white/10 flex items-center justify-center gap-2 overflow-x-auto shrink-0 z-20">
          {normalizedImages.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setCurrentIndex(idx);
                setZoomLevel(1);
                setPanPosition({ x: 0, y: 0 });
              }}
              className={`w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                currentIndex === idx
                  ? 'border-sky-400 scale-105 shadow-lg shadow-sky-500/20'
                  : 'border-white/20 opacity-60 hover:opacity-100 hover:border-white/50'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Bottom Help Tooltip */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none hidden md:block">
        <span className="px-3 py-1 rounded-full bg-black/70 text-slate-400 text-[11px] backdrop-blur-md border border-white/10">
          Cuộn chuột để Phóng to/Thu nhỏ &bull; Nhấp đúp để Phóng to &bull; Kéo chuột để Di chuyển khi zoom
        </span>
      </div>
    </div>
  );
}
