'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FolderKanban,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Sparkles,
  ArrowRight,
  Loader2,
  Calendar,
  DollarSign,
  Package,
  Wrench,
  Boxes,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { clsx } from 'clsx';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  PLANNING: {
    label: 'Lên kế hoạch',
    color: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-amber-950/60',
    border: 'border-amber-200 dark:border-amber-800',
  },
  IN_PROGRESS: {
    label: 'Đang thi công',
    color: 'text-sky-700 dark:text-sky-300',
    bg: 'bg-sky-50 dark:bg-sky-950/60',
    border: 'border-sky-200 dark:border-sky-800',
  },
  COMPLETED: {
    label: 'Đã hoàn thành',
    color: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-50 dark:bg-emerald-950/60',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  ON_HOLD: {
    label: 'Tạm dừng',
    color: 'text-zinc-700 dark:text-zinc-300',
    bg: 'bg-zinc-100 dark:bg-zinc-800',
    border: 'border-zinc-200 dark:border-zinc-700',
  },
  ARCHIVED: {
    label: 'Lưu trữ',
    color: 'text-purple-700 dark:text-purple-300',
    bg: 'bg-purple-50 dark:bg-purple-950/60',
    border: 'border-purple-200 dark:border-purple-800',
  },
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const url = statusFilter === 'ALL' ? '/api/projects' : `/api/projects?status=${statusFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [statusFilter]);

  const filteredProjects = projects.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <Navbar
        title="Dự án & Bộ linh kiện BOM"
        action={
          <Link
            href="/projects/new"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo dự án mới</span>
          </Link>
        }
      />

      {/* Hero Banner */}
      <section className="bg-gradient-to-br from-indigo-700 via-sky-700 to-blue-800 rounded-3xl p-5 sm:p-7 text-white shadow-xl shadow-indigo-900/20 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold border border-white/20 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-sky-200" />
            <span>Quản lý Bill of Materials (BOM) & DIY Kit</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black mb-2">
            Theo dõi linh kiện & Xuất kho theo từng dự án
          </h2>
          <p className="text-xs sm:text-sm text-sky-100 leading-relaxed mb-4">
            Tập hợp danh sách linh kiện cần thiết cho mạch điện, đồ DIY, máy in 3D hay smart home. Hệ thống tự động kiểm tra tồn kho và hỗ trợ xuất kho 1-chạm khi bạn bắt đầu lắp ráp.
          </p>

          <div className="flex items-center gap-3">
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-sky-800 hover:bg-sky-50 font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm dự án mới</span>
            </Link>
            <Link
              href="/analytics"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 border border-white/25 text-white font-semibold text-xs rounded-xl transition-all"
            >
              <DollarSign className="w-4 h-4" />
              <span>Báo cáo tài sản</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'PLANNING', label: 'Lên kế hoạch' },
            { id: 'IN_PROGRESS', label: 'Đang làm' },
            { id: 'COMPLETED', label: 'Đã xong' },
            { id: 'ON_HOLD', label: 'Tạm dừng' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={clsx(
                'px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0',
                statusFilter === tab.id
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên dự án..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Project Cards Grid */}
      {loading ? (
        <div className="py-20 flex justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto">
            <FolderKanban className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-base">
            Chưa có dự án nào
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Tạo dự án để gom các linh kiện cần thiết (BOM), kiểm tra số lượng tồn kho và xuất kho tự động.
          </p>
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo dự án đầu tiên</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => {
            const statusStyle = STATUS_CONFIG[project.status] || STATUS_CONFIG.PLANNING;
            const isReady = project.readinessPercentage === 100 && project.totalItemsCount > 0;

            return (
              <div
                key={project.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-sky-400 dark:hover:border-sky-700 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3.5">
                  {/* Top Bar: Status Badge and Deducted Indicator */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={clsx(
                        'px-2.5 py-1 rounded-lg text-[11px] font-bold border',
                        statusStyle.bg,
                        statusStyle.color,
                        statusStyle.border
                      )}
                    >
                      {statusStyle.label}
                    </span>

                    {project.isFullyDeducted ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Đã xuất kho</span>
                      </span>
                    ) : isReady ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-md">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Đủ linh kiện</span>
                      </span>
                    ) : project.missingItemsCount > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Thiếu {project.missingItemsCount} món</span>
                      </span>
                    ) : null}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <Link
                      href={`/projects/${project.id}`}
                      className="font-bold text-slate-900 dark:text-white text-base hover:text-sky-600 block line-clamp-1"
                    >
                      {project.name}
                    </Link>
                    {project.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                        {project.description}
                      </p>
                    )}
                  </div>

                  {/* Readiness Progress Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-500">Mức độ sẵn sàng linh kiện:</span>
                      <span
                        className={clsx(
                          isReady ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'
                        )}
                      >
                        {project.readyItemsCount}/{project.totalItemsCount} món ({project.readinessPercentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={clsx(
                          'h-full transition-all duration-500 rounded-full',
                          isReady ? 'bg-emerald-500' : project.readinessPercentage > 50 ? 'bg-sky-500' : 'bg-amber-500'
                        )}
                        style={{ width: `${project.readinessPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Key Stats Row */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <div className="text-[10px] text-slate-400">Số loại linh kiện</div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {project.totalItemsCount} loại
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <div className="text-[10px] text-slate-400">Giá trị BOM</div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {project.totalBOMValue ? `${project.totalBOMValue.toLocaleString('vi-VN')} đ` : 'Chưa có giá'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">
                    Cập nhật: {new Date(project.updatedAt).toLocaleDateString('vi-VN')}
                  </span>

                  <Link
                    href={`/projects/${project.id}`}
                    className="font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                  >
                    <span>Mở chi tiết</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
