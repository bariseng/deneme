// ─── OCR Provider ─────────────────────────────────────────
// PDF → metin extraction (pdf-parse)
// Görüntü → metin (Tesseract.js veya Google Cloud Vision)
// Türkçe karakter desteği

import { ProviderCache } from "./cache";

// ─── Types ──────────────────────────────────────────────────

export interface OcrResult {
  text: string;
  confidence: number; // 0-100
  pageCount: number;
  language: string;
  keywords: string[];
  processingTime: number; // ms
}

// ─── Config ─────────────────────────────────────────────────

const cache = new ProviderCache();

// Procurement-related Turkish keywords for extraction
const PROCUREMENT_KEYWORDS = [
  "ihale", "teklif", "şartname", "yaklaşık maliyet", "geçici teminat",
  "kesin teminat", "iş deneyim", "birim fiyat", "sözleşme", "fatura",
  "kdv", "damga vergisi", "muayene", "kabul", "hak ediş", "zeyilname",
  "idari şartname", "teknik şartname", "ön yeterlik", "teklif mektubu",
  "bilanço", "ciro", "iş bitirme", "alt yüklenici", "konsorsiyum",
  "ortak girişim", "banka referans", "sgk", "vergi borcu",
];

// ─── PDF Text Extraction ────────────────────────────────────

export async function extractTextFromPdf(buffer: Buffer): Promise<OcrResult> {
  const startTime = Date.now();

  // Dynamic import for pdf-parse
  const pdfParseModule = await import("pdf-parse");
  const pdfParse = "default" in pdfParseModule ? pdfParseModule.default : pdfParseModule;

  const data = await (pdfParse as (buf: Buffer) => Promise<{ text: string; numpages: number }>)(buffer);

  const text = data.text || "";
  const pageCount = data.numpages || 1;
  const keywords = extractKeywords(text);

  return {
    text,
    confidence: text.length > 100 ? 95 : text.length > 10 ? 70 : 30,
    pageCount,
    language: "tr",
    keywords,
    processingTime: Date.now() - startTime,
  };
}

// ─── Image OCR (Tesseract.js) ───────────────────────────────

export async function extractTextFromImage(buffer: Buffer, mimeType: string): Promise<OcrResult> {
  const startTime = Date.now();

  const cacheKey = `ocr:img:${Buffer.from(buffer).slice(0, 100).toString("hex")}`;
  const cached = await cache.get<OcrResult>(cacheKey);
  if (cached) return { ...cached, processingTime: 0 };

  // Dynamic import for Tesseract.js
  const Tesseract = await import("tesseract.js");

  const worker = await Tesseract.createWorker("tur", undefined, {
    // Turkish language for better accuracy
  });

  const { data } = await worker.recognize(buffer);
  await worker.terminate();

  const text = data.text || "";
  const keywords = extractKeywords(text);

  const result: OcrResult = {
    text,
    confidence: data.confidence || 0,
    pageCount: 1,
    language: "tr",
    keywords,
    processingTime: Date.now() - startTime,
  };

  await cache.set(cacheKey, result, { ttl: 86400, staleWhileRevalidate: true, key: "ocr" }, "OCR");
  return result;
}

// ─── Google Cloud Vision (Alternative) ──────────────────────

export async function extractTextWithVision(buffer: Buffer): Promise<OcrResult> {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_VISION_API_KEY tanımlanmalı");

  const startTime = Date.now();
  const base64Image = buffer.toString("base64");

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64Image },
            features: [{ type: "TEXT_DETECTION", maxResults: 1 }],
            imageContext: { languageHints: ["tr"] },
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Google Vision API hatası: ${response.status}`);
  }

  const data = await response.json();
  const annotation = data.responses?.[0]?.fullTextAnnotation;
  const text = annotation?.text || "";
  const keywords = extractKeywords(text);

  // Page count from annotation pages
  const pageCount = annotation?.pages?.length || 1;

  // Confidence from block-level confidence
  const blocks = annotation?.pages?.[0]?.blocks || [];
  const avgConfidence = blocks.length > 0
    ? blocks.reduce((sum: number, b: { confidence?: number }) => sum + (b.confidence || 0), 0) / blocks.length
    : text.length > 50 ? 0.85 : 0.5;

  return {
    text,
    confidence: Math.round(avgConfidence * 100),
    pageCount,
    language: "tr",
    keywords,
    processingTime: Date.now() - startTime,
  };
}

// ─── Auto-detect and Process ────────────────────────────────

export async function processDocument(
  buffer: Buffer,
  mimeType: string,
): Promise<OcrResult> {
  // PDF → pdf-parse
  if (mimeType === "application/pdf") {
    return extractTextFromPdf(buffer);
  }

  // Images → Tesseract.js (or Vision API if available)
  if (mimeType.startsWith("image/")) {
    if (process.env.GOOGLE_VISION_API_KEY) {
      return extractTextWithVision(buffer);
    }
    return extractTextFromImage(buffer, mimeType);
  }

  // Plain text
  if (mimeType === "text/plain") {
    const text = buffer.toString("utf-8");
    return {
      text,
      confidence: 100,
      pageCount: 1,
      language: "tr",
      keywords: extractKeywords(text),
      processingTime: 0,
    };
  }

  throw new Error(`Desteklenmeyen dosya türü: ${mimeType}. PDF, görüntü veya metin dosyası yükleyin.`);
}

// ─── Keyword Extraction ─────────────────────────────────────

function extractKeywords(text: string): string[] {
  const lowerText = text.toLowerCase();
  return PROCUREMENT_KEYWORDS.filter((kw) => lowerText.includes(kw));
}
