'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Camera, Image as ImageIcon, AlertCircle, Loader2, Radio } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { isNfcSupported, decodeNdefRecord } from '@/lib/nfc';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess?: (decodedText: string) => void;
}

export default function QRScannerModal({ isOpen, onClose, onScanSuccess }: QRScannerModalProps) {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [nfcActive, setNfcActive] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const nfcAbortRef = useRef<AbortController | null>(null);
  const readerElementId = 'qr-camera-reader-view';

  const handleResult = async (decodedText: string) => {
    if (loading) return;
    setLoading(true);

    const cleanText = decodedText.trim();

    if (onScanSuccess) {
      onScanSuccess(cleanText);
      await stopScanner();
      stopNfc();
      onClose();
      return;
    }

    try {
      if (cleanText.startsWith('http://') || cleanText.startsWith('https://')) {
        try {
          const urlObj = new URL(cleanText);
          if (urlObj.pathname.startsWith('/items/') || urlObj.pathname.startsWith('/locations/')) {
            await stopScanner();
            stopNfc();
            onClose();
            router.push(urlObj.pathname);
            return;
          }
        } catch {}
      }

      const res = await fetch(`/api/barcode/${encodeURIComponent(cleanText)}`);
      const data = await res.json();

      if (res.ok && data.url) {
        await stopScanner();
        stopNfc();
        onClose();
        router.push(data.url);
      } else {
        await stopScanner();
        stopNfc();
        onClose();
        router.push(`/search?q=${encodeURIComponent(cleanText)}`);
      }
    } catch (err) {
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
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          handleResult(decodedText);
        },
        () => {
          // Frame error (ignore normal scan frames)
        }
      );
      setIsScanning(true);
    } catch (err: any) {
      console.warn('Camera start error:', err);
      setErrorMsg(
        'Không thể mở camera. Vui lòng cấp quyền truy cập camera trong trình duyệt hoặc chọn tải ảnh mã vạch.'
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
        err?.message || 'Không phát hiện được mã vạch hoặc mã QR trong ảnh này. Hãy thử chụp gần và rõ hơn.'
      );
      setLoading(false);
    }
  };

  const startNfc = async () => {
    if (!isNfcSupported() || !window.NDEFReader) return;

    try {
      const controller = new AbortController();
      nfcAbortRef.current = controller;
      const ndef = new window.NDEFReader();
      await ndef.scan({ signal: controller.signal });
      setNfcActive(true);

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
          handleResult(textFound);
        }
      });
    } catch {
      setNfcActive(false);
    }
  };

  const stopNfc = () => {
    if (nfcAbortRef.current) {
      nfcAbortRef.current.abort();
      nfcAbortRef.current = null;
    }
    setNfcActive(false);
  };

  useEffect(() => {
    if (isOpen) {
      // Small timeout to allow DOM node to render
      const t = setTimeout(() => {
        startScanner();
        startNfc();
      }, 150);
      return () => {
        clearTimeout(t);
        stopScanner();
        stopNfc();
      };
    } else {
      stopScanner();
      stopNfc();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <h2 className="font-bold text-slate-900 dark:text-white text-base">
              Quét Barcode / QR / NFC
            </h2>
          </div>
          <button
            onClick={() => {
              stopScanner();
              stopNfc();
              onClose();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera View Area */}
        <div className="p-4 flex flex-col items-center justify-center bg-slate-950 relative min-h-[300px]">
          <div id={readerElementId} className="w-full max-w-[280px] overflow-hidden rounded-xl bg-black" />

          {loading && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2 text-white">
              <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
              <p className="text-sm font-medium">Đang tìm vật tư...</p>
            </div>
          )}
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3 mx-4 mt-3 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {nfcActive && (
          <div className="px-4 py-2 mx-4 mt-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 text-[11px] flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold">
              <Radio className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
              <span>NFC sẵn sàng:</span>
            </div>
            <span>Có thể áp thẻ vào lưng điện thoại để đọc ngay</span>
          </div>
        )}

        {/* Actions & File Upload */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-colors">
            <ImageIcon className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>Chọn ảnh từ máy</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
          </label>

          <button
            onClick={() => {
              stopScanner();
              startScanner();
            }}
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            Quét lại
          </button>
        </div>
      </div>
    </div>
  );
}
