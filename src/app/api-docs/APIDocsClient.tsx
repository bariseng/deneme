"use client";

import { useState } from "react";
import {
  Code2,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Globe,
  Key,
  Zap,
  FileJson,
} from "lucide-react";

interface Endpoint {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  description: string;
  params?: { name: string; type: string; required: boolean; desc: string }[];
  bodyExample?: string;
  responseExample: string;
}

const endpoints: { category: string; items: Endpoint[] }[] = [
  {
    category: "İhaleler",
    items: [
      {
        method: "GET",
        path: "/api/v1/tenders",
        description:
          "Tüm ihaleleri listeler. Filtreleme, sayfalama ve sıralama destekler.",
        params: [
          { name: "q", type: "string", required: false, desc: "Tam metin arama" },
          { name: "city", type: "string", required: false, desc: "İl filtresi" },
          { name: "category", type: "string", required: false, desc: "Kategori filtresi" },
          { name: "status", type: "active|closed|upcoming", required: false, desc: "Durum filtresi" },
          { name: "minBudget", type: "number", required: false, desc: "Minimum bütçe (₺)" },
          { name: "maxBudget", type: "number", required: false, desc: "Maksimum bütçe (₺)" },
          { name: "page", type: "number", required: false, desc: "Sayfa numarası (varsayılan: 1)" },
          { name: "limit", type: "number", required: false, desc: "Sayfa başına sonuç (maks: 100)" },
          { name: "sort", type: "string", required: false, desc: "Sıralama alanı" },
          { name: "order", type: "asc|desc", required: false, desc: "Sıralama yönü" },
        ],
        responseExample: `{
  "success": true,
  "data": [
    {
      "id": "1",
      "title": "Ankara-Sivas YHT Hattı 2. Etap Yapım İşi",
      "institution": "T.C. Ulaştırma ve Altyapı Bakanlığı",
      "city": "Ankara",
      "category": "Yapım İşleri",
      "estimatedCostValue": 2450000000,
      "deadline": "2026-04-15",
      "status": "active",
      "ekapNo": "2026/100234"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 30,
    "totalPages": 2,
    "hasNext": true
  }
}`,
      },
      {
        method: "GET",
        path: "/api/v1/tenders/:id",
        description:
          "Belirtilen ID'ye sahip ihalenin tüm detaylarını döner.",
        responseExample: `{
  "success": true,
  "data": {
    "id": "1",
    "title": "Ankara-Sivas YHT Hattı 2. Etap Yapım İşi",
    "institution": "T.C. Ulaştırma ve Altyapı Bakanlığı",
    "city": "Ankara",
    "category": "Yapım İşleri",
    "description": "...",
    "documents": [...],
    "timeline": [...]
  }
}`,
      },
    ],
  },
  {
    category: "Firmalar",
    items: [
      {
        method: "GET",
        path: "/api/v1/companies",
        description: "Firma listesini getirir.",
        params: [
          { name: "q", type: "string", required: false, desc: "Firma adı arama" },
          { name: "city", type: "string", required: false, desc: "İl filtresi" },
          { name: "sector", type: "string", required: false, desc: "Sektör filtresi" },
        ],
        responseExample: `{
  "success": true,
  "data": [
    {
      "id": "c1",
      "name": "Anadolu İnşaat A.Ş.",
      "city": "İstanbul",
      "sectors": ["Yapım İşleri"],
      "rating": 4.5
    }
  ]
}`,
      },
    ],
  },
  {
    category: "Veri Senkronizasyon",
    items: [
      {
        method: "POST",
        path: "/api/ekap",
        description: "EKAP veri senkronizasyonunu tetikler.",
        responseExample: `{
  "success": true,
  "data": {
    "totalFetched": 47,
    "newTenders": 12,
    "updatedTenders": 8,
    "syncedAt": "2026-03-25T08:00:00Z"
  }
}`,
      },
      {
        method: "POST",
        path: "/api/ilan",
        description: "ilan.gov.tr veri senkronizasyonunu tetikler.",
        responseExample: `{
  "success": true,
  "data": {
    "totalFetched": 23,
    "newRecords": 7,
    "syncedAt": "2026-03-25T07:30:00Z"
  }
}`,
      },
    ],
  },
  {
    category: "Bildirimler",
    items: [
      {
        method: "POST",
        path: "/api/notifications",
        description: "E-posta bildirimi gönderir.",
        bodyExample: `{
  "to": "kullanici@ornek.com",
  "tenderTitle": "YHT Hattı Yapım İşi",
  "tenderId": "1",
  "type": "new"
}`,
        responseExample: `{
  "success": true,
  "data": { "messageId": "sg-1234567890" }
}`,
      },
    ],
  },
  {
    category: "Ödemeler",
    items: [
      {
        method: "POST",
        path: "/api/payments",
        description: "Ödeme oturumu oluşturur.",
        bodyExample: `{
  "planId": "pro",
  "billingPeriod": "monthly",
  "userId": "user-123"
}`,
        responseExample: `{
  "success": true,
  "data": {
    "id": "cs_12345",
    "planId": "pro",
    "amount": 699,
    "currency": "TRY",
    "status": "pending",
    "paymentUrl": "..."
  }
}`,
      },
    ],
  },
];

const methodColors: Record<string, string> = {
  GET: "bg-green-100 text-green-700",
  POST: "bg-blue-100 text-blue-700",
  PUT: "bg-yellow-100 text-yellow-700",
  DELETE: "bg-red-100 text-red-700",
};

