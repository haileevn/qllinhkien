'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sliders,
  Plus,
  Folder,
  Layers,
  ChevronRight,
  ChevronDown,
  Edit,
  Trash2,
  X,
  Check,
  Loader2,
  Package,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { buildHierarchyOptions } from '@/lib/tree-utils';

export default function CategoriesPage() {
  const [tree, setTree] = useState<any[]>([]);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (res.ok) {
        setTree(data.tree || []);
        setAllCategories(data.categories || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = (pId = '') => {
    setIsEditing(false);
    setEditingId(null);
    setName('');
    setDescription('');
    setParentId(pId);
    setError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (cat: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditing(true);
    setEditingId(cat.id);
    setName(cat.name);
    setDescription(cat.description || '');
    setParentId(cat.parentId || '');
    setError(null);
    setModalOpen(true);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Bạn có chắc muốn xóa danh mục này?')) return;

    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Lỗi xóa danh mục');
        return;
      }
      fetchCategories();
    } catch {
      alert('Đã xảy ra lỗi');
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

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <Navbar
        title="Danh mục & Phân loại"
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

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Cơ cấu danh mục phân cấp
            </h2>
            <p className="text-xs text-slate-500">
              Quản lý các nhóm vật tư kỹ thuật, linh kiện và phụ tùng
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {allCategories.length} danh mục
          </span>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
            <span className="text-xs">Đang tải danh mục...</span>
          </div>
        ) : tree.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">Chưa có danh mục nào.</div>
        ) : (
          <div className="space-y-3">
            {tree.map((cat) => (
              <div
                key={cat.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3"
              >
                {/* Parent Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-xs">
                      <Folder className="w-4 h-4" />
                    </div>
                    <div>
                      <Link
                        href={`/items?categoryId=${cat.id}`}
                        className="font-bold text-slate-900 dark:text-white text-sm hover:text-sky-600"
                      >
                        {cat.name}
                      </Link>
                      {cat.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {cat.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold">
                      {cat._count?.items || 0} vật tư
                    </span>

                    <button
                      onClick={() => handleOpenAdd(cat.id)}
                      title="Thêm danh mục con"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-white dark:hover:bg-slate-700"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => handleOpenEdit(cat, e)}
                      title="Sửa danh mục"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-white dark:hover:bg-slate-700"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => handleDelete(cat.id, e)}
                      title="Xóa danh mục"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white dark:hover:bg-slate-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Subcategories list */}
                {cat.childrenList && cat.childrenList.length > 0 && (
                  <div className="pl-6 border-l-2 border-slate-200 dark:border-slate-700 space-y-2 pt-1">
                    {cat.childrenList.map((sub: any) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                      >
                        <div>
                          <Link
                            href={`/items?categoryId=${sub.id}`}
                            className="font-semibold text-slate-800 dark:text-slate-200 hover:text-sky-600"
                          >
                            {sub.name}
                          </Link>
                          {sub.description && (
                            <span className="text-[11px] text-slate-400 ml-2">
                              &bull; {sub.description}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500 font-medium">
                            {sub._count?.items || 0} món
                          </span>

                          <button
                            onClick={(e) => handleOpenEdit(sub, e)}
                            className="p-1 text-slate-400 hover:text-sky-600"
                          >
                            <Edit className="w-3 h-3" />
                          </button>

                          <button
                            onClick={(e) => handleDelete(sub.id, e)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Category Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {isEditing ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              {error && <p className="text-xs text-rose-500 font-semibold">{error}</p>}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên danh mục *
                </label>
                <input
                  type="text"
                  placeholder="Linh kiện điện tử, Dụng cụ cầm tay..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Danh mục cha (để trống nếu là danh mục gốc)
                </label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
                >
                  <option value="">📁 (Danh mục gốc cấp cao nhất)</option>
                  {buildHierarchyOptions(allCategories, editingId ? [editingId] : []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.formattedOptionLabel}
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
                  placeholder="Ghi chú về danh mục..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
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
                  className="px-5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 active:scale-95 disabled:opacity-50 rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{isEditing ? 'Lưu thay đổi' : 'Tạo danh mục'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
