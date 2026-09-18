import { Html5Qrcode } from 'html5-qrcode';

// Set to hold all active MediaStream objects created in the browser tab
const activeMediaStreams = new Set<MediaStream>();
let stopAllStreamsRequested = false;

// Ensure getUserMedia is intercepted to track all hardware camera streams
if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.mediaDevices) {
  const mediaDevicesAny = navigator.mediaDevices as any;
  if (!mediaDevicesAny.__isStreamTrackerInstalled && typeof mediaDevicesAny.getUserMedia === 'function') {
    const originalGetUserMedia = mediaDevicesAny.getUserMedia.bind(navigator.mediaDevices);

    mediaDevicesAny.getUserMedia = async function (constraints: MediaStreamConstraints) {
      stopAllStreamsRequested = false;
      const stream: MediaStream = await originalGetUserMedia(constraints);

      if (stopAllStreamsRequested) {
        // If stop was requested while getUserMedia was resolving, stop tracks immediately
        try {
          if (stream && typeof stream.getTracks === 'function') {
            stream.getTracks().forEach((t) => {
              try {
                t.stop();
                t.enabled = false;
              } catch {}
            });
          }
        } catch {}
        return stream;
      }

      if (stream && typeof stream.getTracks === 'function') {
        activeMediaStreams.add(stream);

        // Auto-remove stream from set once all its tracks have ended
        stream.getTracks().forEach((track) => {
          track.addEventListener('ended', () => {
            try {
              const allEnded = stream.getTracks().every((t) => t.readyState === 'ended');
              if (allEnded) {
                activeMediaStreams.delete(stream);
              }
            } catch {}
          });
        });
      }
      return stream;
    };

    mediaDevicesAny.__isStreamTrackerInstalled = true;
  }
}

/**
 * Forcibly stops ALL active browser MediaStream camera/mic tracks globally.
 * This physically extinguishes the browser's green camera indicator dot.
 */
export function stopAllGlobalMediaStreams() {
  if (typeof window === 'undefined') return;

  stopAllStreamsRequested = true;

  activeMediaStreams.forEach((stream) => {
    try {
      if (stream && typeof stream.getTracks === 'function') {
        stream.getTracks().forEach((track) => {
          try {
            track.enabled = false;
            track.stop();
          } catch {}
        });
      }
    } catch {}
  });

  activeMediaStreams.clear();
}

/**
 * Forcibly stops all MediaStream video tracks inside a container element (or the document)
 * and detaches the stream from any video elements to ensure the camera hardware is released immediately.
 */
export function forceStopMediaTracks(containerId?: string) {
  if (typeof window === 'undefined') return;

  try {
    // 1. Search in specific container if provided and still mounted
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
            video.load();
            video.remove();
          } catch {}
        });
        el.innerHTML = '';
      }
    }

    // 2. Also search all remaining video elements across document
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
          video.pause();
          video.src = '';
          video.load();
        }
      } catch {}
    });
  } catch {}

  // 3. Fallback: stop all registered MediaStreams
  stopAllGlobalMediaStreams();
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

  // Always force-stop any hardware media tracks remaining in the DOM container or browser memory
  forceStopMediaTracks(containerId);
}

