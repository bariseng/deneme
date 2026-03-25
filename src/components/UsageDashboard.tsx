"use client";

import { useState, useEffect } from "react";
import {
  Eye,
  Heart,
  Bell,
  FileText,
  Sparkles,
  Users,
  Crown,
  TrendingUp,
  Clock,
  Loader2,
} from "lucide-react";

interface QuotaItem {
  feature: string;
  used: number;
  limit: number;
  remaining: number;
  resetAt: string;
}

interface UsageData {
  plan: string;
  quotas: QuotaItem[];
  creditHistory: { type: string; amount: number; balance: number; description: string; createdAt: string }[];
  trial: { active: boolean; daysLeft: number; plan: string } | null;
}

const featureLabels: Record<string, { label: string; icon: React.ElementType }> = {
  tender_view: { label: "İhale Görüntüleme", icon: Eye },
  favorite: { label: "Favori İhale", icon: Heart },
  notification: { label: "Bildirimler", icon: Bell },
  bid: { label: "Teklif Hazırlama", icon: FileText },
  ai_credit: { label: "AI Kredisi", icon: Sparkles },
  competitor: { label: "Rakip Takibi", icon: Users },
};

function getProgressColor(used: number, limit: number): string {
  if (limit === -1) return "bg-primary";
  const ratio = used / limit;
  if (ratio >= 0.9) return "bg-red-500";
  if (ratio >= 0.7) return "bg-amber-500";
  return "bg-primary";
}

function formatResetDate(resetAt: string): string {
  const date = new Date(resetAt);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (days > 1) return `${days} gün sonra yenilenir`;
  if (hours > 0) return `${hours} saat sonra yenilenir`;
  return "Bugün yenilenir";
}

export default function UsageDashboard() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/usage")
      .then((res) => res.json())
      .then((res) => {
        if (res.success) setData(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-border p-6">
        <div className="flex items-center justify-center gap-2 text-foreground-light">
          <Loader2 size={18} className="animate-spin" />
          Kullanım bilgileri yükleniyor...
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Plan badge + trial info */}
      <div className="bg-white rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Crown size={18} className="text-primary" />
            <h3 className="text-base font-bold text-foreground">Kullanım Özeti</h3>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary">
            {data.plan} Plan
          </span>
        </div>

        {data.trial && (
          <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm">
            <Clock size={14} className="text-amber-600 shrink-0" />
            <span className="text-amber-800">
              Deneme süresi: <strong>{data.trial.daysLeft} gün</strong> kaldı
            </span>
          </div>
        )}

        {/* Quota progress bars */}
        <div className="space-y-3">
          {data.quotas.map((q) => {
            const meta = featureLabels[q.feature];
            if (!meta) return null;
            const Icon = meta.icon;
            const isUnlimited = q.limit === -1;
            const percentage = isUnlimited ? 100 : q.limit > 0 ? Math.min(100, (q.used / q.limit) * 100) : 0;

            return (
              <div key={q.feature}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 text-sm text-foreground">
                    <Icon size={14} className="text-foreground-light" />
                    {meta.label}
                  </div>
                  <span className="text-xs text-foreground-light">
                    {isUnlimited ? (
                      "Sınırsız"
                    ) : q.limit === 0 ? (
                      <span className="text-red-500">Kullanılamaz</span>
                    ) : (
                      <>
                        <strong>{q.used}</strong>/{q.limit}
                      </>
                    )}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isUnlimited
                        ? "bg-primary/30"
                        : q.limit === 0
                          ? "bg-gray-200"
                          : getProgressColor(q.used, q.limit)
                    }`}
                    style={{ width: `${isUnlimited ? 100 : percentage}%` }}
                  />
                </div>
                {!isUnlimited && q.limit > 0 && (
                  <p className="text-[11px] text-foreground-light mt-0.5">
                    {formatResetDate(q.resetAt)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent AI credit history */}
      {data.creditHistory.length > 0 && (
        <div className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-primary" />
            <h4 className="text-sm font-bold text-foreground">Son AI Kredi Hareketleri</h4>
          </div>
          <div className="space-y-2">
            {data.creditHistory.slice(0, 5).map((tx, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-foreground-light truncate max-w-[200px]">{tx.description}</span>
                <span className={`font-semibold ${tx.amount < 0 ? "text-red-500" : "text-emerald-600"}`}>
                  {tx.amount > 0 ? "+" : ""}{tx.amount}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
