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
} from 'lucide-react';
import Navbar from '@/components/Navbar';

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
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      router.push('/login');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Navbar title="Cài đặt hệ thống" />

      {/* Profile Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center font-black text-base shadow-md shadow-sky-500/20">
            {user?.username?.slice(0, 2).toUpperCase() || 'AD'}
          </div>
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white text-base">
              {user?.name || 'Quản trị viên H2T'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tài khoản: @{user?.username || 'admin'} &bull; Quyền: {user?.role || 'ADMIN'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Settings Sections */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
          Dữ liệu & Cấu hình kho
        </h3>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 shadow-sm overflow-hidden">
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
                  Đổi mật khẩu tài khoản Admin
                </div>
                <div className="text-xs text-slate-500">
                  Cập nhật mật khẩu đăng nhập an toàn cho quản trị viên
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
          Tiện ích & In ấn
        </h3>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 shadow-sm overflow-hidden">
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
            <strong className="text-slate-800 dark:text-slate-200">H2T Home Inventory V1.1.2</strong>
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
    </div>
  );
}
