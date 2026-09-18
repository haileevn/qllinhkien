'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Database,
  Scale,
  User,
  Lock,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Smartphone,
  Info,
  Check,
  Loader2,
  FolderKanban,
  Coins,
  Users,
  Sparkles,
  Key,
  ExternalLink,
  Cpu,
  AlertCircle,
  X,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { getRoleConfig, isAdmin, canEdit } from '@/lib/permissions';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Change password states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // AI Configuration states
  const [aiConfig, setAiConfig] = useState<{ isConfigured: boolean; maskedKey: string | null; model: string } | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiApiKeyInput, setAiApiKeyInput] = useState('');
  const [testingAi, setTestingAi] = useState(false);
  const [savingAi, setSavingAi] = useState(false);
  const [aiMsg, setAiMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setUser(data.user);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetchAiSettings();
  }, []);

  const fetchAiSettings = async () => {
    try {
      const res = await fetch('/api/ai/settings');
      const data = await res.json();
      if (res.ok) {
        setAiConfig(data);
      }
    } catch {}
  };

  const handleTestAi = async () => {
    if (!aiApiKeyInput.trim()) {
      setAiMsg({ type: 'error', text: 'Vui lòng nhập API Key để kiểm tra' });
      return;
    }
    setTestingAi(true);
    setAiMsg(null);
    try {
      const res = await fetch('/api/ai/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: aiApiKeyInput.trim(), testOnly: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setAiMsg({ type: 'success', text: '✓ Kết nối Google Gemini API thành công (Model: Gemini 2.5 Flash)' });
      } else {
        setAiMsg({ type: 'error', text: data.error || 'Lỗi kiểm tra API Key' });
      }
    } catch (err: any) {
      setAiMsg({ type: 'error', text: err?.message || 'Không thể kết nối máy chủ' });
    } finally {
      setTestingAi(false);
    }
  };

  const handleSaveAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiApiKeyInput.trim()) {
      setAiMsg({ type: 'error', text: 'Vui lòng nhập API Key' });
      return;
    }
    setSavingAi(true);
    setAiMsg(null);
    try {
      const res = await fetch('/api/ai/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: aiApiKeyInput.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setAiMsg({ type: 'success', text: '✓ Đã lưu Google Gemini API Key thành công!' });
        fetchAiSettings();
        setAiApiKeyInput('');
        setTimeout(() => {
          setAiModalOpen(false);
          setAiMsg(null);
        }, 1500);
      } else {
        setAiMsg({ type: 'error', text: data.error || 'Lỗi lưu API Key' });
      }
    } catch (err: any) {
      setAiMsg({ type: 'error', text: err?.message || 'Không thể lưu cấu hình' });
    } finally {
      setSavingAi(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      router.push('/login');
    }
  };

  const roleInfo = getRoleConfig(user?.role);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Navbar title="Cài đặt hệ thống" />

      {/* Profile Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center font-black text-base shadow-md shadow-sky-500/20">
            {user?.name?.slice(0, 2).toUpperCase() || user?.username?.slice(0, 2).toUpperCase() || 'AD'}
          </div>
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white text-base">
              {user?.name || 'Quản trị viên H2T'}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                @{user?.username || 'admin'}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${roleInfo.badgeBg} ${roleInfo.badgeText} ${roleInfo.badgeBorder}`}
              >
                {roleInfo.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Settings Sections */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
          Hệ thống & Tài khoản
        </h3>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 shadow-sm overflow-hidden">
          {/* User Management & Roles */}
          {isAdmin(user?.role) && (
            <Link
              href="/settings/users"
              className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                    Quản lý người dùng & Phân quyền (RBAC)
                  </div>
                  <div className="text-xs text-slate-500">
                    Tạo tài khoản phụ, phân quyền Quản trị, Quản lý kho hoặc Khách xem
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>
          )}

          {/* Data Backup & Restore */}
          <Link
            href="/settings/data"
            className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                  Sao lưu & Phục hồi dữ liệu
                </div>
                <div className="text-xs text-slate-500">
                  Xuất / Nhập tệp CSV và JSON sao lưu an toàn
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </Link>

          {/* Categories Management */}
          <Link
            href="/categories"
            className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <FolderKanban className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                  Quản lý Danh mục vật tư & Phân loại
                </div>
                <div className="text-xs text-slate-500">
                  Thêm mới, đổi tên, di chuyển nhánh cha con và quản lý danh mục linh kiện
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </Link>

          {/* Units */}
          <Link
            href="/settings/units"
            className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                  Đơn vị tính (Units)
                </div>
                <div className="text-xs text-slate-500">
                  Cấu hình các đơn vị: cái, bộ, hộp, cuộn, mét, kg...
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </Link>

          {/* Tags */}
          <Link
            href="/settings/tags"
            className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                  Quản lý thẻ (Tags)
                </div>
                <div className="text-xs text-slate-500">
                  Tạo và gán nhãn nhận diện (ví dụ: SMD, Tháo máy, DIY, New 100%...)
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </Link>

          {/* Google Gemini AI Configuration */}
          <div
            onClick={() => setAiModalOpen(true)}
            className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
              </div>
              <div>
                <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-2">
                  <span>Trí tuệ nhân tạo (Google Gemini AI)</span>
                  {aiConfig?.isConfigured ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      ✓ Đã kích hoạt ({aiConfig.model})
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      Chưa cấu hình Key
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500">
                  {aiConfig?.isConfigured
                    ? `Key đang dùng: ${aiConfig.maskedKey} &bull; Tự động trích xuất thông số & giải thích linh kiện`
                    : 'Cấu hình Google Gemini API Key để kích hoạt tính năng tự động trích xuất thông số'}
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>

          {/* Change Password */}
          <Link
            href="/settings/password"
            className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                  Đổi mật khẩu tài khoản
                </div>
                <div className="text-xs text-slate-500">
                  Cập nhật mật khẩu đăng nhập an toàn cho tài khoản đang dùng
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </Link>
        </div>
      </div>

      {/* Utilities Section */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
          Báo cáo & Tiện ích nâng cao
        </h3>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 shadow-sm overflow-hidden">
          {/* Projects & BOM Kits */}
          <Link
            href="/projects"
            className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <FolderKanban className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                  Dự án DIY & Danh sách vật tư (BOM Kits)
                </div>
                <div className="text-xs text-slate-500">
                  Tạo danh mục linh kiện cần cho từng đề tài, theo dõi tiến độ gom đồ
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </Link>

          {/* Financial Asset Analytics */}
          <Link
            href="/analytics"
            className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                  Báo cáo tổng giá trị tài sản kho
                </div>
                <div className="text-xs text-slate-500">
                  Định giá tổng tài sản kho (VNĐ), phân bổ theo vị trí & dự toán mua bù
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </Link>

          {/* Batch Print Labels */}
          <Link
            href="/print-labels"
            className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                  In nhãn mã QR hàng loạt (Decal / Sticker Sheet)
                </div>
                <div className="text-xs text-slate-500">
                  In hàng loạt tem mã QR dán lên khay, hộp linh kiện và ngăn kéo
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </Link>

          {/* Audit tool */}
          <Link
            href="/audit"
            className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                  Kiểm kê kho & Đối chiếu thực tế
                </div>
                <div className="text-xs text-slate-500">
                  Duyệt từng vị trí, hộp lưu trữ để đếm và xác nhận tồn kho nhanh
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </Link>

          {/* Transactions */}
          <Link
            href="/transactions"
            className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                  Nhật ký lịch sử xuất nhập & điều chuyển
                </div>
                <div className="text-xs text-slate-500">
                  Xem chi tiết mọi biến động nhập, xuất, chuyển vị trí và điều chỉnh
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </Link>
        </div>
      </div>

      {/* System Information */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3 text-xs">
        <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
          <Info className="w-4 h-4 text-sky-600" />
          <span>Thông tin ứng dụng</span>
        </div>
        <div className="space-y-1.5 text-slate-500">
          <div className="flex justify-between">
            <span>Phiên bản:</span>
            <strong className="text-slate-800 dark:text-slate-200">H2T Home Inventory V1.9.0 (Google Gemini AI + Tra cứu thông số)</strong>
          </div>
          <div className="flex justify-between">
            <span>Trí tuệ nhân tạo:</span>
            <strong className="text-sky-600">Google Gemini 2.5 Flash Multimodal</strong>
          </div>
          <div className="flex justify-between">
            <span>Cơ sở dữ liệu:</span>
            <strong className="text-slate-800 dark:text-slate-200">PostgreSQL + Prisma ORM</strong>
          </div>
          <div className="flex justify-between">
            <span>PWA & Offline:</span>
            <strong className="text-emerald-600">Đã kích hoạt</strong>
          </div>
        </div>
      </div>

      {/* Logout button */}
      <button
        onClick={handleLogout}
        className="w-full py-3.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-2xl border border-rose-200 dark:border-rose-900/60 flex items-center justify-center gap-2 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        <span>Đăng xuất khỏi hệ thống</span>
      </button>

      {/* Gemini AI Configuration Modal */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-transparent">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-sky-500/30">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-white text-base">
                    Cấu hình Google Gemini AI
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Model: Gemini 2.5 Flash Multimodal
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setAiModalOpen(false);
                  setAiMsg(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAi} className="p-4 sm:p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Google Gemini API Key
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    placeholder={aiConfig?.isConfigured ? `Key hiện tại: ${aiConfig.maskedKey}` : 'Dán mã AIzaSy...'}
                    value={aiApiKeyInput}
                    onChange={(e) => setAiApiKeyInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Khóa API được lưu an toàn trong cơ sở dữ liệu và chỉ dùng cho tính năng phân tích kho.
                </p>
              </div>

              {aiMsg && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                    aiMsg.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                  }`}
                >
                  {aiMsg.type === 'success' ? <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />}
                  <span>{aiMsg.text}</span>
                </div>
              )}

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-[11px] text-slate-500 dark:text-slate-400 space-y-1.5">
                <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-sky-500" />
                  <span>Cách lấy API Key miễn phí:</span>
                </div>
                <p className="leading-relaxed">
                  1. Truy cập vào <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-sky-600 font-bold hover:underline inline-flex items-center gap-0.5">Google AI Studio <ExternalLink className="w-2.5 h-2.5" /></a><br />
                  2. Đăng nhập tài khoản Google và bấm <strong>Create API key</strong><br />
                  3. Sao chép chuỗi mã và dán vào ô bên trên.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={testingAi || !aiApiKeyInput.trim()}
                  onClick={handleTestAi}
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  {testingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Cpu className="w-3.5 h-3.5 text-sky-600" />}
                  <span>Kiểm tra kết nối</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAiModalOpen(false);
                      setAiMsg(null);
                    }}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700"
                  >
                    Hủy
                  </button>

                  <button
                    type="submit"
                    disabled={savingAi || !aiApiKeyInput.trim()}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-md shadow-sky-600/30 flex items-center gap-1.5 transition-all"
                  >
                    {savingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Lưu Key</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
