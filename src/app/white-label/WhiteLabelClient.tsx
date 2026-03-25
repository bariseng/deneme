"use client";

import { useState, useEffect, useCallback } from "react";

// ─── TYPES ───────────────────────────────────────────────

type Tenant = {
  id: string; name: string; slug: string; customDomain: string | null; logo: string | null;
  primaryColor: string; plan: string; isActive: boolean; createdAt: string;
  _count: { apiKeys: number; webhooks: number };
};

type ApiKeyItem = {
  id: string; name: string; prefix: string; permissions: string[]; rateLimit: number;
  isActive: boolean; lastUsedAt: string | null; expiresAt: string | null; createdAt: string;
  rawKey?: string; tenant: { name: string; slug: string } | null; _count: { usage: number };
};

type WebhookItem = {
  id: string; url: string; events: string[]; isActive: boolean; secret: string;
  lastSentAt: string | null; failCount: number; createdAt: string;
};

type Referral = {
  id: string; referralCode: string; commission: number; commissionRate: number;
  status: string; createdAt: string;
  referredUser: { id: string; name: string | null; email: string; plan: string; createdAt: string } | null;
};

type UsageStats = {
  totalRequests: number; avgResponseTime: number; errorRate: number;
  topEndpoints: { endpoint: string; _count: number }[];
};

type PartnerStats = {
  totalReferrals: number; claimed: number; totalCommission: number;
  paidCommission: number; pendingCommission: number;
};

// ─── CONSTANTS ───────────────────────────────────────────

const tabs = [
  { key: "tenants", label: "White-Label" },
  { key: "apikeys", label: "API Anahtarları" },
  { key: "webhooks", label: "Webhook'lar" },
  { key: "usage", label: "API Kullanımı" },
  { key: "partners", label: "Partner Programı" },
  { key: "embed", label: "Embed Widget" },
];

const WEBHOOK_EVENTS = [
  { key: "tender.created", label: "Yeni ihale eklendi" },
  { key: "tender.updated", label: "İhale güncellendi" },
  { key: "tender.deadline", label: "Son başvuru yaklaşıyor" },
  { key: "result.announced", label: "Sonuç açıklandı" },
  { key: "bid.submitted", label: "Teklif gönderildi" },
  { key: "document.uploaded", label: "Belge yüklendi" },
];

const API_PERMISSIONS = [
  { key: "tenders:read", label: "İhale Okuma" },
  { key: "tenders:search", label: "İhale Arama" },
  { key: "bids:read", label: "Teklif Okuma" },
  { key: "bids:write", label: "Teklif Yazma" },
  { key: "notifications:read", label: "Bildirim Okuma" },
  { key: "analytics:read", label: "Analitik Okuma" },
  { key: "documents:read", label: "Belge Okuma" },
  { key: "webhooks:manage", label: "Webhook Yönetimi" },
];

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  BEKLIYOR: { text: "Bekliyor", color: "bg-yellow-100 text-yellow-700" },
  ONAYLANDI: { text: "Onaylandı", color: "bg-blue-100 text-blue-700" },
  ODENDI: { text: "Ödendi", color: "bg-green-100 text-green-700" },
  IPTAL: { text: "İptal", color: "bg-red-100 text-red-700" },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 0 }).format(n);
}

