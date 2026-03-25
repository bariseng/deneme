"use client";

import { useState, useEffect, useCallback } from "react";

// ─── TYPES ───────────────────────────────────────────────

type AuditLog = {
  id: string; action: string; entityType: string | null; entityId: string | null;
  severity: string; ipAddress: string | null; createdAt: string;
  user: { id: string; name: string | null; email: string } | null;
};

type DeletionRequest = {
  id: string; status: string; reason: string | null; dataTypes: string[];
  requestedAt: string; completedAt: string | null;
};

type TFAStatus = { isEnabled: boolean; verifiedAt: string | null };
type TFASetup = { secret: string; backupCodes: string[]; qrUri: string };

type IpEntry = { id: string; ipRange: string; description: string | null; isActive: boolean; createdAt: string };

type Permission = { id: string; role: string; resource: string; action: string; isAllowed: boolean };

type Session = {
  id: string; device: string | null; ipAddress: string | null; location: string | null;
  isActive: boolean; lastSeenAt: string; createdAt: string;
};

type Summary = {
  twoFactorEnabled: boolean; activeSessions: number;
  auditStats: { total: number; today: number; warnings: number; criticals: number };
  pendingDeletionRequests: number; ipWhitelistCount: number;
};

// ─── CONSTANTS ───────────────────────────────────────────

const tabs = [
  { key: "overview", label: "Genel Bakış" },
  { key: "audit", label: "Denetim İzi" },
  { key: "kvkk", label: "KVKK" },
  { key: "2fa", label: "2FA" },
  { key: "ip", label: "IP Kısıtlama" },
  { key: "roles", label: "Roller" },
  { key: "sessions", label: "Oturumlar" },
];

const SEVERITY_COLORS: Record<string, string> = {
  info: "bg-blue-100 text-blue-700",
  warning: "bg-yellow-100 text-yellow-700",
  critical: "bg-red-100 text-red-700",
};

const DELETION_STATUS: Record<string, { text: string; color: string }> = {
  TALEP_EDILDI: { text: "Talep Edildi", color: "bg-yellow-100 text-yellow-700" },
  ISLENIYOR: { text: "İşleniyor", color: "bg-blue-100 text-blue-700" },
  TAMAMLANDI: { text: "Tamamlandı", color: "bg-green-100 text-green-700" },
  REDDEDILDI: { text: "Reddedildi", color: "bg-red-100 text-red-700" },
};

const DATA_TYPES = [
  { key: "profil", label: "Profil Bilgileri" },
  { key: "teklifler", label: "Teklif Verileri" },
  { key: "mesajlar", label: "Mesajlar & Konuşmalar" },
  { key: "arama_gecmisi", label: "Arama Geçmişi" },
  { key: "bildirimler", label: "Bildirim Geçmişi" },
  { key: "favoriler", label: "Favori Listesi" },
];

const RESOURCE_LABELS: Record<string, string> = {
  tenders: "İhaleler", bids: "Teklifler", contracts: "Sözleşmeler",
  reports: "Raporlar", settings: "Ayarlar",
};

