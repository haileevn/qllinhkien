'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Save, Loader2, Barcode, Tag as TagIcon, ArrowLeft, QrCode, RefreshCw, ShoppingCart, ExternalLink, Sparkles } from 'lucide-react';
import Navbar from '@/components/Navbar';
import ImageUploader from '@/components/ImageUploader';
import AiAnalysisModal from '@/components/AiAnalysisModal';
import { detectShoppingPlatform } from '@/lib/shopping';
import { clsx } from 'clsx';
import { canEdit } from '@/lib/permissions';
import { buildHierarchyOptions } from '@/lib/tree-utils';

export default function EditItemPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [unit, setUnit] = useState('cái');
  const [minimumQuantity, setMinimumQuantity] = useState<number>(0);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [sku, setSku] = useState('');
  const [condition, setCondition] = useState('NEW');
  const [container, setContainer] = useState('');
  const [exactPosition, setExactPosition] = useState('');
  const [purchasePrice, setPurchasePrice] = useState<string>('');
  const [purchaseDate, setPurchaseDate] = useState<string>('');
  const [purchaseUrl, setPurchaseUrl] = useState('');
  const [supplier, setSupplier] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [notes, setNotes] = useState('');
  const [barcode, setBarcode] = useState('');
  const [qrCodeValue, setQrCodeValue] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);

  const generateRandomItemCode = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let res = '';
    for (let i = 0; i < 6; i++) {
      res += chars[Math.floor(Math.random() * chars.length)];
    }
    return `H2T-ITM-${res}`;
  };

  // Metadata
  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [userRes, itemRes, catsRes, locsRes, unitsRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch(`/api/items/${id}`),
        fetch('/api/categories?format=flat'),
        fetch('/api/locations?format=flat'),
        fetch('/api/units'),
      ]);

      const [userData, itemData, catsData, locsData, unitsData] = await Promise.all([
        userRes.json(),
        itemRes.json(),
        catsRes.json(),
        locsRes.json(),
        unitsRes.json(),
      ]);

      if (userData.authenticated && userData.user) {
        setCurrentUser(userData.user);
      }

      if (catsData.categories) setCategories(catsData.categories);
      if (locsData.locations) setLocations(locsData.locations);
      if (unitsData.units) setUnits(unitsData.units);

      if (itemRes.ok && itemData.item) {
        const it = itemData.item;
        setName(it.name);
        setCategoryId(it.categoryId);
        setLocationId(it.locationId);
        setUnit(it.unit);
        setMinimumQuantity(it.minimumQuantity);
        setBrand(it.brand || '');
        setModel(it.model || '');
        setSku(it.sku || '');
        setCondition(it.condition);
        setContainer(it.container || '');
        setExactPosition(it.exactPosition || '');
        setPurchasePrice(it.purchasePrice ? String(it.purchasePrice) : '');
        setPurchaseDate(it.purchaseDate ? it.purchaseDate.split('T')[0] : '');
        setPurchaseUrl(it.purchaseUrl || '');
        setSupplier(it.supplier || '');
        setNotes(it.notes || '');
        setBarcode(it.barcode || '');
        setQrCodeValue(it.qrCodeValue || '');
        setIsFavorite(it.isFavorite);
        setTagsInput(it.tags?.map((t: any) => t.tag.name).join(', ') || '');

        const allImgs = [it.mainImage, ...(it.images?.map((img: any) => img.url) || [])].filter(
          (u, i, arr) => u && arr.indexOf(u) === i
        );
        setImages(allImgs);
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập tên vật tư');
      return;
    }

    setSubmitting(true);
    setError(null);

    const tagsArray = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const res = await fetch(`/api/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          categoryId,
          locationId,
          unit: unit.trim(),
          minimumQuantity: Number(minimumQuantity) || 0,
          sku: sku.trim() || null,
          brand: brand.trim() || null,
          model: model.trim() || null,
          condition,
          container: container.trim() || null,
          exactPosition: exactPosition.trim() || null,
          purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
          purchaseDate: purchaseDate || null,
          purchaseUrl: purchaseUrl.trim() || null,
          supplier: supplier.trim() || null,
          tags: tagsArray,
          notes: notes.trim() || null,
          barcode: barcode.trim() || null,
          qrCodeValue: qrCodeValue.trim() || null,
          mainImage: images[0] || null,
          additionalImages: images.slice(1),
          isFavorite,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi lưu cập nhật');
      }

      router.push(`/items/${id}`);
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi cập nhật');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-2 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
        <span className="text-xs">Đang tải biểu mẫu chỉnh sửa...</span>
      </div>
    );
  }

  if (currentUser && !canEdit(currentUser.role)) {
    return (
      <div className="max-w-md mx-auto space-y-5 pt-8 text-center">
        <Navbar title="Chỉnh sửa vật tư" showBack backHref={`/items/${id}`} />
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto">
            <TagIcon className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Quyền xem chỉ đọc (Viewer)
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Tài khoản của bạn chỉ có quyền xem danh mục và tra cứu kho. Để sửa đổi thông tin vật tư, vui lòng liên hệ Quản trị viên để được nâng quyền.
          </p>
          <button
            onClick={() => router.push(`/items/${id}`)}
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition-colors"
          >
            Quay lại chi tiết vật tư
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <Navbar title={`Chỉnh sửa: ${name}`} showBack backHref={`/items/${id}`} />

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold">
          {error}
        </div>
      )}

      <form onSubmit={handleUpdate} className="space-y-4">
        {/* Core Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Ảnh vật tư
            </label>
            <ImageUploader images={images} onChange={setImages} />
          </div>

          {/* AI Auto-Fill Action Banner */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-sky-50 via-indigo-50 to-purple-50 dark:from-slate-850 dark:via-indigo-950/30 dark:to-purple-950/30 border border-sky-200/70 dark:border-indigo-850 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Sparkles className="w-4 h-4 animate-pulse text-amber-300" />
              </div>
              <div className="min-w-0 text-xs">
                <div className="font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                  <span>Google Gemini AI Điền thông số</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded font-black">
                    Auto-Fill
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Trích xuất thông số kỹ thuật, model, hãng và ghi chú từ ảnh / tên
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAiModalOpen(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 hover:from-sky-700 hover:to-purple-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-sky-600/20 flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Phân tích</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Tên vật tư <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3.5 py-3 text-sm font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Danh mục <span className="text-rose-500">*</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
              >
                {buildHierarchyOptions(categories).map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.formattedOptionLabel}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Vị trí lưu trữ <span className="text-rose-500">*</span>
              </label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full px-3 py-2.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white font-medium"
              >
                {buildHierarchyOptions(locations).map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.formattedOptionLabel}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Đơn vị tính
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Cảnh báo khi dưới
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={minimumQuantity}
                onChange={(e) => setMinimumQuantity(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Details Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-sky-600 dark:text-sky-400">
            Thông tin chi tiết
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tủ / Kệ / Thùng
              </label>
              <input
                type="text"
                value={container}
                onChange={(e) => setContainer(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ngăn / Hộp / Vị trí chi tiết
              </label>
              <input
                type="text"
                value={exactPosition}
                onChange={(e) => setExactPosition(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Thương hiệu
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Model
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Mã SKU
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tình trạng
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
              >
                <option value="NEW">Mới</option>
                <option value="GOOD">Tốt</option>
                <option value="USED">Đã sử dụng</option>
                <option value="NEEDS_REPAIR">Cần sửa</option>
                <option value="BROKEN">Hỏng</option>
                <option value="DISPOSED">Đã bỏ</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Giá mua (VNĐ)
              </label>
              <input
                type="number"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ngày mua
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
              />
            </div>
          </div>

            {/* Shopping Link / Quick Reorder URL */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Link mua hàng online (Shopee, Lazada, Taobao, DigiKey...)
                </label>
                {purchaseUrl.trim() && (
                  <span
                    className={clsx(
                      'px-2 py-0.5 rounded-md text-[10px] font-bold border',
                      detectShoppingPlatform(purchaseUrl).badgeBg,
                      detectShoppingPlatform(purchaseUrl).textColor,
                      detectShoppingPlatform(purchaseUrl).borderColor
                    )}
                  >
                    {detectShoppingPlatform(purchaseUrl).name}
                  </span>
                )}
              </div>
              <div className="relative flex items-center">
                <ShoppingCart className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
                <input
                  type="url"
                  value={purchaseUrl}
                  onChange={(e) => setPurchaseUrl(e.target.value)}
                  placeholder="Dán link sản phẩm Shopee, Lazada, Taobao, DigiKey, Hshop..."
                  className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Gắn link để khi cần bổ sung tồn kho có thể bấm 1 nút để mở ngay giỏ hàng mua lại.
              </p>
            </div>

            {/* Dynamic QR Code & Barcode Section */}
            <div className="p-4 rounded-2xl bg-sky-50/50 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-sky-900 dark:text-sky-300 flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-sky-600" />
                  <span>Mã định danh QR động (Không trùng lặp)</span>
                </label>
                <button
                  type="button"
                  onClick={() => setQrCodeValue(generateRandomItemCode())}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-800 hover:bg-sky-50 dark:hover:bg-sky-900/40 text-sky-700 dark:text-sky-300 text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 shadow-xs"
                  title="Sinh mã định danh ngẫu nhiên mới"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Sinh mã mới</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={qrCodeValue}
                  onChange={(e) => setQrCodeValue(e.target.value)}
                  placeholder="Ví dụ: H2T-ITM-8K9F2A"
                  className="w-full px-3.5 py-2 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-sky-300 dark:border-sky-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-sky-900 dark:text-sky-200 uppercase"
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                Mã này được in trên tem QR. Quét camera sẽ tìm chính xác vật tư này.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mã vạch (Barcode)
                </label>
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Thẻ (Tags, phân cách bằng dấu phẩy)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ghi chú
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
              />
            </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => router.push(`/items/${id}`)}
            className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all"
          >
            Hủy
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 active:scale-95 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-sky-600/30 flex items-center gap-1.5 transition-all"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Lưu thay đổi</span>
          </button>
        </div>
      </form>

      {/* AI Analysis Modal */}
      <AiAnalysisModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        currentTitle={name}
        currentImage={images[0]}
        existingNotes={notes}
        categories={categories}
        onApply={(data) => {
          if (data.name) setName(data.name);
          if (data.brand) setBrand(data.brand);
          if (data.model) setModel(data.model);
          if (data.sku) setSku(data.sku);
          if (data.categoryId) setCategoryId(data.categoryId);
          if (data.unit) setUnit(data.unit);
          if (data.notes) setNotes(data.notes);
          if (data.tags && data.tags.length > 0) {
            const existing = tagsInput
              ? tagsInput.split(',').map((t) => t.trim()).filter(Boolean)
              : [];
            const merged = Array.from(new Set([...existing, ...data.tags]));
            setTagsInput(merged.join(', '));
          }
        }}
      />
    </div>
  );
}
