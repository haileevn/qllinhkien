'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Image as ImageIcon, QrCode, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import Navbar from '@/components/Navbar';

export default function ScannerPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'qr-fullpage-reader';

  const handleResult = async (decodedText: string) => {
    if (loading) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/barcode/${encodeURIComponent(decodedText)}`);
      const data = await res.json();

      if (res.ok && data.url) {
        stopScanner();
        router.push(data.url);
      } else {
        stopScanner();
        router.push(`/search?q=${encodeURIComponent(decodedText)}`);
      }
    } catch {
      setErrorMsg('Không thể tra cứu mã này');
      setLoading(false);
    }
  };

  const startScanner = async () => {
    try {
      setErrorMsg(null);
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch {}
      }

      const html5QrCode = new Html5Qrcode(readerElementId);
      scannerRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 260, height: 260 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => handleResult(decodedText),
        () => {}
      );
      setIsScanning(true);
    } catch (err: any) {
      setErrorMsg(
        'Không thể mở camera. Vui lòng cấp quyền camera trong trình duyệt hoặc chọn ảnh từ máy.'
      );
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
      setIsScanning(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      await stopScanner();
      const { scanBarcodeFromImage } = await import('@/lib/barcodeScanner');
      const result = await scanBarcodeFromImage(file);
      handleResult(result);
    } catch (err: any) {
      setErrorMsg(
        err?.message || 'Không tìm thấy mã vạch hoặc mã QR trong ảnh này. Hãy thử chụp gần và rõ hơn.'
      );
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      startScanner();
    }, 200);

    return () => {
      clearTimeout(t);
      stopScanner();
    };
  }, []);

  return (
    <div className="max-w-md mx-auto space-y-4">
      <Navbar title="Quét Barcode / QR" showBack />

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl flex flex-col">
        {/* Scanner Viewport */}
        <div className="p-4 bg-slate-950 flex flex-col items-center justify-center relative min-h-[320px]">
          <div id={readerElementId} className="w-full max-w-[280px] rounded-2xl overflow-hidden bg-black" />

          {loading && (
            <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-2 text-white">
              <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
              <p className="text-sm font-semibold">Đang nhận diện và tìm kiếm...</p>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 text-center space-y-3">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Hướng camera vào mã vạch sản phẩm (EAN/UPC) hoặc tem QR dán trên hộp/ngăn lưu trữ.
          </p>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-center gap-3 pt-1">
            <label className="cursor-pointer flex items-center gap-1.5 px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm transition-colors">
              <ImageIcon className="w-4 h-4 text-sky-600" />
              <span>Tải ảnh mã vạch</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </label>

            <button
              onClick={() => {
                stopScanner();
                startScanner();
              }}
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
            >
              Mở lại Camera
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
