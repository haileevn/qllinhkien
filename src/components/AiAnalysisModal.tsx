'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  Loader2,
  Check,
  Cpu,
  Tag as TagIcon,
  Layers,
  FileText,
  AlertCircle,
  ExternalLink,
  Key,
  HelpCircle,
  Zap,
  Image as ImageIcon,
  Type,
  RefreshCw,
  Search,
} from 'lucide-react';
import { ComponentAnalysisResult } from '@/lib/gemini';

interface AiAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTitle?: string;
  currentImage?: string;
  existingNotes?: string;
  categories?: any[];
  onApply: (data: {
    name?: string;
    brand?: string;
    model?: string;
    sku?: string;
    categoryId?: string;
    unit?: string;
    notes?: string;
    tags?: string[];
  }) => void;
}

export default function AiAnalysisModal({
  isOpen,
  onClose,
  currentTitle = '',
  currentImage,
  existingNotes = '',
  categories = [],
  onApply,
}: AiAnalysisModalProps) {
  const [inputTitle, setInputTitle] = useState(currentTitle);
  const [selectedImage, setSelectedImage] = useState<string | undefined>(currentImage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ComponentAnalysisResult | null>(null);

  // API Key config state if needed
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [customKey, setCustomKey] = useState('');
  const [showKeySetup, setShowKeySetup] = useState(false);
  const [savingKey, setSavingKey] = useState(false);

  // Selective field application checkboxes
  const [applyFields, setApplyFields] = useState({
    name: true,
    brand: true,
    model: true,
    sku: true,
    category: true,
    unit: true,
    notes: true,
    tags: true,
  });

  useEffect(() => {
    if (isOpen) {
      setInputTitle(currentTitle);
      setSelectedImage(currentImage);
      setError(null);
      checkConfig();

      // If we have a title or image and no result yet, auto-trigger analysis
      if ((currentTitle.trim() || currentImage) && !result) {
        handleAnalyze(currentTitle.trim(), currentImage);
      }
    }
  }, [isOpen, currentTitle, currentImage]);

  const checkConfig = async () => {
    try {
      const res = await fetch('/api/ai/settings');
      const data = await res.json();
      if (res.ok) {
        setIsConfigured(data.isConfigured);
        if (!data.isConfigured) {
          setShowKeySetup(true);
        }
      }
    } catch {
      setIsConfigured(false);
    }
  };

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customKey.trim()) return;

    setSavingKey(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: customKey.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi lưu API Key');
      }

      setIsConfigured(true);
      setShowKeySetup(false);
      // Immediately run analysis
      handleAnalyze(inputTitle, selectedImage);
    } catch (err: any) {
      setError(err?.message || 'Không thể lưu API Key');
    } finally {
      setSavingKey(false);
    }
  };

  const handleAnalyze = async (titleToUse: string, imageToUse?: string) => {
    const queryTitle = titleToUse.trim();
    if (!queryTitle && !imageToUse) {
      setError('Vui lòng nhập tên/tiêu đề hoặc chọn ảnh để AI phân tích');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: queryTitle || undefined,
          imageUrl: imageToUse || undefined,
          existingNotes: existingNotes || undefined,
          customApiKey: customKey.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error && data.error.includes('Chưa cấu hình Google Gemini API Key')) {
          setIsConfigured(false);
          setShowKeySetup(true);
        }
        throw new Error(data.error || 'Lỗi phân tích từ AI');
      }

      setResult(data.result);
    } catch (err: any) {
      setError(err?.message || 'Không thể kết nối đến máy chủ AI');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!result) return;

    const dataToApply: any = {};

    if (applyFields.name && result.name) {
      dataToApply.name = result.name;
    }
    if (applyFields.brand && result.brand) {
      dataToApply.brand = result.brand;
    }
    if (applyFields.model && result.model) {
      dataToApply.model = result.model;
    }
    if (applyFields.sku && result.sku) {
      dataToApply.sku = result.sku;
    }
    if (applyFields.unit && result.unit) {
      dataToApply.unit = result.unit;
    }
    if (applyFields.tags && result.tags && result.tags.length > 0) {
      dataToApply.tags = result.tags;
    }
    if (applyFields.notes && result.notes) {
      dataToApply.notes = result.notes;
    }

    if (applyFields.category) {
      // Find matching category by ID or name
      if (result.suggestedCategoryId) {
        const found = categories.find((c) => c.id === result.suggestedCategoryId);
        if (found) dataToApply.categoryId = found.id;
      } else if (result.suggestedCategoryName) {
        const nameLower = result.suggestedCategoryName.toLowerCase();
        const found = categories.find(
          (c) => c.name.toLowerCase().includes(nameLower) || nameLower.includes(c.name.toLowerCase())
        );
        if (found) dataToApply.categoryId = found.id;
      }
    }

    onApply(dataToApply);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-sky-500/30">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <span>Google Gemini AI &bull; Trích xuất thông số</span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Tự động nhận diện linh kiện từ ảnh/tiêu đề & điền thông số kỹ thuật chuẩn
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowKeySetup(!showKeySetup)}
              className={`p-2 rounded-xl transition-colors ${
                showKeySetup
                  ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-600'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Cài đặt API Key"
            >
              <Key className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* API Key Setup Banner if not configured or toggled */}
          {showKeySetup && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-xs space-y-3">
              <div className="flex items-start gap-2.5">
                <Key className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1">
                  <div className="font-bold text-amber-900 dark:text-amber-200">
                    Cấu hình Google Gemini API Key
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                    Hệ thống sử dụng model <strong>Gemini 2.5 Flash</strong> siêu nhanh và miễn phí. Bạn có thể lấy API Key miễn phí trong 1 phút tại Google AI Studio.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveApiKey} className="space-y-2 pt-1">
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="Dán mã AIzaSy... vào đây"
                    value={customKey}
                    onChange={(e) => setCustomKey(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-slate-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={savingKey || !customKey.trim()}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 shrink-0 transition-colors"
                  >
                    {savingKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Lưu & Kích hoạt</span>
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>Lấy API Key miễn phí tại Google AI Studio</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  {isConfigured && (
                    <button
                      type="button"
                      onClick={() => setShowKeySetup(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      Đóng
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* Input Prompt Section */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Nhập tên / mã linh kiện (VD: ESP32-WROOM-32D, DHT22, IC 74HC595...)"
                  value={inputTitle}
                  onChange={(e) => setInputTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAnalyze(inputTitle, selectedImage)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="button"
                onClick={() => handleAnalyze(inputTitle, selectedImage)}
                disabled={loading || (!inputTitle.trim() && !selectedImage)}
                className="px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-sky-600/20 flex items-center justify-center gap-1.5 shrink-0 transition-all active:scale-95"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{result ? 'Phân tích lại' : '✨ Bắt đầu phân tích'}</span>
              </button>
            </div>

            {/* Image Preview indicator if image exists */}
            {selectedImage && (
              <div className="flex items-center gap-2.5 pt-1 text-xs text-slate-600 dark:text-slate-300">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedImage}
                  alt="Component"
                  className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                />
                <div className="text-[11px] leading-tight">
                  <span className="font-semibold text-sky-600 flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5" />
                    Đang kết hợp phân tích OCR từ ảnh
                  </span>
                  <span className="text-slate-400 block mt-0.5">
                    AI sẽ đọc ký hiệu in trên bề mặt IC / mạch để trích xuất thông số
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Loading Animation */}
          {loading && (
            <div className="py-10 flex flex-col items-center justify-center gap-3 text-center">
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
                  Gemini AI đang tra cứu datasheet & trích xuất thông số...
                </div>
                <p className="text-xs text-slate-400 max-w-sm">
                  Đang phân tích model, điện áp hoạt động, kiểu đóng gói, sơ đồ chân và tạo tài liệu kỹ thuật
                </p>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && !loading && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold">Lỗi phân tích</div>
                <p className="text-[11px] leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {/* Extracted Result View */}
          {result && !loading && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
              {/* Summary Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-slate-800/80 dark:to-indigo-950/30 border border-sky-200/80 dark:border-sky-800/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    Đã nhận diện thành công
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-200/70 dark:bg-sky-900 text-sky-800 dark:text-sky-200 font-bold">
                    Gemini 2.5 Flash
                  </span>
                </div>

                <h3 className="font-black text-slate-900 dark:text-white text-base">
                  {result.name}
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {result.summary}
                </p>
              </div>

              {/* Field checklist & extracted values */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Chọn các trường thông tin muốn áp dụng vào form:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const allChecked = Object.values(applyFields).every(Boolean);
                      setApplyFields({
                        name: !allChecked,
                        brand: !allChecked,
                        model: !allChecked,
                        sku: !allChecked,
                        category: !allChecked,
                        unit: !allChecked,
                        notes: !allChecked,
                        tags: !allChecked,
                      });
                    }}
                    className="text-[11px] font-semibold text-sky-600 hover:underline"
                  >
                    {Object.values(applyFields).every(Boolean) ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {/* Brand */}
                  {result.brand && (
                    <label className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/60 flex items-center justify-between cursor-pointer hover:border-sky-400">
                      <div className="min-w-0 pr-2">
                        <span className="text-[10px] font-semibold text-slate-400 block uppercase">Hãng sản xuất</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">{result.brand}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={applyFields.brand}
                        onChange={(e) => setApplyFields({ ...applyFields, brand: e.target.checked })}
                        className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                      />
                    </label>
                  )}

                  {/* Model / Part Number */}
                  {result.model && (
                    <label className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/60 flex items-center justify-between cursor-pointer hover:border-sky-400">
                      <div className="min-w-0 pr-2">
                        <span className="text-[10px] font-semibold text-slate-400 block uppercase">Mã hiệu / Model</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate block">{result.model}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={applyFields.model}
                        onChange={(e) => setApplyFields({ ...applyFields, model: e.target.checked })}
                        className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                      />
                    </label>
                  )}

                  {/* SKU */}
                  {result.sku && (
                    <label className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/60 flex items-center justify-between cursor-pointer hover:border-sky-400">
                      <div className="min-w-0 pr-2">
                        <span className="text-[10px] font-semibold text-slate-400 block uppercase">Mã SKU đề xuất</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate block">{result.sku}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={applyFields.sku}
                        onChange={(e) => setApplyFields({ ...applyFields, sku: e.target.checked })}
                        className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                      />
                    </label>
                  )}

                  {/* Category */}
                  {result.suggestedCategoryName && (
                    <label className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/60 flex items-center justify-between cursor-pointer hover:border-sky-400">
                      <div className="min-w-0 pr-2">
                        <span className="text-[10px] font-semibold text-slate-400 block uppercase">Danh mục gợi ý</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">{result.suggestedCategoryName}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={applyFields.category}
                        onChange={(e) => setApplyFields({ ...applyFields, category: e.target.checked })}
                        className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                      />
                    </label>
                  )}

                  {/* Unit */}
                  {result.unit && (
                    <label className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/60 flex items-center justify-between cursor-pointer hover:border-sky-400">
                      <div className="min-w-0 pr-2">
                        <span className="text-[10px] font-semibold text-slate-400 block uppercase">Đơn vị tính</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">{result.unit}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={applyFields.unit}
                        onChange={(e) => setApplyFields({ ...applyFields, unit: e.target.checked })}
                        className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Specs Table Preview */}
              {result.specs && Object.keys(result.specs).length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block px-1">
                    Bảng thông số kỹ thuật trích xuất:
                  </span>
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs divide-y divide-slate-100 dark:divide-slate-800">
                    {Object.entries(result.specs).map(([k, v]) => (
                      <div key={k} className="p-2.5 flex items-center justify-between bg-white dark:bg-slate-900">
                        <span className="text-slate-500 font-semibold">{k}</span>
                        <span className="font-bold text-slate-900 dark:text-white text-right">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pinout info */}
              {result.pinout && (
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                  <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    Sơ đồ chân & Kết nối (Pinout):
                  </span>
                  <p className="text-slate-600 dark:text-slate-400 whitespace-pre-line leading-relaxed">
                    {result.pinout}
                  </p>
                </div>
              )}

              {/* Notes & Documentation Preview */}
              {result.notes && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Ghi chú kỹ thuật chuẩn hóa (sẽ điền vào ô Ghi chú):
                    </span>
                    <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={applyFields.notes}
                        onChange={(e) => setApplyFields({ ...applyFields, notes: e.target.checked })}
                        className="w-3.5 h-3.5 rounded text-sky-600"
                      />
                      <span>Áp dụng vào Ghi chú</span>
                    </label>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xs max-h-48 overflow-y-auto font-mono text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 whitespace-pre-line leading-relaxed">
                    {result.notes}
                  </div>
                </div>
              )}

              {/* Tags */}
              {result.tags && result.tags.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Thẻ phân loại gợi ý:
                    </span>
                    <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={applyFields.tags}
                        onChange={(e) => setApplyFields({ ...applyFields, tags: e.target.checked })}
                        className="w-3.5 h-3.5 rounded text-sky-600"
                      />
                      <span>Thêm vào Thẻ</span>
                    </label>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {result.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 text-xs font-medium"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          >
            Đóng
          </button>

          {result && (
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-sky-600/30 flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Áp dụng vào biểu mẫu</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
