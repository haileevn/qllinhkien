'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Printer, ArrowLeft, Loader2, MapPin } from 'lucide-react';

export default function LocationQRPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [location, setLocation] = useState<any>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetch(`/api/locations/${id}`)
        .then((r) => r.json())
        .then((data) => {
          setLocation(data.location);
          setBreadcrumbs(data.breadcrumbs || []);
          setItems(data.items || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
      </div>
    );
  }

  if (!location) {
    return <div className="p-8 text-center text-sm">Không tìm thấy vị trí.</div>;
  }

  const qrData = `LOCATION:${location.id}`;
  const fullPath = breadcrumbs.map((b) => b.name).join(' → ');

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 p-4 sm:p-8 flex flex-col items-center">
      {/* Top Action Bar */}
      <div className="no-print w-full max-w-sm flex items-center justify-between mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại</span>
        </button>

        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>In tem nhãn</span>
        </button>
      </div>

      {/* Printable Storage Box / Cabinet / Drawer QR Label Card */}
      <div className="printable-card bg-white text-black p-5 rounded-2xl border-2 border-black w-full max-w-sm shadow-xl flex flex-col justify-between space-y-3 font-sans">
        {/* Brand header */}
        <div className="flex items-center justify-between border-b border-black/20 pb-2">
          <div className="flex items-center gap-1.5">
            <span className="font-black text-xs px-1.5 py-0.5 bg-black text-white rounded">
              H2T
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800">
              Vị Trí Lưu Trữ
            </span>
          </div>
          {location.code && (
            <span className="text-xs font-mono font-black px-1.5 py-0.5 bg-slate-200 border border-black rounded">
              {location.code}
            </span>
          )}
        </div>

        {/* Center: Large QR Code */}
        <div className="flex flex-col items-center justify-center py-2 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=0&data=${encodeURIComponent(
              qrData
            )}`}
            alt="QR Code"
            className="w-36 h-36 border-2 border-black p-1 mb-2"
          />

          <h2 className="font-black text-lg sm:text-xl text-black leading-tight">
            {location.name}
          </h2>

          <p className="text-[11px] font-medium text-slate-600 mt-0.5">
            {items.length} loại vật tư lưu bên trong
          </p>
        </div>

        {/* Full Hierarchical Breadcrumb Path */}
        <div className="border-t border-black/20 pt-2 text-[11px] text-black">
          <div className="font-bold flex items-start gap-1">
            <MapPin className="w-3.5 h-3.5 text-black shrink-0 mt-0.5" />
            <span className="line-clamp-2 leading-snug">{fullPath}</span>
          </div>
        </div>
      </div>

      <div className="no-print mt-6 text-center text-xs text-slate-400 max-w-xs">
        Dán nhãn này lên ngăn kéo, tủ mica hoặc thùng đồ. Khi quét mã QR này bằng camera điện thoại, hệ thống sẽ mở danh sách vật tư bên trong.
      </div>
    </div>
  );
}
