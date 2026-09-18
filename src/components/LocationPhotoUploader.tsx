'use client';

import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, X, Loader2, Sparkles } from 'lucide-react';

interface LocationPhotoUploaderProps {
  image: string | null | undefined;
  onChange: (url: string | null) => void;
  label?: string;
}

export default function LocationPhotoUploader({
  image,
  onChange,
  label = 'Ảnh chụp thực tế Box / Kệ / Tủ (Tùy chọn)',
}: LocationPhotoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('files', files[0]);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi tải ảnh lên');
      }

      if (data.files && data.files.length > 0) {
        onChange(data.files[0].url);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Không thể tải ảnh');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      {/* Hidden file & camera inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleUpload(e.target.files)}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleUpload(e.target.files)}
      />

      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
        {label}
      </label>

      {image ? (
        <div className="relative group rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shadow-sm max-w-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt="Ảnh thực tế vị trí"
            className="w-full h-36 sm:h-44 object-cover"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 opacity-90 transition-opacity flex flex-col justify-between p-2.5">
            <div className="flex items-center justify-between">
              <span className="bg-sky-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs backdrop-blur-xs flex items-center gap-1">
                <Camera className="w-3 h-3" />
                <span>Ảnh Box / Vị trí</span>
              </span>

              <button
                type="button"
                onClick={() => onChange(null)}
                className="p-1 rounded-full bg-rose-600/90 text-white hover:bg-rose-700 transition-colors shadow-sm"
                title="Xóa ảnh này"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={uploading}
                className="px-2.5 py-1 text-[11px] font-semibold bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 hover:bg-white rounded-lg shadow-sm backdrop-blur-xs flex items-center gap-1 transition-transform active:scale-95"
              >
                <Camera className="w-3 h-3 text-sky-600" />
                <span>Chụp lại</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-2.5 py-1 text-[11px] font-semibold bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 hover:bg-white rounded-lg shadow-sm backdrop-blur-xs flex items-center gap-1 transition-transform active:scale-95"
              >
                <ImageIcon className="w-3 h-3 text-amber-500" />
                <span>Đổi ảnh</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-slate-200 dark:border-slate-700/80 rounded-2xl p-3.5 bg-slate-50/60 dark:bg-slate-800/30 hover:border-sky-400 dark:hover:border-sky-600 transition-colors">
          {uploading ? (
            <div className="py-4 flex flex-col items-center justify-center gap-2 text-xs text-sky-600">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Đang tải ảnh lên...</span>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                <p className="font-medium text-slate-700 dark:text-slate-300">Chụp ảnh thực tế vị trí này</p>
                <p className="text-[11px] text-slate-400">Giúp dễ nhận diện vị trí các ngăn / kệ / hộp trong phòng</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="px-3 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 active:scale-95 rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
                  title="Chụp ảnh bằng Camera điện thoại"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Chụp ảnh</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
                  title="Chọn ảnh từ máy"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                  <span>Chọn ảnh</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );
}
