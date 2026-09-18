import { Html5Qrcode, Html5QrcodeSupportedFormats, Html5QrcodeScannerState } from 'html5-qrcode';
import jsQR from 'jsqr';

export type ScannerStatus =
  | 'idle'
  | 'requesting_permission'
  | 'starting'
  | 'scanning'
  | 'error'
  | 'stopped';

export interface ScannerController {
  stop: () => Promise<void>;
  switchCamera: () => Promise<void>;
  toggleTorch: () => Promise<boolean>;
  getFacingMode: () => 'environment' | 'user';
  hasTorch: () => boolean;
}

const SUPPORTED_FORMATS: Html5QrcodeSupportedFormats[] = [
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
 * Checks if the browser supports camera access and whether the context is secure (HTTPS).
 */
export function checkCameraEnvironment(): { ok: boolean; message?: string } {
  if (typeof window === 'undefined') {
    return { ok: false, message: 'Môi trường không hỗ trợ trình duyệt.' };
  }

  // Check Secure Context (HTTPS or localhost)
  const isLocalhost =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.endsWith('.localhost');

  if (typeof window.isSecureContext !== 'undefined' && !window.isSecureContext && !isLocalhost) {
    return {
      ok: false,
      message:
        'Trình duyệt điện thoại bắt buộc kết nối bảo mật HTTPS để mở Camera. Hãy truy cập trang web bằng đường dẫn https:// (hoặc thiết lập chứng chỉ SSL trên Coolify/Domain).',
    };
  }

  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
    return {
      ok: false,
      message:
        'Trình duyệt này không hỗ trợ API Camera. Hãy thử mở trang web bằng Safari (trên iPhone) hoặc Google Chrome (trên Android).',
    };
  }

  return { ok: true };
}

/**
 * Directly stops all tracks on all MediaStreams and clears video elements
 */
export function stopAllVideoTracksInElement(container: HTMLElement | null) {
  if (!container) return;

  try {
    const videos = container.querySelectorAll('video');
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
        }
        video.srcObject = null;
        video.pause();
        video.src = '';
      } catch {}
    });
  } catch {}
}

/**
 * Creates and starts a camera scanner inside the container element.
 * Provides multi-tier fallback:
 * Tier 1: Html5Qrcode with ideal environment facing mode.
 * Tier 2: Html5Qrcode with explicit back camera ID from getCameras().
 * Tier 3: Native WebRTC MediaStream + Canvas BarcodeDetector/jsQR loop.
 */
