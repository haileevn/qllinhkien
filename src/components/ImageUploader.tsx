'use client';

import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, X, Loader2, Plus } from 'lucide-react';

interface ImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  multiple?: boolean;
}

export default function ImageUploader({
  images,
  onChange,
  maxImages = 5,
  multiple = true,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi tải ảnh');
      }

      if (data.files && data.files.length > 0) {
        const newUrls = data.files.map((f: any) => f.url);
        if (multiple) {
          onChange([...images, ...newUrls].slice(0, maxImages));
        } else {
          onChange([newUrls[0]]);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Không thể tải ảnh lên');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {/* Hidden file inputs */}
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
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleUpload(e.target.files)}
      />

      {/* Image Preview Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
        {images.map((url, idx) => (
          <div
            key={idx}
            className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 group shadow-sm"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Ảnh ${idx + 1}`} className="w-full h-full object-cover" />
            {idx === 0 && (
              <span className="absolute bottom-1 left-1 bg-sky-600/90 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
                Ảnh chính
              </span>
            )}
            <button
              type="button"
              onClick={() => removeImage(idx)}
              className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-rose-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {/* Add image buttons when limit not reached */}
        {images.length < maxImages && (
          <div className="aspect-square rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/40 text-slate-500 hover:text-sky-600 hover:border-sky-500 transition-colors">
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
            ) : (
              <div className="flex flex-col items-center justify-center gap-1 w-full h-full">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="p-2 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 hover:scale-105 active:scale-95 transition-transform"
                    title="Chụp ảnh ngay"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:scale-105 active:scale-95 transition-transform"
                    title="Chọn từ thư viện"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-[10px] text-slate-400">Chụp / Chọn</span>
              </div>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );
}
