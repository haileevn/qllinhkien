export interface PlatformInfo {
  name: string;
  domain: string;
  badgeBg: string;
  textColor: string;
  borderColor: string;
}

export function detectShoppingPlatform(url: string | null | undefined): PlatformInfo {
  if (!url) {
    return {
      name: 'Liên kết mua',
      domain: '',
      badgeBg: 'bg-slate-100 dark:bg-slate-800',
      textColor: 'text-slate-700 dark:text-slate-300',
      borderColor: 'border-slate-200 dark:border-slate-700',
    };
  }

  const clean = url.toLowerCase();

  if (clean.includes('shopee.vn') || clean.includes('shp.ee')) {
    return {
      name: 'Shopee',
      domain: 'shopee.vn',
      badgeBg: 'bg-orange-50 dark:bg-orange-950/60',
      textColor: 'text-orange-600 dark:text-orange-400',
      borderColor: 'border-orange-200 dark:border-orange-800',
    };
  }

  if (clean.includes('lazada.vn') || clean.includes('s.lazada')) {
    return {
      name: 'Lazada',
      domain: 'lazada.vn',
      badgeBg: 'bg-indigo-50 dark:bg-indigo-950/60',
      textColor: 'text-indigo-600 dark:text-indigo-400',
      borderColor: 'border-indigo-200 dark:border-indigo-800',
    };
  }

  if (clean.includes('taobao.com') || clean.includes('tmall.com')) {
    return {
      name: 'Taobao',
      domain: 'taobao.com',
      badgeBg: 'bg-amber-50 dark:bg-amber-950/60',
      textColor: 'text-amber-600 dark:text-amber-400',
      borderColor: 'border-amber-200 dark:border-amber-800',
    };
  }

  if (clean.includes('aliexpress.com')) {
    return {
      name: 'AliExpress',
      domain: 'aliexpress.com',
      badgeBg: 'bg-red-50 dark:bg-red-950/60',
      textColor: 'text-red-600 dark:text-red-400',
      borderColor: 'border-red-200 dark:border-red-800',
    };
  }

  if (clean.includes('digikey.com') || clean.includes('digikey.vn')) {
    return {
      name: 'DigiKey',
      domain: 'digikey.com',
      badgeBg: 'bg-rose-50 dark:bg-rose-950/60',
      textColor: 'text-rose-600 dark:text-rose-400',
      borderColor: 'border-rose-200 dark:border-rose-800',
    };
  }

  if (clean.includes('mouser.vn') || clean.includes('mouser.com')) {
    return {
      name: 'Mouser',
      domain: 'mouser.vn',
      badgeBg: 'bg-blue-50 dark:bg-blue-950/60',
      textColor: 'text-blue-600 dark:text-blue-400',
      borderColor: 'border-blue-200 dark:border-blue-800',
    };
  }

  if (clean.includes('hshop.vn')) {
    return {
      name: 'Hshop.vn',
      domain: 'hshop.vn',
      badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      borderColor: 'border-emerald-200 dark:border-emerald-800',
    };
  }

  if (clean.includes('thegioiic.com')) {
    return {
      name: 'Thế Giới IC',
      domain: 'thegioiic.com',
      badgeBg: 'bg-cyan-50 dark:bg-cyan-950/60',
      textColor: 'text-cyan-600 dark:text-cyan-400',
      borderColor: 'border-cyan-200 dark:border-cyan-800',
    };
  }

  if (clean.includes('nshopvn.com')) {
    return {
      name: 'Nshop',
      domain: 'nshopvn.com',
      badgeBg: 'bg-purple-50 dark:bg-purple-950/60',
      textColor: 'text-purple-600 dark:text-purple-400',
      borderColor: 'border-purple-200 dark:border-purple-800',
    };
  }

  try {
    const host = new URL(url).hostname.replace('www.', '');
    return {
      name: host,
      domain: host,
      badgeBg: 'bg-slate-50 dark:bg-slate-800/60',
      textColor: 'text-slate-700 dark:text-slate-300',
      borderColor: 'border-slate-200 dark:border-slate-700',
    };
  } catch {
    return {
      name: 'Trang mua hàng',
      domain: '',
      badgeBg: 'bg-slate-50 dark:bg-slate-800/60',
      textColor: 'text-slate-700 dark:text-slate-300',
      borderColor: 'border-slate-200 dark:border-slate-700',
    };
  }
}