const ACTION_LABELS: Record<string, string> = {
  read: "Okuma", create: "Oluşturma", update: "Güncelleme",
  delete: "Silme", approve: "Onaylama",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce`;
}

export default function SecurityClient() {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);

  // Data
  const [summary, setSummary] = useState<Summary | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
  const [tfaStatus, setTfaStatus] = useState<TFAStatus>({ isEnabled: false, verifiedAt: null });
  const [tfaSetup, setTfaSetup] = useState<TFASetup | null>(null);
  const [ipList, setIpList] = useState<IpEntry[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);

  // Forms
  const [kvkkForm, setKvkkForm] = useState({ reason: "", dataTypes: [] as string[] });
  const [showKvkkForm, setShowKvkkForm] = useState(false);
  const [ipForm, setIpForm] = useState({ ipRange: "", description: "" });
  const [showIpForm, setShowIpForm] = useState(false);
  const [auditSeverity, setAuditSeverity] = useState("");

  // ─── FETCHERS ──────────────────────────────────

  const fetchSessions = useCallback(async () => {
    try {
      const r = await fetch("/api/security/sessions");
      const j = await r.json();
      if (j.success) { setSessions(j.data.sessions); setSummary(j.data.summary); }
    } catch { /* */ }
  }, []);

  const fetchAudit = useCallback(async (severity?: string) => {
    try {
      const url = severity ? `/api/security/audit?severity=${severity}` : "/api/security/audit";
      const r = await fetch(url);
      const j = await r.json();
      if (j.success) { setAuditLogs(j.data.logs); setAuditTotal(j.data.total); }
    } catch { /* */ }
  }, []);

  const fetchKvkk = useCallback(async () => {
    try { const r = await fetch("/api/security/kvkk"); const j = await r.json(); if (j.success) setDeletionRequests(j.data); } catch { /* */ }
  }, []);

  const fetch2FA = useCallback(async () => {
    try { const r = await fetch("/api/security/2fa"); const j = await r.json(); if (j.success) setTfaStatus(j.data); } catch { /* */ }
  }, []);

  const fetchIp = useCallback(async () => {
    try { const r = await fetch("/api/security/ip-whitelist"); const j = await r.json(); if (j.success) setIpList(j.data); } catch { /* */ }
  }, []);

  const fetchRoles = useCallback(async () => {
    try { const r = await fetch("/api/security/roles"); const j = await r.json(); if (j.success) setPermissions(j.data); } catch { /* */ }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSessions(), fetchAudit(), fetchKvkk(), fetch2FA(), fetchIp(), fetchRoles()]).then(() => setLoading(false));
  }, [fetchSessions, fetchAudit, fetchKvkk, fetch2FA, fetchIp, fetchRoles]);

  // ─── HANDLERS ──────────────────────────────────

  async function handleKvkkSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/security/kvkk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(kvkkForm) });
    setKvkkForm({ reason: "", dataTypes: [] }); setShowKvkkForm(false); fetchKvkk();
  }

  async function handle2FASetup() {
    const r = await fetch("/api/security/2fa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "setup" }) });
    const j = await r.json();
    if (j.success) setTfaSetup(j.data);
  }

  async function handle2FAEnable() {
    await fetch("/api/security/2fa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "enable" }) });
    setTfaSetup(null); fetch2FA(); fetchSessions();
  }

  async function handle2FADisable() {
    await fetch("/api/security/2fa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "disable" }) });
    fetch2FA(); fetchSessions();
  }

  async function handleAddIp(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/security/ip-whitelist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ipForm) });
    setIpForm({ ipRange: "", description: "" }); setShowIpForm(false); fetchIp();
  }

  async function handleRemoveIp(id: string) {
    await fetch(`/api/security/ip-whitelist?id=${id}`, { method: "DELETE" }); fetchIp();
  }

  async function handleTogglePermission(id: string, isAllowed: boolean) {
    await fetch("/api/security/roles", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, isAllowed: !isAllowed }) });
    fetchRoles();
  }

  async function handleTerminateSession(id: string) {
    await fetch(`/api/security/sessions/${id}`, { method: "DELETE" }); fetchSessions();
  }

  async function handleTerminateAll() {
    await fetch("/api/security/sessions", { method: "DELETE" }); fetchSessions();
  }

  // ─── RENDER ────────────────────────────────────

  const roleGroups = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.role]) acc[p.role] = [];
    acc[p.role].push(p);
    return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Güvenlik & Uyumluluk</h1>
      <p className="text-gray-600 mb-6">Denetim izi, KVKK uyumluluk, iki faktörlü doğrulama ve erişim kontrolü</p>

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
          {/* ═══ OVERVIEW ═══ */}
          {activeTab === "overview" && summary && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-white rounded-lg border p-4 text-center">
                  <p className={`text-2xl font-bold ${summary.twoFactorEnabled ? "text-green-600" : "text-red-600"}`}>
                    {summary.twoFactorEnabled ? "Aktif" : "Kapalı"}
                  </p>
                  <p className="text-xs text-gray-500">2FA Durumu</p>
                </div>
                <div className="bg-white rounded-lg border p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{summary.activeSessions}</p>
                  <p className="text-xs text-gray-500">Aktif Oturum</p>
                </div>
                <div className="bg-white rounded-lg border p-4 text-center">
                  <p className="text-2xl font-bold text-purple-600">{summary.auditStats.total}</p>
                  <p className="text-xs text-gray-500">Denetim Kaydı</p>
                </div>
                <div className="bg-white rounded-lg border p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{summary.auditStats.today}</p>
                  <p className="text-xs text-gray-500">Bugünkü İşlem</p>
                </div>
                <div className="bg-white rounded-lg border p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-600">{summary.auditStats.warnings}</p>
                  <p className="text-xs text-gray-500">Uyarı</p>
                </div>
                <div className="bg-white rounded-lg border p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{summary.auditStats.criticals}</p>
                  <p className="text-xs text-gray-500">Kritik</p>
                </div>
              </div>

              {/* Security checklist */}
              <div className="bg-white rounded-lg border p-6">
                <h3 className="font-semibold mb-4">Güvenlik Kontrol Listesi</h3>
                <div className="space-y-3">
                  {[
                    { label: "İki Faktörlü Doğrulama (2FA)", done: summary.twoFactorEnabled, action: "2fa" },
                    { label: "IP Kısıtlama", done: summary.ipWhitelistCount > 0, action: "ip" },
                    { label: "Aktif Oturum Kontrolü", done: summary.activeSessions <= 3, action: "sessions" },
                    { label: "KVKK Uyumluluk", done: summary.pendingDeletionRequests === 0, action: "kvkk" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs ${item.done ? "bg-green-500" : "bg-gray-300"}`}>
                          {item.done ? "✓" : "!"}
                        </div>
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                      <button onClick={() => setActiveTab(item.action)} className="text-xs text-blue-600 hover:underline">
                        {item.done ? "Görüntüle" : "Ayarla"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ AUDIT LOG ═══ */}
          {activeTab === "audit" && (
            <div className="space-y-4">
              <div className="flex gap-2">
                {["", "info", "warning", "critical"].map((s) => (
                  <button key={s} onClick={() => { setAuditSeverity(s); fetchAudit(s || undefined); }}
                    className={`px-3 py-1.5 rounded text-xs font-medium ${auditSeverity === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                    {s === "" ? "Tümü" : s === "info" ? "Bilgi" : s === "warning" ? "Uyarı" : "Kritik"}
                  </button>
                ))}
                <span className="text-xs text-gray-400 self-center ml-auto">{auditTotal} kayıt</span>
              </div>

              <div className="bg-white rounded-lg border divide-y">
                {auditLogs.length === 0 ? (
                  <p className="p-4 text-sm text-gray-500">Henüz denetim kaydı yok.</p>
                ) : auditLogs.map((log) => (
                  <div key={log.id} className="p-3 flex items-start gap-3">
                    <span className={`text-xs px-1.5 py-0.5 rounded mt-0.5 ${SEVERITY_COLORS[log.severity] || "bg-gray-100"}`}>
                      {log.severity}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{log.action}</p>
                      <div className="flex gap-3 text-xs text-gray-400 mt-0.5">
                        <span>{log.user?.name || log.user?.email || "Sistem"}</span>
                        {log.entityType && <span>{log.entityType}{log.entityId ? ` #${log.entityId.slice(0, 8)}` : ""}</span>}
                        {log.ipAddress && <span>{log.ipAddress}</span>}
                        <span>{timeAgo(log.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ KVKK ═══ */}
          {activeTab === "kvkk" && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border p-6">
                <h3 className="font-semibold mb-2">KVKK Uyumluluk Paneli</h3>
                <p className="text-sm text-gray-600 mb-4">6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında verilerinizi yönetin.</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium text-sm mb-1">Kişisel Veri Envanteri</h4>
                    <p className="text-xs text-gray-500">Profil bilgileri, iletişim, ihale verileri, teklif geçmişi, arama kayıtları</p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium text-sm mb-1">Çerez Politikası</h4>
                    <p className="text-xs text-gray-500">Oturum çerezleri, analitik çerezler, tercih çerezleri</p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium text-sm mb-1">Aydınlatma Metni</h4>
                    <p className="text-xs text-gray-500">Veri sorumlusu bilgileri, işleme amaçları, saklama süreleri</p>
                  </div>
                </div>

                <button onClick={() => setShowKvkkForm(!showKvkkForm)} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700">
                  {showKvkkForm ? "Kapat" : "Veri Silme Talebi Oluştur"}
                </button>
              </div>

              {showKvkkForm && (
                <form onSubmit={handleKvkkSubmit} className="bg-white rounded-lg border p-4 space-y-3">
                  <h3 className="font-semibold">Veri Silme Talebi</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {DATA_TYPES.map((dt) => (
                      <label key={dt.key} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={kvkkForm.dataTypes.includes(dt.key)}
                          onChange={(e) => setKvkkForm((f) => ({ ...f, dataTypes: e.target.checked ? [...f.dataTypes, dt.key] : f.dataTypes.filter((d) => d !== dt.key) }))} />
                        {dt.label}
                      </label>
                    ))}
                  </div>
                  <textarea placeholder="Silme sebebi (opsiyonel)" value={kvkkForm.reason} onChange={(e) => setKvkkForm({ ...kvkkForm, reason: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
                  <button type="submit" className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700">Talebi Gönder</button>
                </form>
              )}

              {deletionRequests.length > 0 && (
                <div className="bg-white rounded-lg border">
                  <div className="p-4 border-b"><h3 className="font-semibold">Veri Silme Taleplerim</h3></div>
                  <div className="divide-y">
                    {deletionRequests.map((req) => (
                      <div key={req.id} className="p-4 flex justify-between items-center">
                        <div>
                          <div className="flex flex-wrap gap-1 mb-1">
                            {req.dataTypes.map((dt) => <span key={dt} className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{dt}</span>)}
                          </div>
                          <p className="text-xs text-gray-500">{formatDate(req.requestedAt)}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded ${DELETION_STATUS[req.status]?.color || "bg-gray-100"}`}>
                          {DELETION_STATUS[req.status]?.text || req.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ 2FA ═══ */}
          {activeTab === "2fa" && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border p-6">
                <h3 className="font-semibold mb-4">İki Faktörlü Doğrulama (2FA)</h3>
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg ${tfaStatus.isEnabled ? "bg-green-500" : "bg-gray-300"}`}>
                    {tfaStatus.isEnabled ? "✓" : "✗"}
                  </div>
                  <div>
                    <p className="font-medium">{tfaStatus.isEnabled ? "2FA Aktif" : "2FA Kapalı"}</p>
                    <p className="text-sm text-gray-500">
                      {tfaStatus.isEnabled && tfaStatus.verifiedAt ? `${formatDate(tfaStatus.verifiedAt)} tarihinde etkinleştirildi` : "Hesabınızı korumak için 2FA etkinleştirin"}
                    </p>
                  </div>
                </div>

                {!tfaStatus.isEnabled && !tfaSetup && (
                  <button onClick={handle2FASetup} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                    2FA Kurulumunu Başlat
                  </button>
                )}

                {tfaStatus.isEnabled && (
                  <button onClick={handle2FADisable} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700">
                    2FA Devre Dışı Bırak
                  </button>
                )}

                {tfaSetup && (
                  <div className="mt-4 space-y-4 border-t pt-4">
                    <div>
                      <p className="text-sm font-medium mb-2">1. Google Authenticator uygulamasında aşağıdaki kodu girin:</p>
                      <code className="block bg-gray-50 p-3 rounded text-sm font-mono break-all">{tfaSetup.secret}</code>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">2. Yedek kodlarınızı güvenli bir yere kaydedin:</p>
                      <div className="grid grid-cols-4 gap-2">
                        {tfaSetup.backupCodes.map((code, i) => (
                          <code key={i} className="bg-yellow-50 border border-yellow-200 p-1.5 rounded text-xs font-mono text-center">{code}</code>
                        ))}
                      </div>
                    </div>
                    <button onClick={handle2FAEnable} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
                      Doğrulayıp Etkinleştir
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ IP WHITELIST ═══ */}
          {activeTab === "ip" && (
            <div className="space-y-6">
              <div className="flex justify-end">
                <button onClick={() => setShowIpForm(!showIpForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                  {showIpForm ? "Kapat" : "IP Ekle"}
                </button>
              </div>

              {showIpForm && (
                <form onSubmit={handleAddIp} className="bg-white rounded-lg border p-4 space-y-3">
                  <h3 className="font-semibold">Yeni IP Kısıtlaması</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input type="text" required placeholder="IP adresi veya CIDR (ör: 192.168.1.0/24)" value={ipForm.ipRange} onChange={(e) => setIpForm({ ...ipForm, ipRange: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
                    <input type="text" placeholder="Açıklama (ör: Ofis ağı)" value={ipForm.description} onChange={(e) => setIpForm({ ...ipForm, description: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Ekle</button>
                </form>
              )}

              <div className="bg-white rounded-lg border">
                <div className="p-4 border-b"><h3 className="font-semibold">İzin Verilen IP Adresleri</h3></div>
                <div className="divide-y">
                  {ipList.length === 0 ? (
                    <p className="p-4 text-sm text-gray-500">IP kısıtlaması tanımlı değil. Firma hesabı gereklidir.</p>
                  ) : ipList.map((ip) => (
                    <div key={ip.id} className="p-4 flex justify-between items-center">
                      <div>
                        <code className="text-sm font-mono font-bold">{ip.ipRange}</code>
                        {ip.description && <p className="text-xs text-gray-500 mt-0.5">{ip.description}</p>}
                      </div>
                      <button onClick={() => handleRemoveIp(ip.id)} className="text-xs text-red-500 hover:underline">Kaldır</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ ROLES ═══ */}
          {activeTab === "roles" && (
            <div className="space-y-6">
              {Object.entries(roleGroups).map(([role, perms]) => (
                <div key={role} className="bg-white rounded-lg border">
                  <div className="p-4 border-b">
                    <h3 className="font-semibold">{role}</h3>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                      {perms.map((p) => (
                        <label key={p.id} className="flex items-center gap-2 text-sm p-2 rounded hover:bg-gray-50">
                          <input type="checkbox" checked={p.isAllowed} onChange={() => handleTogglePermission(p.id, p.isAllowed)} />
                          <span className="text-xs">
                            {RESOURCE_LABELS[p.resource] || p.resource} / {ACTION_LABELS[p.action] || p.action}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═══ SESSIONS ═══ */}
          {activeTab === "sessions" && (
            <div className="space-y-6">
              <div className="flex justify-end">
                <button onClick={handleTerminateAll} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700">
                  Tüm Oturumları Kapat
                </button>
              </div>

              <div className="bg-white rounded-lg border">
                <div className="p-4 border-b"><h3 className="font-semibold">Aktif Oturumlar</h3></div>
                <div className="divide-y">
                  {sessions.length === 0 ? (
                    <p className="p-4 text-sm text-gray-500">Kayıtlı oturum yok.</p>
                  ) : sessions.map((s) => (
                    <div key={s.id} className="p-4 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">{s.device || "Bilinmeyen Cihaz"}</p>
                        <div className="flex gap-3 text-xs text-gray-500 mt-0.5">
                          {s.ipAddress && <span>{s.ipAddress}</span>}
                          {s.location && <span>{s.location}</span>}
                          <span>Son: {timeAgo(s.lastSeenAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded ${s.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {s.isActive ? "Aktif" : "Kapandı"}
                        </span>
                        {s.isActive && (
                          <button onClick={() => handleTerminateSession(s.id)} className="text-xs text-red-500 hover:underline">Kapat</button>
                        )}
                      </div>
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
