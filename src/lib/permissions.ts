export type UserRole = 'ADMIN' | 'MEMBER' | 'VIEWER';

export interface RoleConfig {
  role: UserRole;
  label: string;
  description: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

export const ROLES: Record<UserRole, RoleConfig> = {
  ADMIN: {
    role: 'ADMIN',
    label: 'Quản trị viên',
    description: 'Toàn quyền quản lý tài khoản, cấu hình hệ thống, sao lưu và dữ liệu kho.',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/60',
    badgeText: 'text-rose-700 dark:text-rose-300',
    badgeBorder: 'border-rose-200 dark:border-rose-800',
  },
  MEMBER: {
    role: 'MEMBER',
    label: 'Quản lý kho',
    description: 'Toàn quyền xem, thêm, sửa, xuất/nhập, kiểm kê và vận hành dự án linh kiện.',
    badgeBg: 'bg-sky-50 dark:bg-sky-950/60',
    badgeText: 'text-sky-700 dark:text-sky-300',
    badgeBorder: 'border-sky-200 dark:border-sky-800',
  },
  VIEWER: {
    role: 'VIEWER',
    label: 'Khách xem kho',
    description: 'Chỉ đọc (Read-only): Xem danh mục, tìm kiếm, quét QR tra cứu vị trí kho.',
    badgeBg: 'bg-slate-100 dark:bg-slate-800',
    badgeText: 'text-slate-700 dark:text-slate-300',
    badgeBorder: 'border-slate-200 dark:border-slate-700',
  },
};

/**
 * Checks if a given role has write / modification permissions in the inventory
 */
export function canEdit(role?: string | null): boolean {
  if (!role) return false;
  const normalized = role.toUpperCase();
  return normalized === 'ADMIN' || normalized === 'MEMBER';
}

/**
 * Checks if a given role is Admin
 */
export function isAdmin(role?: string | null): boolean {
  if (!role) return false;
  return role.toUpperCase() === 'ADMIN';
}

/**
 * Returns role metadata or fallback to VIEWER
 */
export function getRoleConfig(role?: string | null): RoleConfig {
  if (!role) return ROLES.VIEWER;
  const normalized = role.toUpperCase() as UserRole;
  return ROLES[normalized] || ROLES.VIEWER;
}
