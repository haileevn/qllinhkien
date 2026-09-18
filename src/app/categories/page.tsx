'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sliders,
  Plus,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Edit,
  Trash2,
  X,
  Check,
  Loader2,
  Package,
  Search,
  ArrowRight,
  Layers,
  FolderTree,
  AlertCircle,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { buildHierarchyOptions } from '@/lib/tree-utils';

interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  parentId: string | null;
  _count: { items: number; children?: number };
  childrenList?: CategoryNode[];
  totalItemsCount?: number;
}

export default function CategoriesPage() {
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Add / Edit Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState('');
  const [parentSearch, setParentSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delete Confirmation Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingCat, setDeletingCat] = useState<CategoryNode | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (res.ok) {
        const rawTree: CategoryNode[] = data.tree || [];
        const rawCategories: any[] = data.categories || [];

        // Recursively compute total items count (direct + descendant)
        function aggregateCategoryItems(node: CategoryNode): number {
          let sum = node._count?.items || 0;
          if (node.childrenList && node.childrenList.length > 0) {
            for (const child of node.childrenList) {
              sum += aggregateCategoryItems(child);
            }
          }
          node.totalItemsCount = sum;
          return sum;
        }

        rawTree.forEach((root) => aggregateCategoryItems(root));

        setTree(rawTree);
        setAllCategories(rawCategories);

        // Expand all by default
        const initExpanded: Record<string, boolean> = {};
        rawCategories.forEach((c: any) => {
          initExpanded[c.id] = true;
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

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    allCategories.forEach((c) => (all[c.id] = true));
    setExpandedNodes(all);
  };

  const collapseAll = () => {
    setExpandedNodes({});
  };

  const handleOpenAdd = (pId = '') => {
    setIsEditing(false);
    setEditingId(null);
    setName('');
    setDescription('');
    setParentId(pId);
    setParentSearch('');
    setError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (cat: CategoryNode, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditing(true);
    setEditingId(cat.id);
    setName(cat.name);
    setDescription(cat.description || '');
    setParentId(cat.parentId || '');
    setParentSearch('');
    setError(null);
    setModalOpen(true);
  };

  const handleOpenDelete = (cat: CategoryNode, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletingCat(cat);
    setDeleteError(null);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCat) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/categories/${deletingCat.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || 'Lỗi xóa danh mục');
        return;
      }
      setDeleteModalOpen(false);
      setDeletingCat(null);
      fetchCategories();
    } catch {
      setDeleteError('Đã xảy ra lỗi kết nối đến máy chủ');
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập tên danh mục');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const url = isEditing ? `/api/categories/${editingId}` : '/api/categories';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          parentId: parentId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi lưu danh mục');
      }

      setModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi');
    } finally {
      setSubmitting(false);
    }
  };

  // Compute options for parent category selector
  const getForbiddenIds = (targetId: string | null): Set<string> => {
    if (!targetId) return new Set<string>();
    const descendants = new Set<string>([targetId]);
    let added = true;
    while (added) {
      added = false;
      for (const cat of allCategories) {
        if (cat.parentId && descendants.has(cat.parentId) && !descendants.has(cat.id)) {
          descendants.add(cat.id);
          added = true;
        }
      }
    }
    return descendants;
  };

  const forbiddenParentIds = isEditing ? getForbiddenIds(editingId) : new Set<string>();
  const hierarchicalCategoryParents = buildHierarchyOptions(allCategories, forbiddenParentIds);

  const filteredCategoryParents = parentSearch.trim()
    ? hierarchicalCategoryParents.filter(
        (p) =>
          p.name.toLowerCase().includes(parentSearch.toLowerCase()) ||
          p.path.toLowerCase().includes(parentSearch.toLowerCase())
      )
    : hierarchicalCategoryParents;

  const totalCategoriesCount = allCategories.length;
  const totalItemsAcrossCategories = allCategories.reduce(
    (sum, c) => sum + (c._count?.items || 0),
    0
  );

  // Filter tree nodes for live search
  const isMatchOrHasMatchingChild = (node: CategoryNode, query: string): boolean => {
    if (!query) return true;
    const q = query.toLowerCase();
    if (node.name.toLowerCase().includes(q) || (node.description && node.description.toLowerCase().includes(q))) {
      return true;
    }
    if (node.childrenList && node.childrenList.length > 0) {
      return node.childrenList.some((child) => isMatchOrHasMatchingChild(child, query));
    }
    return false;
  };

  // Recursive Category Tree Node Renderer
  const renderCategoryNode = (node: CategoryNode, depth = 0) => {
    if (searchQuery.trim() && !isMatchOrHasMatchingChild(node, searchQuery)) {
      return null;
    }

    const isExpanded = !!expandedNodes[node.id];
    const hasChildren = node.childrenList && node.childrenList.length > 0;
    const directItems = node._count?.items || 0;
    const totalItems = node.totalItemsCount ?? directItems;
    const hasSubtreeItems = totalItems > directItems;

    return (
      <div key={node.id} className="select-none">
        <div
          className={`group flex items-center justify-between py-2.5 px-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors ${
            depth === 0 ? 'bg-slate-50/80 dark:bg-slate-800/40 my-1 font-semibold' : 'my-0.5'
          }`}
          style={{ paddingLeft: `${Math.max(12, depth * 22 + 12)}px` }}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
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
              <span className="w-4 h-4 inline-block shrink-0" />
            )}

            <Link
              href={`/items?categoryId=${node.id}`}
              className="flex items-center gap-2 min-w-0 flex-1 hover:text-sky-600 dark:hover:text-sky-400"
            >
              {isExpanded && hasChildren ? (
                <FolderOpen className="w-4 h-4 text-sky-500 shrink-0" />
              ) : (
                <Folder className="w-4 h-4 text-amber-500 shrink-0" />
              )}

              <span className="text-xs sm:text-sm truncate text-slate-800 dark:text-slate-200 font-medium">
                {node.name}
              </span>

              {node.description && (
                <span className="hidden md:inline-block text-[11px] text-slate-400 truncate max-w-xs">
                  &bull; {node.description}
                </span>
              )}
            </Link>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Items count badge */}
            <Link
              href={`/items?categoryId=${node.id}`}
              title={
                hasSubtreeItems
                  ? `${directItems} vật tư trực tiếp + ${totalItems - directItems} vật tư trong danh mục con`
                  : `${directItems} vật tư`
              }
              className="text-[11px] px-2.5 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold border border-sky-200 dark:border-sky-800 hover:bg-sky-100 transition-colors"
            >
              {directItems}
              {hasSubtreeItems ? ` (+${totalItems - directItems})` : ''} vật tư
            </Link>

            {/* Inline Action Buttons */}
            <div className="flex items-center gap-1 opacity-85 group-hover:opacity-100">
              <button
                onClick={() => handleOpenAdd(node.id)}
                title="Thêm danh mục con"
                className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-white dark:hover:bg-slate-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={(e) => handleOpenEdit(node, e)}
                title="Sửa tên / Chuyển danh mục cha"
                className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-white dark:hover:bg-slate-700 transition-colors"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={(e) => handleOpenDelete(node, e)}
                title="Xóa danh mục"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white dark:hover:bg-slate-700 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <Link
                href={`/items?categoryId=${node.id}`}
                title="Xem danh sách vật tư"
                className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-white dark:hover:bg-slate-700 transition-colors hidden sm:inline-flex"
              >
                <Package className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Render nested children */}
        {hasChildren && isExpanded && (
          <div className="border-l border-slate-200 dark:border-slate-800 ml-4">
            {node.childrenList!.map((child) => renderCategoryNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <Navbar
        title="Danh mục & Phân loại vật tư"
        action={
          <button
            onClick={() => handleOpenAdd()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm danh mục</span>
          </button>
        }
      />

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center shrink-0">
            <FolderTree className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium">Tổng số danh mục</div>
            <div className="text-lg font-black text-slate-900 dark:text-white">
              {totalCategoriesCount} <span className="text-xs font-normal text-slate-400">danh mục</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium">Vật tư đã gán danh mục</div>
            <div className="text-lg font-black text-slate-900 dark:text-white">
              {totalItemsAcrossCategories}{' '}
              <span className="text-xs font-normal text-slate-400">mặt hàng</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Tree Controls Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm danh mục linh kiện..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={expandAll}
            className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Mở rộng tất cả
          </button>
          <span className="text-slate-300 dark:text-slate-700">&bull;</span>
          <button
            onClick={collapseAll}
            className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Thu gọn
          </button>
        </div>
      </div>

      {/* Tree View Container */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-2">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Cơ cấu cây danh mục phân cấp
            </h2>
            <p className="text-xs text-slate-500">
              Quản lý các nhóm vật tư kỹ thuật, linh kiện và phụ tùng theo sơ đồ cha-con
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
            <span className="text-xs">Đang tải danh mục...</span>
          </div>
        ) : tree.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500 space-y-2">
            <FolderTree className="w-10 h-10 text-slate-300 mx-auto" />
            <p>Chưa có danh mục nào được tạo.</p>
            <button
              onClick={() => handleOpenAdd()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 text-white text-xs font-bold rounded-xl"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo danh mục đầu tiên</span>
            </button>
          </div>
        ) : (
          <div className="space-y-1">{tree.map((cat) => renderCategoryNode(cat, 0))}</div>
        )}
      </div>

      {/* Add / Edit Category Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30 shrink-0">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {isEditing ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto flex-1">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tên danh mục <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Linh kiện điện tử, Vi điều khiển, Cảm biến..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Danh mục cha (Cây thư mục)
                  </label>
                  {hierarchicalCategoryParents.length > 5 && (
                    <span className="text-[11px] text-slate-400 font-normal">
                      ({hierarchicalCategoryParents.length} danh mục)
                    </span>
                  )}
                </div>

                {hierarchicalCategoryParents.length > 7 && (
                  <input
                    type="text"
                    placeholder="🔍 Tìm nhanh danh mục cha..."
                    value={parentSearch}
                    onChange={(e) => setParentSearch(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                )}

                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white font-medium"
                >
                  <option value="">📁 (Danh mục gốc cấp cao nhất / Không có cha)</option>
                  {filteredCategoryParents.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.formattedOptionLabel}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Mô tả
                </label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú về phân loại nhóm vật tư này..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 active:scale-95 disabled:opacity-50 rounded-xl shadow-md shadow-sky-600/20 flex items-center gap-1.5"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{isEditing ? 'Lưu thay đổi' : 'Tạo danh mục'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && deletingCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Xóa danh mục?
                </h3>
                <p className="text-xs text-slate-500 font-medium truncate max-w-[200px]">
                  {deletingCat.name}
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Bạn có chắc chắn muốn xóa danh mục <strong>&quot;{deletingCat.name}&quot;</strong>? Hành động này không thể hoàn tác.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 disabled:opacity-50 rounded-xl shadow-md shadow-rose-600/20 flex items-center gap-1.5"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Xóa vĩnh viễn</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
