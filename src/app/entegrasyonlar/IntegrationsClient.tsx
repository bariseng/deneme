"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  Globe,
  Database,
  Mail,
  CreditCard,
  MapPin,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  ExternalLink,
  Code2,
  Zap,
} from "lucide-react";

interface Integration {
  id: string;
  name: string;
  provider: string;
  description: string;
  icon: React.ElementType;
  status: "active" | "demo" | "inactive";
  lastSync?: string;
  syncEndpoint?: string;
  envVars: string[];
  docsUrl?: string;
}

const integrations: Integration[] = [
  {
    id: "ekap",
    name: "EKAP Entegrasyonu",
    provider: "ekap.kik.gov.tr",
    description:
      "Elektronik Kamu Alımları Platformu'ndan ihale verilerini otomatik çeker.",
    icon: Database,
    status: "demo",
    lastSync: "2026-03-25T08:00:00Z",
    syncEndpoint: "/api/ekap",
    envVars: ["EKAP_API_URL", "EKAP_API_KEY", "EKAP_API_SECRET"],
  },
  {
    id: "ilan-gov",
    name: "ilan.gov.tr",
    provider: "ilan.gov.tr",
    description:
      "Resmi İlan Portalı'ndan ihale ilanlarını ve duyuruları çeker.",
    icon: Globe,
    status: "demo",
    lastSync: "2026-03-25T07:30:00Z",
    syncEndpoint: "/api/ilan",
    envVars: ["ILAN_GOV_API_URL"],
  },
  {
    id: "google-maps",
    name: "Google Maps",
    provider: "Google Cloud Platform",
    description:
      "İhale lokasyonlarını harita üzerinde gösterir. Şu anda OpenStreetMap kullanılmaktadır.",
    icon: MapPin,
    status: "demo",
    envVars: ["GOOGLE_MAPS_API_KEY"],
  },
  {
    id: "email",
    name: "E-posta Bildirimleri",
    provider: "SendGrid",
    description:
      "İhale bildirimleri, son başvuru hatırlatmaları ve zeyilname uyarıları için e-posta gönderir.",
    icon: Mail,
    status: "demo",
    syncEndpoint: "/api/notifications",
    envVars: ["SENDGRID_API_KEY", "EMAIL_FROM"],
  },
  {
    id: "payment",
    name: "Ödeme Sistemi",
    provider: "iyzico",
    description:
      "Premium üyelik ödemeleri, abonelik yönetimi ve fatura oluşturma.",
    icon: CreditCard,
    status: "demo",
    syncEndpoint: "/api/payments",
    envVars: ["IYZICO_API_KEY", "IYZICO_SECRET_KEY", "IYZICO_BASE_URL"],
  },
];

const statusConfig = {
  active: {
    label: "Aktif",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle2,
  },
  demo: {
    label: "Demo Modu",
    color: "bg-yellow-100 text-yellow-700",
    icon: AlertCircle,
  },
  inactive: {
    label: "İnaktif",
    color: "bg-red-100 text-red-700",
    icon: AlertCircle,
  },
};

