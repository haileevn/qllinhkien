import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats,
  Html5QrcodeScannerState,
} from 'html5-qrcode';

/**
 * Standard formats to decode across all scanners
 */
export const SUPPORTED_SCAN_FORMATS: Html5QrcodeSupportedFormats[] = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
];

/**
 * Check if the current browser context allows camera access
 */
export function isCameraSupported(): { supported: boolean; reason?: string } {
  if (typeof window === 'undefined') {
    return { supported: false, reason: 'Môi trường không hỗ trợ trình duyệt.' };
  }

  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
    // Check if insecure context (HTTP instead of HTTPS)
    if (
      typeof window.isSecureContext !== 'undefined' &&
      !window.isSecureContext &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      return {
        supported: false,
        reason:
          'Trình duyệt điện thoại yêu cầu kết nối bảo mật HTTPS để mở Camera. Hãy truy cập qua tên miền có https://.',
      };
    }
    return {
      supported: false,
      reason: 'Trình duyệt này không hỗ trợ API Camera (MediaDevices).',
    };
  }

  return { supported: true };
}

/**
 * Forcibly stops all MediaStream video tracks in DOM video elements
 * and detaches the streams to ensure the camera hardware light turns off immediately.
 */
export function forceStopMediaTracks(containerId?: string) {
  if (typeof window === 'undefined') return;

  try {
    // 1. Check specific container if provided
    if (containerId) {
      const el = document.getElementById(containerId);
      if (el) {
        const videos = el.querySelectorAll('video');
        videos.forEach((video) => {
          try {
            if (video.srcObject && 'getTracks' in (video.srcObject as any)) {
              const stream = video.srcObject as MediaStream;
              stream.getTracks().forEach((track) => {
                try {
                  track.enabled = false;
                  track.stop();
                } catch {}
              });
              video.srcObject = null;
            }
            video.pause();
            video.src = '';
          } catch {}
        });
        el.innerHTML = '';
      }
    }

    // 2. Also check any other video elements that might have been attached by scanner
    const allVideos = document.querySelectorAll('video');
    allVideos.forEach((video) => {
      try {
        if (video.srcObject && 'getTracks' in (video.srcObject as any)) {
          const stream = video.srcObject as MediaStream;
          stream.getTracks().forEach((track) => {
            try {
              track.enabled = false;
              track.stop();
            } catch {}
          });
          video.srcObject = null;
        }
      } catch {}
    });
  } catch {}
}

/**
 * Safely stops and clears an Html5Qrcode instance, handling all lifecycle states
 */
export async function stopHtml5QrcodeSafely(
  scannerInstance: Html5Qrcode | null,
  containerId?: string
): Promise<void> {
  if (scannerInstance) {
    try {
      let isRunning = false;
      try {
        if (typeof scannerInstance.getState === 'function') {
          const state = scannerInstance.getState();
          isRunning =
            state === Html5QrcodeScannerState.SCANNING ||
            state === Html5QrcodeScannerState.PAUSED;
        } else {
          isRunning = !!scannerInstance.isScanning;
        }
      } catch {
        isRunning = true;
      }

      if (isRunning) {
        await scannerInstance.stop().catch(() => {});
      }
    } catch {}

    try {
      scannerInstance.clear();
    } catch {}
  }

  forceStopMediaTracks(containerId);
}

/**
 * Robustly starts camera scanning with multi-camera fallback on smartphones.
 * Tries facingMode 'environment' -> back camera ID -> any available camera.
 */
export async function startScannerWithFallback(
  elementId: string,
  onScanSuccess: (decodedText: string) => void,
  onScanError?: (error: any) => void
): Promise<Html5Qrcode> {
  const check = isCameraSupported();
  if (!check.supported) {
    throw new Error(check.reason || 'Camera không được hỗ trợ trên thiết bị này.');
  }

  const container = document.getElementById(elementId);
  if (!container) {
    throw new Error(`Không tìm thấy thẻ hiển thị camera #${elementId}`);
  }
  container.innerHTML = '';

  const html5QrCode = new Html5Qrcode(elementId, {
    formatsToSupport: SUPPORTED_SCAN_FORMATS,
    verbose: false,
    experimentalFeatures: {
      useBarCodeDetectorIfSupported: true,
    },
  });

  const config = {
    fps: 12,
    qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
      const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
      const edge = Math.max(180, Math.floor(minEdge * 0.72));
      return { width: edge, height: edge };
    },
    aspectRatio: 1.0,
  };

  const successCb = (decodedText: string) => {
    onScanSuccess(decodedText);
  };
  const errorCb = () => {
    if (onScanError) onScanError(null);
  };

  // Attempt 1: Start with facingMode 'environment' (standard for mobile back camera)
  try {
    await html5QrCode.start({ facingMode: 'environment' }, config, successCb, errorCb);
    return html5QrCode;
  } catch (err1) {
    console.warn('facingMode environment start failed, attempting camera list fallback...', err1);
  }

  // Attempt 2: Query camera devices and pick back camera
  try {
    const devices = await Html5Qrcode.getCameras();
    if (devices && devices.length > 0) {
      // Find back camera by label
      const backCamera =
        devices.find((d) => {
          const lbl = (d.label || '').toLowerCase();
          return (
            lbl.includes('back') ||
            lbl.includes('rear') ||
            lbl.includes('sau') ||
            lbl.includes('environment') ||
            lbl.includes('0')
          );
        }) || devices[devices.length - 1]; // Often the last camera in list is back camera on mobile

      const targetCameraId = backCamera?.id || devices[0].id;
      await html5QrCode.start(targetCameraId, config, successCb, errorCb);
      return html5QrCode;
    }
  } catch (err2) {
    console.warn('Camera device fallback failed, trying generic facingMode user...', err2);
  }

  // Attempt 3: Generic fallback
  try {
    await html5QrCode.start({ facingMode: 'user' }, config, successCb, errorCb);
    return html5QrCode;
  } catch (err3: any) {
    console.error('All camera start attempts failed:', err3);
    await stopHtml5QrcodeSafely(html5QrCode, elementId);
    throw new Error(
      err3?.message ||
        'Không thể mở camera. Vui lòng cấp quyền truy cập Camera trong trình duyệt điện thoại.'
    );
  }
}
