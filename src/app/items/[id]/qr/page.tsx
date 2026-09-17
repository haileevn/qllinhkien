'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Printer, ArrowLeft, Loader2, MapPin, Package } from 'lucide-react';
import Link from 'next/link';

export default function ItemQRPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [item, setItem] = useState<any>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetch(`/api/items/${id}`)
        .then((r) => r.json())
        .then((data) => {
          setItem(data.item);
          setBreadcrumbs(data.breadcrumbs || []);
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

  if (!item) {
    return <div className="p-8 text-center text-sm">Không tìm thấy vật tư.</div>;
  }

  const qrData = item.qrCodeValue || `ITEM:${item.id}`;
  const locationPath = [
    ...breadcrumbs.map((b) => b.name),
    item.container,
    item.exactPosition,
  ]
    .filter(Boolean)
    .join(' → ');

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 p-4 sm:p-8 flex flex-col items-center">
      {/* Top Action Bar (hidden when printing) */}
      <div className="no-print w-full max-w-md flex items-center justify-between mb-6">
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

      {/* Printable Label Card - Formatted for Label Printers / Sticker Sheets */}
      <div className="printable-card bg-white text-black p-4 sm:p-5 rounded-2xl border-2 border-black w-full max-w-sm shadow-xl flex flex-col justify-between space-y-3 font-sans">
        {/* Brand & App Title Header */}
        <div className="flex items-center justify-between border-b border-black/20 pb-2">
          <div className="flex items-center gap-1.5">
            <span className="font-black text-xs px-1.5 py-0.5 bg-black text-white rounded">
              H2T
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Home Inventory
            </span>
          </div>
          {item.sku && (
            <span className="text-[11px] font-mono font-bold text-slate-800">
              SKU: {item.sku}
            </span>
          )}
        </div>

        {/* Center: QR Code & Item Name */}
        <div className="flex items-center gap-3.5 py-1">
          <div className="flex flex-col items-center shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=0&data=${encodeURIComponent(
                qrData
              )}`}
              alt="QR Code"
              className="w-24 h-24 border border-black p-1"
            />
            <span className="text-[9px] font-mono font-bold text-black mt-1 uppercase max-w-[100px] truncate">
              {qrData}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold text-slate-600 uppercase">
              {item.category?.name}
            </div>
            <h2 className="font-black text-sm sm:text-base leading-tight text-black line-clamp-2 mt-0.5">
              {item.name}
            </h2>
            {(item.brand || item.model) && (
              <p className="text-[11px] text-slate-600 font-medium mt-0.5 truncate">
                {[item.brand, item.model].filter(Boolean).join(' - ')}
              </p>
            )}
          </div>
        </div>

        {/* Location Path Footer */}
        <div className="border-t border-black/20 pt-2 text-[11px] text-black">
          <div className="font-bold flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-black shrink-0" />
            <span className="line-clamp-2 leading-snug">{locationPath}</span>
          </div>
        </div>
      </div>

      <div className="no-print mt-6 text-center text-xs text-slate-400 max-w-xs">
        Mẹo: Bạn có thể in tem này trên giấy dán (decal) hoặc máy in nhãn nhiệt rồi dán lên hộp/ngăn chứa linh kiện.
      </div>
    </div>
  );
}