export default function WhiteLabelClient() {
  const [activeTab, setActiveTab] = useState("tenants");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [partnerStats, setPartnerStats] = useState<PartnerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [newKeyRevealed, setNewKeyRevealed] = useState<string | null>(null);

  // Forms
  const [tenantForm, setTenantForm] = useState({ name: "", slug: "", primaryColor: "#1a56db" });
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [keyForm, setKeyForm] = useState({ name: "", permissions: ["tenders:read", "tenders:search"], rateLimit: "1000" });
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [webhookForm, setWebhookForm] = useState({ url: "", events: [] as string[] });
  const [showWebhookForm, setShowWebhookForm] = useState(false);

  // ─── FETCHERS ──────────────────────────────────

  const fetchTenants = useCallback(async () => {
    try { const r = await fetch("/api/white-label/tenants"); const j = await r.json(); if (j.success) setTenants(j.data); } catch { /* */ }
  }, []);

  const fetchApiKeys = useCallback(async () => {
    try { const r = await fetch("/api/white-label/api-keys"); const j = await r.json(); if (j.success) setApiKeys(j.data); } catch { /* */ }
  }, []);

  const fetchWebhooks = useCallback(async () => {
    try { const r = await fetch("/api/white-label/webhooks"); const j = await r.json(); if (j.success) setWebhooks(j.data); } catch { /* */ }
  }, []);

  const fetchUsage = useCallback(async () => {
    try { const r = await fetch("/api/white-label/usage"); const j = await r.json(); if (j.success) setUsageStats(j.data); } catch { /* */ }
  }, []);

  const fetchPartners = useCallback(async () => {
    try {
      const r = await fetch("/api/white-label/partners");
      const j = await r.json();
      if (j.success) { setReferrals(j.data.referrals); setPartnerStats(j.data.stats); }
    } catch { /* */ }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchTenants(), fetchApiKeys(), fetchWebhooks(), fetchUsage(), fetchPartners()]).then(() => setLoading(false));
  }, [fetchTenants, fetchApiKeys, fetchWebhooks, fetchUsage, fetchPartners]);

  // ─── HANDLERS ──────────────────────────────────

  async function handleCreateTenant(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/white-label/tenants", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(tenantForm) });
    setTenantForm({ name: "", slug: "", primaryColor: "#1a56db" }); setShowTenantForm(false); fetchTenants();
  }

  async function handleDeleteTenant(id: string) {
    await fetch(`/api/white-label/tenants/${id}`, { method: "DELETE" }); fetchTenants();
  }

  async function handleCreateKey(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/white-label/api-keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(keyForm) });
    const json = await res.json();
    if (json.success && json.data.rawKey) setNewKeyRevealed(json.data.rawKey);
    setKeyForm({ name: "", permissions: ["tenders:read", "tenders:search"], rateLimit: "1000" }); setShowKeyForm(false); fetchApiKeys();
  }

  async function handleRevokeKey(id: string) {
    await fetch(`/api/white-label/api-keys/${id}`, { method: "PATCH" }); fetchApiKeys();
  }

  async function handleDeleteKey(id: string) {
    await fetch(`/api/white-label/api-keys/${id}`, { method: "DELETE" }); fetchApiKeys();
  }

  async function handleCreateWebhook(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/white-label/webhooks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(webhookForm) });
    setWebhookForm({ url: "", events: [] }); setShowWebhookForm(false); fetchWebhooks();
  }

  async function handleToggleWebhook(id: string, isActive: boolean) {
    await fetch(`/api/white-label/webhooks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !isActive }) });
    fetchWebhooks();
  }

  async function handleDeleteWebhook(id: string) {
    await fetch(`/api/white-label/webhooks/${id}`, { method: "DELETE" }); fetchWebhooks();
  }

  async function handleCreateReferral() {
    await fetch("/api/white-label/partners", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create_code" }) });
    fetchPartners();
  }

  function toggleWebhookEvent(event: string) {
    setWebhookForm((f) => ({
      ...f,
      events: f.events.includes(event) ? f.events.filter((e) => e !== event) : [...f.events, event],
    }));
  }

  function togglePermission(perm: string) {
    setKeyForm((f) => ({
      ...f,
      permissions: f.permissions.includes(perm) ? f.permissions.filter((p) => p !== perm) : [...f.permissions, perm],
    }));
  }

  // ─── RENDER ────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">White-Label & API Marketplace</h1>
      <p className="text-gray-600 mb-6">Markanızla kendi ihale platformunuzu oluşturun, API entegrasyonları kurun</p>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === t.key ? "bg-white text-blue-700 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <div className="text-center py-12 text-gray-500">Yükleniyor...</div> : (
        <>
          {/* ═══ TENANTS ═══ */}
          {activeTab === "tenants" && (
            <div className="space-y-6">
              <div className="flex justify-end">
                <button onClick={() => setShowTenantForm(!showTenantForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                  {showTenantForm ? "Kapat" : "Yeni Tenant Oluştur"}
                </button>
              </div>

              {showTenantForm && (
                <form onSubmit={handleCreateTenant} className="bg-white rounded-lg border p-4 space-y-3">
                  <h3 className="font-semibold">Yeni White-Label Tenant</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input type="text" required placeholder="Firma Adı" value={tenantForm.name} onChange={(e) => setTenantForm({ ...tenantForm, name: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
                    <input type="text" required placeholder="Subdomain (slug)" value={tenantForm.slug} onChange={(e) => setTenantForm({ ...tenantForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} className="border rounded-lg px-3 py-2 text-sm" />
                    <div className="flex gap-2 items-center">
                      <input type="color" value={tenantForm.primaryColor} onChange={(e) => setTenantForm({ ...tenantForm, primaryColor: e.target.value })} className="w-10 h-10 rounded cursor-pointer" />
                      <span className="text-sm text-gray-500">Ana renk</span>
                    </div>
                  </div>
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Oluştur</button>
                </form>
              )}

              {tenants.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border">
                  <p className="text-2xl mb-2">🏢</p>
                  <p className="text-gray-500">Henüz tenant yok. Kendi markanızla bir ihale portalı oluşturun!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tenants.map((t) => (
                    <div key={t.id} className="bg-white rounded-lg border p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: t.primaryColor }}>
                            {t.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{t.name}</h3>
                            <p className="text-xs text-gray-500">{t.slug}.ihalepro.com</p>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded ${t.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {t.isActive ? "Aktif" : "Pasif"}
                        </span>
                      </div>
                      <div className="flex gap-4 text-xs text-gray-500 mb-3">
                        <span>{t.plan}</span>
                        <span>{t._count.apiKeys} API Key</span>
                        <span>{t._count.webhooks} Webhook</span>
                        <span>{formatDate(t.createdAt)}</span>
                      </div>
                      {t.customDomain && <p className="text-xs text-blue-600 mb-2">Domain: {t.customDomain}</p>}
                      <div className="flex gap-2">
                        <button onClick={() => handleDeleteTenant(t.id)} className="text-xs text-red-500 hover:underline">Sil</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ API KEYS ═══ */}
          {activeTab === "apikeys" && (
            <div className="space-y-6">
              {/* Revealed key banner */}
              {newKeyRevealed && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-yellow-800 mb-2">API anahtarınız oluşturuldu. Bu anahtarı bir daha göremezsiniz!</p>
                  <code className="block bg-yellow-100 p-2 rounded text-xs font-mono break-all">{newKeyRevealed}</code>
                  <button onClick={() => { navigator.clipboard.writeText(newKeyRevealed); }} className="mt-2 text-xs text-yellow-700 hover:underline">Kopyala</button>
                  <button onClick={() => setNewKeyRevealed(null)} className="mt-2 ml-4 text-xs text-gray-500 hover:underline">Kapat</button>
                </div>
              )}

              <div className="flex justify-end">
                <button onClick={() => setShowKeyForm(!showKeyForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                  {showKeyForm ? "Kapat" : "Yeni API Anahtarı"}
                </button>
              </div>

              {showKeyForm && (
                <form onSubmit={handleCreateKey} className="bg-white rounded-lg border p-4 space-y-3">
                  <h3 className="font-semibold">Yeni API Anahtarı</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input type="text" required placeholder="Anahtar adı" value={keyForm.name} onChange={(e) => setKeyForm({ ...keyForm, name: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
                    <input type="number" min="100" max="100000" placeholder="Rate limit (req/saat)" value={keyForm.rateLimit} onChange={(e) => setKeyForm({ ...keyForm, rateLimit: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">İzinler</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {API_PERMISSIONS.map((p) => (
                        <label key={p.key} className="flex items-center gap-2 text-xs">
                          <input type="checkbox" checked={keyForm.permissions.includes(p.key)} onChange={() => togglePermission(p.key)} />
                          {p.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Oluştur</button>
                </form>
              )}

              <div className="space-y-3">
                {apiKeys.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-lg border">
                    <p className="text-gray-500">Henüz API anahtarı yok.</p>
                  </div>
                ) : apiKeys.map((k) => (
                  <div key={k.id} className="bg-white rounded-lg border p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-gray-900">{k.name}</h4>
                        <code className="text-xs text-gray-500 font-mono">{k.prefix}...****</code>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded ${k.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {k.isActive ? "Aktif" : "İptal"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {k.permissions.map((p) => <span key={p} className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{p}</span>)}
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-gray-400">
                      <span>Limit: {k.rateLimit}/saat</span>
                      <span>{k._count.usage} istek</span>
                      {k.lastUsedAt && <span>Son: {formatDate(k.lastUsedAt)}</span>}
                      <span>{formatDate(k.createdAt)}</span>
                    </div>
                    <div className="flex gap-3 mt-2">
                      {k.isActive && <button onClick={() => handleRevokeKey(k.id)} className="text-xs text-yellow-600 hover:underline">İptal Et</button>}
                      <button onClick={() => handleDeleteKey(k.id)} className="text-xs text-red-500 hover:underline">Sil</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ WEBHOOKS ═══ */}
          {activeTab === "webhooks" && (
            <div className="space-y-6">
              <div className="flex justify-end">
                <button onClick={() => setShowWebhookForm(!showWebhookForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                  {showWebhookForm ? "Kapat" : "Yeni Webhook"}
                </button>
              </div>

              {showWebhookForm && (
                <form onSubmit={handleCreateWebhook} className="bg-white rounded-lg border p-4 space-y-3">
                  <h3 className="font-semibold">Yeni Webhook</h3>
                  <input type="url" required placeholder="https://sizin-api.com/webhook" value={webhookForm.url} onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Olaylar</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {WEBHOOK_EVENTS.map((ev) => (
                        <label key={ev.key} className="flex items-center gap-2 text-xs">
                          <input type="checkbox" checked={webhookForm.events.includes(ev.key)} onChange={() => toggleWebhookEvent(ev.key)} />
                          {ev.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Oluştur</button>
                </form>
              )}

              <div className="space-y-3">
                {webhooks.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-lg border"><p className="text-gray-500">Henüz webhook tanımlı değil.</p></div>
                ) : webhooks.map((wh) => (
                  <div key={wh.id} className="bg-white rounded-lg border p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <code className="text-sm font-mono text-gray-900">{wh.url}</code>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {wh.events.map((e) => <span key={e} className="text-xs bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">{e}</span>)}
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded ${wh.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {wh.isActive ? "Aktif" : "Pasif"}
                      </span>
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-gray-400">
                      {wh.lastSentAt && <span>Son gönderim: {formatDate(wh.lastSentAt)}</span>}
                      {wh.failCount > 0 && <span className="text-red-500">{wh.failCount} hata</span>}
                    </div>
                    <div className="flex gap-3 mt-2">
                      <button onClick={() => handleToggleWebhook(wh.id, wh.isActive)} className="text-xs text-blue-600 hover:underline">
                        {wh.isActive ? "Durdur" : "Başlat"}
                      </button>
                      <button onClick={() => handleDeleteWebhook(wh.id)} className="text-xs text-red-500 hover:underline">Sil</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ API USAGE ═══ */}
          {activeTab === "usage" && (
            <div className="space-y-6">
              {usageStats ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg border p-4 text-center">
                      <p className="text-2xl font-bold text-blue-600">{usageStats.totalRequests.toLocaleString("tr-TR")}</p>
                      <p className="text-sm text-gray-500">Toplam İstek</p>
                    </div>
                    <div className="bg-white rounded-lg border p-4 text-center">
                      <p className="text-2xl font-bold text-green-600">{usageStats.avgResponseTime}ms</p>
                      <p className="text-sm text-gray-500">Ort. Yanıt Süresi</p>
                    </div>
                    <div className="bg-white rounded-lg border p-4 text-center">
                      <p className="text-2xl font-bold text-red-600">%{usageStats.errorRate}</p>
                      <p className="text-sm text-gray-500">Hata Oranı</p>
                    </div>
                    <div className="bg-white rounded-lg border p-4 text-center">
                      <p className="text-2xl font-bold text-purple-600">{apiKeys.filter((k) => k.isActive).length}</p>
                      <p className="text-sm text-gray-500">Aktif Anahtar</p>
                    </div>
                  </div>

                  {usageStats.topEndpoints.length > 0 && (
                    <div className="bg-white rounded-lg border">
                      <div className="p-4 border-b"><h3 className="font-semibold">En Çok Kullanılan Endpoint'ler</h3></div>
                      <div className="divide-y">
                        {usageStats.topEndpoints.map((ep) => (
                          <div key={ep.endpoint} className="flex justify-between items-center px-4 py-3">
                            <code className="text-sm font-mono text-gray-700">{ep.endpoint}</code>
                            <span className="text-sm font-medium text-gray-900">{ep._count.toLocaleString("tr-TR")}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 bg-white rounded-lg border"><p className="text-gray-500">API kullanım verisi yok.</p></div>
              )}
            </div>
          )}

          {/* ═══ PARTNERS ═══ */}
          {activeTab === "partners" && (
            <div className="space-y-6">
              {partnerStats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-white rounded-lg border p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{partnerStats.totalReferrals}</p>
                    <p className="text-xs text-gray-500">Toplam Referans</p>
                  </div>
                  <div className="bg-white rounded-lg border p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{partnerStats.claimed}</p>
                    <p className="text-xs text-gray-500">Kullanılan</p>
                  </div>
                  <div className="bg-white rounded-lg border p-4 text-center">
                    <p className="text-2xl font-bold text-purple-600">{formatCurrency(partnerStats.totalCommission)}</p>
                    <p className="text-xs text-gray-500">Toplam Komisyon</p>
                  </div>
                  <div className="bg-white rounded-lg border p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(partnerStats.paidCommission)}</p>
                    <p className="text-xs text-gray-500">Ödenen</p>
                  </div>
                  <div className="bg-white rounded-lg border p-4 text-center">
                    <p className="text-2xl font-bold text-orange-600">{formatCurrency(partnerStats.pendingCommission)}</p>
                    <p className="text-xs text-gray-500">Bekleyen</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button onClick={handleCreateReferral} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                  Yeni Referans Kodu Oluştur
                </button>
              </div>

              <div className="bg-white rounded-lg border">
                <div className="p-4 border-b"><h3 className="font-semibold">Referans Kodlarım</h3></div>
                <div className="divide-y">
                  {referrals.length === 0 ? (
                    <p className="p-4 text-sm text-gray-500">Henüz referans kodu yok. Oluşturup paylaşarak komisyon kazanın!</p>
                  ) : referrals.map((ref) => (
                    <div key={ref.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <div>
                        <code className="text-sm font-mono font-bold text-blue-600">{ref.referralCode}</code>
                        <div className="flex gap-3 text-xs text-gray-500 mt-1">
                          <span>Komisyon: %{Number(ref.commissionRate)}</span>
                          <span>{formatDate(ref.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {ref.referredUser ? (
                          <span className="text-xs text-green-600">{ref.referredUser.name || ref.referredUser.email} ({ref.referredUser.plan})</span>
                        ) : (
                          <span className="text-xs text-gray-400">Henüz kullanılmadı</span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded ${STATUS_LABELS[ref.status]?.color || "bg-gray-100"}`}>
                          {STATUS_LABELS[ref.status]?.text || ref.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ EMBED WIDGET ═══ */}
          {activeTab === "embed" && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border p-6">
                <h3 className="font-semibold text-lg mb-4">Embed Widget</h3>
                <p className="text-sm text-gray-600 mb-4">
                  İhale listesini kendi web sitenize gömün. Aşağıdaki kodu sitenize ekleyin.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">iframe Embed Kodu</label>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <code className="text-xs font-mono break-all text-gray-700">
                        {`<iframe src="${typeof window !== "undefined" ? window.location.origin : ""}/api/white-label/embed?key=YOUR_API_KEY&limit=10" width="100%" height="600" frameborder="0"></iframe>`}
                      </code>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">JavaScript Embed</label>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <code className="text-xs font-mono break-all text-gray-700">
{`<div id="ihalepro-widget"></div>
<script>
  fetch('${typeof window !== "undefined" ? window.location.origin : ""}/api/white-label/embed?key=YOUR_API_KEY&limit=10')
    .then(r => r.json())
    .then(data => {
      const el = document.getElementById('ihalepro-widget');
      el.innerHTML = data.data.map(t =>
        '<div style="padding:12px;border-bottom:1px solid #eee">' +
        '<strong>' + t.title + '</strong><br>' +
        '<small>' + t.institution + ' - ' + t.city + '</small>' +
        '</div>'
      ).join('');
    });
</script>`}
                      </code>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">REST API Kullanımı</label>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <code className="text-xs font-mono break-all text-gray-700">
{`GET /api/white-label/embed?key=YOUR_API_KEY&limit=10&city=İstanbul&type=YAPIM

Headers: { "x-api-key": "YOUR_API_KEY" }

Response: { "success": true, "data": [...], "count": 10 }`}
                      </code>
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 text-sm mb-2">Parametreler</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
                      <span><code>key</code> — API anahtarınız (zorunlu)</span>
                      <span><code>limit</code> — Sonuç sayısı (max 50)</span>
                      <span><code>city</code> — Şehir filtresi</span>
                      <span><code>type</code> — İhale türü (YAPIM, HIZMET, MAL_ALIMI)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ERP Integrations */}
              <div className="bg-white rounded-lg border p-6">
                <h3 className="font-semibold text-lg mb-4">ERP Entegrasyonları</h3>
                <p className="text-sm text-gray-600 mb-4">Hazır connector'lar ile ERP sisteminize bağlanın.</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { name: "SAP", desc: "SAP Business One / S4HANA", status: "Hazır" },
                    { name: "Logo", desc: "Logo Tiger / Go / J-Platform", status: "Hazır" },
                    { name: "Netsis", desc: "Netsis ERP / Enterprise", status: "Beta" },
                    { name: "Mikro", desc: "Mikro Yazılım", status: "Yakında" },
                  ].map((erp) => (
                    <div key={erp.name} className="border rounded-lg p-3 text-center">
                      <h4 className="font-bold text-gray-900">{erp.name}</h4>
                      <p className="text-xs text-gray-500 mt-1">{erp.desc}</p>
                      <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded ${erp.status === "Hazır" ? "bg-green-100 text-green-700" : erp.status === "Beta" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500"}`}>
                        {erp.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
