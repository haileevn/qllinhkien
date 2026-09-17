'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Box,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  QrCode,
  MapPin,
  Layers,
  Loader2,
  Package,
  X,
  Check,
} from 'lucide-react';
import Navbar from '@/components/Navbar';

interface LocationNode {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  parentId: string | null;
  _count: { items: number; children: number };
  childrenList?: LocationNode[];
}

export default function LocationsPage() {
  const [tree, setTree] = useState<LocationNode[]>([]);
  const [allLocations, setAllLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Add Location Modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newParentId, setNewParentId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/locations');
      const data = await res.json();
      if (res.ok) {
        setTree(data.tree || []);
        setAllLocations(data.locations || []);

        // Expand root and 1st level by default
        const initExpanded: Record<string, boolean> = {};
        data.locations?.forEach((loc: any) => {
          if (!loc.parentId || loc._count.children > 0) {
            initExpanded[loc.id] = true;
          }
        });
        setExpandedNodes(initExpanded);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setError('Vui lòng nhập tên vị trí');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          code: newCode.trim() || null,
          description: newDescription.trim() || null,
          parentId: newParentId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi tạo vị trí');
      }

      setAddModalOpen(false);
      setNewName('');
      setNewCode('');
      setNewDescription('');
      setNewParentId('');
      fetchLocations();
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi');
    } finally {
      setSubmitting(false);
    }
  };

  const openAddChildModal = (parentId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setNewParentId(parentId);
    setAddModalOpen(true);
  };

  // Recursive Tree Node Renderer
  const renderTreeNode = (node: LocationNode, depth = 0) => {
    const isExpanded = !!expandedNodes[node.id];
    const hasChildren = node.childrenList && node.childrenList.length > 0;

    return (
      <div key={node.id} className="select-none">
        <div
          className={`group flex items-center justify-between py-2.5 px-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
            depth === 0 ? 'bg-slate-50 dark:bg-slate-800/40 my-1 font-semibold' : 'my-0.5'
          }`}
          style={{ paddingLeft: `${Math.max(12, depth * 22 + 12)}px` }}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {hasChildren ? (
              <button
                onClick={(e) => toggleExpand(node.id, e)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-sky-600" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            ) : (
              <span className="w-4 h-4 inline-block" />
            )}

            <Link
              href={`/locations/${node.id}`}
              className="flex items-center gap-2 min-w-0 flex-1 hover:text-sky-600 dark:hover:text-sky-400"
            >
              {isExpanded ? (
                <FolderOpen className="w-4 h-4 text-sky-500 shrink-0" />
              ) : (
                <Folder className="w-4 h-4 text-amber-500 shrink-0" />
              )}

              <span className="text-xs sm:text-sm truncate text-slate-800 dark:text-slate-200 font-medium">
                {node.name}
              </span>

              {node.code && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold shrink-0">
                  {node.code}
                </span>
              )}
            </Link>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Direct items count badge */}
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold border border-sky-200 dark:border-sky-800">
              {node._count.items} vật tư
            </span>

            {/* Quick action buttons */}
            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
              <button
                onClick={(e) => openAddChildModal(node.id, e)}
                title="Thêm vị trí con"
                className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-white dark:hover:bg-slate-700"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              <Link
                href={`/locations/${node.id}/qr`}
                title="In tem QR vị trí"
                className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-white dark:hover:bg-slate-700"
              >
                <QrCode className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Children Render */}
        {hasChildren && isExpanded && (
          <div className="border-l border-slate-200 dark:border-slate-800 ml-4">
            {node.childrenList!.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <Navbar
        title="Cây vị trí lưu trữ"
        action={
          <button
            onClick={() => {
              setNewParentId('');
              setAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm vị trí</span>
          </button>
        }
      />

      {/* Description banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 border border-sky-100 dark:border-slate-800 flex items-start gap-3 text-xs text-slate-600 dark:text-slate-300">
        <MapPin className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-900 dark:text-white block mb-0.5">
            Cơ cấu kho phân cấp không giới hạn tầng (Tree Hierarchy)
          </span>
          Nhấp vào vị trí bất kỳ để xem toàn bộ vật tư lưu trữ bên trong và tất cả các tầng con.
        </div>
      </div>

      {/* Tree Container Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
            <span className="text-xs">Đang tải cây vị trí lưu trữ...</span>
          </div>
        ) : tree.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs space-y-2">
            <Box className="w-10 h-10 text-slate-300 mx-auto" />
            <p>Chưa có vị trí lưu trữ nào.</p>
          </div>
        ) : (
          <div className="space-y-1">{tree.map((node) => renderTreeNode(node, 0))}</div>
        )}
      </div>

      {/* Create Location Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Thêm vị trí lưu trữ mới
              </h3>
              <button
                onClick={() => setAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLocation} className="p-5 space-y-4">
              {error && <p className="text-xs text-rose-500 font-semibold">{error}</p>}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên vị trí *
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Phòng làm việc, Tủ A, Ngăn 3, Hộp A3-05..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mã định danh rút gọn (tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: A3-05, TLA, KSN..."
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Vị trí cha (Parent Location)
                </label>
                <select
                  value={newParentId}
                  onChange={(e) => setNewParentId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
                >
                  <option value="">(Cấp cao nhất - Không có vị trí cha)</option>
                  {allLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.code ? `[${loc.code}] ` : ''}
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mô tả
                </label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú về vị trí này..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 active:scale-95 disabled:opacity-50 rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Tạo vị trí</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
