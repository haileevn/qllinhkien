'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Radio,
  Check,
  Copy,
  AlertCircle,
  Loader2,
  Smartphone,
  ExternalLink,
  Sparkles,
  Info,
  Layers,
} from 'lucide-react';
import { isNfcSupported, writeNfcTag } from '@/lib/nfc';

interface NfcModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  code?: string;
  urlPath: string; // e.g. /items/123 or /locations/456
}

export default function NfcModal({
  isOpen,
  onClose,
  title,
  subtitle,
  code,
  urlPath,
}: NfcModalProps) {
  const [supported, setSupported] = useState(false);
  const [status, setStatus] = useState<'idle' | 'writing' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fullUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${urlPath}`
      : `https://qllk.h2t.vn${urlPath}`;

  useEffect(() => {
    setSupported(isNfcSupported());
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleStartWrite = async () => {
    setStatus('writing');
    setErrorMsg(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await writeNfcTag(fullUrl, code || title, controller.signal);
      setStatus('success');
      // Vibrate if supported
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setStatus('idle');
        return;
      }
      setStatus('error');
      setErrorMsg(
        err?.message ||
          'Không thể ghi thẻ. Hãy kiểm tra xem NFC trên điện thoại đã bật chưa và áp thẻ sát lưng máy.'
      );
    }
  };

  const handleCancelWrite = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStatus('idle');
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shadow-inner">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Ghi thẻ NFC / Tem thông minh
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[240px]">
                {title}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              handleCancelWrite();
              onClose();
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-4">
          {/* Target Item Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Nội dung sẽ ghi vào thẻ
            </div>
            <div className="font-bold text-slate-900 dark:text-white text-sm">
              {title}
            </div>
            {subtitle && (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {subtitle}
              </div>
            )}
            <div className="text-xs font-mono text-sky-600 dark:text-sky-400 truncate pt-1">
              {fullUrl}
            </div>
          </div>

          {/* Web NFC Write Action or Writing State */}
          {status === 'writing' ? (
            <div className="p-6 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-center space-y-3 animate-pulse">
              <div className="w-14 h-14 rounded-full bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/30">
                <Radio className="w-7 h-7 animate-spin" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                  Đang sẵn sàng ghi...
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  Hãy <strong>áp thẻ NFC/MFC vào lưng điện thoại</strong> và giữ yên 1-2 giây.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCancelWrite}
                className="px-4 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 shadow-xs"
              >
                Hủy ghi
              </button>
            </div>
          ) : status === 'success' ? (
            <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-600/30">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <h4 className="font-bold text-emerald-900 dark:text-emerald-200 text-sm">
                Ghi thẻ NFC thành công!
              </h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                Bây giờ bạn có thể dán thẻ này lên hộp/tủ. Khi bất kỳ ai chạm điện thoại vào, ứng dụng sẽ tự động mở trang này.
              </p>
              <div className="pt-2 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={handleStartWrite}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors"
                >
                  Ghi thêm thẻ khác
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700"
                >
                  Hoàn tất
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {supported ? (
                <button
                  type="button"
                  onClick={handleStartWrite}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 active:scale-98 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all"
                >
                  <Radio className="w-4 h-4" />
                  <span>Chạm để ghi vào thẻ NFC ngay</span>
                </button>
              ) : (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 text-xs text-amber-800 dark:text-amber-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-amber-600" />
                    <span>Trình duyệt hiện tại chưa bật Web NFC trực tiếp</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
                    Chrome trên Android hỗ trợ ghi trực tiếp. Với iPhone hoặc thiết bị khác, bạn có thể sao chép link bên dưới và dùng ứng dụng <strong>NFC Tools</strong> (miễn phí) để ghi vào thẻ cực kỳ tiện lợi!
                  </p>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          )}

          {/* Quick Copy Link Bar */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={fullUrl}
              className="flex-1 px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-700 dark:text-slate-300 truncate"
            />
            <button
              type="button"
              onClick={handleCopyUrl}
              className="px-3.5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">Đã chép</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sao chép</span>
                </>
              )}
            </button>
          </div>

          {/* Guide Toggle */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>{showGuide ? 'Ẩn hướng dẫn sử dụng thẻ NFC' : 'Cách điện thoại đọc thẻ khi dán lên tủ / hộp'}</span>
            </button>

            {showGuide && (
              <div className="mt-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-2.5 animate-in fade-in">
                <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Tính năng Chạm là tra cứu (Background NFC):</span>
                </div>
                <ul className="space-y-1.5 list-disc list-inside text-[11px] leading-relaxed">
                  <li>
                    <strong>iPhone (từ iPhone Xs/XR trở lên) &amp; Android</strong>: Chỉ cần mở sáng màn hình điện thoại rồi chạm vào thẻ NFC dán trên tủ/khay → thông báo web app sẽ tự hiện lên để mở thẳng vật tư!
                  </li>
                  <li>
                    <strong>Ghi thẻ bằng app NFC Tools</strong>: Tải app <em>NFC Tools</em> trên App Store hoặc Google Play → Chọn <strong>Write</strong> → <strong>Add a record</strong> → <strong>URL / URI</strong> → Dán link vừa sao chép ở trên → Bấm <strong>Write</strong> và chạm thẻ.
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
