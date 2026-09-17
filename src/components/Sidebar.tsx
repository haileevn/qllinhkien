'use client';

import React, { useState, useEffect } from 'react';
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
  FolderKanban,
  Coins,
  Users,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useRouter } from 'next/navigation';
import { getRoleConfig, isAdmin, canEdit } from '@/lib/permissions';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {});
  }, [pathname]);

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

  const roleInfo = getRoleConfig(user?.role);
  const isUserAdmin = isAdmin(user?.role);
  const userCanEdit = canEdit(user?.role);

  const navGroups = [
    {
      title: 'Quản lý kho',
      items: [
        { href: '/', label: 'Trang chủ', icon: Home, exact: true },
        { href: '/items', label: 'Tất cả vật tư', icon: Layers, exact: true },
        ...(userCanEdit ? [{ href: '/items/new', label: 'Thêm vật tư mới', icon: PlusCircle }] : []),
        { href: '/projects', label: 'Dự án & BOM Kit', icon: FolderKanban },
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
      title: 'Công cụ & Báo cáo',
      items: [
        { href: '/analytics', label: 'Báo cáo tài sản kho', icon: Coins },
        { href: '/scanner', label: 'Quét Barcode / QR', icon: QrCode },
        { href: '/print-labels', label: 'In nhãn tem hàng loạt', icon: Printer },
        { href: '/audit', label: 'Kiểm kê thực tế', icon: ClipboardCheck },
      ],
    },
    {
      title: 'Hệ thống & Tài khoản',
      items: [
        ...(isUserAdmin
          ? [{ href: '/settings/users', label: 'Quản lý người dùng', icon: Users }]
          : []),
        ...(isUserAdmin
          ? [{ href: '/settings/data', label: 'Sao lưu & Phục hồi', icon: Database }]
          : []),
        { href: '/settings/password', label: 'Đổi mật khẩu', icon: Lock },
        { href: '/settings', label: 'Cài đặt chung', icon: Settings, exact: true },
      ],
    },
  ];

  return (
    <aside className="hidden md:flex md:w-64 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 min-h-screen sticky top-0 shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <img
            src="/icon.svg"
            alt="H2T Logo"
            className="w-9 h-9 rounded-xl shadow-md shadow-sky-500/20 object-cover group-hover:scale-105 transition-transform"
          />
          <div>
            <div className="font-black text-slate-900 dark:text-white leading-none text-base tracking-tight">
              H2T Inventory
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
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
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
            {user?.name?.slice(0, 2).toUpperCase() || user?.username?.slice(0, 2).toUpperCase() || 'AD'}
          </div>
          <div className="text-xs min-w-0">
            <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
              {user?.name || user?.username || 'Đang tải...'}
            </div>
            <div className="text-[11px] text-slate-400 truncate flex items-center gap-1">
              <span>@{user?.username || 'user'}</span>
              <span>&bull;</span>
              <span className={`font-semibold ${roleInfo.badgeText}`}>{roleInfo.label}</span>
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          title="Đăng xuất"
          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
