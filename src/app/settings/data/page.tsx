'use client';

import React, { useState } from 'react';
import {
  Database,
  Download,
  Upload,
  FileSpreadsheet,
  FileCode,
  AlertCircle,
  CheckCircle,
  Loader2,
  Eye,
  ArrowLeft,
} from 'lucide-react';
import Navbar from '@/components/Navbar';

export default function DataBackupPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dryRunResult, setDryRunResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setDryRunResult(null);
      setStatusMsg(null);
    }
  };

  const handleValidateDryRun = async () => {
    if (!file) {
      setStatusMsg({ type: 'error', text: 'Vui lòng chọn tệp để kiểm tra' });
      return;
    }

    setLoading(true);
    setStatusMsg(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('dryRun', 'true');

    try {
      const res = await fetch('/api/data/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi kiểm tra dữ liệu');
      }

      setDryRunResult(data);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Lỗi kiểm tra tệp' });
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!file) return;

    setImporting(true);
    setStatusMsg(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('dryRun', 'false');

    try {
      const res = await fetch('/api/data/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi nhập dữ liệu');
      }

      setStatusMsg({
        type: 'success',
        text: data.message || 'Nhập dữ liệu thành công!',
      });
      setDryRunResult(null);
      setFile(null);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Lỗi trong quá trình nhập dữ liệu' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Navbar title="Sao lưu & Phục hồi dữ liệu" showBack backHref="/settings" />

      {/* Export Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
          <Download className="w-5 h-5 text-sky-600" />
          <h2 className="font-bold text-slate-900 dark:text-white text-base">
            Xuất dữ liệu sao lưu (Export)
          </h2>
        </div>

        <p className="text-xs text-slate-500">
          Tải về toàn bộ danh sách vật tư, cây vị trí, danh mục và lịch sử biến động để lưu trữ hoặc chỉnh sửa trên Excel / Google Sheets.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* CSV Export Button */}
          <a
            href="/api/data/export?format=csv"
            download
            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-sky-600">
                Xuất tệp CSV (Excel)
              </div>
              <div className="text-[11px] text-slate-400">Dễ đọc & chỉnh sửa bảng tính</div>
            </div>
          </a>

          {/* Full JSON Backup Button */}
          <a
            href="/api/data/export?format=json"
            download
            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center font-bold">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-sky-600">
                Xuất JSON Backup đầy đủ
              </div>
              <div className="text-[11px] text-slate-400">Toàn bộ quan hệ & ảnh & lịch sử</div>
            </div>
          </a>
        </div>
      </div>

      {/* Import Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
          <Upload className="w-5 h-5 text-emerald-600" />
          <h2 className="font-bold text-slate-900 dark:text-white text-base">
            Nhập dữ liệu & Khôi phục (Import)
          </h2>
        </div>

        <p className="text-xs text-slate-500">
          Hệ thống sẽ kiểm tra và xác thực dữ liệu trước khi nhập để đảm bảo an toàn, không làm hỏng dữ liệu hiện tại.
        </p>

        {/* File Selector */}
        <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center space-y-3 bg-slate-50 dark:bg-slate-800/40">
          <input
            type="file"
            id="import-file"
            accept=".csv, .json"
            onChange={handleFileChange}
            className="hidden"
          />
          <label
            htmlFor="import-file"
            className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm transition-all"
          >
            <Upload className="w-4 h-4 text-sky-600" />
            <span>{file ? file.name : 'Chọn tệp CSV hoặc JSON từ máy'}</span>
          </label>
          {file && (
            <p className="text-[11px] text-slate-500">
              Kích thước: {(file.size / 1024).toFixed(1)} KB
            </p>
          )}
        </div>

        {/* Status Message */}
        {statusMsg && (
          <div
            className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Dry Run Validation Results */}
        {dryRunResult && (
          <div className="p-4 rounded-2xl bg-sky-50 dark:bg-slate-800/80 border border-sky-200 dark:border-slate-700 space-y-3 text-xs">
            <h3 className="font-bold text-sky-900 dark:text-sky-300 flex items-center gap-1.5">
              <Eye className="w-4 h-4" />
              <span>Kết quả kiểm tra trước khi nhập:</span>
            </h3>

            {dryRunResult.type === 'csv' ? (
              <div className="space-y-1.5 text-slate-700 dark:text-slate-300">
                <p>Tổng số dòng trong tệp: <strong>{dryRunResult.totalRows}</strong></p>
                <p className="text-emerald-600 dark:text-emerald-400">
                  Số dòng hợp lệ sẵn sàng nhập: <strong>{dryRunResult.validCount}</strong>
                </p>
                {dryRunResult.errorCount > 0 && (
                  <div className="text-rose-600 dark:text-rose-400">
                    <p>Lỗi phát hiện: {dryRunResult.errorCount} dòng</p>
                    <ul className="list-disc pl-4 text-[11px] mt-1 space-y-0.5">
                      {dryRunResult.errors.map((err: string, idx: number) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1.5 text-slate-700 dark:text-slate-300">
                <p>Khôi phục bản sao lưu JSON đầy đủ:</p>
                <ul className="list-disc pl-4 text-[11px] space-y-0.5">
                  <li>Vật tư: {dryRunResult.stats?.items}</li>
                  <li>Danh mục: {dryRunResult.stats?.categories}</li>
                  <li>Vị trí lưu trữ: {dryRunResult.stats?.locations}</li>
                  <li>Lịch sử giao dịch: {dryRunResult.stats?.transactions}</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          {!dryRunResult ? (
            <button
              onClick={handleValidateDryRun}
              disabled={!file || loading}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl disabled:opacity-50 flex items-center gap-1.5 transition-all shadow-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              <span>Kiểm tra tệp (Validate)</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => setDryRunResult(null)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
              >
                Hủy
              </button>
              <button
                onClick={handleExecuteImport}
                disabled={importing}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl disabled:opacity-50 flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/30"
              >
                {importing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                <span>Xác nhận nhập dữ liệu</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