export default function IntegrationsClient() {
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncResults, setSyncResults] = useState<Record<string, string>>({});

  const handleSync = useCallback(async (integration: Integration) => {
    if (!integration.syncEndpoint) return;
    setSyncing(integration.id);

    try {
      const res = await fetch(integration.syncEndpoint, { method: "POST" });
      const data = await res.json();
      setSyncResults((prev) => ({
        ...prev,
        [integration.id]: data.success
          ? `Başarılı: ${JSON.stringify(data.data).slice(0, 80)}...`
          : `Hata: ${data.error}`,
      }));
    } catch {
      setSyncResults((prev) => ({
        ...prev,
        [integration.id]: "Bağlantı hatası",
      }));
    } finally {
      setSyncing(null);
    }
  }, []);

  return (
    <div className="bg-background-alt min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-background-dark to-primary py-8 md:py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-2">
            <Zap size={28} className="text-white" />
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Entegrasyonlar
            </h1>
          </div>
          <p className="text-blue-200 text-sm">
            Dış servis bağlantıları ve senkronizasyon durumları
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Quick links */}
        <div className="flex gap-3 mb-6 overflow-x-auto pb-1">
          <Link
            href="/api-docs"
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-border rounded-lg text-sm font-medium text-foreground hover:border-primary hover:text-primary transition-colors whitespace-nowrap"
          >
            <Code2 size={16} />
            API Dokümantasyonu
          </Link>
          <Link
            href="/premium"
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-border rounded-lg text-sm font-medium text-foreground hover:border-primary hover:text-primary transition-colors whitespace-nowrap"
          >
            <CreditCard size={16} />
            Premium Planlar
          </Link>
        </div>

        {/* Integration cards */}
        <div className="space-y-4">
          {integrations.map((intg) => {
            const Icon = intg.icon;
            const sc = statusConfig[intg.status];
            const StatusIcon = sc.icon;

            return (
              <div
                key={intg.id}
                className="bg-white rounded-xl border border-border overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                      <Icon size={24} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-bold text-foreground">
                          {intg.name}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${sc.color}`}
                        >
                          <StatusIcon size={10} />
                          {sc.label}
                        </span>
                      </div>
                      <p className="text-sm text-foreground-light mb-2">
                        {intg.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-foreground-light">
                        <span>Sağlayıcı: {intg.provider}</span>
                        {intg.lastSync && (
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            Son senkronizasyon:{" "}
                            {new Date(intg.lastSync).toLocaleString("tr-TR")}
                          </span>
                        )}
                      </div>

                      {/* Env vars */}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {intg.envVars.map((v) => (
                          <code
                            key={v}
                            className="text-[10px] bg-gray-100 text-foreground-light px-2 py-0.5 rounded font-mono"
                          >
                            {v}
                          </code>
                        ))}
                      </div>

                      {/* Sync result */}
                      {syncResults[intg.id] && (
                        <p className="mt-2 text-xs text-foreground-light bg-background-alt px-3 py-1.5 rounded">
                          {syncResults[intg.id]}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {intg.syncEndpoint && (
                        <button
                          onClick={() => handleSync(intg)}
                          disabled={syncing !== null}
                          className="flex items-center gap-1.5 px-3 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          {syncing === intg.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <RefreshCw size={12} />
                          )}
                          Senkronize Et
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* API Stats */}
        <div className="mt-8 bg-white rounded-xl border border-border p-5">
          <h2 className="text-lg font-bold text-foreground mb-4">
            RESTful API Endpoint&apos;leri
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left font-medium text-foreground-light">
                    Metod
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-foreground-light">
                    Endpoint
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-foreground-light">
                    Açıklama
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-foreground-light">
                    Erişim
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["GET", "/api/v1/tenders", "İhale listesi", "Herkese açık"],
                  ["GET", "/api/v1/tenders/:id", "İhale detay", "Herkese açık"],
                  ["GET", "/api/v1/companies", "Firma listesi", "Herkese açık"],
                  ["POST", "/api/ekap", "EKAP senkronizasyon", "Admin"],
                  ["POST", "/api/ilan", "ilan.gov.tr senkronizasyon", "Admin"],
                  ["POST", "/api/notifications", "E-posta gönder", "Sistem"],
                  ["POST", "/api/payments", "Ödeme oturumu", "Kullanıcı"],
                  ["POST", "/api/payments/webhook", "Ödeme webhook", "Sistem"],
                ].map(([method, path, desc, access]) => (
                  <tr key={path} className="border-t border-border">
                    <td className="px-4 py-2">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                          method === "GET"
                            ? "bg-green-100 text-green-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {method}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-foreground">
                      {path}
                    </td>
                    <td className="px-4 py-2 text-foreground-light text-xs">
                      {desc}
                    </td>
                    <td className="px-4 py-2 text-foreground-light text-xs">
                      {access}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-right">
            <Link
              href="/api-docs"
              className="text-sm text-primary hover:text-primary-dark font-medium inline-flex items-center gap-1"
            >
              Tam dokümantasyon
              <ExternalLink size={12} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
