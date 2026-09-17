'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, QrCode, Plus, Box, ArrowLeft, SlidersHorizontal } from 'lucide-react';
import QRScannerModal from './QRScannerModal';

interface NavbarProps {
  title?: string;
  showBack?: boolean;
  backHref?: string;
  action?: React.ReactNode;
}

export default function Navbar({ title, showBack, backHref, action }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [scannerOpen, setScannerOpen] = useState(false);

  if (pathname === '/login' || pathname.endsWith('/qr')) {
    return null;
  }

  const isHome = pathname === '/';

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 pt-safe">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          {/* Left Title / Brand / Back */}
          <div className="flex items-center gap-2.5 min-w-0">
            {showBack ? (
              <button
                onClick={() => (backHref ? router.push(backHref) : router.back())}
                className="p-1.5 -ml-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Quay lại"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : null}

            {isHome ? (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-sky-600 flex items-center justify-center text-white font-bold text-xs md:hidden">
                  H2T
                </div>
                <h1 className="font-bold text-slate-900 dark:text-white text-base md:text-lg truncate">
                  H2T Home Inventory
                </h1>
              </div>
            ) : (
              <h1 className="font-bold text-slate-900 dark:text-white text-base md:text-lg truncate">
                {title || 'H2T Inventory'}
              </h1>
            )}
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {action}

            {/* Live Camera Scanner Trigger */}
            <button
              onClick={() => setScannerOpen(true)}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs font-medium"
              title="Quét Barcode / QR"
            >
              <QrCode className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              <span className="hidden sm:inline">Quét mã</span>
            </button>

            {/* Quick Add on Top Bar for Desktop */}
            <Link
              href="/items/new"
              className="hidden sm:flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm đồ</span>
            </Link>
          </div>
        </div>
      </header>

      {/* QR & Barcode Camera Scanner Modal */}
      {scannerOpen && (
        <QRScannerModal isOpen={scannerOpen} onClose={() => setScannerOpen(false)} />
      )}
    </>
  );
}
