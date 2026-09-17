'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Plus,
  ChevronDown,
  ChevronUp,
  Save,
  Check,
  Loader2,
  Sparkles,
  Barcode,
  Tag as TagIcon,
  ArrowLeft,
  Camera,
  Copy,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import ImageUploader from '@/components/ImageUploader';

function NewItemForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cloneFromId = searchParams.get('cloneFrom');
  const initialLocationId = searchParams.get('locationId');

  // Basic Fields (Initially visible)
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [locationId, setLocationId] = useState(initialLocationId || '');
  const [quantity, setQuantity] = useState<number>(1);
  const [unit, setUnit] = useState('cái');
  const [images, setImages] = useState<string[]>([]);

  // Detailed Fields (Expandable)
  const [showDetails, setShowDetails] = useState(false);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [sku, setSku] = useState('');
  const [minimumQuantity, setMinimumQuantity] = useState<number>(0);
  const [condition, setCondition] = useState('NEW');
  const [container, setContainer] = useState('');
  const [exactPosition, setExactPosition] = useState('');
  const [purchasePrice, setPurchasePrice] = useState<string>('');
  const [purchaseDate, setPurchaseDate] = useState<string>('');
  const [supplier, setSupplier] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [notes, setNotes] = useState('');
  const [barcode, setBarcode] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);

  // Metadata dropdown options
  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isClone, setIsClone] = useState(false);

  useEffect(() => {
    fetchMetadataAndClone();
  }, [cloneFromId]);

  const fetchMetadataAndClone = async () => {
    try {
      setLoadingMeta(true);
      const [catsRes, locsRes, unitsRes] = await Promise.all([
        fetch('/api/categories?format=flat'),
        fetch('/api/locations?format=flat'),
        fetch('/api/units'),
      ]);

      const [catsData, locsData, unitsData] = await Promise.all([
        catsRes.json(),
        locsRes.json(),
        unitsRes.json(),
      ]);

      if (catsData.categories && catsData.categories.length > 0) {
        setCategories(catsData.categories);
        setCategoryId(catsData.categories[0].id);
      }
      if (locsData.locations && locsData.locations.length > 0) {
        setLocations(locsData.locations);
        if (!initialLocationId) {
          setLocationId(locsData.locations[0].id);
        }
      }
      if (unitsData.units && unitsData.units.length > 0) {
        setUnits(unitsData.units);
      }

      // If cloning an existing item
      if (cloneFromId) {
        const itemRes = await fetch(`/api/items/${cloneFromId}`);
        const itemData = await itemRes.json();
        if (itemRes.ok && itemData.item) {
          const it = itemData.item;
          setIsClone(true);
          setName(`${it.name} (Bản sao)`);
          setCategoryId(it.categoryId);
          setLocationId(it.locationId);
          setUnit(it.unit);
          setQuantity(it.quantity);
          setMinimumQuantity(it.minimumQuantity);
          setBrand(it.brand || '');
          setModel(it.model || '');
          setCondition(it.condition || 'NEW');
          setContainer(it.container || '');
          setExactPosition(it.exactPosition || '');
          setPurchasePrice(it.purchasePrice ? String(it.purchasePrice) : '');
          setSupplier(it.supplier || '');
          setNotes(it.notes || '');
          setTagsInput(it.tags?.map((t: any) => t.tag.name).join(', ') || '');
          setShowDetails(true);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMeta(false);
    }
  };

  const resetForm = () => {
    setName('');
    setQuantity(1);
    setImages([]);
    setBrand('');
    setModel('');
    setSku('');
    setMinimumQuantity(0);
    setCondition('NEW');
    setContainer('');
    setExactPosition('');
    setPurchasePrice('');
    setPurchaseDate('');
    setSupplier('');
    setTagsInput('');
    setNotes('');
    setBarcode('');
    setIsFavorite(false);
    setError(null);
  };

  const handleSave = async (continueAdding: boolean) => {
    if (!name.trim()) {
      setError('Vui lòng nhập tên vật tư');
      return;
    }
    if (!categoryId) {
      setError('Vui lòng chọn danh mục');
      return;
    }
    if (!locationId) {
      setError('Vui lòng chọn vị trí lưu trữ');
      return;
    }

    setSubmitting(true);
    setError(null);

    const tagsArray = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          categoryId,
          locationId,
          quantity: Number(quantity) || 0,
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
          supplier: supplier.trim() || null,
          tags: tagsArray,
          notes: notes.trim() || null,
          barcode: barcode.trim() || null,
          mainImage: images[0] || null,
          additionalImages: images.slice(1),
          isFavorite,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi lưu vật tư');
      }

      if (continueAdding) {
        setSuccessMsg(`Đã thêm thành công "${name}". Mời tiếp tục thêm.`);
        resetForm();
        setTimeout(() => setSuccessMsg(null), 3500);
      } else {
        router.push(`/items/${data.item.id}`);
      }
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi tạo vật tư');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <Navbar title={isClone ? 'Nhân bản vật tư' : 'Thêm vật tư mới'} showBack />

      {isClone && (
        <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 text-xs flex items-center gap-2">
          <Copy className="w-4 h-4 text-sky-600" />
          <span>Đang nhân bản từ vật tư gốc. Thông số đã được sao chép sẵn.</span>
        </div>
      )}

      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 shadow-sm animate-fade-in">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold">
          {error}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave(false);
        }}
        className="space-y-4"
      >
        {/* Core Quick Card (Initially Visible) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-4">
          {/* Image Upload Area */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Ảnh vật tư (chụp ảnh hoặc chọn từ thư viện)
            </label>
            <ImageUploader images={images} onChange={setImages} />
          </div>

          {/* Item Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Tên vật tư / Linh kiện <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Ví dụ: ESP32 DevKit V1, Relay 5V Songle, Dây Type-C..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3.5 py-3 text-sm font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white placeholder-slate-400"
            />
          </div>

          {/* Category & Location Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Danh mục <span className="text-rose-500">*</span>
              </label>
              {loadingMeta ? (
                <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
              ) : (
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Storage Location */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Vị trí lưu trữ <span className="text-rose-500">*</span>
              </label>
              {loadingMeta ? (
                <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
              ) : (
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.code ? `[${loc.code}] ` : ''}
                      {loc.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Quantity & Unit Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Số lượng <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 text-sm font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Đơn vị tính <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                list="unit-options"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="cái, bộ, hộp..."
                className="w-full px-3 py-2.5 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
              />
              <datalist id="unit-options">
                {units.map((u) => (
                  <option key={u.id} value={u.name} />
                ))}
              </datalist>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Cảnh báo khi dưới
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0"
                value={minimumQuantity}
                onChange={(e) => setMinimumQuantity(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Expandable Detailed Fields Button */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-2xl transition-colors shadow-sm"
          >
            <span>{showDetails ? 'Thu gọn chi tiết' : 'Thêm thông tin chi tiết'}</span>
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Expanded Detailed Section */}
        {showDetails && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-4 animate-fade-in">
            <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-sky-600 dark:text-sky-400">
              Thông tin bổ sung
            </h3>

            {/* Container & Exact Position */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tủ / Kệ / Thùng
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Tủ linh kiện A, Kệ B"
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
                  placeholder="Ví dụ: Ngăn 3 → Hộp A3-05"
                  value={exactPosition}
                  onChange={(e) => setExactPosition(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Brand, Model, SKU */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Thương hiệu / Hãng
                </label>
                <input
                  type="text"
                  placeholder="Espressif, Dewalt, Baseus..."
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Model / Mã mẫu
                </label>
                <input
                  type="text"
                  placeholder="ESP-WROOM-32..."
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
                  placeholder="ESP-32-01"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Condition & Purchase Details */}
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
                  placeholder="Ví dụ: 95000"
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

            {/* Barcode & Tags */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mã vạch (Barcode)
                </label>
                <div className="relative">
                  <Barcode className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Quét hoặc nhập số barcode..."
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Thẻ phân loại (Tags, phân cách bằng dấu phẩy)
                </label>
                <div className="relative">
                  <TagIcon className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="esp32, wifi, bluetooth, 5v..."
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ghi chú
              </label>
              <textarea
                rows={2}
                placeholder="Thông số kỹ thuật, nơi mua, lưu ý khi dùng..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
              />
            </div>
          </div>
        )}

        {/* Action Buttons: Lưu & Lưu & thêm tiếp */}
        <div className="sticky bottom-16 md:bottom-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={submitting}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 disabled:opacity-50 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all"
          >
            Lưu & thêm tiếp
          </button>

          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={submitting}
            className="flex-1 sm:flex-none px-6 py-2.5 bg-sky-600 hover:bg-sky-700 active:scale-95 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-sky-600/30 flex items-center justify-center gap-1.5 transition-all"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Lưu vật tư</span>
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewItemPage() {
  return (
    <Suspense fallback={<div className="p-4 text-xs text-slate-400">Đang tải...</div>}>
      <NewItemForm />
    </Suspense>
  );
}
