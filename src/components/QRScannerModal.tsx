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
  RefreshCw,
  Zap,
  ZapOff,
  SwitchCamera,
  CheckCircle2,
} from 'lucide-react';
import { isNfcSupported, decodeNdefRecord } from '@/lib/nfc';
import {
  createAndStartScanner,
  checkCameraEnvironment,
  ScannerController,
  ScannerStatus,
  stopAllVideoTracksInElement,
} from '@/lib/unifiedScanner';
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
  const [scannerStatus, setScannerStatus] = useState<ScannerStatus>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [nfcActive, setNfcActive] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Auto-deduct state in modal
  const [lastDeducted, setLastDeducted] = useState<{
    item: any;
    deductedAmount: number;
    transactionId: string;
    undone?: boolean;
  } | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);

  const controllerRef = useRef<ScannerController | null>(null);
  const nfcAbortRef = useRef<AbortController | null>(null);
  const isNavigatingRef = useRef<boolean>(false);
  const lastScannedRef = useRef<{ code: string; time: number } | null>(null);
  const readerElementId = 'qr-modal-scanner-view';

  // State refs to keep callbacks stable
  const targetActionRef = useRef(targetAction);
  targetActionRef.current = targetAction;
  const onScanSuccessRef = useRef(onScanSuccess);
  onScanSuccessRef.current = onScanSuccess;
  const loadingRef = useRef(loading);
  loadingRef.current = loading;

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
    if (controllerRef.current) {
      const c = controllerRef.current;
      controllerRef.current = null;
      try {
        await c.stop();
      } catch {}
    }
    stopAllVideoTracksInElement(document.getElementById(readerElementId));
    setScannerStatus('stopped');
    setTorchOn(false);
  }, [readerElementId]);

  const normalizeUrlPath = (urlOrPath: string): string => {
    try {
      if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
        const u = new URL(urlOrPath);
        return (u.pathname + u.search).replace(/\/+$/, '') || '/';
      }
      return urlOrPath.replace(/\/+$/, '') || '/';
    } catch {
      return urlOrPath.replace(/\/+$/, '') || '/';
    }
  };

  const handleResult = async (decodedText: string) => {
    const cleanText = decodedText.trim();
    if (!cleanText) return;

    // Prevent duplicate processing during navigation
    if (isNavigatingRef.current) return;

    const currentAction = targetActionRef.current;
    const currentOnScanSuccess = onScanSuccessRef.current;

    // If custom callback is provided (e.g. Audit / Form field)
    if (currentOnScanSuccess) {
      isNavigatingRef.current = true;
      await stopScanner();
      stopNfc();
      onClose();
      currentOnScanSuccess(cleanText);
      return;
    }

    // --- AUTO DEDUCT MODE ---
    if (currentAction === 'deduct') {
      const now = Date.now();
      if (
        lastScannedRef.current &&
        lastScannedRef.current.code === cleanText &&
        now - lastScannedRef.current.time < 1500
      ) {
        return; // debounce duplicate frame
      }
      lastScannedRef.current = { code: cleanText, time: now };

      if (loadingRef.current) return;
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
    isNavigatingRef.current = true;
    setLoading(true);

    // Stop camera immediately
    await stopScanner();
    stopNfc();

    const currentNorm = normalizeUrlPath(
      typeof window !== 'undefined' ? window.location.pathname + window.location.search : ''
    );

    try {
      let targetPath: string | null = null;

      if (cleanText.startsWith('http://') || cleanText.startsWith('https://')) {
        try {
          const urlObj = new URL(cleanText);
          const p = urlObj.pathname;
          if (p.startsWith('/items/') || p.startsWith('/locations/')) {
            targetPath = p + urlObj.search;
          }
        } catch {}
      }

      if (!targetPath) {
        const res = await fetch(`/api/barcode/${encodeURIComponent(cleanText)}`);
        const data = await res.json();
        if (res.ok && data.url) {
          targetPath = data.url;
        } else {
          targetPath = `/search?q=${encodeURIComponent(cleanText)}`;
        }
      }

      onClose();

      const finalPath = targetPath || `/search?q=${encodeURIComponent(cleanText)}`;
      const targetNorm = normalizeUrlPath(finalPath);
      if (currentNorm !== targetNorm) {
        router.push(finalPath);
      }
    } catch {
      setErrorMsg('Không thể tra cứu mã này');
      setLoading(false);
      isNavigatingRef.current = false;
    }
  };

  const handleResultRef = useRef(handleResult);
  handleResultRef.current = handleResult;

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
    setErrorMsg(null);
    isNavigatingRef.current = false;

    // Check environment first (e.g. HTTPS)
    const env = checkCameraEnvironment();
    if (!env.ok) {
      setErrorMsg(env.message || 'Thiết bị không hỗ trợ Camera.');
      setScannerStatus('error');
      setStatusMessage(env.message || 'Lỗi Camera');
      return;
    }

    await stopScanner();

    try {
      setScannerStatus('requesting_permission');
      setStatusMessage('Đang yêu cầu quyền truy cập Camera...');

      const controller = await createAndStartScanner(
        readerElementId,
        (decodedText) => handleResultRef.current(decodedText),
        (status, message) => {
          setScannerStatus(status);
          if (message) setStatusMessage(message);
          if (status === 'error' && message) {
            setErrorMsg(message);
          }
        },
        facingMode
      );

      controllerRef.current = controller;
      setFacingMode(controller.getFacingMode());
    } catch (err: any) {
      console.warn('Camera start error in modal:', err);
      await stopScanner();
      setErrorMsg(
        err?.message ||
          'Không thể mở Camera. Vui lòng kiểm tra quyền Camera trong trình duyệt hoặc chọn ảnh mã vạch.'
      );
      setScannerStatus('error');
    }
  }, [stopScanner, readerElementId, facingMode]);

  const handleSwitchCamera = async () => {
    if (controllerRef.current?.switchCamera) {
      try {
        await controllerRef.current.switchCamera();
        setFacingMode(controllerRef.current.getFacingMode());
      } catch (err: any) {
        setErrorMsg(err?.message || 'Không thể chuyển đổi camera');
      }
    } else {
      const next = facingMode === 'environment' ? 'user' : 'environment';
      setFacingMode(next);
    }
  };

  const handleToggleTorch = async () => {
    if (controllerRef.current?.toggleTorch) {
      const state = await controllerRef.current.toggleTorch();
      setTorchOn(state);
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
          handleResultRef.current(textFound);
        }
      });
    } catch {
      setNfcActive(false);
    }
  }, []);

  const handleClose = async () => {
    await stopScanner();
    stopNfc();
    onClose();
  };

  const handleRescan = async () => {
    isNavigatingRef.current = false;
    await stopScanner();
    await startScanner();
  };

  // Launch on open
  useEffect(() => {
    let timer: any = null;
    if (isOpen) {
      timer = setTimeout(() => {
        startScanner();
        startNfc();
      }, 100);
    } else {
      stopScanner();
      stopNfc();
    }

    return () => {
      if (timer) clearTimeout(timer);
      stopScanner();
      stopNfc();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-base">
                Quét Barcode / QR / NFC
              </h2>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <span
                  className={`w-2 h-2 rounded-full ${
                    scannerStatus === 'scanning'
                      ? 'bg-emerald-500 animate-pulse'
                      : scannerStatus === 'error'
                      ? 'bg-rose-500'
                      : 'bg-amber-500'
                  }`}
                />
                <span>{statusMessage || 'Đang sẵn sàng'}</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Action Mode Selector (Lookup vs Quick Deduct -1) */}
        {!onScanSuccess && (
          <div className="px-3 pt-2.5 pb-1.5 bg-slate-50 dark:bg-slate-850 border-b border-slate-200/60 dark:border-slate-800">
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setTargetAction('lookup')}
                className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  targetAction === 'lookup'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Tra cứu</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetAction('deduct')}
                className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  targetAction === 'deduct'
                    ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <MinusCircle className="w-3.5 h-3.5 animate-pulse" />
                <span>⚡ Lấy hàng (-1)</span>
              </button>
            </div>
          </div>
        )}

        {/* Camera View Area */}
        <div className="p-4 flex flex-col items-center justify-center bg-slate-950 relative min-h-[300px] overflow-hidden">
          <div
            id={readerElementId}
            className="w-full max-w-[290px] h-[260px] overflow-hidden rounded-2xl bg-black border border-slate-800 shadow-inner relative flex items-center justify-center"
          />

          {/* Action indicator over video */}
          <div className="absolute top-6 left-6 z-10">
            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-md flex items-center gap-1 ${
                targetAction === 'deduct' ? 'bg-amber-500/90 text-white' : 'bg-sky-500/90 text-white'
              }`}
            >
              {targetAction === 'deduct' ? '⚡ Chế độ lấy hàng (-1)' : '🔍 Chế độ tra cứu'}
            </span>
          </div>

          {/* Live Camera Quick Controls (Switch Lens, Torch) */}
          <div className="absolute top-6 right-6 z-10 flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleToggleTorch}
              className={`p-2 rounded-full backdrop-blur-md transition-all shadow-md ${
                torchOn
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-black/60 text-white/90 hover:bg-black/80'
              }`}
              title="Bật/Tắt đèn Flash"
            >
              {torchOn ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={handleSwitchCamera}
              className="p-2 rounded-full bg-black/60 text-white/90 hover:bg-black/80 backdrop-blur-md transition-all shadow-md"
              title="Đổi camera trước / sau"
            >
              <SwitchCamera className="w-4 h-4" />
            </button>
          </div>

          {/* Status Overlay if Loading/Starting */}
          {scannerStatus !== 'scanning' && scannerStatus !== 'error' && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-3 text-white z-10 p-4 text-center">
              <Loader2 className="w-9 h-9 animate-spin text-sky-400" />
              <div className="space-y-1">
                <p className="text-sm font-semibold">{statusMessage || 'Đang chuẩn bị Camera...'}</p>
                <p className="text-[11px] text-slate-400">
                  Nếu trình duyệt hỏi cấp quyền Camera, vui lòng nhấn &ldquo;Cho phép&rdquo; (Allow)
                </p>
              </div>
            </div>
          )}

          {/* Processing overlay when reading barcode */}
          {loading && (
            <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-2.5 text-white z-20">
              <Loader2 className="w-9 h-9 animate-spin text-amber-400" />
              <p className="text-sm font-semibold">
                {targetAction === 'deduct' ? 'Đang tự động trừ kho...' : 'Đang tra cứu vật tư...'}
              </p>
            </div>
          )}
        </div>

        {/* Success / Last Deducted Notification Card in Modal */}
        {lastDeducted && targetAction === 'deduct' && (
          <div
            className={`p-3 mx-4 mt-3 rounded-2xl border text-xs flex items-center justify-between gap-2 shadow-xs animate-in fade-in duration-150 ${
              lastDeducted.undone
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300'
                : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 text-emerald-900 dark:text-emerald-100'
            }`}
          >
            <div className="min-w-0">
              <div className="font-bold flex items-center gap-1.5 truncate">
                <span>{lastDeducted.item.name}</span>
                {lastDeducted.undone ? (
                  <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.2 rounded font-semibold">
                    Đã hoàn tác
                  </span>
                ) : (
                  <span className="text-[10px] font-black bg-rose-600 text-white px-1.5 py-0.2 rounded">
                    -{lastDeducted.deductedAmount} {lastDeducted.item.unit}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Kho còn: <strong>{lastDeducted.item.newQuantity} {lastDeducted.item.unit}</strong>
                {lastDeducted.item.location && ` • ${lastDeducted.item.location.name}`}
              </div>
            </div>

            {!lastDeducted.undone && (
              <button
                type="button"
                disabled={isUndoing}
                onClick={handleUndoDeduct}
                className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-rose-50 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-bold flex items-center gap-1 shrink-0 shadow-xs active:scale-95 transition-all"
              >
                {isUndoing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Undo2 className="w-3.5 h-3.5 text-rose-500" />}
                <span>Hoàn tác</span>
              </button>
            )}
          </div>
        )}

        {/* Error Notification with Help Tips */}
        {errorMsg && (
          <div className="p-3.5 mx-4 mt-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <div className="space-y-1">
              <p className="font-bold">Không thể mở Camera</p>
              <p className="leading-relaxed">{errorMsg}</p>
            </div>
          </div>
        )}

        {nfcActive && (
          <div className="px-4 py-2 mx-4 mt-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold">
              <Radio className="w-4 h-4 text-indigo-600 animate-pulse" />
              <span>NFC sẵn sàng:</span>
            </div>
            <span>Áp thẻ vào lưng máy để đọc</span>
          </div>
        )}

        {/* Actions & File Upload */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 mt-3">
          <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 px-3.5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs transition-colors">
            <ImageIcon className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>Chọn ảnh mã</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
          </label>

          <button
            onClick={handleRescan}
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white rounded-2xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Quét lại</span>
          </button>
        </div>
      </div>
    </div>
  );
}
