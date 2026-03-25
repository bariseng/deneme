"use client";

import { useState, useEffect, useCallback } from "react";

type Contract = {
  id: string;
  contractNo: string | null;
  title: string;
  status: string;
  contractDate: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  paidAmount: number;
  completionRate: number;
  warrantyMonths: number;
  tender: { title: string; institution: string; city: string };
  payments: { id: string; status: string; netAmount: number }[];
  guarantees: { id: string; type: string; status: string; expiryDate: string }[];
  _count: { workProgress: number };
};

type Summary = {
  totalContracts: number;
  activeContracts: number;
  totalValue: number;
  totalPaid: number;
  remainingValue: number;
  activeGuarantees: number;
  avgCompletion: number;
};

type Rating = {
  id: string;
  supplierName: string;
  supplierTaxNo: string | null;
  contractTitle: string | null;
  deliveryScore: number;
  qualityScore: number;
  communicationScore: number;
  priceScore: number;
  overallScore: number;
  comment: string | null;
  ratingDate: string;
};

type ExpiringGuarantee = {
  id: string;
  type: string;
  status: string;
  bankName: string;
  letterNo: string | null;
  amount: number;
  expiryDate: string;
  contract: { title: string; contractNo: string | null };
};

const STATUS_LABELS: Record<string, string> = {
  TASLAK: "Taslak",
  AKTIF: "Aktif",
  DEVAM_EDIYOR: "Devam Ediyor",
  TAMAMLANDI: "Tamamlandı",
  FESHEDILDI: "Feshedildi",
  ASKIYA_ALINDI: "Askıya Alındı",
};

const STATUS_COLORS: Record<string, string> = {
  TASLAK: "bg-gray-100 text-gray-700",
  AKTIF: "bg-blue-100 text-blue-700",
  DEVAM_EDIYOR: "bg-yellow-100 text-yellow-700",
  TAMAMLANDI: "bg-green-100 text-green-700",
  FESHEDILDI: "bg-red-100 text-red-700",
  ASKIYA_ALINDI: "bg-orange-100 text-orange-700",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  HAZIRLANIYOR: "Hazırlanıyor",
  ONAY_BEKLIYOR: "Onay Bekliyor",
  ONAYLANDI: "Onaylandı",
  ODENDI: "Ödendi",
  REDDEDILDI: "Reddedildi",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  HAZIRLANIYOR: "bg-gray-100 text-gray-700",
  ONAY_BEKLIYOR: "bg-yellow-100 text-yellow-700",
  ONAYLANDI: "bg-blue-100 text-blue-700",
  ODENDI: "bg-green-100 text-green-700",
  REDDEDILDI: "bg-red-100 text-red-700",
};

const GUARANTEE_TYPE_LABELS: Record<string, string> = {
  GECICI_TEMINAT: "Geçici Teminat",
  KESIN_TEMINAT: "Kesin Teminat",
  AVANS_TEMINAT: "Avans Teminatı",
  EK_KESIN_TEMINAT: "Ek Kesin Teminat",
};

const GUARANTEE_STATUS_LABELS: Record<string, string> = {
  AKTIF: "Aktif",
  IADE_EDILDI: "İade Edildi",
  NAKDE_CEVRILDI: "Nakde Çevrildi",
  SURESI_DOLDU: "Süresi Doldu",
};

const tabs = [
  { key: "contracts", label: "Sözleşmeler" },
  { key: "payments", label: "Hakediş Takibi" },
  { key: "progress", label: "İş İlerleme" },
  { key: "suppliers", label: "Tedarikçi Kartı" },
  { key: "guarantees", label: "Teminat Takibi" },
];

function formatCurrency(n: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("tr-TR");
}

function daysUntil(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

function Stars({ score, size = 16 }: { score: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} width={size} height={size} viewBox="0 0 20 20" fill={s <= Math.round(score) ? "#f59e0b" : "#e5e7eb"}>
          <path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.33L10 13.27l-4.77 2.51.91-5.33L2.27 6.68l5.34-.78z" />
        </svg>
      ))}
    </div>
  );
}

