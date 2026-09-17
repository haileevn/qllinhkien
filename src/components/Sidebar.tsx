'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Search,
  PlusCircle,
  Box,
  Layers,
  AlertTriangle,
  Star,
  Settings,
  QrCode,
  LogOut,
  Sliders,
  Database,
  Tag as TagIcon,
  Wrench,
  History,
  Printer,
  ClipboardCheck,
  Lock,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useRouter } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === '/login' || pathname.endsWith('/qr')) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      router.push('/login');
    }
  };

  const navGroups = [
    {
      title: 'Quản lý kho',
      items: [
        { href: '/', label: 'Trang chủ', icon: Home, exact: true },
        { href: '/items', label: 'Tất cả vật tư', icon: Layers, exact: true },
        { href: '/items/new', label: 'Thêm vật tư mới', icon: PlusCircle },
        { href: '/search', label: 'Tìm kiếm nhanh', icon: Search },
        { href: '/low-stock', label: 'Sắp hết & Hết hàng', icon: AlertTriangle, highlight: true },
        { href: '/transactions', label: 'Lịch sử xuất / nhập', icon: History },
      ],
    },
    {
      title: 'Cơ cấu lưu trữ',
      items: [
        { href: '/locations', label: 'Cây vị trí lưu trữ', icon: Box },
        { href: '/categories', label: 'Danh mục vật tư', icon: Sliders },
        { href: '/settings/tags', label: 'Thẻ phân loại (Tags)', icon: TagIcon },
      ],
    },
    {
      title: 'Công cụ & In ấn',
      items: [
        { href: '/scanner', label: 'Quét Barcode / QR', icon: QrCode },
        { href: '/print-labels', label: 'In nhãn tem hàng loạt', icon: Printer },
        { href: '/audit', label: 'Kiểm kê thực tế', icon: ClipboardCheck },
      ],
    },
    {
      title: 'Hệ thống & Tài khoản',
      items: [
        { href: '/settings/data', label: 'Sao lưu & Phục hồi', icon: Database },
        { href: '/settings/password', label: 'Đổi mật khẩu Admin', icon: Lock },
        { href: '/settings', label: 'Cài đặt chung', icon: Settings, exact: true },
      ],
    },
  ];

  return (
    <aside className="hidden md:flex md:w-64 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 min-h-screen sticky top-0 shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center text-white font-bold shadow-md shadow-sky-500/20">
            H2T
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-white leading-none text-base">
              H2T Inventory
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Kho vật tư gia đình
            </div>
          </div>
        </Link>
      </div>

      {/* Nav list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {navGroups.map((group, idx) => (
          <div key={idx} className="space-y-1">
            <div className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              {group.title}
            </div>
            {group.items.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white',
                    item.highlight && !isActive && 'text-amber-600 dark:text-amber-400'
                  )}
                >
                  <Icon className={clsx('w-4 h-4', isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400')} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer Profile & Logout */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-200">
            AD
          </div>
          <div className="text-xs">
            <div className="font-semibold text-slate-800 dark:text-slate-200">Quản trị viên</div>
            <div className="text-slate-400">admin</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          title="Đăng xuất"
          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
