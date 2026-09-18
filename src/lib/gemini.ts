import { GoogleGenAI } from '@google/genai';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';

export interface ComponentAnalysisResult {
  name: string;
  brand?: string;
  model?: string;
  sku?: string;
  suggestedCategoryId?: string;
  suggestedCategoryName?: string;
  unit: string;
  summary: string;
  specs: Record<string, string>;
  notes: string;
  pinout?: string;
  tags: string[];
  applications?: string[];
  datasheetKeywords?: string;
}

export interface AnalyzeComponentParams {
  title?: string;
  imageUrl?: string;
  imageBase64?: string;
  mimeType?: string;
  existingNotes?: string;
  categories?: { id: string; name: string }[];
}

/**
 * Retrieves the active Gemini API Key.
 * Priority: Database AppSetting ('GEMINI_API_KEY') -> process.env.GEMINI_API_KEY
 */
export async function getGeminiApiKey(): Promise<string | null> {
  try {
    const setting = await prisma.appSetting.findUnique({
      where: { key: 'GEMINI_API_KEY' },
    });
    if (setting?.value && setting.value.trim()) {
      return setting.value.trim();
    }
  } catch (err) {
    console.warn('Could not read GEMINI_API_KEY from AppSetting:', err);
  }

  const envKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (envKey && envKey.trim()) {
    return envKey.trim();
  }

  return null;
}

/**
 * Saves or updates the Gemini API Key in the database
 */
export async function saveGeminiApiKey(apiKey: string): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key: 'GEMINI_API_KEY' },
    update: { value: apiKey.trim() },
    create: {
      key: 'GEMINI_API_KEY',
      value: apiKey.trim(),
      description: 'Google Gemini API Key for AI component identification and lookup',
    },
  });
}

/**
 * Tests the Gemini API Key connection with a minimal prompt
 */
export async function testGeminiConnection(customApiKey?: string): Promise<{ success: boolean; model: string; error?: string }> {
  const apiKey = customApiKey || (await getGeminiApiKey());
  if (!apiKey) {
    return { success: false, model: 'gemini-2.5-flash', error: 'Chưa cấu hình Gemini API Key' };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Respond with exactly the word "PONG"',
    });

    if (response && response.text) {
      return { success: true, model: 'gemini-2.5-flash' };
    }
    return { success: false, model: 'gemini-2.5-flash', error: 'Không nhận được phản hồi từ Gemini API' };
  } catch (err: any) {
    return {
      success: false,
      model: 'gemini-2.5-flash',
      error: err?.message || 'Lỗi xác thực hoặc kết nối Google Gemini API',
    };
  }
}

/**
 * Helper to convert an image URL or local upload path to base64 inline data for Gemini
 */
async function resolveImageForGemini(
  imageUrl?: string,
  imageBase64?: string,
  mimeType?: string
): Promise<{ data: string; mimeType: string } | null> {
  if (imageBase64) {
    let cleanBase64 = imageBase64;
    let detectedMime = mimeType || 'image/jpeg';
    if (imageBase64.startsWith('data:')) {
      const parts = imageBase64.split(';base64,');
      detectedMime = parts[0].replace('data:', '') || detectedMime;
      cleanBase64 = parts[1] || imageBase64;
    }
    return { data: cleanBase64, mimeType: detectedMime };
  }

  if (!imageUrl) return null;

  try {
    // 1. Check if local uploaded file
    if (imageUrl.startsWith('/uploads/') || imageUrl.startsWith('uploads/')) {
      const filename = path.basename(imageUrl);
      const filePath = path.join(process.cwd(), 'public', 'uploads', filename);
      const fileBuffer = await fs.readFile(filePath);
      const ext = path.extname(filename).toLowerCase().replace('.', '');
      const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      return {
        data: fileBuffer.toString('base64'),
        mimeType: mime,
      };
    }

    // 2. If it's a base64 data url directly in imageUrl
    if (imageUrl.startsWith('data:image/')) {
      const parts = imageUrl.split(';base64,');
      const mime = parts[0].replace('data:', '');
      return { data: parts[1], mimeType: mime };
    }

    // 3. Remote HTTP/HTTPS URL
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      const res = await fetch(imageUrl);
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        const contentType = res.headers.get('content-type') || 'image/jpeg';
        return {
          data: buffer.toString('base64'),
          mimeType: contentType,
        };
      }
    }
  } catch (e) {
    console.warn('Failed to resolve image for Gemini analysis:', e);
  }

  return null;
}

/**
 * Analyzes an electronic component or lab item using Google Gemini Multimodal AI.
 * Extracts technical specs, brand, model, pinout, usage guide, and tags from title and/or image.
 */
