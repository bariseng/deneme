"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  FileDown,
  RefreshCw,
  CheckCircle2,
  Clock,
  Send,
  Calculator,
  FileText,
  StickyNote,
  Copy,
  Building2,
  Printer,
  Zap,
} from "lucide-react";
import {
  useBidStore,
  calcLineTotal,
  calcBidTotal,
  generateBidLetter,
  defaultUnits,
  type BidStatus,
  type CostLineItem,
} from "@/lib/bid-store";
import { formatCurrency } from "@/lib/format";
import SmartOptimizationPanel from "./SmartOptimizationPanel";

type Tab = "cost" | "optimize" | "letter" | "company" | "notes";

const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "cost", label: "Maliyet Hesaplama", icon: Calculator },
  { key: "optimize", label: "Akıllı Optimizasyon", icon: Zap },
  { key: "letter", label: "Teklif Mektubu", icon: FileText },
  { key: "company", label: "Firma Bilgileri", icon: Building2 },
  { key: "notes", label: "Notlar", icon: StickyNote },
];

export default function BidEditorClient({ bidId }: { bidId: string }) {
  const router = useRouter();
  const {
    bids,
    addCostItem,
    updateCostItem,
    removeCostItem,
    updateLetterContent,
    updateNotes,
    regenerateLetter,
    updateBidStatus,
    touchBid,
    duplicateBid,
    deleteBid,
    updateCompanyInfo,
  } = useBidStore();

  const bid = useMemo(() => bids.find((b) => b.id === bidId), [bids, bidId]);

  const [activeTab, setActiveTab] = useState<Tab>("cost");
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!bid || bid.status === "submitted") return;
    autoSaveRef.current = setInterval(() => {
      touchBid(bidId);
      setLastSaved(
        new Date().toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    }, 30000);
    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, [bid, bidId, touchBid]);

  const handleManualSave = useCallback(() => {
    touchBid(bidId);
    setLastSaved(
      new Date().toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    );
  }, [bidId, touchBid]);

  const handlePdfExport = useCallback(() => {
    setShowPdfPreview(true);
    setTimeout(() => {
      window.print();
    }, 300);
  }, []);

  const handleDuplicate = useCallback(() => {
    const newId = duplicateBid(bidId);
    if (newId) router.push(`/teklifler/${newId}`);
  }, [bidId, duplicateBid, router]);

  if (!bid) {
    return (
      <div className="bg-background-alt min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">
            Teklif bulunamadı
          </h2>
          <Link
            href="/teklifler"
            className="text-primary hover:underline text-sm"
          >
            Tekliflere dön
          </Link>
        </div>
      </div>
    );
  }

  const total = calcBidTotal(bid.costItems);
  const isReadOnly = bid.status === "submitted";

  return (
    <>
      {/* Print-only PDF view */}
      <div className="hidden print:block" ref={printRef}>
        <PdfTemplate bid={bid} total={total} />
      </div>

      {/* Screen view */}
      <div className="bg-background-alt min-h-screen print:hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-background-dark to-primary py-6 md:py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link
              href="/teklifler"
              className="inline-flex items-center gap-1 text-blue-200 hover:text-white text-sm mb-3 transition-colors"
            >
              <ArrowLeft size={14} />
              Tekliflere Dön
            </Link>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white line-clamp-1">
                  {bid.tenderTitle}
                </h1>
                <p className="text-blue-200 text-sm mt-0.5">
                  {bid.institution} | EKAP: {bid.ekapNo}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {lastSaved && (
                  <span className="text-xs text-blue-200">
                    Son kayıt: {lastSaved}
                  </span>
                )}
                <StatusBadge status={bid.status} />
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Action bar */}
          <div className="bg-white rounded-xl border border-border p-3 mb-6 flex flex-wrap items-center gap-2">
            <button
              onClick={handleManualSave}
              disabled={isReadOnly}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <Save size={14} />
              Kaydet
            </button>
            <button
              onClick={handlePdfExport}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-border text-foreground hover:bg-gray-50 rounded-lg font-medium transition-colors"
            >
              <Printer size={14} />
              PDF Yazdır
            </button>
            <button
              onClick={handleDuplicate}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-border text-foreground hover:bg-gray-50 rounded-lg font-medium transition-colors"
              title="Bu teklifi temel al"
            >
              <Copy size={14} />
              Kopyala
            </button>
            <div className="flex-1" />
            {bid.status === "draft" && (
              <button
                onClick={() => updateBidStatus(bidId, "completed")}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-accent hover:bg-accent/90 text-white rounded-lg font-medium transition-colors"
              >
                <CheckCircle2 size={14} />
                Tamamlandı
              </button>
            )}
            {bid.status === "completed" && (
              <>
                <button
                  onClick={() => updateBidStatus(bidId, "draft")}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm border border-border text-foreground hover:bg-gray-50 rounded-lg font-medium transition-colors"
                >
                  <Clock size={14} />
                  Taslağa Çevir
                </button>
                <button
                  onClick={() => updateBidStatus(bidId, "submitted")}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors"
                >
                  <Send size={14} />
                  Gönderildi İşaretle
                </button>
              </>
            )}
          </div>

          {/* Total bar */}
          <div className="bg-white rounded-xl border border-border p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground-light">
                  Toplam Teklif Bedeli
                </p>
                <p className="text-2xl md:text-3xl font-bold text-primary">
                  {formatCurrency(total)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-foreground-light">
                  KDV (%20)
                </p>
                <p className="text-lg font-semibold text-foreground">
                  {formatCurrency(total * 0.2)}
                </p>
                <p className="text-xs text-foreground-light">
                  Genel Toplam (KDV dahil):{" "}
                  <span className="font-semibold">
                    {formatCurrency(total * 1.2)}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Tab navigation */}
          <div className="flex gap-1 overflow-x-auto pb-1 mb-6 scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.key
                      ? "bg-primary text-white shadow-sm"
                      : "bg-white text-foreground-light hover:bg-gray-50 border border-border"
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          {activeTab === "cost" && (
            <CostTable
              bidId={bidId}
              items={bid.costItems}
              readOnly={isReadOnly}
              addCostItem={addCostItem}
              updateCostItem={updateCostItem}
              removeCostItem={removeCostItem}
            />
          )}
          {activeTab === "optimize" && (
            <SmartOptimizationPanel
              tenderId={bid.tenderId}
              items={bid.costItems}
              totalAmount={total}
            />
          )}
          {activeTab === "letter" && (
            <LetterEditor
              bidId={bidId}
              content={bid.letterContent}
              readOnly={isReadOnly}
              updateLetterContent={updateLetterContent}
              regenerateLetter={regenerateLetter}
            />
          )}
          {activeTab === "company" && (
            <CompanyInfoEditor
              companyInfo={bid.companyInfo}
              readOnly={isReadOnly}
              updateCompanyInfo={updateCompanyInfo}
            />
          )}
          {activeTab === "notes" && (
            <NotesEditor
              bidId={bidId}
              notes={bid.notes}
              readOnly={isReadOnly}
              updateNotes={updateNotes}
            />
          )}
        </div>
      </div>
    </>
  );
}

