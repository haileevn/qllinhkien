'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, PlusCircle, Box, Settings, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';

export default function BottomNav() {
  const pathname = usePathname();

  // Don't show bottom nav on login page or print pages
  if (pathname === '/login' || pathname.endsWith('/qr')) {
    return null;
  }

  const navItems = [
    { href: '/', label: 'Trang chủ', icon: Home, exact: true },
    { href: '/search', label: 'Tìm kiếm', icon: Search },
    { href: '/items/new', label: 'Thêm đồ', icon: PlusCircle, isPrimary: true },
    { href: '/locations', label: 'Kho', icon: Box },
    { href: '/settings', label: 'Cài đặt', icon: Settings },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 bottom-nav-safe">
      <div className="grid grid-cols-5 h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

          const Icon = item.icon;

          if (item.isPrimary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-4 relative group"
              >
                <div className="w-12 h-12 rounded-full bg-sky-600 dark:bg-sky-500 text-white flex items-center justify-center shadow-lg shadow-sky-600/30 group-active:scale-95 transition-transform">
                  <Icon className="w-6 h-6 stroke-[2.5]" />
                </div>
                <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 mt-1">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex flex-col items-center justify-center py-1 transition-colors relative',
                isActive
                  ? 'text-sky-600 dark:text-sky-400 font-medium'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              )}
            >
              <Icon className={clsx('w-5 h-5 mb-1', isActive && 'stroke-[2.5]')} />
              <span className="text-[11px]">{item.label}</span>
              {isActive && (
                <span className="absolute top-1 w-1 h-1 bg-sky-600 dark:bg-sky-400 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
