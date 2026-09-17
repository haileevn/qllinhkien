'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Tag as TagIcon, Plus, Trash2, Edit, Check, X, Loader2 } from 'lucide-react';
import Navbar from '@/components/Navbar';

export default function TagsPage() {
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTagName, setNewTagName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/tags');
      const data = await res.json();
      if (res.ok) setTags(data.tags || []);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi thêm thẻ');

      setNewTagName('');
      fetchTags();
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTag = async (id: string) => {
    if (!editName.trim()) return;

    try {
      const res = await fetch(`/api/tags/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      });

      if (res.ok) {
        setEditingId(null);
        fetchTags();
      }
    } catch {}
  };

  const handleDeleteTag = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa thẻ này khỏi hệ thống?')) return;
    try {
      await fetch(`/api/tags/${id}`, { method: 'DELETE' });
      fetchTags();
    } catch {}
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Navbar title="Quản lý thẻ (Tags)" showBack backHref="/settings" />

      {/* Add Tag Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <h2 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
          <Plus className="w-4 h-4 text-sky-600" />
          <span>Tạo thẻ phân loại mới</span>
        </h2>

        {error && <p className="text-xs text-rose-500 font-semibold">{error}</p>}

        <form onSubmit={handleAddTag} className="flex items-center gap-2">
          <div className="relative flex-1">
            <TagIcon className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Nhập tên tag (ví dụ: esp32, wifi, type-c...)"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              required
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1 shrink-0"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>Thêm thẻ</span>
          </button>
        </form>
      </div>

      {/* Tags List Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase">
          <span>Danh sách thẻ hiện có</span>
          <span>{tags.length} thẻ</span>
        </div>

        {loading ? (
          <div className="py-8 flex justify-center text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin text-sky-600" />
          </div>
        ) : tags.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">Chưa có thẻ nào.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
              >
                {editingId === tag.id ? (
                  <div className="flex items-center gap-1.5 flex-1 mr-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg"
                      autoFocus
                    />
                    <button
                      onClick={() => handleUpdateTag(tag.id)}
                      className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1 text-slate-400 hover:bg-slate-200 rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <Link
                    href={`/search?tag=${encodeURIComponent(tag.name)}`}
                    className="font-bold text-slate-800 dark:text-slate-200 hover:text-sky-600 flex items-center gap-1.5"
                  >
                    <span>#{tag.name}</span>
                    <span className="text-[11px] font-normal text-slate-400">
                      ({tag._count?.items || 0} vật tư)
                    </span>
                  </Link>
                )}

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingId(tag.id);
                      setEditName(tag.name);
                    }}
                    className="p-1 text-slate-400 hover:text-sky-600 rounded"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteTag(tag.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
