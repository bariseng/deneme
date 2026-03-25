"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileText,
  PenTool,
  History,
  Share2,
  ScanLine,
  CheckSquare,
  Loader2,
  Clock,
  Check,
  X,
  Download,
  Copy,
  Shield,
  Eye,
  ChevronDown,
  FileCheck,
  AlertTriangle,
  ArrowLeft,
  Link as LinkIcon,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────

type Tab = "signatures" | "versions" | "approvals" | "shares";

interface SignatureRequest {
  id: string;
  status: "BEKLIYOR" | "IMZALANDI" | "REDDEDILDI" | "IPTAL";
  method: string | null;
  certificateId: string | null;
  signedAt: string | null;
  createdAt: string;
  version: {
    id: string;
    version: number;
    fileName: string;
    document: { id: string; name: string; tenderId: string };
  };
}

// ─── Constants ──────────────────────────────────────────

const STATUS_STYLES: Record<string, { bg: string; label: string; icon: React.ElementType }> = {
  BEKLIYOR: { bg: "bg-amber-100 text-amber-700", label: "Bekliyor", icon: Clock },
  IMZALANDI: { bg: "bg-emerald-100 text-emerald-700", label: "İmzalandı", icon: Check },
  REDDEDILDI: { bg: "bg-red-100 text-red-700", label: "Reddedildi", icon: X },
  IPTAL: { bg: "bg-gray-100 text-gray-600", label: "İptal", icon: X },
  ONAYLANDI: { bg: "bg-emerald-100 text-emerald-700", label: "Onaylandı", icon: Check },
  ATLANDI: { bg: "bg-gray-100 text-gray-600", label: "Atlandı", icon: X },
};

const METHOD_LABELS: Record<string, string> = {
  e_devlet: "e-Devlet",
  turkcell_e_imza: "Turkcell e-İmza",
  mobil_imza: "Mobil İmza",
};

// ─── Main Component ─────────────────────────────────────

export default function DocumentsClient() {
  const [tab, setTab] = useState<Tab>("signatures");
  const [signatures, setSignatures] = useState<SignatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState<string | null>(null);

  const fetchSignatures = useCallback(async () => {
    try {
      const res = await fetch("/api/documents/all/signatures");
      const data = await res.json();
      if (data.success) setSignatures(data.data);
    } catch {
      // handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSignatures();
  }, [fetchSignatures]);

  const handleSign = async (requestId: string) => {
    setSigning(requestId);
    try {
      const res = await fetch("/api/documents/all/signatures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sign", requestId }),
      });
      const data = await res.json();
      if (data.success) {
        setSignatures((prev) =>
          prev.map((s) =>
            s.id === requestId
              ? { ...s, status: "IMZALANDI", signedAt: new Date().toISOString(), certificateId: data.certificateId }
              : s
          )
        );
      }
    } catch {
      // handle
    } finally {
      setSigning(null);
    }
  };

  const handleReject = async (requestId: string) => {
    const reason = prompt("Red gerekçesi girin:");
    if (!reason) return;

    try {
      await fetch("/api/documents/all/signatures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", requestId, reason }),
      });
      setSignatures((prev) =>
        prev.map((s) =>
          s.id === requestId ? { ...s, status: "REDDEDILDI" } : s
        )
      );
    } catch {
      // handle
    }
  };

  return (
    <div className="bg-background-alt min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-background-dark to-primary py-8 md:py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
            Belge Yönetimi
          </h1>
          <p className="text-blue-200 text-sm">
            E-imza, versiyon kontrol, onay akışı ve güvenli doküman paylaşımı
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Feature cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { key: "signatures" as Tab, label: "E-İmza", icon: PenTool, desc: "İmza talepleri" },
            { key: "versions" as Tab, label: "Versiyonlama", icon: History, desc: "Doküman geçmişi" },
            { key: "approvals" as Tab, label: "Onay Akışı", icon: CheckSquare, desc: "Workflow takibi" },
            { key: "shares" as Tab, label: "Paylaşım", icon: Share2, desc: "Güvenli linkler" },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = tab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  isActive
                    ? "bg-primary text-white border-primary shadow-md"
                    : "bg-white border-border hover:border-primary/30"
                }`}
              >
                <Icon size={20} className={isActive ? "text-white" : "text-primary"} />
                <p className={`text-sm font-semibold mt-2 ${isActive ? "text-white" : "text-foreground"}`}>
                  {item.label}
                </p>
                <p className={`text-xs mt-0.5 ${isActive ? "text-blue-100" : "text-foreground-light"}`}>
                  {item.desc}
                </p>
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {tab === "signatures" && (
          <SignaturesPanel
            signatures={signatures}
            loading={loading}
            signing={signing}
            onSign={handleSign}
            onReject={handleReject}
          />
        )}
        {tab === "versions" && <VersionsPanel />}
        {tab === "approvals" && <ApprovalsPanel />}
        {tab === "shares" && <SharesPanel />}
      </div>
    </div>
  );
}

// ─── Signatures Panel ───────────────────────────────────

function SignaturesPanel({
  signatures,
  loading,
  signing,
  onSign,
  onReject,
}: {
  signatures: SignatureRequest[];
  loading: boolean;
  signing: string | null;
  onSign: (id: string) => void;
  onReject: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-foreground-light gap-2">
        <Loader2 size={18} className="animate-spin" />
        İmza talepleri yükleniyor...
      </div>
    );
  }

  const pending = signatures.filter((s) => s.status === "BEKLIYOR");
  const completed = signatures.filter((s) => s.status !== "BEKLIYOR");

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <Shield size={20} className="text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-900">E-İmza Entegrasyonu</p>
          <p className="text-xs text-blue-700 mt-0.5">
            e-Devlet, Turkcell e-İmza ve Mobil İmza ile teklif mektupları ve sözleşmelere
            dijital imza atabilirsiniz. İmzalanan belgeler sertifika ile doğrulanır.
          </p>
        </div>
      </div>

      {/* Pending requests */}
      {pending.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-500" />
            Bekleyen İmza Talepleri ({pending.length})
          </h3>
          <div className="space-y-2">
            {pending.map((sig) => (
              <div key={sig.id} className="bg-white rounded-xl border border-amber-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {sig.version.document.name} — v{sig.version.version}
                    </p>
                    <p className="text-xs text-foreground-light mt-1">
                      {sig.method ? METHOD_LABELS[sig.method] || sig.method : "e-Devlet"} ile imza talep edildi
                    </p>
                    <p className="text-xs text-foreground-light">
                      {new Date(sig.createdAt).toLocaleString("tr-TR")}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => onSign(sig.id)}
                      disabled={signing === sig.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary-dark disabled:opacity-50"
                    >
                      {signing === sig.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <PenTool size={12} />
                      )}
                      İmzala
                    </button>
                    <button
                      onClick={() => onReject(sig.id)}
                      className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50"
                    >
                      Reddet
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Tamamlanan İmzalar ({completed.length})
          </h3>
          <div className="space-y-2">
            {completed.map((sig) => {
              const style = STATUS_STYLES[sig.status];
              const StatusIcon = style?.icon || Check;
              return (
                <div key={sig.id} className="bg-white rounded-xl border border-border p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {sig.version.document.name} — v{sig.version.version}
                    </p>
                    <p className="text-xs text-foreground-light mt-0.5">
                      {sig.signedAt
                        ? `İmzalandı: ${new Date(sig.signedAt).toLocaleString("tr-TR")}`
                        : `Durum: ${style?.label}`}
                    </p>
                    {sig.certificateId && (
                      <p className="text-[10px] text-foreground-light mt-0.5 font-mono">
                        Sertifika: {sig.certificateId}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 ${style?.bg}`}>
                    <StatusIcon size={12} />
                    {style?.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {signatures.length === 0 && (
        <EmptyTab icon={PenTool} message="İmza talebi bulunmuyor" sub="Belgelere e-imza talebi geldiğinde burada görünecek." />
      )}
    </div>
  );
}

