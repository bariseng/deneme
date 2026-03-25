"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  FileText,
  Clock,
  XCircle,
  Sparkles,
  Trash2,
  Plus,
  Settings,
  Filter,
  X,
  MapPin,
  Tag,
  Banknote,
  Building2,
  AlertTriangle,
} from "lucide-react";
import {
  useUserStore,
  type NotificationType,
  type NotificationRule,
} from "@/lib/store";
import { cities, categories, institutionTypes } from "@/lib/data";
import { formatCurrency } from "@/lib/format";

const typeConfig: Record<
  NotificationType,
  { icon: React.ElementType; color: string; bg: string; label: string }
> = {
  new_tender: {
    icon: Sparkles,
    color: "text-primary",
    bg: "bg-blue-100",
    label: "Yeni İhale",
  },
  deadline_reminder: {
    icon: Clock,
    color: "text-secondary",
    bg: "bg-orange-100",
    label: "Son Başvuru",
  },
  amendment: {
    icon: FileText,
    color: "text-yellow-600",
    bg: "bg-yellow-100",
    label: "Zeyilname",
  },
  cancellation: {
    icon: XCircle,
    color: "text-red-600",
    bg: "bg-red-100",
    label: "İptal",
  },
  application_update: {
    icon: Check,
    color: "text-accent",
    bg: "bg-green-100",
    label: "Başvuru",
  },
  rule_match: {
    icon: BellRing,
    color: "text-purple-600",
    bg: "bg-purple-100",
    label: "Kural Eşleşme",
  },
};

type TabKey = "history" | "rules";

export default function NotificationHistoryClient() {
  const [tab, setTab] = useState<TabKey>("history");

  return (
    <div className="bg-background-alt min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-background-dark to-primary py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
            Bildirimler
          </h1>
          <p className="text-blue-200 text-sm">
            Bildirim geçmişiniz ve özel bildirim kurallarınız
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab("history")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              tab === "history"
                ? "bg-primary text-white"
                : "bg-white text-foreground-light border border-border hover:bg-gray-50"
            }`}
          >
            <Bell size={16} />
            Bildirim Geçmişi
          </button>
          <button
            onClick={() => setTab("rules")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              tab === "rules"
                ? "bg-primary text-white"
                : "bg-white text-foreground-light border border-border hover:bg-gray-50"
            }`}
          >
            <Settings size={16} />
            Bildirim Kuralları
          </button>
        </div>

        {tab === "history" ? <HistoryTab /> : <RulesTab />}
      </div>
    </div>
  );
}

/* ─── History Tab ──────────────────────────────── */

