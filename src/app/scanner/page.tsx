'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera,
  Image as ImageIcon,
  QrCode,
  AlertCircle,
  Loader2,
  Radio,
  Sparkles,
  Smartphone,
  CheckCircle2,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import Navbar from '@/components/Navbar';
import { isNfcSupported, decodeNdefRecord } from '@/lib/nfc';

export default function ScannerPage() {
  const router = useRouter();
  const [scanMode, setScanMode] = useState<'camera' | 'nfc'>('camera');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [nfcListening, setNfcListening] = useState(false);
  const [nfcSuccessMsg, setNfcSuccessMsg] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const nfcAbortRef = useRef<AbortController | null>(null);
  const readerElementId = 'qr-fullpage-reader';

  const handleResult = async (decodedText: string) => {
    if (loading) return;
    setLoading(true);

    try {
      const cleanText = decodedText.trim();

      // If full URL was scanned
      if (cleanText.startsWith('http://') || cleanText.startsWith('https://')) {
        try {
          const urlObj = new URL(cleanText);
          if (urlObj.pathname.startsWith('/items/') || urlObj.pathname.startsWith('/locations/')) {
            await stopScanner();
            stopNfcScan();
            router.push(urlObj.pathname);
            return;
          }
        } catch {}
      }

      const res = await fetch(`/api/barcode/${encodeURIComponent(cleanText)}`);
      const data = await res.json();

      if (res.ok && data.url) {
        await stopScanner();
        stopNfcScan();
        router.push(data.url);
      } else {
        await stopScanner();
        stopNfcScan();
        router.push(`/search?q=${encodeURIComponent(cleanText)}`);
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

  const startNfcScan = async () => {
    if (!isNfcSupported() || !window.NDEFReader) {
      setErrorMsg(
        'Trình duyệt này chưa bật Web NFC trực tiếp. Với iPhone hoặc Android thông thường, bạn chỉ cần mở sáng màn hình và chạm thẳng vào thẻ NFC ngoài màn hình chính để tự động mở ứng dụng.'
      );
      return;
    }

    try {
      setErrorMsg(null);
      setNfcSuccessMsg(null);
      const controller = new AbortController();
      nfcAbortRef.current = controller;

      const ndef = new window.NDEFReader();
      await ndef.scan({ signal: controller.signal });
      setNfcListening(true);

      ndef.addEventListener('reading', (event: any) => {
        let textFound: string | null = null;

        if (event.message?.records) {
          for (const record of event.message.records) {
            const decoded = decodeNdefRecord(record);
            if (decoded) {
              textFound = decoded;
              break;
            }
          }
        }

        if (!textFound && event.serialNumber) {
          textFound = event.serialNumber;
        }

        if (textFound) {
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate([100, 50, 100]);
          }
          setNfcSuccessMsg(`✓ Đã đọc thẻ thành công: ${textFound}`);
          handleResult(textFound);
        }
      });

      ndef.addEventListener('readingerror', () => {
        setErrorMsg('Lỗi đọc thẻ NFC. Vui lòng giữ thẻ sát mặt lưng điện thoại.');
      });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setErrorMsg('Không thể kích hoạt NFC: ' + (err?.message || 'Hãy bật NFC trong cài đặt máy'));
      }
      setNfcListening(false);
    }
  };

  const stopNfcScan = () => {
    if (nfcAbortRef.current) {
      nfcAbortRef.current.abort();
      nfcAbortRef.current = null;
    }
    setNfcListening(false);
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
    if (scanMode === 'camera') {
      stopNfcScan();
      const t = setTimeout(() => {
        startScanner();
      }, 200);
      return () => {
        clearTimeout(t);
        stopScanner();
      };
    } else {
      stopScanner();
      startNfcScan();
      return () => {
        stopNfcScan();
      };
    }
  }, [scanMode]);

  return (
    <div className="max-w-md mx-auto space-y-4">
      <Navbar title="Quét & Tra cứu" showBack />

      {/* Mode Switcher Tabs */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
        <button
          type="button"
          onClick={() => setScanMode('camera')}
          className={`py-2.5 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
            scanMode === 'camera'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Camera className="w-4 h-4 text-sky-600" />
          <span>Camera Barcode / QR</span>
        </button>

        <button
          type="button"
          onClick={() => setScanMode('nfc')}
          className={`py-2.5 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
            scanMode === 'nfc'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Radio className="w-4 h-4 animate-pulse" />
          <span>Chạm thẻ NFC</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl flex flex-col">
        {scanMode === 'camera' ? (
          <>
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

            {/* Camera Instructions */}
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
          </>
        ) : (
          /* NFC Mode Viewport */
          <div className="p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-5">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center mx-auto shadow-inner animate-pulse">
                <Radio className="w-12 h-12" />
              </div>
              <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs shadow-md">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="space-y-1.5 max-w-xs">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Áp thẻ NFC vào lưng điện thoại
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Đưa điện thoại lại gần thẻ NFC / tem dán trên tủ hoặc hộp linh kiện để tra cứu tức thì.
              </p>
            </div>

            {loading && (
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang xử lý dữ liệu thẻ...</span>
              </div>
            )}

            {nfcSuccessMsg && (
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{nfcSuccessMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs text-left space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Lưu ý về NFC</span>
                </div>
                <p className="text-[11px] leading-relaxed">{errorMsg}</p>
              </div>
            )}

            {/* Helpful tip box */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 text-left space-y-1 w-full">
              <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
                <span>Chạm ngoài màn hình khóa:</span>
              </div>
              <p className="leading-relaxed">
                Thẻ NFC đã ghi URL link sẽ tự động đánh thức màn hình và mở trang vật tư mà không cần mở app trước!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