export default function ContractsClient() {
  const [activeTab, setActiveTab] = useState("contracts");
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [expiringGuarantees, setExpiringGuarantees] = useState<ExpiringGuarantee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);

  // ─── New payment form state
  const [paymentForm, setPaymentForm] = useState({ periodStart: "", periodEnd: "", grossAmount: "", deductions: "", description: "" });
  // ─── New progress form state
  const [progressForm, setProgressForm] = useState({ title: "", completionRate: "", description: "", isMilestone: false });
  // ─── New supplier rating form state
  const [ratingForm, setRatingForm] = useState({ supplierName: "", contractTitle: "", deliveryScore: "5", qualityScore: "5", communicationScore: "5", priceScore: "5", comment: "" });

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/contracts");
      const json = await res.json();
      if (json.success) {
        setContracts(json.data.contracts);
        setSummary(json.data.summary);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const fetchRatings = useCallback(async () => {
    try {
      const res = await fetch("/api/suppliers");
      const json = await res.json();
      if (json.success) setRatings(json.data);
    } catch { /* ignore */ }
  }, []);

  const fetchExpiringGuarantees = useCallback(async () => {
    try {
      const res = await fetch("/api/contracts/expiring-guarantees");
      const json = await res.json();
      if (json.success) setExpiringGuarantees(json.data);
    } catch { /* ignore */ }
  }, []);

  const fetchDetail = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/contracts/${id}`);
      const json = await res.json();
      if (json.success) setDetail(json.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchContracts();
    fetchRatings();
    fetchExpiringGuarantees();
  }, [fetchContracts, fetchRatings, fetchExpiringGuarantees]);

  useEffect(() => {
    if (selectedContract) fetchDetail(selectedContract);
  }, [selectedContract, fetchDetail]);

  // ─── Handlers ──────────────────────────────────

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedContract) return;
    await fetch(`/api/contracts/${selectedContract}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paymentForm),
    });
    setPaymentForm({ periodStart: "", periodEnd: "", grossAmount: "", deductions: "", description: "" });
    fetchDetail(selectedContract);
    fetchContracts();
  }

  async function handleUpdatePaymentStatus(paymentId: string, status: string) {
    if (!selectedContract) return;
    await fetch(`/api/contracts/${selectedContract}/payments/${paymentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchDetail(selectedContract);
    fetchContracts();
  }

  async function handleAddProgress(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedContract) return;
    await fetch(`/api/contracts/${selectedContract}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(progressForm),
    });
    setProgressForm({ title: "", completionRate: "", description: "", isMilestone: false });
    fetchDetail(selectedContract);
    fetchContracts();
  }

  async function handleRateSupplier(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ratingForm),
    });
    setRatingForm({ supplierName: "", contractTitle: "", deliveryScore: "5", qualityScore: "5", communicationScore: "5", priceScore: "5", comment: "" });
    fetchRatings();
  }

  async function handleUpdateContractStatus(id: string, status: string) {
    await fetch(`/api/contracts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchContracts();
    if (selectedContract === id) fetchDetail(id);
  }

  // ─── RENDER ────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Sözleşme & Performans Yönetimi</h1>
      <p className="text-gray-600 mb-6">İhale sonrası süreçlerinizi tek panelden yönetin</p>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Toplam Sözleşme</p>
            <p className="text-2xl font-bold text-gray-900">{summary.totalContracts}</p>
            <p className="text-xs text-blue-600">{summary.activeContracts} aktif</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Toplam Değer</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalValue)}</p>
            <p className="text-xs text-green-600">{formatCurrency(summary.totalPaid)} ödendi</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Kalan Tutar</p>
            <p className="text-2xl font-bold text-orange-600">{formatCurrency(summary.remainingValue)}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Ort. İlerleme</p>
            <p className="text-2xl font-bold text-gray-900">%{summary.avgCompletion}</p>
            <p className="text-xs text-purple-600">{summary.activeGuarantees} aktif teminat</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setActiveTab(t.key); setSelectedContract(null); setDetail(null); }}
            className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === t.key ? "bg-white text-blue-700 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Yükleniyor...</div>
      ) : (
        <>
          {/* ─── TAB: SÖZLEŞMELER ─── */}
          {activeTab === "contracts" && (
            <div className="space-y-4">
              {contracts.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border">
                  <p className="text-gray-500">Henüz sözleşme bulunmuyor.</p>
                  <p className="text-sm text-gray-400 mt-1">Kazandığınız ihaleler için sözleşme oluşturabilirsiniz.</p>
                </div>
              ) : (
                contracts.map((c) => (
                  <div key={c.id} className="bg-white rounded-lg border p-5 hover:shadow-md transition-shadow">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{c.title}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status] || "bg-gray-100"}`}>
                            {STATUS_LABELS[c.status] || c.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">{c.tender.institution} — {c.tender.city}</p>
                        {c.contractNo && <p className="text-xs text-gray-400">Sözleşme No: {c.contractNo}</p>}
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          <span>Başlangıç: {formatDate(c.startDate)}</span>
                          <span>Bitiş: {formatDate(c.endDate)}</span>
                          <span>{daysUntil(c.endDate) > 0 ? `${daysUntil(c.endDate)} gün kaldı` : "Süre doldu"}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <p className="text-lg font-bold text-gray-900">{formatCurrency(Number(c.totalAmount))}</p>
                        <div className="w-40">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>İlerleme</span>
                            <span>%{c.completionRate}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${c.completionRate}%` }} />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <select
                            value={c.status}
                            onChange={(e) => handleUpdateContractStatus(c.id, e.target.value)}
                            className="text-xs border rounded px-2 py-1"
                          >
                            {Object.entries(STATUS_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => setSelectedContract(selectedContract === c.id ? null : c.id)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            {selectedContract === c.id ? "Kapat" : "Detay"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Inline Detail */}
                    {selectedContract === c.id && detail && (
                      <div className="mt-4 pt-4 border-t space-y-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div><span className="text-gray-500">Hakediş:</span> <strong>{(detail as { payments: unknown[] }).payments?.length || 0}</strong></div>
                          <div><span className="text-gray-500">İlerleme Kaydı:</span> <strong>{(detail as { workProgress: unknown[] }).workProgress?.length || 0}</strong></div>
                          <div><span className="text-gray-500">Teminat:</span> <strong>{(detail as { guarantees: unknown[] }).guarantees?.length || 0}</strong></div>
                          <div><span className="text-gray-500">Garanti:</span> <strong>{c.warrantyMonths} ay</strong></div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ─── TAB: HAKEDİŞ TAKİBİ ─── */}
          {activeTab === "payments" && (
            <div className="space-y-6">
              {/* Contract selector */}
              <div className="bg-white rounded-lg border p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Sözleşme Seçin</label>
                <select
                  value={selectedContract || ""}
                  onChange={(e) => setSelectedContract(e.target.value || null)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">-- Sözleşme seçin --</option>
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>{c.title} ({formatCurrency(Number(c.totalAmount))})</option>
                  ))}
                </select>
              </div>

              {selectedContract && detail && (
                <>
                  {/* Payment list */}
                  <div className="bg-white rounded-lg border">
                    <div className="p-4 border-b">
                      <h3 className="font-semibold">Hakediş Listesi</h3>
                    </div>
                    {((detail as { payments: Array<{ id: string; periodNo: number; periodStart: string; periodEnd: string; grossAmount: number; deductions: number; netAmount: number; status: string; cumulativeRate: number }> }).payments || []).length === 0 ? (
                      <p className="p-4 text-sm text-gray-500">Henüz hakediş oluşturulmamış.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left">No</th>
                              <th className="px-4 py-2 text-left">Dönem</th>
                              <th className="px-4 py-2 text-right">Brüt</th>
                              <th className="px-4 py-2 text-right">Kesinti</th>
                              <th className="px-4 py-2 text-right">Net</th>
                              <th className="px-4 py-2 text-center">Durum</th>
                              <th className="px-4 py-2 text-center">İşlem</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(detail as { payments: Array<{ id: string; periodNo: number; periodStart: string; periodEnd: string; grossAmount: number; deductions: number; netAmount: number; status: string; cumulativeRate: number }> }).payments.map((p) => (
                              <tr key={p.id} className="border-t hover:bg-gray-50">
                                <td className="px-4 py-2 font-medium">#{p.periodNo}</td>
                                <td className="px-4 py-2">{formatDate(p.periodStart)} - {formatDate(p.periodEnd)}</td>
                                <td className="px-4 py-2 text-right">{formatCurrency(Number(p.grossAmount))}</td>
                                <td className="px-4 py-2 text-right text-red-600">{formatCurrency(Number(p.deductions))}</td>
                                <td className="px-4 py-2 text-right font-medium">{formatCurrency(Number(p.netAmount))}</td>
                                <td className="px-4 py-2 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-xs ${PAYMENT_STATUS_COLORS[p.status] || "bg-gray-100"}`}>
                                    {PAYMENT_STATUS_LABELS[p.status] || p.status}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-center">
                                  {p.status === "HAZIRLANIYOR" && (
                                    <button onClick={() => handleUpdatePaymentStatus(p.id, "ONAY_BEKLIYOR")} className="text-xs text-blue-600 hover:underline">Onaya Gönder</button>
                                  )}
                                  {p.status === "ONAY_BEKLIYOR" && (
                                    <div className="flex gap-1 justify-center">
                                      <button onClick={() => handleUpdatePaymentStatus(p.id, "ONAYLANDI")} className="text-xs text-green-600 hover:underline">Onayla</button>
                                      <button onClick={() => handleUpdatePaymentStatus(p.id, "REDDEDILDI")} className="text-xs text-red-600 hover:underline">Reddet</button>
                                    </div>
                                  )}
                                  {p.status === "ONAYLANDI" && (
                                    <button onClick={() => handleUpdatePaymentStatus(p.id, "ODENDI")} className="text-xs text-green-600 hover:underline">Ödendi</button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Add payment form */}
                  <div className="bg-white rounded-lg border p-4">
                    <h3 className="font-semibold mb-3">Yeni Hakediş Ekle</h3>
                    <form onSubmit={handleAddPayment} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input type="date" required value={paymentForm.periodStart} onChange={(e) => setPaymentForm({ ...paymentForm, periodStart: e.target.value })} className="border rounded px-3 py-2 text-sm" placeholder="Dönem Başı" />
                      <input type="date" required value={paymentForm.periodEnd} onChange={(e) => setPaymentForm({ ...paymentForm, periodEnd: e.target.value })} className="border rounded px-3 py-2 text-sm" placeholder="Dönem Sonu" />
                      <input type="number" required value={paymentForm.grossAmount} onChange={(e) => setPaymentForm({ ...paymentForm, grossAmount: e.target.value })} className="border rounded px-3 py-2 text-sm" placeholder="Brüt Tutar (TL)" />
                      <input type="number" value={paymentForm.deductions} onChange={(e) => setPaymentForm({ ...paymentForm, deductions: e.target.value })} className="border rounded px-3 py-2 text-sm" placeholder="Kesintiler (TL)" />
                      <input type="text" value={paymentForm.description} onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })} className="border rounded px-3 py-2 text-sm" placeholder="Açıklama" />
                      <button type="submit" className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700">Ekle</button>
                    </form>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ─── TAB: İŞ İLERLEME ─── */}
          {activeTab === "progress" && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Sözleşme Seçin</label>
                <select
                  value={selectedContract || ""}
                  onChange={(e) => setSelectedContract(e.target.value || null)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">-- Sözleşme seçin --</option>
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>{c.title} (%{c.completionRate})</option>
                  ))}
                </select>
              </div>

              {selectedContract && detail && (
                <>
                  {/* Progress timeline */}
                  <div className="bg-white rounded-lg border">
                    <div className="p-4 border-b">
                      <h3 className="font-semibold">İlerleme Kayıtları</h3>
                    </div>
                    <div className="p-4 space-y-4">
                      {((detail as { workProgress: Array<{ id: string; title: string; description: string | null; completionRate: number; isMilestone: boolean; reportDate: string; notes: string | null }> }).workProgress || []).length === 0 ? (
                        <p className="text-sm text-gray-500">Henüz ilerleme kaydı yok.</p>
                      ) : (
                        (detail as { workProgress: Array<{ id: string; title: string; description: string | null; completionRate: number; isMilestone: boolean; reportDate: string; notes: string | null }> }).workProgress.map((wp) => (
                          <div key={wp.id} className="flex gap-4 items-start">
                            <div className="flex flex-col items-center">
                              <div className={`w-4 h-4 rounded-full border-2 ${wp.isMilestone ? "bg-yellow-400 border-yellow-500" : "bg-blue-400 border-blue-500"}`} />
                              <div className="w-0.5 h-full bg-gray-200 mt-1" />
                            </div>
                            <div className="flex-1 pb-4">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-gray-900">{wp.title}</h4>
                                {wp.isMilestone && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs">Milestone</span>}
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">{formatDate(wp.reportDate)}</p>
                              {wp.description && <p className="text-sm text-gray-600 mt-1">{wp.description}</p>}
                              <div className="mt-2 w-48">
                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                  <span>Tamamlanma</span>
                                  <span>%{wp.completionRate}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${wp.completionRate === 100 ? "bg-green-500" : wp.completionRate >= 70 ? "bg-blue-500" : wp.completionRate >= 40 ? "bg-yellow-500" : "bg-red-500"}`}
                                    style={{ width: `${wp.completionRate}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Add progress form */}
                  <div className="bg-white rounded-lg border p-4">
                    <h3 className="font-semibold mb-3">Yeni İlerleme Kaydı</h3>
                    <form onSubmit={handleAddProgress} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input type="text" required value={progressForm.title} onChange={(e) => setProgressForm({ ...progressForm, title: e.target.value })} className="border rounded px-3 py-2 text-sm" placeholder="Başlık" />
                      <input type="number" required min="0" max="100" value={progressForm.completionRate} onChange={(e) => setProgressForm({ ...progressForm, completionRate: e.target.value })} className="border rounded px-3 py-2 text-sm" placeholder="Tamamlanma %" />
                      <textarea value={progressForm.description} onChange={(e) => setProgressForm({ ...progressForm, description: e.target.value })} className="border rounded px-3 py-2 text-sm md:col-span-2" rows={2} placeholder="Açıklama" />
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="milestone" checked={progressForm.isMilestone} onChange={(e) => setProgressForm({ ...progressForm, isMilestone: e.target.checked })} />
                        <label htmlFor="milestone" className="text-sm text-gray-700">Milestone olarak işaretle</label>
                      </div>
                      <button type="submit" className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700">Kaydet</button>
                    </form>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ─── TAB: TEDARİKÇİ KARTI ─── */}
          {activeTab === "suppliers" && (
            <div className="space-y-6">
              {/* Existing ratings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ratings.length === 0 ? (
                  <div className="md:col-span-2 text-center py-12 bg-white rounded-lg border">
                    <p className="text-gray-500">Henüz tedarikçi değerlendirmesi yok.</p>
                  </div>
                ) : (
                  ratings.map((r) => (
                    <div key={r.id} className="bg-white rounded-lg border p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">{r.supplierName}</h3>
                          {r.contractTitle && <p className="text-sm text-gray-500">{r.contractTitle}</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-yellow-500">{r.overallScore.toFixed(1)}</p>
                          <Stars score={r.overallScore} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        {[
                          { label: "Teslimat", score: r.deliveryScore },
                          { label: "Kalite", score: r.qualityScore },
                          { label: "İletişim", score: r.communicationScore },
                          { label: "Fiyat", score: r.priceScore },
                        ].map((item) => (
                          <div key={item.label} className="flex items-center gap-2">
                            <span className="text-sm text-gray-600 w-20">{item.label}</span>
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div className="bg-yellow-400 h-2 rounded-full" style={{ width: `${(item.score / 5) * 100}%` }} />
                            </div>
                            <span className="text-sm font-medium w-6 text-right">{item.score}</span>
                          </div>
                        ))}
                      </div>
                      {r.comment && <p className="mt-3 text-sm text-gray-600 italic">&ldquo;{r.comment}&rdquo;</p>}
                      <p className="text-xs text-gray-400 mt-2">{formatDate(r.ratingDate)}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add rating form */}
              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-semibold mb-3">Yeni Tedarikçi Değerlendirmesi</h3>
                <form onSubmit={handleRateSupplier} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input type="text" required value={ratingForm.supplierName} onChange={(e) => setRatingForm({ ...ratingForm, supplierName: e.target.value })} className="border rounded px-3 py-2 text-sm" placeholder="Tedarikçi Adı" />
                  <input type="text" value={ratingForm.contractTitle} onChange={(e) => setRatingForm({ ...ratingForm, contractTitle: e.target.value })} className="border rounded px-3 py-2 text-sm" placeholder="Sözleşme / İş Başlığı" />
                  {[
                    { key: "deliveryScore", label: "Teslimat Puanı (1-5)" },
                    { key: "qualityScore", label: "Kalite Puanı (1-5)" },
                    { key: "communicationScore", label: "İletişim Puanı (1-5)" },
                    { key: "priceScore", label: "Fiyat Puanı (1-5)" },
                  ].map((field) => (
                    <div key={field.key}>
                      <label className="block text-xs text-gray-500 mb-1">{field.label}</label>
                      <input
                        type="number" min="1" max="5" step="0.5" required
                        value={ratingForm[field.key as keyof typeof ratingForm]}
                        onChange={(e) => setRatingForm({ ...ratingForm, [field.key]: e.target.value })}
                        className="w-full border rounded px-3 py-2 text-sm"
                      />
                    </div>
                  ))}
                  <textarea value={ratingForm.comment} onChange={(e) => setRatingForm({ ...ratingForm, comment: e.target.value })} className="border rounded px-3 py-2 text-sm md:col-span-2" rows={2} placeholder="Yorum (opsiyonel)" />
                  <button type="submit" className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700 md:col-span-2">Değerlendir</button>
                </form>
              </div>
            </div>
          )}

          {/* ─── TAB: TEMİNAT TAKİBİ ─── */}
          {activeTab === "guarantees" && (
            <div className="space-y-6">
              {/* Expiring guarantees warning */}
              {expiringGuarantees.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-700 mb-2">Süresi Yaklaşan Teminatlar ({expiringGuarantees.length})</h3>
                  <div className="space-y-2">
                    {expiringGuarantees.map((g) => {
                      const days = daysUntil(g.expiryDate);
                      return (
                        <div key={g.id} className="flex items-center justify-between bg-white rounded p-3 border border-red-100">
                          <div>
                            <p className="text-sm font-medium">{g.contract.title}</p>
                            <p className="text-xs text-gray-500">{GUARANTEE_TYPE_LABELS[g.type] || g.type} — {g.bankName}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(Number(g.amount))}</p>
                            <p className={`text-xs font-medium ${days <= 7 ? "text-red-600" : days <= 14 ? "text-orange-600" : "text-yellow-600"}`}>
                              {days <= 0 ? "Süresi doldu!" : `${days} gün kaldı`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* All guarantees by contract */}
              {contracts.map((c) => {
                const contractGuarantees = c.guarantees || [];
                if (contractGuarantees.length === 0) return null;
                return (
                  <div key={c.id} className="bg-white rounded-lg border">
                    <div className="p-4 border-b">
                      <h3 className="font-semibold">{c.title}</h3>
                      <p className="text-xs text-gray-500">{c.contractNo || "No yok"}</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left">Tür</th>
                            <th className="px-4 py-2 text-left">Durum</th>
                            <th className="px-4 py-2 text-right">Tutar</th>
                            <th className="px-4 py-2 text-left">Bitiş</th>
                          </tr>
                        </thead>
                        <tbody>
                          {contractGuarantees.map((g) => (
                            <tr key={g.id} className="border-t">
                              <td className="px-4 py-2">{GUARANTEE_TYPE_LABELS[g.type] || g.type}</td>
                              <td className="px-4 py-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs ${g.status === "AKTIF" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                                  {GUARANTEE_STATUS_LABELS[g.status] || g.status}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-right font-medium">{formatCurrency(Number((g as unknown as { amount: number }).amount || 0))}</td>
                              <td className="px-4 py-2">{formatDate(g.expiryDate)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}

              {contracts.every((c) => !c.guarantees || c.guarantees.length === 0) && expiringGuarantees.length === 0 && (
                <div className="text-center py-12 bg-white rounded-lg border">
                  <p className="text-gray-500">Henüz teminat kaydı bulunmuyor.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
