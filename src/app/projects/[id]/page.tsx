'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FolderKanban,
  Zap,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  ExternalLink,
  Layers,
  MapPin,
  Clock,
  Sparkles,
  ArrowLeft,
  Loader2,
  Calendar,
  DollarSign,
  Package,
  ShoppingBag,
  ShoppingCart,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import LocationBadgeWithToast from '@/components/LocationBadgeWithToast';
import { detectShoppingPlatform } from '@/lib/shopping';
import { clsx } from 'clsx';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${projectId}`);
      const data = await res.json();
      if (res.ok) {
        setProject(data.project);
      } else {
        setMsg({ type: 'error', text: data.error || 'Không thể tải dự án' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Lỗi kết nối máy chủ' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  // 1-Click Deduct BOM Stock
  const handleDeduct = async () => {
    if (!confirm(`Bạn có chắc chắn muốn xuất kho toàn bộ ${project?.items?.length} loại linh kiện cho dự án "${project?.name}"?`)) {
      return;
    }

    setActionLoading(true);
    setMsg(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/deduct`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: 'success', text: data.message });
        await fetchProject();
      } else {
        setMsg({ type: 'error', text: data.error || 'Lỗi xuất kho' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Không thể kết nối máy chủ' });
    } finally {
      setActionLoading(false);
    }
  };

  // 1-Click Return BOM Stock
  const handleReturn = async () => {
    if (!confirm(`Bạn có chắc chắn muốn hoàn trả lại toàn bộ linh kiện của dự án "${project?.name}" về lại kho?`)) {
      return;
    }

    setActionLoading(true);
    setMsg(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/return`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: 'success', text: data.message });
        await fetchProject();
      } else {
        setMsg({ type: 'error', text: data.error || 'Lỗi hoàn trả' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Không thể kết nối máy chủ' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Bạn có chắc chắn muốn xóa dự án "${project?.name}"?`)) return;

    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/projects');
      }
    } catch {
      alert('Không thể xóa dự án');
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-12 text-center max-w-md mx-auto space-y-3">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="font-bold text-slate-900 dark:text-white text-base">Không tìm thấy dự án</h2>
        <Link href="/projects" className="inline-block px-4 py-2 bg-sky-600 text-white rounded-xl text-xs font-bold">
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  const isReadyToAssemble = project.readinessPercentage === 100 && project.totalItemsCount > 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Navbar title={project.name} showBack backHref="/projects" />

      {/* Status Notifications */}
      {msg && (
        <div
          className={clsx(
            'p-4 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 shadow-sm',
            msg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200'
          )}
        >
          <div className="flex items-center gap-2">
            {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />}
            <span>{msg.text}</span>
          </div>
          <button onClick={() => setMsg(null)} className="text-[11px] underline opacity-70 hover:opacity-100">
            Đóng
          </button>
        </div>
      )}

      {/* Project Overview Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                {project.status === 'PLANNING'
                  ? 'Lên kế hoạch'
                  : project.status === 'IN_PROGRESS'
                  ? 'Đang thi công'
                  : project.status === 'COMPLETED'
                  ? 'Đã hoàn thành'
                  : 'Tạm dừng'}
              </span>

              {project.isFullyDeducted ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Đã xuất kho toàn bộ</span>
                </span>
              ) : isReadyToAssemble ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-lg border border-sky-200 dark:border-sky-800">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Sẵn sàng xuất kho & Lắp ráp</span>
                </span>
              ) : null}
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {project.name}
            </h1>

            {project.description && (
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                {project.description}
              </p>
            )}
          </div>

          {/* 1-Click Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {!project.isFullyDeducted ? (
              <button
                onClick={handleDeduct}
                disabled={actionLoading || project.totalItemsCount === 0}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
                title="Tự động trừ số lượng các linh kiện trong kho"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                <span>⚡ Xuất kho dự án</span>
              </button>
            ) : (
              <button
                onClick={handleReturn}
                disabled={actionLoading}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50"
                title="Cộng lại các linh kiện vào kho"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                <span>↩️ Hoàn trả lại kho</span>
              </button>
            )}

            <button
              onClick={handleDelete}
              className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
              title="Xóa dự án"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Readiness Meter */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-600 dark:text-slate-300">
              Tiến độ chuẩn bị linh kiện ({project.readyItemsCount}/{project.totalItemsCount} loại sẵn sàng)
            </span>
            <span className={clsx(isReadyToAssemble ? 'text-emerald-600' : 'text-sky-600')}>
              {project.readinessPercentage}%
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              className={clsx(
                'h-full transition-all duration-500 rounded-full',
                isReadyToAssemble ? 'bg-emerald-500' : 'bg-sky-500'
              )}
              style={{ width: `${project.readinessPercentage}%` }}
            />
          </div>
        </div>

        {/* Financial & Metadata Info */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <div className="text-[10px] text-slate-400">Tổng giá trị BOM</div>
            <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
              {project.totalBOMValue ? `${project.totalBOMValue.toLocaleString('vi-VN')} đ` : 'Chưa có giá'}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <div className="text-[10px] text-slate-400">Ngân sách dự kiến</div>
            <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
              {project.budget ? `${project.budget.toLocaleString('vi-VN')} đ` : 'Chưa đặt'}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <div className="text-[10px] text-slate-400">Ngày dự kiến</div>
            <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
              {project.targetDate ? new Date(project.targetDate).toLocaleDateString('vi-VN') : 'Chưa đặt'}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <div className="text-[10px] text-slate-400">Linh kiện thiếu</div>
            <div
              className={clsx(
                'text-sm font-black mt-0.5',
                project.missingItemsCount > 0 ? 'text-amber-600' : 'text-emerald-600'
              )}
            >
              {project.missingItemsCount > 0 ? `Thiếu ${project.missingItemsCount} món` : 'Đã đủ 100%'}
            </div>
          </div>
        </div>
      </div>

      {/* BOM Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-slate-900 dark:text-white text-base">
              Bảng linh kiện chi tiết (Bill of Materials)
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            {project.items?.length || 0} mục
          </span>
        </div>

        {project.items?.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
            Dự án này chưa có linh kiện nào trong danh mục BOM.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {project.items.map((pItem: any) => {
              const shopPlatform = detectShoppingPlatform(pItem.item?.purchaseUrl);

              return (
                <div key={pItem.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  {/* Left: Item Info & Location */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={clsx(
                        'w-8 h-8 rounded-xl flex items-center justify-center font-bold shrink-0',
                        pItem.isDeducted
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : pItem.isEnough
                          ? 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      )}
                    >
                      {pItem.isDeducted ? '✓' : pItem.isEnough ? 'OK' : '!'}
                    </div>

                    <div className="min-w-0">
                      <Link
                        href={`/items/${pItem.itemId}`}
                        className="font-bold text-slate-900 dark:text-white text-sm hover:text-sky-600 truncate block"
                      >
                        {pItem.item?.name}
                      </Link>
                      <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-400 mt-0.5">
                        {pItem.item?.location && (
                          <LocationBadgeWithToast
                            location={pItem.item.location}
                            locationPath={pItem.item.locationPath}
                            container={pItem.item.container}
                            exactPosition={pItem.item.exactPosition}
                            variant="inline"
                            showCopy={false}
                          />
                        )}
                        {pItem.item?.purchasePrice ? (
                          <span>&bull; {pItem.item.purchasePrice.toLocaleString('vi-VN')} đ/{pItem.item.unit}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Right: Quantity comparison & Quick Buy Link */}
                  <div className="flex items-center gap-4 justify-between sm:justify-end shrink-0">
                    <div className="text-right">
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        Cần: <strong className="text-indigo-600 dark:text-indigo-400">{pItem.requiredQuantity}</strong> {pItem.item?.unit}
                      </div>
                      <div className="text-[11px]">
                        {pItem.isDeducted ? (
                          <span className="text-emerald-600 font-semibold">Đã xuất kho</span>
                        ) : (
                          <span className={clsx('font-semibold', pItem.isEnough ? 'text-slate-500' : 'text-amber-600')}>
                            Tồn kho: {pItem.currentStock} {pItem.item?.unit} ({pItem.isEnough ? 'Đủ' : `Thiếu ${pItem.shortage}`})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Buy Button if missing or purchaseUrl exists */}
                    {pItem.item?.purchaseUrl && (
                      <a
                        href={pItem.item.purchaseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={clsx(
                          'px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs hover:scale-105',
                          shopPlatform.badgeBg,
                          shopPlatform.textColor,
                          shopPlatform.borderColor
                        )}
                        title={`Mở link mua trên ${shopPlatform.name}`}
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>Mua {shopPlatform.name}</span>
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