export default function APIDocsClient() {
  const [expanded, setExpanded] = useState<string | null>(
    endpoints[0].items[0].path
  );
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="bg-background-alt min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-background-dark to-primary py-8 md:py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-2">
            <Code2 size={28} className="text-white" />
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              API Dokümantasyonu
            </h1>
          </div>
          <p className="text-blue-200 text-sm max-w-xl">
            İhalePro RESTful API ile ihale verilerine programatik erişim sağlayın.
            Tüm endpoint&apos;ler JSON formatında yanıt döner.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Quick info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-border p-4 flex items-center gap-3">
            <Globe size={20} className="text-primary" />
            <div>
              <p className="text-xs text-foreground-light">Base URL</p>
              <p className="text-sm font-mono font-semibold text-foreground">
                /api/v1
              </p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-border p-4 flex items-center gap-3">
            <FileJson size={20} className="text-primary" />
            <div>
              <p className="text-xs text-foreground-light">Format</p>
              <p className="text-sm font-semibold text-foreground">
                JSON (UTF-8)
              </p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-border p-4 flex items-center gap-3">
            <Key size={20} className="text-primary" />
            <div>
              <p className="text-xs text-foreground-light">Kimlik Doğrulama</p>
              <p className="text-sm font-semibold text-foreground">
                API Key (Pro+)
              </p>
            </div>
          </div>
        </div>

        {/* Endpoints */}
        <div className="space-y-6">
          {endpoints.map((group) => (
            <div key={group.category}>
              <h2 className="text-lg font-bold text-foreground mb-3">
                {group.category}
              </h2>
              <div className="space-y-2">
                {group.items.map((ep) => {
                  const isOpen = expanded === ep.path;
                  return (
                    <div
                      key={ep.path}
                      className="bg-white rounded-xl border border-border overflow-hidden"
                    >
                      <button
                        onClick={() =>
                          setExpanded(isOpen ? null : ep.path)
                        }
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                      >
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded ${methodColors[ep.method]}`}
                        >
                          {ep.method}
                        </span>
                        <code className="text-sm font-mono text-foreground flex-1">
                          {ep.path}
                        </code>
                        <span className="text-xs text-foreground-light hidden sm:inline mr-2">
                          {ep.description.slice(0, 50)}
                          {ep.description.length > 50 ? "..." : ""}
                        </span>
                        {isOpen ? (
                          <ChevronDown
                            size={16}
                            className="text-foreground-light"
                          />
                        ) : (
                          <ChevronRight
                            size={16}
                            className="text-foreground-light"
                          />
                        )}
                      </button>

                      {isOpen && (
                        <div className="px-4 pb-4 border-t border-border pt-3">
                          <p className="text-sm text-foreground-light mb-3">
                            {ep.description}
                          </p>

                          {ep.params && ep.params.length > 0 && (
                            <div className="mb-3">
                              <h4 className="text-xs font-semibold text-foreground mb-2">
                                Parametreler
                              </h4>
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-gray-50">
                                      <th className="px-3 py-2 text-left font-medium text-foreground-light">
                                        İsim
                                      </th>
                                      <th className="px-3 py-2 text-left font-medium text-foreground-light">
                                        Tip
                                      </th>
                                      <th className="px-3 py-2 text-left font-medium text-foreground-light">
                                        Zorunlu
                                      </th>
                                      <th className="px-3 py-2 text-left font-medium text-foreground-light">
                                        Açıklama
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {ep.params.map((p) => (
                                      <tr
                                        key={p.name}
                                        className="border-t border-border"
                                      >
                                        <td className="px-3 py-2 font-mono text-primary">
                                          {p.name}
                                        </td>
                                        <td className="px-3 py-2 text-foreground-light">
                                          {p.type}
                                        </td>
                                        <td className="px-3 py-2">
                                          {p.required ? (
                                            <span className="text-red-500">
                                              Evet
                                            </span>
                                          ) : (
                                            <span className="text-foreground-light">
                                              Hayır
                                            </span>
                                          )}
                                        </td>
                                        <td className="px-3 py-2 text-foreground-light">
                                          {p.desc}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {ep.bodyExample && (
                            <div className="mb-3">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="text-xs font-semibold text-foreground">
                                  İstek Gövdesi
                                </h4>
                                <button
                                  onClick={() =>
                                    copyToClipboard(
                                      ep.bodyExample!,
                                      `body-${ep.path}`
                                    )
                                  }
                                  className="text-xs text-foreground-light hover:text-primary flex items-center gap-1"
                                >
                                  {copied === `body-${ep.path}` ? (
                                    <Check size={12} />
                                  ) : (
                                    <Copy size={12} />
                                  )}
                                  {copied === `body-${ep.path}`
                                    ? "Kopyalandı"
                                    : "Kopyala"}
                                </button>
                              </div>
                              <pre className="bg-background-dark text-blue-200 p-3 rounded-lg text-xs overflow-x-auto">
                                {ep.bodyExample}
                              </pre>
                            </div>
                          )}

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="text-xs font-semibold text-foreground">
                                Yanıt Örneği
                              </h4>
                              <button
                                onClick={() =>
                                  copyToClipboard(
                                    ep.responseExample,
                                    `resp-${ep.path}`
                                  )
                                }
                                className="text-xs text-foreground-light hover:text-primary flex items-center gap-1"
                              >
                                {copied === `resp-${ep.path}` ? (
                                  <Check size={12} />
                                ) : (
                                  <Copy size={12} />
                                )}
                                {copied === `resp-${ep.path}`
                                  ? "Kopyalandı"
                                  : "Kopyala"}
                              </button>
                            </div>
                            <pre className="bg-background-dark text-green-300 p-3 rounded-lg text-xs overflow-x-auto">
                              {ep.responseExample}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
