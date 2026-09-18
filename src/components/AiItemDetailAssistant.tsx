'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  Loader2,
  Check,
  Cpu,
  Zap,
  BookOpen,
  HelpCircle,
  ExternalLink,
  Layers,
  Save,
  AlertCircle,
  Key,
  Search,
  Copy,
} from 'lucide-react';
import { ComponentAnalysisResult } from '@/lib/gemini';

interface AiItemDetailAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    id: string;
    name: string;
    brand?: string | null;
    model?: string | null;
    sku?: string | null;
    notes?: string | null;
    mainImage?: string | null;
    category?: { name: string } | null;
  };
  onNotesUpdated?: (newNotes: string) => void;
  canEdit?: boolean;
}

export default function AiItemDetailAssistant({
  isOpen,
  onClose,
  item,
  onNotesUpdated,
  canEdit = false,
}: AiItemDetailAssistantProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'specs' | 'pinout' | 'applications'>('overview');
  const [loading, setLoading] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ComponentAnalysisResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSaveSuccess(false);
      if (!result) {
        handleLookup();
      }
    }
  }, [isOpen, item.id]);

  const handleLookup = async () => {
    setLoading(true);
    setError(null);

    const query = [item.name, item.brand, item.model].filter(Boolean).join(' ');

    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: query || item.name,
          imageUrl: item.mainImage || undefined,
          existingNotes: item.notes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi tra cứu thông tin linh kiện');
      }

      setResult(data.result);
    } catch (err: any) {
      setError(err?.message || 'Không thể tra cứu thông tin');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToNotes = async () => {
    if (!result?.notes) return;

    setSavingNotes(true);
    setError(null);

    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: result.notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi cập nhật ghi chú');
      }

      setSaveSuccess(true);
      if (onNotesUpdated) {
        onNotesUpdated(result.notes);
      }
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err?.message || 'Không thể lưu vào ghi chú');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleCopyNotes = () => {
    if (!result?.notes) return;
    navigator.clipboard.writeText(result.notes);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-sky-500/30">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-base">
                Trợ lý Kỹ thuật AI &bull; {item.name}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Tra cứu datasheet, giải thích công dụng, sơ đồ chân & thông số kỹ thuật chi tiết
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        {result && !loading && (
          <div className="px-4 pt-3 pb-1 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50">
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                  activeTab === 'overview'
                    ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="truncate">Tổng quan</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('specs')}
                className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                  activeTab === 'specs'
                    ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span className="truncate">Thông số</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('pinout')}
                className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                  activeTab === 'pinout'
                    ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span className="truncate">Sơ đồ chân</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('applications')}
                className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                  activeTab === 'applications'
                    ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="truncate">Ứng dụng</span>
              </button>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-lg animate-pulse">
                  <Cpu className="w-8 h-8 animate-spin" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="font-bold text-slate-900 dark:text-white text-sm">
                  Gemini AI đang tra cứu thông số kỹ thuật...
                </div>
                <p className="text-xs text-slate-400 max-w-sm">
                  Phân tích datasheet chính hãng, thông số điện áp, dòng điện và sơ đồ chân
                </p>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <div className="font-bold">Lỗi tra cứu</div>
                <p className="text-[11px] leading-relaxed">{error}</p>
                <button
                  type="button"
                  onClick={handleLookup}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-[11px]"
                >
                  Thử lại
                </button>
              </div>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Đã lưu thông số kỹ thuật vào Ghi chú của vật tư thành công!</span>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-4">
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-slate-800/80 dark:to-indigo-950/30 border border-sky-200 dark:border-sky-800/50 space-y-2">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-sky-700 dark:text-sky-300">
                      <Cpu className="w-3.5 h-3.5" />
                      <span>{result.name}</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                      {result.summary}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {result.brand && (
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400 block uppercase font-semibold">Hãng</span>
                        <strong className="text-slate-800 dark:text-slate-200">{result.brand}</strong>
                      </div>
                    )}
                    {result.model && (
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400 block uppercase font-semibold">Part Number</span>
                        <strong className="font-mono text-slate-800 dark:text-slate-200">{result.model}</strong>
                      </div>
                    )}
                    {result.suggestedCategoryName && (
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400 block uppercase font-semibold">Phân loại</span>
                        <strong className="text-slate-800 dark:text-slate-200">{result.suggestedCategoryName}</strong>
                      </div>
                    )}
                  </div>

                  {/* Full Markdown Notes Preview */}
                  <div className="space-y-1.5 pt-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Tài liệu kỹ thuật tổng hợp:
                    </span>
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed font-mono max-h-60 overflow-y-auto">
                      {result.notes}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SPECS */}
              {activeTab === 'specs' && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Thông số điện áp, dòng điện & vật lý:
                  </span>
                  {result.specs && Object.keys(result.specs).length > 0 ? (
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {Object.entries(result.specs).map(([key, val]) => (
                        <div key={key} className="p-3 flex items-center justify-between bg-white dark:bg-slate-900">
                          <span className="text-slate-500 font-semibold">{key}</span>
                          <span className="font-bold text-slate-900 dark:text-white text-right font-mono">{val}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">Không có bảng thông số chi tiết riêng.</p>
                  )}
                </div>
              )}

              {/* TAB 3: PINOUT */}
              {activeTab === 'pinout' && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                    <span className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-500" />
                      Sơ đồ chân & Kết nối dây:
                    </span>
                    <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed font-mono">
                      {result.pinout || 'Không có sơ đồ chân đặc biệt cho loại vật tư này.'}
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 4: APPLICATIONS */}
              {activeTab === 'applications' && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Ứng dụng điển hình trong mạch điện tử:
                  </span>
                  {result.applications && result.applications.length > 0 ? (
                    <div className="space-y-2">
                      {result.applications.map((app, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2"
                        >
                          <span className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-400 flex items-center justify-center text-[10px] shrink-0">
                            {i + 1}
                          </span>
                          <span>{app}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">Chưa có danh sách ứng dụng.</p>
                  )}

                  {result.datasheetKeywords && (
                    <div className="pt-2">
                      <a
                        href={`https://www.google.com/search?q=${encodeURIComponent(result.datasheetKeywords)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 text-xs font-bold flex items-center justify-between hover:underline"
                      >
                        <span>🔍 Tìm Datasheet PDF trên Google ({result.datasheetKeywords})</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          >
            Đóng
          </button>

          <div className="flex items-center gap-2">
            {result && (
              <button
                type="button"
                onClick={handleCopyNotes}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Đã sao chép' : 'Sao chép ghi chú'}</span>
              </button>
            )}

            {result && canEdit && (
              <button
                type="button"
                disabled={savingNotes}
                onClick={handleSaveToNotes}
                className="px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-sky-600/30 flex items-center gap-1.5 transition-all active:scale-95"
              >
                {savingNotes ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Lưu vào Ghi chú vật tư</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