/* ── Status Badge ──────────────────────────────── */

function StatusBadge({ status }: { status: BidStatus }) {
  const config: Record<BidStatus, { label: string; cls: string }> = {
    draft: { label: "Taslak", cls: "bg-yellow-400/20 text-yellow-200" },
    completed: { label: "Tamamlandı", cls: "bg-green-400/20 text-green-200" },
    submitted: { label: "Gönderildi", cls: "bg-blue-400/20 text-blue-200" },
  };
  const c = config[status];
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${c.cls}`}>
      {c.label}
    </span>
  );
}

/* ── Cost Table ────────────────────────────────── */

function CostTable({
  bidId,
  items,
  readOnly,
  addCostItem,
  updateCostItem,
  removeCostItem,
}: {
  bidId: string;
  items: CostLineItem[];
  readOnly: boolean;
  addCostItem: (bidId: string) => void;
  updateCostItem: (
    bidId: string,
    lineId: string,
    u: Partial<CostLineItem>
  ) => void;
  removeCostItem: (bidId: string, lineId: string) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">
          Birim Fiyat Tablosu
        </h2>
        {!readOnly && (
          <button
            onClick={() => addCostItem(bidId)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors"
          >
            <Plus size={14} />
            Kalem Ekle
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="p-12 text-center">
          <Calculator
            size={40}
            className="mx-auto mb-3 text-foreground-light"
          />
          <p className="text-foreground-light text-sm mb-3">
            Henüz maliyet kalemi eklenmemiş
          </p>
          {!readOnly && (
            <button
              onClick={() => addCostItem(bidId)}
              className="inline-flex items-center gap-1.5 text-primary hover:text-primary-dark text-sm font-medium"
            >
              <Plus size={14} />
              İlk kalemi ekle
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 font-medium text-foreground-light w-8">
                  #
                </th>
                <th className="px-4 py-3 font-medium text-foreground-light min-w-[200px]">
                  İş Kalemi Açıklaması
                </th>
                <th className="px-4 py-3 font-medium text-foreground-light w-28">
                  Birim
                </th>
                <th className="px-4 py-3 font-medium text-foreground-light w-28 text-right">
                  Miktar
                </th>
                <th className="px-4 py-3 font-medium text-foreground-light w-36 text-right">
                  Birim Fiyat (₺)
                </th>
                <th className="px-4 py-3 font-medium text-foreground-light w-40 text-right">
                  Toplam (₺)
                </th>
                {!readOnly && (
                  <th className="px-4 py-3 font-medium text-foreground-light w-12" />
                )}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const lineTotal = calcLineTotal(item);
                return (
                  <tr
                    key={item.id}
                    className="border-t border-border hover:bg-blue-50/30 transition-colors"
                  >
                    <td className="px-4 py-2 text-foreground-light">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-2">
                      {readOnly ? (
                        <span>{item.description}</span>
                      ) : (
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) =>
                            updateCostItem(bidId, item.id, {
                              description: e.target.value,
                            })
                          }
                          placeholder="İş kalemi açıklaması"
                          className="w-full px-2 py-1.5 border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                        />
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {readOnly ? (
                        <span>{item.unit}</span>
                      ) : (
                        <select
                          value={item.unit}
                          onChange={(e) =>
                            updateCostItem(bidId, item.id, {
                              unit: e.target.value,
                            })
                          }
                          className="w-full px-2 py-1.5 border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                        >
                          {defaultUnits.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {readOnly ? (
                        <span>
                          {item.quantity.toLocaleString("tr-TR")}
                        </span>
                      ) : (
                        <input
                          type="number"
                          value={item.quantity || ""}
                          onChange={(e) =>
                            updateCostItem(bidId, item.id, {
                              quantity: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-2 py-1.5 border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary text-sm text-right"
                          min={0}
                        />
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {readOnly ? (
                        <span>
                          {item.unitPrice.toLocaleString("tr-TR", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      ) : (
                        <input
                          type="number"
                          value={item.unitPrice || ""}
                          onChange={(e) =>
                            updateCostItem(bidId, item.id, {
                              unitPrice: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-2 py-1.5 border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary text-sm text-right"
                          min={0}
                          step="0.01"
                        />
                      )}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-foreground">
                      {formatCurrency(lineTotal)}
                    </td>
                    {!readOnly && (
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => removeCostItem(bidId, item.id)}
                          className="p-1 text-foreground-light hover:text-red-600 transition-colors"
                          title="Kalemi sil"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-primary/20 bg-blue-50/50">
                <td
                  colSpan={readOnly ? 5 : 5}
                  className="px-4 py-3 text-right font-bold text-foreground"
                >
                  GENEL TOPLAM (KDV Hariç):
                </td>
                <td className="px-4 py-3 text-right font-bold text-primary text-base">
                  {formatCurrency(calcBidTotal(items))}
                </td>
                {!readOnly && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Letter Editor ─────────────────────────────── */

function LetterEditor({
  bidId,
  content,
  readOnly,
  updateLetterContent,
  regenerateLetter,
}: {
  bidId: string;
  content: string;
  readOnly: boolean;
  updateLetterContent: (bidId: string, content: string) => void;
  regenerateLetter: (bidId: string) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Teklif Mektubu</h2>
        {!readOnly && (
          <button
            onClick={() => {
              if (
                confirm(
                  "Mektubu yeniden oluşturmak mevcut içeriğin üzerine yazacaktır. Devam edilsin mi?"
                )
              )
                regenerateLetter(bidId);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-border text-foreground hover:bg-gray-50 rounded-lg font-medium transition-colors"
          >
            <RefreshCw size={14} />
            Şablondan Yeniden Oluştur
          </button>
        )}
      </div>
      <div className="p-4">
        <p className="text-xs text-foreground-light mb-3">
          Aşağıdaki teklif mektubu ihale bilgilerinizden otomatik oluşturulmuştur. İçeriği düzenleyebilirsiniz.
        </p>
        <textarea
          value={content}
          onChange={(e) => updateLetterContent(bidId, e.target.value)}
          readOnly={readOnly}
          className="w-full h-[500px] px-4 py-3 text-sm font-mono border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-y bg-gray-50"
          placeholder="Teklif mektubu içeriği..."
        />
      </div>
    </div>
  );
}

/* ── Company Info Editor ───────────────────────── */

function CompanyInfoEditor({
  companyInfo,
  readOnly,
  updateCompanyInfo,
}: {
  companyInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
    taxOffice: string;
    taxNumber: string;
    authorizedPerson: string;
    title: string;
  };
  readOnly: boolean;
  updateCompanyInfo: (info: Record<string, string>) => void;
}) {
  const fields: { key: string; label: string; span?: boolean }[] = [
    { key: "name", label: "Firma Adı", span: true },
    { key: "address", label: "Adres", span: true },
    { key: "phone", label: "Telefon" },
    { key: "email", label: "E-posta" },
    { key: "taxOffice", label: "Vergi Dairesi" },
    { key: "taxNumber", label: "Vergi Numarası" },
    { key: "authorizedPerson", label: "Yetkili Kişi" },
    { key: "title", label: "Unvan" },
  ];

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-bold text-foreground">Firma Bilgileri</h2>
        <p className="text-xs text-foreground-light mt-1">
          Bu bilgiler teklif mektubunuzda ve PDF çıktısında kullanılır.
          Değişiklikler gelecek teklifler için de kaydedilir.
        </p>
      </div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map((f) => (
          <div key={f.key} className={f.span ? "md:col-span-2" : ""}>
            <label className="block text-sm font-medium text-foreground mb-1">
              {f.label}
            </label>
            <input
              type="text"
              value={(companyInfo as Record<string, string>)[f.key] || ""}
              onChange={(e) =>
                updateCompanyInfo({ [f.key]: e.target.value })
              }
              readOnly={readOnly}
              className="w-full h-10 px-3 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary read-only:bg-gray-50"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Notes Editor ──────────────────────────────── */

function NotesEditor({
  bidId,
  notes,
  readOnly,
  updateNotes,
}: {
  bidId: string;
  notes: string;
  readOnly: boolean;
  updateNotes: (bidId: string, notes: string) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-bold text-foreground">Notlar</h2>
        <p className="text-xs text-foreground-light mt-1">
          Bu teklifle ilgili özel notlarınızı buraya ekleyebilirsiniz.
        </p>
      </div>
      <div className="p-4">
        <textarea
          value={notes}
          onChange={(e) => updateNotes(bidId, e.target.value)}
          readOnly={readOnly}
          className="w-full h-64 px-4 py-3 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-y"
          placeholder="Teklif notları..."
        />
      </div>
    </div>
  );
}

/* ── PDF Print Template ────────────────────────── */

function PdfTemplate({
  bid,
  total,
}: {
  bid: {
    tenderTitle: string;
    institution: string;
    ekapNo: string;
    companyInfo: {
      name: string;
      address: string;
      phone: string;
      email: string;
      taxOffice: string;
      taxNumber: string;
      authorizedPerson: string;
      title: string;
    };
    costItems: CostLineItem[];
    letterContent: string;
  };
  total: number;
}) {
  const today = new Date().toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="p-8 max-w-[210mm] mx-auto text-black text-sm font-sans">
      {/* Company header */}
      <div className="border-b-2 border-blue-800 pb-4 mb-6">
        <h1 className="text-xl font-bold text-blue-900">
          {bid.companyInfo.name}
        </h1>
        <p className="text-xs text-gray-600 mt-1">
          {bid.companyInfo.address}
        </p>
        <p className="text-xs text-gray-600">
          Tel: {bid.companyInfo.phone} | E-posta: {bid.companyInfo.email}
        </p>
        <p className="text-xs text-gray-600">
          Vergi Dairesi: {bid.companyInfo.taxOffice} | Vergi No:{" "}
          {bid.companyInfo.taxNumber}
        </p>
      </div>

      {/* Date and ref */}
      <div className="flex justify-between mb-6">
        <div>
          <p className="text-xs text-gray-500">Konu</p>
          <p className="font-semibold">Teklif Mektubu</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Tarih</p>
          <p className="font-semibold">{today}</p>
        </div>
      </div>

      {/* Tender info */}
      <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-6">
        <p className="font-semibold">{bid.tenderTitle}</p>
        <p className="text-xs text-gray-600 mt-1">
          Kurum: {bid.institution} | EKAP No: {bid.ekapNo}
        </p>
      </div>

      {/* Cost table */}
      {bid.costItems.length > 0 && (
        <div className="mb-6">
          <h2 className="font-bold mb-2">Birim Fiyat Teklif Cetveli</h2>
          <table className="w-full text-xs border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-2 py-1.5 text-left w-8">
                  #
                </th>
                <th className="border border-gray-300 px-2 py-1.5 text-left">
                  İş Kalemi
                </th>
                <th className="border border-gray-300 px-2 py-1.5 text-center w-16">
                  Birim
                </th>
                <th className="border border-gray-300 px-2 py-1.5 text-right w-20">
                  Miktar
                </th>
                <th className="border border-gray-300 px-2 py-1.5 text-right w-24">
                  Birim Fiyat
                </th>
                <th className="border border-gray-300 px-2 py-1.5 text-right w-28">
                  Toplam
                </th>
              </tr>
            </thead>
            <tbody>
              {bid.costItems.map((item, idx) => (
                <tr key={item.id}>
                  <td className="border border-gray-300 px-2 py-1">
                    {idx + 1}
                  </td>
                  <td className="border border-gray-300 px-2 py-1">
                    {item.description}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-center">
                    {item.unit}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-right">
                    {item.quantity.toLocaleString("tr-TR")}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-right">
                    {item.unitPrice.toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                    })}{" "}
                    ₺
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-right font-semibold">
                    {formatCurrency(calcLineTotal(item))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-bold">
                <td
                  colSpan={5}
                  className="border border-gray-300 px-2 py-1.5 text-right"
                >
                  GENEL TOPLAM (KDV Hariç):
                </td>
                <td className="border border-gray-300 px-2 py-1.5 text-right">
                  {formatCurrency(total)}
                </td>
              </tr>
              <tr className="font-bold">
                <td
                  colSpan={5}
                  className="border border-gray-300 px-2 py-1.5 text-right"
                >
                  GENEL TOPLAM (KDV Dahil):
                </td>
                <td className="border border-gray-300 px-2 py-1.5 text-right">
                  {formatCurrency(total * 1.2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Letter content */}
      <div className="whitespace-pre-wrap text-xs leading-relaxed mb-8">
        {bid.letterContent}
      </div>

      {/* Signature area */}
      <div className="mt-12 text-right">
        <div className="inline-block text-center">
          <div className="border-b border-gray-400 w-48 mb-2" />
          <p className="font-semibold">{bid.companyInfo.authorizedPerson}</p>
          <p className="text-xs text-gray-600">{bid.companyInfo.title}</p>
          <p className="text-xs text-gray-600">{bid.companyInfo.name}</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-300 text-[10px] text-gray-400 text-center">
        Bu belge {bid.companyInfo.name} tarafından İhalePro platformu üzerinden
        oluşturulmuştur. | {today}
      </div>
    </div>
  );
}