export async function createAndStartScanner(
  containerId: string,
  onScanSuccess: (decodedText: string) => void,
  onStatusChange?: (status: ScannerStatus, message?: string) => void,
  initialFacingMode: 'environment' | 'user' = 'environment'
): Promise<ScannerController> {
  const envCheck = checkCameraEnvironment();
  if (!envCheck.ok) {
    onStatusChange?.('error', envCheck.message);
    throw new Error(envCheck.message);
  }

  const container = document.getElementById(containerId);
  if (!container) {
    const msg = `Không tìm thấy phần tử #${containerId} trong giao diện.`;
    onStatusChange?.('error', msg);
    throw new Error(msg);
  }

  onStatusChange?.('requesting_permission', 'Đang yêu cầu quyền truy cập Camera...');

  // State
  let isStopped = false;
  let currentFacing: 'environment' | 'user' = initialFacingMode;
  let html5Instance: Html5Qrcode | null = null;
  let nativeStream: MediaStream | null = null;
  let animFrameId: number | null = null;
  let torchEnabled = false;

  const stopScannerInternal = async () => {
    isStopped = true;

    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }

    if (nativeStream) {
      try {
        nativeStream.getTracks().forEach((t) => {
          try {
            t.enabled = false;
            t.stop();
          } catch {}
        });
      } catch {}
      nativeStream = null;
    }

    if (html5Instance) {
      try {
        let isRunning = false;
        try {
          if (typeof html5Instance.getState === 'function') {
            const state = html5Instance.getState();
            isRunning =
              state === Html5QrcodeScannerState.SCANNING ||
              state === Html5QrcodeScannerState.PAUSED;
          } else {
            isRunning = !!html5Instance.isScanning;
          }
        } catch {
          isRunning = true;
        }

        if (isRunning) {
          await html5Instance.stop().catch(() => {});
        }
      } catch {}

      try {
        html5Instance.clear();
      } catch {}
      html5Instance = null;
    }

    stopAllVideoTracksInElement(document.getElementById(containerId));
    onStatusChange?.('stopped', 'Đã dừng Camera');
  };

  const startEngine = async (facing: 'environment' | 'user') => {
    // --- TIER 1 & 2: Html5Qrcode ---
    try {
      container.innerHTML = '';
      onStatusChange?.('starting', 'Đang kết nối Camera...');

      const qr = new Html5Qrcode(containerId, {
        formatsToSupport: SUPPORTED_FORMATS,
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      });
      html5Instance = qr;

      const qrConfig = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const edge = Math.max(180, Math.floor(minEdge * 0.75));
          return { width: edge, height: edge };
        },
      };

      let started = false;

      // Try A: facingMode ideal
      try {
        await qr.start(
          { facingMode: { ideal: facing } as any },
          qrConfig,
          (text) => {
            if (!isStopped && text) onScanSuccess(text);
          },
          () => {}
        );
        started = true;
      } catch (errA) {
        console.warn('Html5Qrcode facingMode start failed, trying camera list...', errA);
      }

      // Try B: query cameras and pick target camera
      if (!started) {
        const cameras = await Html5Qrcode.getCameras().catch(() => []);
        if (cameras && cameras.length > 0) {
          let chosenCam = cameras[0];
          if (facing === 'environment') {
            chosenCam =
              cameras.find((c) => {
                const label = (c.label || '').toLowerCase();
                return (
                  label.includes('back') ||
                  label.includes('rear') ||
                  label.includes('sau') ||
                  label.includes('environment') ||
                  label.includes('0')
                );
              }) || cameras[cameras.length - 1];
          } else {
            chosenCam =
              cameras.find((c) => {
                const label = (c.label || '').toLowerCase();
                return (
                  label.includes('front') ||
                  label.includes('trước') ||
                  label.includes('user') ||
                  label.includes('selfie')
                );
              }) || cameras[0];
          }

          await qr.start(
            chosenCam.id,
            qrConfig,
            (text) => {
              if (!isStopped && text) onScanSuccess(text);
            },
            () => {}
          );
          started = true;
        }
      }

      if (started && !isStopped) {
        onStatusChange?.('scanning', 'Camera đang hoạt động');
        return;
      }
    } catch (html5Err) {
      console.warn('Html5Qrcode failed, falling back to Tier 3 (Direct WebRTC)...', html5Err);
    }

    // --- TIER 3: Direct Native WebRTC Video + Canvas Scanner Fallback ---
    try {
      container.innerHTML = '';
      onStatusChange?.('starting', 'Đang khởi động Camera trực tiếp...');

      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      nativeStream = stream;

      if (isStopped) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      // Create video element with strict mobile settings
      const video = document.createElement('video');
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('autoplay', 'true');
      video.setAttribute('muted', 'true');
      video.muted = true;
      video.srcObject = stream;
      video.className = 'w-full h-full object-cover rounded-2xl';
      container.appendChild(video);

      await video.play().catch(() => {});

      // Create hidden canvas for frame analysis
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      // Check Native BarcodeDetector
      let nativeDetector: any = null;
      if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
        try {
          nativeDetector = new (window as any).BarcodeDetector({
            formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e'],
          });
        } catch {}
      }

      let lastScanTime = 0;

      const scanFrameLoop = async () => {
        if (isStopped) return;

        const now = Date.now();
        // Scan every 100ms
        if (now - lastScanTime >= 100 && video.readyState >= video.HAVE_CURRENT_DATA && video.videoWidth > 0) {
          lastScanTime = now;
          const vw = video.videoWidth;
          const vh = video.videoHeight;

          // Downscale canvas for fast jsQR processing
          const scale = Math.min(1, 640 / Math.max(vw, vh));
          const cw = Math.round(vw * scale);
          const ch = Math.round(vh * scale);

          canvas.width = cw;
          canvas.height = ch;

          if (ctx) {
            ctx.drawImage(video, 0, 0, cw, ch);

            // 1. Try Native BarcodeDetector first (extremely fast hardware acceleration)
            if (nativeDetector) {
              try {
                const barcodes = await nativeDetector.detect(canvas);
                if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                  const val = barcodes[0].rawValue.trim();
                  if (val && !isStopped) {
                    onScanSuccess(val);
                  }
                }
              } catch {}
            }

            // 2. Fallback to jsQR
            try {
              const imgData = ctx.getImageData(0, 0, cw, ch);
              const code = jsQR(imgData.data, imgData.width, imgData.height, {
                inversionAttempts: 'attemptBoth',
              });
              if (code && code.data) {
                const val = code.data.trim();
                if (val && !isStopped) {
                  onScanSuccess(val);
                }
              }
            } catch {}
          }
        }

        if (!isStopped) {
          animFrameId = requestAnimationFrame(scanFrameLoop);
        }
      };

      animFrameId = requestAnimationFrame(scanFrameLoop);
      onStatusChange?.('scanning', 'Camera đang hoạt động');
    } catch (nativeErr: any) {
      console.error('All camera initialization tiers failed:', nativeErr);
      await stopScannerInternal();
      const message =
        nativeErr?.name === 'NotAllowedError' || nativeErr?.name === 'PermissionDeniedError'
          ? 'Quyền truy cập Camera đã bị từ chối. Vui lòng cho phép quyền truy cập Camera trong cài đặt trình duyệt của bạn.'
          : nativeErr?.name === 'NotFoundError' || nativeErr?.name === 'DevicesNotFoundError'
          ? 'Không tìm thấy thiết bị Camera trên máy này.'
          : nativeErr?.message || 'Không thể kết nối với Camera.';

      onStatusChange?.('error', message);
      throw new Error(message);
    }
  };

  // Launch initial engine
  await startEngine(currentFacing);

  return {
    stop: stopScannerInternal,
    switchCamera: async () => {
      const nextFacing = currentFacing === 'environment' ? 'user' : 'environment';
      currentFacing = nextFacing;
      isStopped = false;

      // Clean up previous without setting isStopped permanently
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
      if (nativeStream) {
        nativeStream.getTracks().forEach((t) => t.stop());
        nativeStream = null;
      }
      if (html5Instance) {
        try {
          await html5Instance.stop().catch(() => {});
          html5Instance.clear();
        } catch {}
        html5Instance = null;
      }
      stopAllVideoTracksInElement(document.getElementById(containerId));

      await startEngine(nextFacing);
    },
    toggleTorch: async () => {
      try {
        let track: MediaStreamTrack | null = null;
        if (nativeStream) {
          track = nativeStream.getVideoTracks()[0] || null;
        } else if (html5Instance) {
          // Check video in container
          const vid = document.getElementById(containerId)?.querySelector('video');
          if (vid && vid.srcObject) {
            track = (vid.srcObject as MediaStream).getVideoTracks()[0] || null;
          }
        }

        if (track && 'applyConstraints' in track) {
          const capabilities = (track as any).getCapabilities ? (track as any).getCapabilities() : {};
          if (capabilities.torch) {
            torchEnabled = !torchEnabled;
            await (track as any).applyConstraints({
              advanced: [{ torch: torchEnabled }],
            });
            return torchEnabled;
          }
        }
      } catch (e) {
        console.warn('Torch toggle failed', e);
      }
      return false;
    },
    getFacingMode: () => currentFacing,
    hasTorch: () => {
      try {
        const vid = document.getElementById(containerId)?.querySelector('video');
        if (vid && vid.srcObject) {
          const track = (vid.srcObject as MediaStream).getVideoTracks()[0];
          if (track && (track as any).getCapabilities) {
            return !!(track as any).getCapabilities().torch;
          }
        }
      } catch {}
      return false;
    },
  };
}
