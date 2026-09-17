import jsQR from 'jsqr';
import { Html5Qrcode } from 'html5-qrcode';

/**
 * Loads a File into an HTMLImageElement
 */
function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Không thể tải ảnh'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Lỗi đọc tệp ảnh'));
    reader.readAsDataURL(file);
  });
}

/**
 * Multi-pass Barcode and QR code scanner from an image File.
 * Highly robust against high resolutions, rotations, poor contrast, and different barcode formats.
 */
export async function scanBarcodeFromImage(file: File): Promise<string> {
  const img = await loadImageFromFile(file);

  // --- PASS 1: Native Browser BarcodeDetector (Chrome, Android, iOS 17+, Edge) ---
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const formats = [
        'qr_code',
        'ean_13',
        'ean_8',
        'code_128',
        'code_39',
        'code_93',
        'upc_a',
        'upc_e',
        'itf',
        'data_matrix',
        'aztec',
      ];
      const barcodeDetector = new (window as any).BarcodeDetector({ formats });
      const barcodes = await barcodeDetector.detect(img);
      if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
        return barcodes[0].rawValue;
      }
    } catch (e) {
      console.warn('Native BarcodeDetector pass failed, continuing to jsQR...', e);
    }
  }

  // Helper: Try jsQR on a canvas with specific dimensions and filter
  const tryJsQROnCanvas = (targetWidth: number, targetHeight: number, filter?: (ctx: CanvasRenderingContext2D, width: number, height: number) => void): string | null => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return null;

      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      if (filter) {
        filter(ctx, targetWidth, targetHeight);
      }

      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      });

      if (code && code.data) {
        return code.data;
      }
    } catch {
      // Ignore individual canvas pass errors
    }
    return null;
  };

  // --- PASS 2: jsQR on original dimensions (capped to max 1600px) ---
  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;

  let scale1 = 1;
  if (origW > 1600 || origH > 1600) {
    scale1 = 1600 / Math.max(origW, origH);
  }
  const w1 = Math.round(origW * scale1);
  const h1 = Math.round(origH * scale1);

  const res1 = tryJsQROnCanvas(w1, h1);
  if (res1) return res1;

  // --- PASS 3: jsQR on normalized 800px dimension (optimal for high-res smartphone photos) ---
  if (origW > 900 || origH > 900) {
    const scale2 = 800 / Math.max(origW, origH);
    const w2 = Math.round(origW * scale2);
    const h2 = Math.round(origH * scale2);
    const res2 = tryJsQROnCanvas(w2, h2);
    if (res2) return res2;
  }

  // --- PASS 4: jsQR on high-contrast / grayscale image ---
  const res3 = tryJsQROnCanvas(w1, h1, (ctx, width, height) => {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    // Apply contrast boost and grayscale
    const contrast = 1.3; // +30% contrast
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
      const boosted = factor * (avg - 128) + 128;
      const clamped = Math.min(255, Math.max(0, boosted));
      data[i] = clamped;
      data[i + 1] = clamped;
      data[i + 2] = clamped;
    }
    ctx.putImageData(imgData, 0, 0);
  });
  if (res3) return res3;

  // --- PASS 5: Html5Qrcode scanFile fallback ---
  try {
    const tempId = `temp-qr-file-reader-${Date.now()}`;
    const tempDiv = document.createElement('div');
    tempDiv.id = tempId;
    tempDiv.style.display = 'none';
    document.body.appendChild(tempDiv);

    try {
      const html5Qr = new Html5Qrcode(tempId);
      const decoded = await html5Qr.scanFile(file, false);
      html5Qr.clear();
      tempDiv.remove();
      if (decoded) return decoded;
    } catch {
      tempDiv.remove();
    }
  } catch {}

  throw new Error('Không phát hiện được mã vạch hoặc mã QR trong ảnh này. Vui lòng chụp rõ hơn hoặc căn chỉnh góc thẳng.');
}