export async function analyzeComponentWithAI(
  params: AnalyzeComponentParams,
  customApiKey?: string
): Promise<ComponentAnalysisResult> {
  const apiKey = customApiKey || (await getGeminiApiKey());
  if (!apiKey) {
    throw new Error('Chưa cấu hình Google Gemini API Key. Vui lòng vào Cài đặt để thêm API Key.');
  }

  const { title, imageUrl, imageBase64, mimeType, existingNotes, categories } = params;

  if (!title && !imageUrl && !imageBase64) {
    throw new Error('Vui lòng cung cấp ít nhất tiêu đề hoặc ảnh linh kiện để phân tích.');
  }

  const imagePart = await resolveImageForGemini(imageUrl, imageBase64, mimeType);

  const categoryListText = categories && categories.length > 0
    ? `Available categories in this inventory system:\n` +
      categories.map((c) => `- ID: "${c.id}", Name: "${c.name}"`).join('\n')
    : 'No predefined category list provided.';

  const systemInstruction = `You are a world-class senior electronic engineer, hardware developer, and components cataloging expert for an advanced electronics lab & inventory management system (H2T Home Inventory).
Your mission is to accurately identify electronic components, ICs, microcontrollers, development boards, modules, sensors, passive components (resistors, capacitors, inductors), connectors, mechanical parts, and tools from provided titles, images, and existing notes.

Analyze all available inputs (text and/or image of component, IC markings, datasheet label, PCB text).
Extract comprehensive technical information, generate well-structured specifications, and provide practical usage notes in Vietnamese.

Respond with a strictly valid JSON object matching this schema:
{
  "name": "Standardized, clear, professional name of the component in Vietnamese/English (e.g. 'Module Thu Phát WiFi BLE ESP32-WROOM-32D', 'IC Dịch Bít 74HC595 SOP-16', 'Cảm biến Nhiệt độ Độ ẩm DHT22 / AM2302')",
  "brand": "Manufacturer / Brand name if identifiable (e.g. 'Espressif', 'Texas Instruments', 'STMicroelectronics', 'NXP', 'Aosong', 'Microchip', 'Arduino')",
  "model": "Exact Part Number or Model (e.g. 'ESP32-WROOM-32D', '74HC595D', 'DHT22', 'TP4056', 'NE555P', 'LM2596S-5.0')",
  "sku": "Suggested short SKU / part code (e.g. 'IC-74HC595-SOP16', 'MOD-ESP32-WROOM32D')",
  "suggestedCategoryId": "The ID of the most relevant category from the provided list, or empty string if no good match",
  "suggestedCategoryName": "The name of the best fitting category (e.g. 'Vi điều khiển / MCU', 'IC Chức năng', 'Cảm biến', 'Module Nguồn', 'Linh kiện dán SMD', 'Đầu nối / Jack cắm')",
  "unit": "Appropriate inventory unit in Vietnamese: 'cái' (default for ICs/modules), 'thanh', 'cuộn', 'bộ', 'gói', 'mét', 'hộp', 'sợi'",
  "summary": "Concise 1-2 sentence overview in Vietnamese explaining what this item is and its primary function",
  "specs": {
    "Điện áp hoạt động": "e.g. 3.0V - 3.6V (hoặc 5V DC)",
    "Dòng điện tiêu thụ": "e.g. 80mA (Peak 500mA khi phát RF)",
    "Kiểu đóng gói / Package": "e.g. SMD 38-Pin / SOP-16 / DIP-8 / Module có chân cắm",
    "Giao tiếp / Interface": "e.g. UART, SPI, I2C, PWM, ADC, DAC",
    "Tần số / Tốc độ": "e.g. 240MHz Dual-Core Xtensa LX6",
    "Nhiệt độ hoạt động": "e.g. -40°C ~ +85°C"
  },
  "pinout": "Brief pinout description or key connection pins (e.g. 'VCC: 3.3V, GND: Mass, EN: Kích hoạt chip, TX0/RX0: Nạp code qua UART, GPIO...'). If not applicable, provide brief wiring notes.",
  "notes": "A well-structured, beautiful markdown technical documentation note in Vietnamese. Include: Overview, Key Specs Table/List, Pinout Guide, and Important Practical Tips (e.g. decoupling capacitors, voltage level shifting, heat dissipation).",
  "tags": ["Array of 4-8 relevant search tags, e.g. 'ESP32', 'WiFi', 'Bluetooth', 'IoT', 'Espressif', 'SMD', 'Vi điều khiển'"],
  "applications": ["Array of 3-5 typical applications, e.g. 'Thiết bị IoT nhà thông minh', 'Bộ điều khiển kết nối không dây', 'Gateway BLE']",
  "datasheetKeywords": "Search keywords to find official datasheet (e.g. 'ESP32-WROOM-32D datasheet pdf Espressif')"
}

Guidelines:
- If an image contains component markings or label numbers, prioritize OCR from the image.
- If only a title is provided, infer full technical specs based on established engineering datasheets.
- Ensure all technical specs (voltage, current, logic levels) are accurate and safe for engineers to follow.
- Output ONLY the raw JSON object, without any markdown formatting wrappers or backticks.`;

  const userPromptText = `Please analyze this component and extract full specifications:
Input Title / Description: ${title || '(No title provided, please inspect image)'}
${existingNotes ? `Existing User Notes: ${existingNotes}` : ''}
${categoryListText}`;

  const ai = new GoogleGenAI({ apiKey });

  const contents: any[] = [];

  if (imagePart) {
    contents.push({
      inlineData: {
        data: imagePart.data,
        mimeType: imagePart.mimeType,
      },
    });
  }

  contents.push(userPromptText);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.2, // Low temperature for high factual accuracy
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '';
    if (!responseText.trim()) {
      throw new Error('Gemini không trả về nội dung phân tích.');
    }

    // Clean up response text if wrapped in code blocks
    let cleanJson = responseText.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed: ComponentAnalysisResult = JSON.parse(cleanJson);
    return parsed;
  } catch (err: any) {
    console.error('Gemini analysis error:', err);
    throw new Error(`Lỗi phân tích AI: ${err?.message || 'Không thể xử lý yêu cầu'}`);
  }
}