function HistoryTab() {
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
  } = useUserStore();

  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">(
    "all"
  );
  const [typeFilter, setTypeFilter] = useState<NotificationType | "all">(
    "all"
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filtered = useMemo(() => {
    let result = [...notifications];

    if (readFilter === "unread") result = result.filter((n) => !n.read);
    else if (readFilter === "read") result = result.filter((n) => n.read);

    if (typeFilter !== "all")
      result = result.filter((n) => n.type === typeFilter);

    if (dateFrom) {
      const from = new Date(dateFrom);
      result = result.filter((n) => new Date(n.createdAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((n) => new Date(n.createdAt) <= to);
    }

    return result.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [notifications, readFilter, typeFilter, dateFrom, dateTo]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-border p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={16} className="text-foreground-light" />
            {(
              [
                { key: "all", label: "Tümü" },
                { key: "unread", label: `Okunmamış (${unreadCount})` },
                { key: "read", label: "Okunmuş" },
              ] as const
            ).map((f) => (
              <button
                key={f.key}
                onClick={() => setReadFilter(f.key)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  readFilter === f.key
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-foreground-light hover:bg-gray-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary-dark font-medium transition-colors"
              >
                <CheckCheck size={14} />
                Tümünü Oku
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAllNotifications}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
              >
                <Trash2 size={14} />
                Temizle
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value as NotificationType | "all")
            }
            className="h-9 px-3 text-xs border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">Tüm Türler</option>
            {Object.entries(typeConfig).map(([key, cfg]) => (
              <option key={key} value={key}>
                {cfg.label}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 px-3 text-xs border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Başlangıç tarihi"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 px-3 text-xs border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Bitiş tarihi"
          />

          {(typeFilter !== "all" || dateFrom || dateTo) && (
            <button
              onClick={() => {
                setTypeFilter("all");
                setDateFrom("");
                setDateTo("");
              }}
              className="flex items-center gap-1 text-xs text-error hover:text-red-700"
            >
              <X size={12} />
              Temizle
            </button>
          )}
        </div>
      </div>

      {/* Notification list */}
      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((notif) => {
            const cfg = typeConfig[notif.type];
            const Icon = cfg.icon;
            return (
              <div
                key={notif.id}
                className={`bg-white rounded-xl border border-border p-4 flex items-start gap-3 transition-colors ${
                  !notif.read ? "border-l-4 border-l-primary" : ""
                }`}
              >
                <div
                  className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${cfg.bg}`}
                >
                  <Icon size={18} className={cfg.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.bg} ${cfg.color} mr-2`}
                      >
                        {cfg.label}
                      </span>
                      <span
                        className={`text-sm font-medium ${
                          !notif.read ? "text-foreground" : "text-foreground-light"
                        }`}
                      >
                        {notif.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-foreground-light/60 shrink-0 whitespace-nowrap">
                      {new Date(notif.createdAt).toLocaleDateString("tr-TR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-foreground-light">
                    {notif.message}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    {notif.tenderId && (
                      <Link
                        href={`/ihaleler/${notif.tenderId}`}
                        className="text-xs text-primary hover:text-primary-dark font-medium"
                      >
                        İhaleyi Görüntüle
                      </Link>
                    )}
                    {!notif.read && (
                      <button
                        onClick={() => markAsRead(notif.id)}
                        className="text-xs text-foreground-light hover:text-primary font-medium flex items-center gap-0.5"
                      >
                        <Check size={12} />
                        Okundu
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notif.id)}
                      className="text-xs text-foreground-light hover:text-red-500 font-medium flex items-center gap-0.5"
                    >
                      <Trash2 size={12} />
                      Sil
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <Bell
            size={48}
            className="mx-auto text-foreground-light/30 mb-3"
          />
          <p className="text-sm font-medium text-foreground-light">
            Bildirim bulunamadı
          </p>
          <p className="text-xs text-foreground-light/60 mt-1">
            Filtrelerinize uygun bildirim yok.
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Rules Tab ────────────────────────────────── */

function RulesTab() {
  const { notificationRules, addRule, deleteRule, toggleRuleEnabled } =
    useUserStore();
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formInstitutionType, setFormInstitutionType] = useState("");
  const [formMinBudget, setFormMinBudget] = useState("");
  const [formMaxBudget, setFormMaxBudget] = useState("");

  const resetForm = () => {
    setFormName("");
    setFormCity("");
    setFormCategory("");
    setFormInstitutionType("");
    setFormMinBudget("");
    setFormMaxBudget("");
    setShowForm(false);
  };

  const handleSubmit = () => {
    if (!formName.trim()) return;
    addRule({
      name: formName.trim(),
      enabled: true,
      city: formCity || undefined,
      category: formCategory || undefined,
      institutionType: formInstitutionType || undefined,
      minBudget: formMinBudget ? Number(formMinBudget) : undefined,
      maxBudget: formMaxBudget ? Number(formMaxBudget) : undefined,
    });
    resetForm();
  };

  return (
    <div className="space-y-4">
      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle size={18} className="text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">
            Bildirim Kuralları
          </p>
          <p className="text-xs text-foreground-light mt-0.5">
            Özel kurallar oluşturarak belirli kriterlere uyan ihalelerde
            otomatik bildirim alın. Örn: &quot;İstanbul + Yapım İşleri +
            &gt;100M ₺&quot;
          </p>
        </div>
      </div>

      {/* Existing rules */}
      {notificationRules.length > 0 && (
        <div className="space-y-2">
          {notificationRules.map((rule) => (
            <div
              key={rule.id}
              className={`bg-white rounded-xl border border-border p-4 ${
                !rule.enabled ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <BellRing
                      size={16}
                      className={
                        rule.enabled
                          ? "text-primary"
                          : "text-foreground-light"
                      }
                    />
                    <span className="text-sm font-semibold text-foreground">
                      {rule.name}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        rule.enabled
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {rule.enabled ? "Aktif" : "Pasif"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {rule.city && (
                      <RuleBadge
                        icon={MapPin}
                        label={rule.city}
                      />
                    )}
                    {rule.category && (
                      <RuleBadge
                        icon={Tag}
                        label={rule.category}
                      />
                    )}
                    {rule.institutionType && (
                      <RuleBadge
                        icon={Building2}
                        label={
                          institutionTypes.find(
                            (i) => i.value === rule.institutionType
                          )?.label || rule.institutionType
                        }
                      />
                    )}
                    {rule.minBudget && (
                      <RuleBadge
                        icon={Banknote}
                        label={`Min: ${formatCurrency(rule.minBudget)}`}
                      />
                    )}
                    {rule.maxBudget && (
                      <RuleBadge
                        icon={Banknote}
                        label={`Max: ${formatCurrency(rule.maxBudget)}`}
                      />
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleRuleEnabled(rule.id)}
                    role="switch"
                    aria-checked={rule.enabled}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      rule.enabled ? "bg-primary" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                        rule.enabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="p-1.5 text-foreground-light hover:text-red-500 transition-colors"
                    aria-label="Kuralı sil"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add rule */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full bg-white rounded-xl border border-dashed border-border p-4 flex items-center justify-center gap-2 text-sm font-medium text-primary hover:bg-blue-50 hover:border-primary/30 transition-colors"
        >
          <Plus size={18} />
          Yeni Kural Ekle
        </button>
      ) : (
        <div className="bg-white rounded-xl border border-border p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Plus size={16} className="text-primary" />
            Yeni Bildirim Kuralı
          </h3>

          <div>
            <label className="block text-xs font-medium text-foreground-light mb-1">
              Kural Adı *
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="ör: İstanbul Büyük Yapım İhaleleri"
              className="w-full h-10 px-3 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground-light mb-1">
                İl
              </label>
              <select
                value={formCity}
                onChange={(e) => setFormCity(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Tüm İller</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground-light mb-1">
                Kategori
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Tüm Kategoriler</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground-light mb-1">
                Kurum Türü
              </label>
              <select
                value={formInstitutionType}
                onChange={(e) => setFormInstitutionType(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Tüm Kurumlar</option>
                {institutionTypes.map((it) => (
                  <option key={it.value} value={it.value}>
                    {it.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground-light mb-1">
                Min. Bütçe (₺)
              </label>
              <input
                type="number"
                value={formMinBudget}
                onChange={(e) => setFormMinBudget(e.target.value)}
                placeholder="ör: 1000000"
                className="w-full h-10 px-3 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground-light mb-1">
                Max. Bütçe (₺)
              </label>
              <input
                type="number"
                value={formMaxBudget}
                onChange={(e) => setFormMaxBudget(e.target.value)}
                placeholder="ör: 10000000000"
                className="w-full h-10 px-3 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSubmit}
              disabled={!formName.trim()}
              className="h-10 px-5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
            >
              Kuralı Kaydet
            </button>
            <button
              onClick={resetForm}
              className="h-10 px-5 border border-border text-foreground-light text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              İptal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RuleBadge({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-foreground-light text-xs rounded-full">
      <Icon size={11} />
      {label}
    </span>
  );
}
