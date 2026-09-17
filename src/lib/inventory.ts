import { prisma } from './prisma';

export interface LocationBreadcrumb {
  id: string;
  name: string;
  code: string | null;
}

/**
 * Computes full breadcrumb path for a storage location:
 * e.g. Nhà → Phòng làm việc → Tủ linh kiện A → Ngăn 3 → Hộp A3-05
 */
export async function getLocationBreadcrumbs(locationId: string): Promise<LocationBreadcrumb[]> {
  const breadcrumbs: LocationBreadcrumb[] = [];
  let currentId: string | null = locationId;

  const allLocations = await prisma.storageLocation.findMany({
    select: { id: true, name: true, code: true, parentId: true },
  });

  const locationMap = new Map(allLocations.map((l) => [l.id, l]));

  while (currentId) {
    const loc = locationMap.get(currentId);
    if (!loc) break;
    breadcrumbs.unshift({ id: loc.id, name: loc.name, code: loc.code });
    currentId = loc.parentId;
  }

  return breadcrumbs;
}

/**
 * Returns formatted location path string
 * e.g. "Nhà → Phòng làm việc → Tủ A → Ngăn 3 → Hộp A3-05"
 */
export function formatLocationPath(breadcrumbs: LocationBreadcrumb[]): string {
  if (!breadcrumbs || breadcrumbs.length === 0) return 'Chưa phân vị trí';
  return breadcrumbs.map((b) => b.name).join(' → ');
}

/**
 * Gets all descendant location IDs recursively for a given location ID
 */
export async function getDescendantLocationIds(locationId: string): Promise<string[]> {
  const allLocations = await prisma.storageLocation.findMany({
    select: { id: true, parentId: true },
  });

  const ids = [locationId];
  let toCheck = [locationId];

  while (toCheck.length > 0) {
    const currentParentId = toCheck.pop();
    const children = allLocations.filter((l) => l.parentId === currentParentId);
    for (const child of children) {
      if (!ids.includes(child.id)) {
        ids.push(child.id);
        toCheck.push(child.id);
      }
    }
  }

  return ids;
}

/**
 * Condition label translation map
 */
export const ITEM_CONDITIONS: Record<string, { label: string; color: string; bg: string }> = {
  NEW: { label: 'Mới', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800' },
  GOOD: { label: 'Tốt', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800' },
  USED: { label: 'Đã sử dụng', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800' },
  NEEDS_REPAIR: { label: 'Cần sửa', color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-50 dark:bg-orange-950/60 border-orange-200 dark:border-orange-800' },
  BROKEN: { label: 'Hỏng', color: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800' },
  DISPOSED: { label: 'Đã bỏ', color: 'text-zinc-600 dark:text-zinc-400', bg: 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700' },
};

/**
 * Transaction type label map
 */
export const TRANSACTION_TYPES: Record<string, { label: string; prefix: string; color: string; badgeBg: string }> = {
  IN: { label: 'Nhập thêm', prefix: '+', color: 'text-emerald-600 dark:text-emerald-400', badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
  OUT: { label: 'Đã sử dụng / Xuất', prefix: '-', color: 'text-rose-600 dark:text-rose-400', badgeBg: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
  ADJUSTMENT: { label: 'Điều chỉnh số lượng', prefix: '±', color: 'text-blue-600 dark:text-blue-400', badgeBg: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
  MOVE: { label: 'Chuyển vị trí', prefix: '→', color: 'text-purple-600 dark:text-purple-400', badgeBg: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
};

/**
 * Character set without ambiguous characters (no 0, O, 1, I, L)
 */
const CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Generates a collision-resistant unique code for items or locations
 * Format: H2T-ITM-XXXXXX or H2T-LOC-XXXXXX
 */
export function generateUniqueCode(prefix: 'ITM' | 'LOC' = 'ITM', length = 6): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * CODE_CHARS.length);
    result += CODE_CHARS[randomIndex];
  }
  return `H2T-${prefix}-${result}`;
}

