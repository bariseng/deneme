"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  FileText,
  Search,
  Trash2,
  Copy,
  CheckCircle2,
  Clock,
  Send,
  Filter,
  Calculator,
  ChevronRight,
} from "lucide-react";
import { useBidStore, calcBidTotal, type BidStatus } from "@/lib/bid-store";
import type { Tender } from "@/lib/data";
import { mapApiTender } from "@/lib/api-client";
import { formatCurrency, formatDateTR } from "@/lib/format";

const statusConfig: Record<
  BidStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  draft: {
    label: "Taslak",
    color: "bg-yellow-100 text-yellow-800",
    icon: Clock,
  },
  completed: {
    label: "Tamamlandı",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle2,
  },
  submitted: {
    label: "Gönderildi",
    color: "bg-blue-100 text-blue-800",
    icon: Send,
  },
};

export default function BidListClient() {
  const router = useRouter();
  const { bids, createBid, deleteBid, duplicateBid } = useBidStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BidStatus | "all">("all");
  const [showNewBidModal, setShowNewBidModal] = useState(false);
  const [selectedTenderId, setSelectedTenderId] = useState("");
  const [availableTenders, setAvailableTenders] = useState<Tender[]>([]);

  useEffect(() => {
    fetch("/api/tenders?status=BASVURU_ACIK&limit=50&sort=deadline&order=asc")
      .then((r) => r.json())
      .then((json) => setAvailableTenders((json.data ?? []).map(mapApiTender)))
      .catch(() => {});
  }, []);

  const filteredBids = useMemo(() => {
    return bids.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          b.tenderTitle.toLowerCase().includes(q) ||
          b.institution.toLowerCase().includes(q) ||
          b.ekapNo.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [bids, search, statusFilter]);

  const handleCreateBid = () => {
    const tender = availableTenders.find((t) => t.id === selectedTenderId);
    if (!tender) return;
    const bidId = createBid({
      tenderId: tender.id,
      tenderTitle: tender.title,
      institution: tender.institution,
      ekapNo: tender.ekapNo,
    });
    setShowNewBidModal(false);
    setSelectedTenderId("");
    router.push(`/teklifler/${bidId}`);
  };

  const handleDuplicate = (bidId: string) => {
    const newId = duplicateBid(bidId);
    if (newId) router.push(`/teklifler/${newId}`);
  };

  return (
    <div className="bg-background-alt min-h-screen">
      {/* Page header */}
      <div className="bg-gradient-to-r from-background-dark to-primary py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
                Teklif Hazırlama
              </h1>
              <p className="text-blue-200 text-sm">
                İhaleler için teklif oluşturun, maliyet hesaplayın ve teklif
                mektubunuzu hazırlayın
              </p>
            </div>
            <button
              onClick={() => setShowNewBidModal(true)}
              className="flex items-center gap-2 bg-secondary hover:bg-secondary-dark text-white px-5 py-2.5 rounded-lg font-medium transition-colors shrink-0"
            >
              <Plus size={18} />
              Yeni Teklif Oluştur
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {bids.length}
                </p>
                <p className="text-xs text-foreground-light">Toplam Teklif</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock size={20} className="text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {bids.filter((b) => b.status === "draft").length}
                </p>
                <p className="text-xs text-foreground-light">Taslak</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 size={20} className="text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {bids.filter((b) => b.status === "completed").length}
                </p>
                <p className="text-xs text-foreground-light">Tamamlanan</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Send size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {bids.filter((b) => b.status === "submitted").length}
                </p>
                <p className="text-xs text-foreground-light">Gönderilen</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-border p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-light"
              />
              <input
                type="text"
                placeholder="Teklif ara (ihale adı, kurum, EKAP no)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-10 pr-4 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-foreground-light" />
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as BidStatus | "all")
                }
                className="h-10 px-3 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">Tüm Durumlar</option>
                <option value="draft">Taslak</option>
                <option value="completed">Tamamlandı</option>
                <option value="submitted">Gönderildi</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bid list */}
        {filteredBids.length === 0 ? (
          <div className="bg-white rounded-xl border border-border p-12 text-center">
            <Calculator
              size={48}
              className="mx-auto mb-4 text-foreground-light"
            />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {bids.length === 0
                ? "Henüz teklif oluşturmadınız"
                : "Aramanıza uygun teklif bulunamadı"}
            </h3>
            <p className="text-sm text-foreground-light mb-4">
              {bids.length === 0
                ? "İhaleler için teklif hazırlamaya başlayın"
                : "Farklı arama kriterleri deneyin"}
            </p>
            {bids.length === 0 && (
              <button
                onClick={() => setShowNewBidModal(true)}
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
              >
                <Plus size={18} />
                İlk Teklifinizi Oluşturun
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBids.map((bid) => {
              const total = calcBidTotal(bid.costItems);
              const cfg = statusConfig[bid.status];
              const Icon = cfg.icon;
              return (
                <div
                  key={bid.id}
                  className="bg-white rounded-xl border border-border hover:border-primary/30 hover:shadow-md transition-all"
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      {/* Left */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}
                          >
                            <Icon size={12} />
                            {cfg.label}
                          </span>
                          <span className="text-xs text-foreground-light">
                            EKAP: {bid.ekapNo}
                          </span>
                        </div>
                        <Link
                          href={`/teklifler/${bid.id}`}
                          className="text-base font-semibold text-foreground hover:text-primary transition-colors line-clamp-1"
                        >
                          {bid.tenderTitle}
                        </Link>
                        <p className="text-sm text-foreground-light mt-0.5">
                          {bid.institution}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-foreground-light">
                          <span>
                            Kalem: {bid.costItems.length}
                          </span>
                          <span>
                            Oluşturulma:{" "}
                            {formatDateTR(bid.createdAt)}
                          </span>
                          <span>
                            Son güncelleme:{" "}
                            {formatDateTR(bid.updatedAt)}
                          </span>
                        </div>
                      </div>

                      {/* Right */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className="text-right">
                          <p className="text-xs text-foreground-light">
                            Toplam Teklif
                          </p>
                          <p className="text-lg font-bold text-primary">
                            {formatCurrency(total)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDuplicate(bid.id)}
                            className="p-2 text-foreground-light hover:text-primary hover:bg-blue-50 rounded-lg transition-colors"
                            title="Bu teklifi temel al"
                          >
                            <Copy size={16} />
                          </button>
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  "Bu teklifi silmek istediğinize emin misiniz?"
                                )
                              )
                                deleteBid(bid.id);
                            }}
                            className="p-2 text-foreground-light hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Teklifi sil"
                          >
                            <Trash2 size={16} />
                          </button>
                          <Link
                            href={`/teklifler/${bid.id}`}
                            className="flex items-center gap-1 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            Düzenle
                            <ChevronRight size={14} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Bid Modal */}
      {showNewBidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="p-5 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">
                Yeni Teklif Oluştur
              </h2>
              <p className="text-sm text-foreground-light mt-1">
                Teklif hazırlamak istediğiniz ihaleyi seçin
              </p>
            </div>
            <div className="p-5 overflow-y-auto flex-1">
              <label className="block text-sm font-medium text-foreground mb-2">
                İhale Seçin
              </label>
              <select
                value={selectedTenderId}
                onChange={(e) => setSelectedTenderId(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mb-3"
              >
                <option value="">-- İhale seçiniz --</option>
                {availableTenders.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.ekapNo})
                  </option>
                ))}
              </select>
              {selectedTenderId && (
                <div className="bg-blue-50 rounded-lg p-3 text-sm">
                  {(() => {
                    const t = availableTenders.find(
                      (t) => t.id === selectedTenderId
                    );
                    if (!t) return null;
                    return (
                      <>
                        <p className="font-medium text-foreground">
                          {t.title}
                        </p>
                        <p className="text-foreground-light mt-1">
                          {t.institution}
                        </p>
                        <p className="text-foreground-light">
                          Tahmini Bedel: {t.estimatedCost}
                        </p>
                        <p className="text-foreground-light">
                          Son Başvuru: {formatDateTR(t.deadline)}
                        </p>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
            <div className="p-5 border-t border-border flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowNewBidModal(false);
                  setSelectedTenderId("");
                }}
                className="px-4 py-2 text-sm text-foreground-light hover:text-foreground border border-border rounded-lg transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleCreateBid}
                disabled={!selectedTenderId}
                className="px-5 py-2 text-sm bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Teklif Oluştur
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
