/**
 * Web NFC Helper & Utilities for H2T Inventory
 */

// Safe type definitions for Web NFC API
export interface NDEFRecordInit {
  recordType: 'text' | 'url' | 'mime' | 'empty' | 'unknown' | string;
  mediaType?: string;
  data?: any;
  id?: string;
  encoding?: string;
  lang?: string;
}

export interface NDEFMessageInit {
  records: NDEFRecordInit[];
}

export interface NDEFReadingEvent extends Event {
  serialNumber: string;
  message: {
    records: Array<{
      recordType: string;
      mediaType?: string;
      id?: string;
      data?: DataView;
      encoding?: string;
      lang?: string;
    }>;
  };
}

declare global {
  interface Window {
    NDEFReader?: {
      new (): {
        scan(options?: { signal?: AbortSignal }): Promise<void>;
        write(
          message: string | NDEFMessageInit,
          options?: { signal?: AbortSignal; overwrite?: boolean }
        ): Promise<void>;
        addEventListener(
          type: 'reading' | 'readingerror',
          listener: (event: any) => void,
          options?: boolean | AddEventListenerOptions
        ): void;
        removeEventListener(
          type: 'reading' | 'readingerror',
          listener: (event: any) => void
        ): void;
      };
    };
  }
}

/**
 * Checks if the browser supports Web NFC
 */
export function isNfcSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'NDEFReader' in window;
}

/**
 * Writes target URL and record data to an NFC Tag
 */
export async function writeNfcTag(
  url: string,
  extraText?: string,
  abortSignal?: AbortSignal
): Promise<void> {
  if (!isNfcSupported() || !window.NDEFReader) {
    throw new Error(
      'Trình duyệt này chưa hỗ trợ Web NFC trực tiếp. Bạn có thể sao chép liên kết và dùng app "NFC Tools" miễn phí trên điện thoại.'
    );
  }

  const ndef = new window.NDEFReader();

  const records: NDEFRecordInit[] = [
    {
      recordType: 'url',
      data: url,
    },
  ];

  if (extraText) {
    records.push({
      recordType: 'text',
      data: extraText,
    });
  }

  await ndef.write(
    { records },
    { signal: abortSignal, overwrite: true }
  );
}

/**
 * Decodes text or url from an NDEF record
 */
export function decodeNdefRecord(record: any): string | null {
  try {
    if (record.recordType === 'url' || record.recordType === 'text') {
      if (record.data instanceof DataView) {
        const textDecoder = new TextDecoder(record.encoding || 'utf-8');
        return textDecoder.decode(record.data);
      }
      if (typeof record.data === 'string') {
        return record.data;
      }
    }
  } catch (err) {
    console.error('Error decoding NDEF record:', err);
  }
  return null;
}
