'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  History,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  ArrowRight,
  Filter,
  Loader2,
  Calendar,
  Clock,
  Package,
  Download,
  Search,
  X,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { TRANSACTION_TYPES } from '@/lib/inventory';

function TransactionsContent() {
  const searchParams = useSearchParams();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState(searchParams.get('type') || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchTransactions();
  }, [selectedType, searchQuery, page]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedType) params.set('type', selectedType);
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      params.set('page', String(page));
      params.set('limit', '40');

      const res = await fetch(`/api/transactions?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setTransactions(data.transactions || []);
        setSummary(data.summary);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (selectedType) params.set('type', selectedType);
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    params.set('format', 'csv');
    window.open(`/api/transactions?${params.toString()}`, '_blank');
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <Navbar
        title="Lịch sử biến động kho"
        action={
          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
            title="Xuất lịch sử biến động ra file CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất CSV</span>
          </button>
        }
      />

      {/* Summary Stats Header */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-1">
              <ArrowDownLeft className="w-4 h-4" />
              <span>Tổng nhập thêm</span>
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white">
              +{summary.totalInQty} món
            </div>
            <div className="text-[11px] text-slate-400">{summary.totalInCount} lượt nhập</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-bold mb-1">
              <ArrowUpRight className="w-4 h-4" />
              <span>Tổng đã dùng</span>
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white">
              -{summary.totalOutQty} món
            </div>
            <div className="text-[11px] text-slate-400">{summary.totalOutCount} lượt xuất</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm col-span-2">
            <div className="text-xs font-bold text-slate-400 mb-1">Quy tắc ghi vết</div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Mọi hoạt động xuất nhập, đổi vị trí, kiểm kê hay xuất linh kiện cho dự án BOM đều được tự động lưu vết chính xác.
            </p>
          </div>
        </div>
      )}

      {/* Search Input and Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo tên linh kiện, SKU, lý do, người tạo... (không dấu)"
            className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setPage(1);
              }}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 p-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs overflow-x-auto">
          <button
            onClick={() => {
              setSelectedType('');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
              !selectedType
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Tất cả biến động
          </button>
          <button
            onClick={() => {
              setSelectedType('IN');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
              selectedType === 'IN'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            + Nhập thêm
          </button>
          <button
            onClick={() => {
              setSelectedType('OUT');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
              selectedType === 'OUT'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            - Đã dùng / Xuất
          </button>
          <button
            onClick={() => {
              setSelectedType('MOVE');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
              selectedType === 'MOVE'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            → Chuyển vị trí
          </button>
          <button
            onClick={() => {
              setSelectedType('ADJUSTMENT');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
              selectedType === 'ADJUSTMENT'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            ± Điều chỉnh kiểm kê
          </button>
        </div>
      </div>

      {/* Transactions Timeline List */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-3">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
            <span className="text-xs">Đang tải lịch sử giao dịch...</span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Không có giao dịch nào khớp với bộ lọc.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {transactions.map((tx) => {
              const info = TRANSACTION_TYPES[tx.type] || TRANSACTION_TYPES.ADJUSTMENT;
              const isPlus = tx.type === 'IN';
              const isMinus = tx.type === 'OUT';

              return (
                <div key={tx.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center font-bold text-xs ${info.badgeBg}`}
                    >
                      {info.prefix}
                    </span>

                    <div className="min-w-0">
                      <Link
                        href={`/items/${tx.item?.id || tx.itemId}`}
                        className="font-bold text-slate-900 dark:text-white hover:text-sky-600 truncate block text-xs sm:text-sm"
                      >
                        {tx.item?.name || 'Vật tư đã xóa'}
                      </Link>

                      <div className="text-slate-500 text-[11px] flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {info.label}
                        </span>
                        {tx.note && <span>&bull; {tx.note}</span>}
                        {tx.type === 'MOVE' && tx.sourceLocation && tx.destinationLocation && (
                          <span className="text-purple-600">
                            &bull; [{tx.sourceLocation.name}] → [{tx.destinationLocation.name}]
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`font-black text-xs sm:text-sm ${
                        isPlus
                          ? 'text-emerald-600'
                          : isMinus
                          ? 'text-rose-600'
                          : 'text-purple-600'
                      }`}
                    >
                      {isPlus ? `+${tx.quantity}` : isMinus ? `-${tx.quantity}` : `${tx.quantity}`}{' '}
                      {tx.item?.unit || 'cái'}
                    </div>

                    <div className="text-[10px] text-slate-400 mt-0.5 flex items-center justify-end gap-1">
                      <Clock className="w-3 h-3" />
                      <span>
                        {new Date(tx.createdAt).toLocaleDateString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 disabled:opacity-40 font-semibold"
            >
              Trang trước
            </button>
            <span className="text-slate-400">
              Trang {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 disabled:opacity-40 font-semibold"
            >
              Trang sau
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="p-4 text-xs text-slate-400">Đang tải lịch sử...</div>}>
      <TransactionsContent />
    </Suspense>
  );
}
