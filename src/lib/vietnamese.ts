/**
 * Vietnamese diacritics removal and string normalization utility
 * Allows fuzzy and accent-insensitive search like "day usb" -> "Dây USB Type-C"
 */
export function removeVietnameseTones(str: string): string {
  if (!str) return '';
  str = str.trim().toLowerCase();
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
  str = str.replace(/đ/g, 'd');
  // Combining diacritical marks
  str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return str;
}

/**
 * Checks whether target string contains all query terms (accent-insensitive)
 */
export function matchesVietnameseSearch(target: string | null | undefined, query: string): boolean {
  if (!target || !query) return false;
  const cleanTarget = removeVietnameseTones(target);
  const cleanQuery = removeVietnameseTones(query);
  const queryTokens = cleanQuery.split(/\s+/).filter(Boolean);
  return queryTokens.every(token => cleanTarget.includes(token));
}

/**
 * Creates a URL-friendly slug from Vietnamese text
 */
export function createSlug(text: string): string {
  const normalized = removeVietnameseTones(text);
  return normalized
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
