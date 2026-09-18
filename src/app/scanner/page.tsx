'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
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
  MinusCircle,
  Undo2,
  Package,
  Layers,
  MapPin,
  Clock,
  Trash2,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  FolderKanban,
  Check,
  Search,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import Navbar from '@/components/Navbar';
import { isNfcSupported, decodeNdefRecord } from '@/lib/nfc';
import { stopHtml5QrcodeSafely, forceStopMediaTracks, stopAllGlobalMediaStreams } from '@/lib/cameraUtils';
import { playBeepSuccess, playBeepError } from '@/lib/audio';

interface PickedHistoryItem {
  id: string;
  item: {
    id: string;
    name: string;
    sku?: string | null;
    brand?: string | null;
    unit: string;
    previousQuantity: number;
    newQuantity: number;
    location?: { name: string; code?: string | null } | null;
    container?: string | null;
    exactPosition?: string | null;
    mainImage?: string | null;
  };
  deductedAmount: number;
  transactionId: string;
  timestamp: string;
  note?: string | null;
  undone?: boolean;
}

function ScannerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') === 'deduct' ? 'deduct' : 'lookup';

  // State: Action mode (Lookup vs Auto-Deduct)
  const [targetAction, setTargetAction] = useState<'lookup' | 'deduct'>(initialMode);
  // State: Hardware Input Medium (Camera vs NFC)
  const [scanMedium, setScanMedium] = useState<'camera' | 'nfc'>('camera');

  // Deduction parameters
  const [deductAmount, setDeductAmount] = useState<number>(1);
  const [customAmountStr, setCustomAmountStr] = useState<string>('');
  const [showCustomAmount, setShowCustomAmount] = useState(false);
  const [deductNote, setDeductNote] = useState<string>('');
  const [showAdvancedDeduct, setShowAdvancedDeduct] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [projects, setProjects] = useState<any[]>([]);

  // Scan states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [nfcListening, setNfcListening] = useState(false);
  const [nfcSuccessMsg, setNfcSuccessMsg] = useState<string | null>(null);

  // Auto-deduct feedback states
  const [lastPicked, setLastPicked] = useState<PickedHistoryItem | null>(null);
  const [sessionHistory, setSessionHistory] = useState<PickedHistoryItem[]>([]);
  const [undoingTxId, setUndoingTxId] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const nfcAbortRef = useRef<AbortController | null>(null);
  const isStartingRef = useRef<boolean>(false);
  const isStoppingRef = useRef<boolean>(false);
  const shouldStopRef = useRef<boolean>(false);
  const isHandlingNavRef = useRef<boolean>(false);
  const lastScannedRef = useRef<{ code: string; time: number } | null>(null);
  const readerElementId = 'qr-fullpage-reader';

  // Refs for state variables so callbacks stay completely stable without restarting camera
  const targetActionRef = useRef(targetAction);
  targetActionRef.current = targetAction;
  const deductAmountRef = useRef(deductAmount);
  deductAmountRef.current = deductAmount;
  const customAmountStrRef = useRef(customAmountStr);
  customAmountStrRef.current = customAmountStr;
  const showCustomAmountRef = useRef(showCustomAmount);
  showCustomAmountRef.current = showCustomAmount;
  const deductNoteRef = useRef(deductNote);
  deductNoteRef.current = deductNote;
  const selectedProjectIdRef = useRef(selectedProjectId);
  selectedProjectIdRef.current = selectedProjectId;
  const processingRef = useRef(processing);
  processingRef.current = processing;

  // Fetch active projects for optional BOM link
  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data) => {
        if (data.projects) {
          setProjects(data.projects.filter((p: any) => p.status !== 'COMPLETED' && p.status !== 'ARCHIVED'));
        }
      })
      .catch(() => {});
  }, []);

  const stopNfcScan = useCallback(() => {
    if (nfcAbortRef.current) {
      try {
        nfcAbortRef.current.abort();
      } catch {}
      nfcAbortRef.current = null;
    }
    setNfcListening(false);
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

    forceStopMediaTracks(readerElementId);
    stopAllGlobalMediaStreams();

    setIsScanning(false);
    isStoppingRef.current = false;
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

  // Execute Auto Deduction API call
  const executeAutoDeduct = async (code: string) => {
    if (processingRef.current) return;
    setProcessing(true);
    setErrorMsg(null);

    const isCustom = showCustomAmountRef.current && parseFloat(customAmountStrRef.current) > 0;
    const effectiveAmount = isCustom ? parseFloat(customAmountStrRef.current) : deductAmountRef.current;
    const currentNote = deductNoteRef.current.trim();
    const currentProj = selectedProjectIdRef.current;

    try {
      const res = await fetch('/api/scanner/quick-deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim(),
          amount: effectiveAmount,
          note: currentNote || undefined,
          projectId: currentProj || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        playBeepError();
        setErrorMsg(data.error || 'Lỗi xuất kho tự động');
        setProcessing(false);
        return;
      }

      // Success
      playBeepSuccess();
      const historyItem: PickedHistoryItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        item: data.item,
        deductedAmount: data.deductedAmount,
        transactionId: data.transactionId,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        note: currentNote || undefined,
        undone: false,
      };

      setLastPicked(historyItem);
      setSessionHistory((prev) => [historyItem, ...prev]);
      setErrorMsg(null);
    } catch (err: any) {
      playBeepError();
      setErrorMsg('Không thể kết nối máy chủ để trừ kho');
    } finally {
      setProcessing(false);
    }
  };

  // Handle Scan result depending on current Action Mode
  const handleResult = async (decodedText: string) => {
    const cleanText = decodedText.trim();
    if (!cleanText) return;

    const currentMode = targetActionRef.current;

    // In Auto-Deduct Mode: continuous scanning with debounce
    if (currentMode === 'deduct') {
      const now = Date.now();
      if (
        lastScannedRef.current &&
        lastScannedRef.current.code === cleanText &&
        now - lastScannedRef.current.time < 1500
      ) {
        return; // Ignore duplicate immediate frame
      }
      lastScannedRef.current = { code: cleanText, time: now };
      await executeAutoDeduct(cleanText);
      return;
    }

    // In Lookup Mode: Stop camera and navigate to target page
    if (isHandlingNavRef.current) return;
    isHandlingNavRef.current = true;

    setProcessing(true);

    // Completely stop camera and hardware streams before navigating
    await stopScanner();
    stopNfcScan();

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

      const finalPath = targetPath || `/search?q=${encodeURIComponent(cleanText)}`;
      const targetNorm = normalizeUrlPath(finalPath);
      // Avoid redundant navigation if already on this exact page
      if (currentNorm !== targetNorm) {
        router.push(finalPath);
      }
    } catch {
      setErrorMsg('Không thể tra cứu mã này');
      setProcessing(false);
      isHandlingNavRef.current = false;
    }
  };

  const handleResultRef = useRef(handleResult);
  handleResultRef.current = handleResult;

  // Undo accidental deduction
  const handleUndoDeduct = async (txId: string, historyId: string) => {
    if (undoingTxId) return;
    setUndoingTxId(txId);

    try {
      const res = await fetch('/api/scanner/quick-deduct/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: txId }),
      });

      const data = await res.json();
      if (res.ok) {
        playBeepSuccess();
        setSessionHistory((prev) =>
          prev.map((h) => (h.id === historyId ? { ...h, undone: true } : h))
        );
        if (lastPicked?.id === historyId) {
          setLastPicked((prev) => (prev ? { ...prev, undone: true } : null));
        }
      } else {
        setErrorMsg(data.error || 'Lỗi hoàn tác xuất kho');
      }
    } catch {
      setErrorMsg('Không thể kết nối máy chủ để hoàn tác');
    } finally {
      setUndoingTxId(null);
    }
  };

  const startScanner = useCallback(async () => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    shouldStopRef.current = false;
    isHandlingNavRef.current = false;
    setErrorMsg(null);

    // Stop previous instance cleanly
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
        qrbox: { width: 260, height: 260 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => handleResultRef.current(decodedText),
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
        'Không thể mở camera. Vui lòng cấp quyền camera trong trình duyệt hoặc chọn ảnh từ máy.'
      );
      setIsScanning(false);
    } finally {
      isStartingRef.current = false;
    }
  }, [stopScanner, readerElementId]);

  const startNfcScan = useCallback(async () => {
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
          setNfcSuccessMsg(`✓ Đã đọc thẻ: ${textFound}`);
          handleResultRef.current(textFound);
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
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    setErrorMsg(null);

    try {
      await stopScanner();
      const { scanBarcodeFromImage } = await import('@/lib/barcodeScanner');
      const result = await scanBarcodeFromImage(file);
      await handleResult(result);
    } catch (err: any) {
      setErrorMsg(
        err?.message || 'Không tìm thấy mã vạch hoặc mã QR trong ảnh này. Hãy thử chụp gần và rõ hơn.'
      );
      setProcessing(false);
    }
  };

  const handleMediumChange = async (medium: 'camera' | 'nfc') => {
    if (medium === scanMedium) return;
    if (medium === 'nfc') {
      await stopScanner();
    } else {
      stopNfcScan();
    }
    setScanMedium(medium);
  };

  const handleReopenCamera = async () => {
    isHandlingNavRef.current = false;
    await stopScanner();
    await startScanner();
  };

  useEffect(() => {
    if (scanMedium === 'camera') {
      stopNfcScan();
      shouldStopRef.current = false;
      isHandlingNavRef.current = false;
      const t = setTimeout(() => {
        startScanner();
      }, 150);

      return () => {
        shouldStopRef.current = true;
        clearTimeout(t);
        stopScanner();
        forceStopMediaTracks(readerElementId);
        stopAllGlobalMediaStreams();
      };
    } else {
      shouldStopRef.current = true;
      stopScanner();
      startNfcScan();
      return () => {
        stopNfcScan();
        stopAllGlobalMediaStreams();
      };
    }
  }, [scanMedium, startScanner, stopScanner, startNfcScan, stopNfcScan, readerElementId]);

  const totalSessionQuantity = sessionHistory.filter((h) => !h.undone).reduce((sum, h) => sum + h.deductedAmount, 0);
  const totalSessionCount = sessionHistory.filter((h) => !h.undone).length;

  return (
    <div className="max-w-md mx-auto space-y-4 pb-12">
      <Navbar
        title={targetAction === 'deduct' ? 'Quét mã lấy hàng (Trừ kho)' : 'Quét & Tra cứu'}
        showBack
      />

      {/* Target Action Mode Switcher (Lookup vs Auto-Deduct) */}
      <div className="p-1.5 bg-slate-100 dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-xs space-y-1">
        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => setTargetAction('lookup')}
            className={`py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              targetAction === 'lookup'
                ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Tra cứu thông tin</span>
          </button>

          <button
            type="button"
            onClick={() => setTargetAction('deduct')}
            className={`py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              targetAction === 'deduct'
                ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <MinusCircle className="w-3.5 h-3.5 animate-pulse" />
            <span>⚡ Lấy hàng tự trừ kho</span>
          </button>
        </div>

        {/* Action Description */}
        <p className="text-[11px] text-center text-slate-500 dark:text-slate-400 pt-0.5">
          {targetAction === 'deduct'
            ? '⚡ Chế độ lấy hàng: Quét mã là tự động trừ số lượng khỏi kho ngay tức thì'
            : '🔍 Chế độ tra cứu: Quét để xem vị trí, số lượng và chi tiết linh kiện'}
        </p>
      </div>

      {/* Deduct Settings Panel when Auto-Deduct is Active */}
      {targetAction === 'deduct' && (
        <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 shadow-xs space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Số lượng trừ mỗi lần quét:</span>
            </span>

            <button
              type="button"
              onClick={() => setShowAdvancedDeduct(!showAdvancedDeduct)}
              className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-0.5"
            >
              <span>{showAdvancedDeduct ? 'Ẩn ghi chú' : 'Thêm ghi chú / Dự án'}</span>
              {showAdvancedDeduct ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Quantity Preset Badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[1, 2, 5, 10].map((qty) => (
              <button
                key={qty}
                type="button"
                onClick={() => {
                  setDeductAmount(qty);
                  setShowCustomAmount(false);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  !showCustomAmount && deductAmount === qty
                    ? 'bg-amber-600 text-white shadow-xs scale-105'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100/60'
                }`}
              >
                -{qty}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setShowCustomAmount(true)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                showCustomAmount
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100/60'
              }`}
            >
              Tùy chỉnh
            </button>

            {showCustomAmount && (
              <div className="flex items-center gap-1 w-24">
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  placeholder="SL..."
                  value={customAmountStr}
                  onChange={(e) => setCustomAmountStr(e.target.value)}
                  className="w-full px-2.5 py-1 text-xs font-bold bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* Advanced Deduct Options: Note & Project selection */}
          {showAdvancedDeduct && (
            <div className="space-y-2 pt-2 border-t border-amber-200/60 dark:border-amber-800/50 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Lý do / Ghi chú xuất kho:
                </label>
                <input
                  type="text"
                  placeholder="VD: Lắp ráp mạch điều khiển, thay thế linh kiện..."
                  value={deductNote}
                  onChange={(e) => setDeductNote(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
                />
              </div>

              {projects.length > 0 && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Gắn vào dự án BOM (tùy chọn):
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
                  >
                    <option value="">-- Không gắn dự án --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Hardware Medium Switcher (Camera vs NFC) */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
        <button
          type="button"
          onClick={() => handleMediumChange('camera')}
          className={`py-2.5 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
            scanMedium === 'camera'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Camera className="w-4 h-4 text-sky-600" />
          <span>Camera Barcode / QR</span>
        </button>

        <button
          type="button"
          onClick={() => handleMediumChange('nfc')}
          className={`py-2.5 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
            scanMedium === 'nfc'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Radio className="w-4 h-4 animate-pulse" />
          <span>Chạm thẻ NFC</span>
        </button>
      </div>

      {/* Main Scanner Container */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl flex flex-col">
        {scanMedium === 'camera' ? (
          <>
            {/* Camera Viewport */}
            <div className="p-4 bg-slate-950 flex flex-col items-center justify-center relative min-h-[300px]">
              <div id={readerElementId} className="w-full max-w-[280px] rounded-2xl overflow-hidden bg-black" />

              {/* Action Mode Indicator Badge over Camera */}
              <div className="absolute top-3 left-3 z-10">
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-md flex items-center gap-1 ${
                    targetAction === 'deduct'
                      ? 'bg-amber-500/90 text-white'
                      : 'bg-sky-500/90 text-white'
                  }`}
                >
                  {targetAction === 'deduct' ? (
                    <>
                      <MinusCircle className="w-3 h-3" />
                      <span>Đang lấy hàng (-{showCustomAmount && customAmountStr ? customAmountStr : deductAmount})</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-3 h-3" />
                      <span>Đang tra cứu</span>
                    </>
                  )}
                </span>
              </div>

              {processing && (
                <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-2 text-white z-20">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
                  <p className="text-xs font-semibold">
                    {targetAction === 'deduct' ? 'Đang tự động trừ kho...' : 'Đang nhận diện và tìm kiếm...'}
                  </p>
                </div>
              )}
            </div>

            {/* Camera Controls & File Upload */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 text-center space-y-2.5">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {targetAction === 'deduct'
                  ? 'Hướng camera vào mã vạch linh kiện để tự động trừ kho liên tục.'
                  : 'Hướng camera vào mã vạch sản phẩm (EAN/UPC) hoặc tem QR dán trên hộp/ngăn.'}
              </p>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2 text-left animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex items-center justify-center gap-3 pt-0.5">
                <label className="cursor-pointer flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm transition-colors">
                  <ImageIcon className="w-4 h-4 text-sky-600" />
                  <span>Tải ảnh mã</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                </label>

                <button
                  type="button"
                  onClick={handleReopenCamera}
                  className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
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
                {targetAction === 'deduct'
                  ? 'Chạm thẻ NFC để tự động xuất và trừ số lượng món đồ ngay lập tức.'
                  : 'Đưa điện thoại lại gần thẻ NFC / tem dán trên tủ hoặc hộp linh kiện để tra cứu tức thì.'}
              </p>
            </div>

            {processing && (
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
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs text-left space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Lưu ý</span>
                </div>
                <p className="text-[11px] leading-relaxed">{errorMsg}</p>
              </div>
            )}

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

      {/* Live Last Picked Card with Quick Undo */}
      {lastPicked && (
        <div
          className={`p-4 rounded-3xl border shadow-md flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200 ${
            lastPicked.undone
              ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 opacity-60'
              : 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            {lastPicked.item.mainImage ? (
              <img
                src={lastPicked.item.mainImage}
                alt={lastPicked.item.name}
                className="w-12 h-12 rounded-xl object-cover shrink-0 border border-emerald-200 dark:border-emerald-700"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                <Package className="w-6 h-6" />
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-black text-sm truncate block">{lastPicked.item.name}</span>
                {lastPicked.undone ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                    Đã hoàn tác
                  </span>
                ) : (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-600 text-white font-black">
                    -{lastPicked.deductedAmount} {lastPicked.item.unit}
                  </span>
                )}
              </div>

              <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                <span>
                  Kho còn: <strong className="font-bold text-slate-900 dark:text-white">{lastPicked.item.newQuantity} {lastPicked.item.unit}</strong>
                </span>
                {lastPicked.item.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-sky-600" />
                    <span>{lastPicked.item.location.name}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {!lastPicked.undone && (
            <button
              type="button"
              disabled={undoingTxId === lastPicked.transactionId}
              onClick={() => handleUndoDeduct(lastPicked.transactionId, lastPicked.id)}
              className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-bold shrink-0 flex items-center gap-1 shadow-xs active:scale-95 transition-all"
              title="Nhấn để hoàn tác nếu quét nhầm"
            >
              {undoingTxId === lastPicked.transactionId ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Undo2 className="w-3.5 h-3.5 text-rose-500" />
              )}
              <span>Hoàn tác</span>
            </button>
          )}
        </div>
      )}

      {/* Session History Log of Picked Items */}
      {sessionHistory.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                Đã lấy trong đợt này ({totalSessionCount} món &bull; {totalSessionQuantity} cái)
              </h3>
            </div>

            <button
              type="button"
              onClick={() => {
                setSessionHistory([]);
                setLastPicked(null);
              }}
              className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors"
              title="Xóa danh sách đợt này"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 space-y-1">
            {sessionHistory.map((item) => (
              <div
                key={item.id}
                className={`py-2 flex items-center justify-between gap-2 text-xs ${
                  item.undone ? 'opacity-40 line-through' : ''
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white truncate">
                      {item.item.name}
                    </span>
                    <span className="text-[11px] font-mono text-rose-600 font-bold shrink-0">
                      -{item.deductedAmount} {item.item.unit}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span>{item.timestamp}</span>
                    {item.item.location && <span>&bull; Vị trí: {item.item.location.name}</span>}
                    {item.note && <span>&bull; {item.note}</span>}
                  </div>
                </div>

                {!item.undone && (
                  <button
                    type="button"
                    disabled={undoingTxId === item.transactionId}
                    onClick={() => handleUndoDeduct(item.transactionId, item.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Hoàn tác món này"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
            <Link
              href="/transactions"
              className="font-bold text-sky-600 hover:underline flex items-center gap-1"
            >
              <span>Xem toàn bộ lịch sử xuất nhập kho →</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ScannerPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-slate-400">Đang tải máy quét...</div>}>
      <ScannerContent />
    </Suspense>
  );
}
