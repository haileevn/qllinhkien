'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  Camera,
  Image as ImageIcon,
  AlertCircle,
  Loader2,
  Radio,
  MinusCircle,
  Search,
  Undo2,
  CheckCircle2,
  MapPin,
  Package,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { isNfcSupported, decodeNdefRecord } from '@/lib/nfc';
import { stopHtml5QrcodeSafely, forceStopMediaTracks } from '@/lib/cameraUtils';
import { playBeepSuccess, playBeepError } from '@/lib/audio';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess?: (decodedText: string) => void;
  defaultAction?: 'lookup' | 'deduct';
}

export default function QRScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
  defaultAction = 'lookup',
}: QRScannerModalProps) {
  const router = useRouter();
  const [targetAction, setTargetAction] = useState<'lookup' | 'deduct'>(defaultAction);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [nfcActive, setNfcActive] = useState(false);

  // Auto-deduct state in modal
  const [lastDeducted, setLastDeducted] = useState<{
    item: any;
    deductedAmount: number;
    transactionId: string;
    undone?: boolean;
  } | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const nfcAbortRef = useRef<AbortController | null>(null);
  const isStartingRef = useRef<boolean>(false);
  const isStoppingRef = useRef<boolean>(false);
  const shouldStopRef = useRef<boolean>(false);
  const lastScannedRef = useRef<{ code: string; time: number } | null>(null);
  const readerElementId = 'qr-camera-reader-view';

  const stopNfc = useCallback(() => {
    if (nfcAbortRef.current) {
      try {
        nfcAbortRef.current.abort();
      } catch {}
      nfcAbortRef.current = null;
    }
    setNfcActive(false);
  }, []);

  const stopScanner = useCallback(async () => {
    shouldStopRef.current = true;
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    const instance = scannerRef.current;
    scannerRef.current = null;

    try {
      await stopHtml5QrcodeSafely(instance, readerElementId);
    } catch {}

    setIsScanning(false);
    isStoppingRef.current = false;
  }, [readerElementId]);

  const handleResult = async (decodedText: string) => {
    const cleanText = decodedText.trim();
    if (!cleanText) return;

    // If caller provided onScanSuccess (e.g. Audit page)
    if (onScanSuccess) {
      await stopScanner();
      stopNfc();
      onScanSuccess(cleanText);
      onClose();
      return;
    }

    // --- AUTO DEDUCT MODE ---
    if (targetAction === 'deduct') {
      const now = Date.now();
      if (
        lastScannedRef.current &&
        lastScannedRef.current.code === cleanText &&
        now - lastScannedRef.current.time < 1500
      ) {
        return; // debounce frame
      }
      lastScannedRef.current = { code: cleanText, time: now };

      if (loading) return;
      setLoading(true);
      setErrorMsg(null);

      try {
        const res = await fetch('/api/scanner/quick-deduct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: cleanText, amount: 1 }),
        });

        const data = await res.json();

        if (!res.ok) {
          playBeepError();
          setErrorMsg(data.error || 'Lỗi xuất kho tự động');
        } else {
          playBeepSuccess();
          setLastDeducted({
            item: data.item,
            deductedAmount: data.deductedAmount,
            transactionId: data.transactionId,
            undone: false,
          });
          setErrorMsg(null);
        }
      } catch {
        playBeepError();
        setErrorMsg('Không thể kết nối máy chủ để trừ kho');
      } finally {
        setLoading(false);
      }
      return;
    }

    // --- LOOKUP MODE ---
    if (loading) return;
    setLoading(true);

    await stopScanner();
    stopNfc();

    try {
      if (cleanText.startsWith('http://') || cleanText.startsWith('https://')) {
        try {
          const urlObj = new URL(cleanText);
          if (urlObj.pathname.startsWith('/items/') || urlObj.pathname.startsWith('/locations/')) {
            onClose();
            router.push(urlObj.pathname);
            return;
          }
        } catch {}
      }

      const res = await fetch(`/api/barcode/${encodeURIComponent(cleanText)}`);
      const data = await res.json();

      if (res.ok && data.url) {
        onClose();
        router.push(data.url);
      } else {
        onClose();
        router.push(`/search?q=${encodeURIComponent(cleanText)}`);
      }
    } catch (err) {
      setErrorMsg('Không thể tra cứu mã này');
      setLoading(false);
    }
  };

  const handleUndoDeduct = async () => {
    if (!lastDeducted || isUndoing) return;
    setIsUndoing(true);

    try {
      const res = await fetch('/api/scanner/quick-deduct/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: lastDeducted.transactionId }),
      });

      const data = await res.json();
      if (res.ok) {
        playBeepSuccess();
        setLastDeducted((prev) => (prev ? { ...prev, undone: true } : null));
      } else {
        setErrorMsg(data.error || 'Lỗi hoàn tác');
      }
    } catch {
      setErrorMsg('Lỗi kết nối hoàn tác');
    } finally {
      setIsUndoing(false);
    }
  };

  const startScanner = useCallback(async () => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    shouldStopRef.current = false;
    setErrorMsg(null);

    await stopScanner();

    if (shouldStopRef.current) {
      isStartingRef.current = false;
      return;
    }

    try {
      const container = document.getElementById(readerElementId);
      if (!container) {
        isStartingRef.current = false;
        return;
      }
      container.innerHTML = '';

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
        () => {}
      );

      if (shouldStopRef.current) {
        await stopScanner();
        return;
      }

      setIsScanning(true);
    } catch (err: any) {
      console.warn('Camera start error:', err);
      await stopScanner();
      setErrorMsg(
        'Không thể mở camera. Vui lòng cấp quyền truy cập camera trong trình duyệt hoặc chọn tải ảnh mã vạch.'
      );
      setIsScanning(false);
    } finally {
      isStartingRef.current = false;
    }
  }, [stopScanner, readerElementId, targetAction]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      await stopScanner();
      const { scanBarcodeFromImage } = await import('@/lib/barcodeScanner');
      const result = await scanBarcodeFromImage(file);
      await handleResult(result);
    } catch (err: any) {
      setErrorMsg(
        err?.message || 'Không phát hiện được mã vạch hoặc mã QR trong ảnh này. Hãy thử chụp gần và rõ hơn.'
      );
      setLoading(false);
    }
  };

  const startNfc = useCallback(async () => {
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
          handleResult(textFound);
        }
      });
    } catch {
      setNfcActive(false);
    }
  }, [targetAction]);

  const handleClose = async () => {
    shouldStopRef.current = true;
    await stopScanner();
    stopNfc();
    onClose();
  };

  const handleRescan = async () => {
    await stopScanner();
    await startScanner();
  };

  useEffect(() => {
    if (isOpen) {
      shouldStopRef.current = false;
      const t = setTimeout(() => {
        startScanner();
        startNfc();
      }, 150);

      return () => {
        shouldStopRef.current = true;
        clearTimeout(t);
        stopScanner();
        stopNfc();
        forceStopMediaTracks(readerElementId);
      };
    } else {
      shouldStopRef.current = true;
      stopScanner();
      stopNfc();
      forceStopMediaTracks(readerElementId);
    }
  }, [isOpen, startScanner, startNfc, stopScanner, stopNfc, readerElementId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
        {/* Header */}
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <h2 className="font-bold text-slate-900 dark:text-white text-base">
              Quét Barcode / QR / NFC
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Action Mode Selector (Lookup vs Quick Deduct -1) */}
        {!onScanSuccess && (
          <div className="px-3 pt-2 pb-1 bg-slate-50 dark:bg-slate-850 border-b border-slate-200/60 dark:border-slate-800">
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setTargetAction('lookup')}
                className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                  targetAction === 'lookup'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Tra cứu</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetAction('deduct')}
                className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                  targetAction === 'deduct'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <MinusCircle className="w-3.5 h-3.5" />
                <span>⚡ Lấy hàng (-1)</span>
              </button>
            </div>
          </div>
        )}

        {/* Camera View Area */}
        <div className="p-4 flex flex-col items-center justify-center bg-slate-950 relative min-h-[290px]">
          <div id={readerElementId} className="w-full max-w-[280px] overflow-hidden rounded-xl bg-black" />

          {/* Action indicator over video */}
          <div className="absolute top-3 left-3 z-10">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-md flex items-center gap-1 ${
                targetAction === 'deduct' ? 'bg-amber-500 text-white' : 'bg-sky-500 text-white'
              }`}
            >
              {targetAction === 'deduct' ? '⚡ Chế độ lấy hàng (-1)' : '🔍 Chế độ tra cứu'}
            </span>
          </div>

          {loading && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2 text-white z-20">
              <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
              <p className="text-sm font-medium">
                {targetAction === 'deduct' ? 'Đang trừ kho...' : 'Đang tìm vật tư...'}
              </p>
            </div>
          )}
        </div>

        {/* Success / Last Deducted Notification Card in Modal */}
        {lastDeducted && targetAction === 'deduct' && (
          <div
            className={`p-3 mx-4 mt-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 shadow-xs animate-in fade-in duration-150 ${
              lastDeducted.undone
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300'
                : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 text-emerald-900 dark:text-emerald-100'
            }`}
          >
            <div className="min-w-0">
              <div className="font-bold flex items-center gap-1.5 truncate">
                <span>{lastDeducted.item.name}</span>
                {lastDeducted.undone ? (
                  <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.2 rounded">
                    Đã hoàn tác
                  </span>
                ) : (
                  <span className="text-[10px] font-black bg-rose-600 text-white px-1.5 py-0.2 rounded">
                    -{lastDeducted.deductedAmount} {lastDeducted.item.unit}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Kho còn: <strong>{lastDeducted.item.newQuantity} {lastDeducted.item.unit}</strong>
                {lastDeducted.item.location && ` • ${lastDeducted.item.location.name}`}
              </div>
            </div>

            {!lastDeducted.undone && (
              <button
                type="button"
                disabled={isUndoing}
                onClick={handleUndoDeduct}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-rose-50 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-[11px] font-bold flex items-center gap-1 shrink-0 shadow-xs"
              >
                {isUndoing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Undo2 className="w-3 h-3 text-rose-500" />}
                <span>Hoàn tác</span>
              </button>
            )}
          </div>
        )}

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3 mx-4 mt-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {nfcActive && (
          <div className="px-4 py-1.5 mx-4 mt-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 text-[11px] flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold">
              <Radio className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
              <span>NFC sẵn sàng:</span>
            </div>
            <span>Áp thẻ vào lưng máy để đọc ngay</span>
          </div>
        )}

        {/* Actions & File Upload */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 mt-2">
          <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-colors">
            <ImageIcon className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>Chọn ảnh mã</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
          </label>

          <button
            onClick={handleRescan}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            Quét lại
          </button>
        </div>
      </div>
    </div>
  );
}