// ─── Versions Panel ─────────────────────────────────────

function VersionsPanel() {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <History size={20} className="text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-900">Doküman Versiyonlama</p>
          <p className="text-xs text-blue-700 mt-0.5">
            Her düzenlemede otomatik versiyon kaydı oluşturulur. İhale detay sayfasında
            dokümanların versiyon geçmişini görüntüleyebilir, eski versiyonlara geri dönebilirsiniz.
          </p>
        </div>
      </div>

      {/* Demo version history */}
      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <FileText size={16} className="text-primary" />
          Örnek Versiyon Geçmişi
        </h3>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[11px] top-6 bottom-2 w-0.5 bg-border" />

          <div className="space-y-4">
            {[
              { v: 3, date: "25.03.2026 14:30", summary: "Birim fiyatlar güncellendi", user: "Ahmet Y.", current: true },
              { v: 2, date: "24.03.2026 10:15", summary: "KDV oranı düzeltildi", user: "Ayşe K.", current: false },
              { v: 1, date: "22.03.2026 09:00", summary: "İlk yükleme", user: "Ahmet Y.", current: false },
            ].map((item) => (
              <div key={item.v} className="flex gap-3 items-start relative">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 ${
                    item.current ? "bg-primary text-white" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  <span className="text-[10px] font-bold">{item.v}</span>
                </div>
                <div className={`flex-1 p-3 rounded-lg ${item.current ? "bg-primary/5 border border-primary/20" : "bg-gray-50"}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">v{item.v} — {item.summary}</p>
                    {item.current && (
                      <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full">Güncel</span>
                    )}
                  </div>
                  <p className="text-xs text-foreground-light mt-1">
                    {item.user} · {item.date}
                  </p>
                  {!item.current && (
                    <button className="text-xs text-primary font-medium mt-1.5 hover:underline">
                      Bu versiyona geri dön
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Approvals Panel ────────────────────────────────────

function ApprovalsPanel() {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <CheckSquare size={20} className="text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-900">Onay Workflow</p>
          <p className="text-xs text-blue-700 mt-0.5">
            Teklif → Departman Müdürü → Genel Müdür → Gönderim. Her adımda onay/red kararı
            ile e-posta bildirimi gönderilir. Proje detay sayfasından onay akışı başlatabilirsiniz.
          </p>
        </div>
      </div>

      {/* Demo approval workflow */}
      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Örnek Onay Akışı</h3>

        <div className="flex flex-col gap-3">
          {[
            { step: 1, title: "Departman Müdürü Onayı", approver: "Mehmet B.", status: "ONAYLANDI", date: "24.03.2026" },
            { step: 2, title: "Genel Müdür Onayı", approver: "Fatma D.", status: "BEKLIYOR", date: null },
            { step: 3, title: "Gönderim Onayı", approver: "Ahmet Y.", status: "BEKLIYOR", date: null },
          ].map((item) => {
            const style = STATUS_STYLES[item.status];
            const StatusIcon = style?.icon || Clock;
            const isActive = item.status === "BEKLIYOR" && (item.step === 2);

            return (
              <div
                key={item.step}
                className={`p-4 rounded-xl border ${
                  isActive ? "border-primary/30 bg-primary/5" : "border-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        item.status === "ONAYLANDI"
                          ? "bg-emerald-100 text-emerald-700"
                          : isActive
                            ? "bg-primary text-white"
                            : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {item.status === "ONAYLANDI" ? <Check size={14} /> : item.step}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <p className="text-xs text-foreground-light">
                        {item.approver}
                        {item.date && ` · ${item.date}`}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 ${style?.bg}`}>
                    <StatusIcon size={12} />
                    {style?.label}
                  </span>
                </div>
                {isActive && (
                  <div className="flex gap-2 mt-3 ml-11">
                    <button className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium">
                      <Check size={12} />
                      Onayla
                    </button>
                    <button className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-medium">
                      Reddet
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Shares Panel ───────────────────────────────────────

function SharesPanel() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText("https://ihalepro.com/share/abc123...").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <Share2 size={20} className="text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-900">Güvenli Paylaşım</p>
          <p className="text-xs text-blue-700 mt-0.5">
            Zaman sınırlı paylaşım linkleri oluşturun. 24 saat geçerlilik, tek kullanımlık indirme
            opsiyonu ile dokümanlarınızı güvenle paylaşın. İhale detay sayfasından paylaşım yapabilirsiniz.
          </p>
        </div>
      </div>

      {/* Share form demo */}
      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <LinkIcon size={16} className="text-primary" />
          Paylaşım Linki Oluştur
        </h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-foreground-light block mb-1">Geçerlilik Süresi</label>
            <select className="w-full text-sm border border-border rounded-lg px-3 py-2">
              <option value="1">1 saat</option>
              <option value="6">6 saat</option>
              <option value="24" selected>24 saat</option>
              <option value="72">3 gün</option>
              <option value="168">7 gün</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground-light block mb-1">Maksimum İndirme Sayısı</label>
            <select className="w-full text-sm border border-border rounded-lg px-3 py-2">
              <option value="1" selected>1 (Tek kullanımlık)</option>
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="-1">Sınırsız</option>
            </select>
          </div>

          <button className="w-full bg-primary text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors flex items-center justify-center gap-2">
            <Share2 size={16} />
            Link Oluştur
          </button>
        </div>

        {/* Example link */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-foreground-light mb-2">Oluşturulan Link:</p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value="https://ihalepro.com/share/abc123..."
              className="flex-1 text-xs bg-white border border-border rounded-lg px-3 py-2 text-foreground font-mono"
            />
            <button
              onClick={handleCopy}
              className="p-2 bg-white border border-border rounded-lg hover:bg-gray-50"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} className="text-foreground-light" />}
            </button>
          </div>
          <p className="text-[10px] text-foreground-light mt-1.5">
            24 saat geçerli · Tek kullanımlık indirme
          </p>
        </div>
      </div>

      {/* OCR section */}
      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <ScanLine size={16} className="text-primary" />
          OCR Doküman Tarama
        </h3>
        <p className="text-xs text-foreground-light mb-4">
          Taranan şartname PDF'lerinden otomatik metin çıkarma. İhale anahtar kelimelerini
          tanır ve metni aranabilir hale getirir.
        </p>
        <div className="bg-gray-50 rounded-lg p-3 border border-dashed border-border text-center">
          <ScanLine size={24} className="mx-auto text-foreground-light/40 mb-2" />
          <p className="text-xs text-foreground-light">
            İhale detay sayfasındaki dokümanlarda OCR işlemi başlatabilirsiniz
          </p>
          <p className="text-[10px] text-foreground-light mt-1">
            Her OCR işlemi 1 AI kredisi kullanır
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Empty Tab ──────────────────────────────────────────

function EmptyTab({
  icon: Icon,
  message,
  sub,
}: {
  icon: React.ElementType;
  message: string;
  sub: string;
}) {
  return (
    <div className="text-center py-12">
      <Icon size={36} className="mx-auto text-foreground-light/30 mb-3" />
      <p className="text-sm font-medium text-foreground-light">{message}</p>
      <p className="text-xs text-foreground-light/70 mt-1">{sub}</p>
    </div>
  );
}
