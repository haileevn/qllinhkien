import { Html5Qrcode } from 'html5-qrcode';

/**
 * Forcibly stops all MediaStream video tracks inside a container element (or the document)
 * and detaches the stream from any video elements to ensure the camera hardware is released immediately.
 */
export function forceStopMediaTracks(containerId?: string) {
  if (typeof window === 'undefined') return;

  try {
    const root = containerId ? document.getElementById(containerId) : document;
    if (root) {
      const videos = root.querySelectorAll('video');
      videos.forEach((video) => {
        try {
          if (video.srcObject && 'getTracks' in (video.srcObject as MediaStream)) {
            const stream = video.srcObject as MediaStream;
            stream.getTracks().forEach((track) => {
              try {
                track.stop();
              } catch {}
            });
            video.srcObject = null;
          }
          video.pause();
          video.src = '';
          video.load();
          video.remove();
        } catch {}
      });
    }
  } catch {}
}

/**
 * Safely stops and clears an Html5Qrcode instance, catching any DOMException or lifecycle error,
 * and ensures all underlying MediaStream tracks are terminated.
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
          // Html5QrcodeScannerState: SCANNING = 2, PAUSED = 3
          isRunning = state === 2 || state === 3;
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

  // Always force-stop any hardware media tracks remaining in the DOM container
  forceStopMediaTracks(containerId);
}
