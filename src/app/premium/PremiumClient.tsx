"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Check,
  Crown,
  Building2,
  Star,
  ArrowRight,
  Loader2,
  Shield,
  Zap,
  Users,
  Clock,
} from "lucide-react";
import { pricingPlans, type PlanId } from "@/lib/integrations/payment";
import { formatCurrency } from "@/lib/format";

export default function PremiumClient() {
  const { data: session } = useSession();
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState<PlanId | null>(null);
  const [success, setSuccess] = useState(false);
  const [trialLoading, setTrialLoading] = useState(false);
  const [trialStarted, setTrialStarted] = useState(false);

  const currentPlan = (session?.user as Record<string, unknown>)?.plan as string || "FREE";

  const handleCheckout = useCallback(
    async (planId: PlanId) => {
      if (planId === "free") return;
      setLoading(planId);

      try {
        const res = await fetch("/api/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planId,
            billingPeriod: billing,
            userId: (session?.user as Record<string, unknown>)?.id || "demo-user",
          }),
        });
        const data = await res.json();
        if (data.success) {
          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);
        }
      } catch {
        // Handle error
      } finally {
        setLoading(null);
      }
    },
    [billing, session]
  );

  const handleStartTrial = useCallback(async () => {
    setTrialLoading(true);
    try {
      const res = await fetch("/api/usage/trial", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setTrialStarted(true);
      }
    } catch {
      // Handle error
    } finally {
      setTrialLoading(false);
    }
  }, []);

  const planIcons: Record<PlanId, React.ElementType> = {
    free: Star,
    pro: Crown,
    enterprise: Building2,
  };

  const planColors: Record<PlanId, string> = {
    free: "from-gray-500 to-gray-600",
    pro: "from-primary to-blue-700",
    enterprise: "from-purple-600 to-purple-800",
  };

  return (
    <div className="bg-background-alt min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-background-dark to-primary py-10 md:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full text-sm text-blue-200 mb-4">
            <Crown size={14} />
            Premium Üyelik
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            İhale Takibinde Bir Adım Önde Olun
          </h1>
          <p className="text-blue-200 text-base md:text-lg max-w-2xl mx-auto">
            Yapay zeka destekli analiz, sınırsız bildirim ve rakip takibi ile
            ihale süreçlerinizi profesyonelce yönetin.
          </p>

          {/* Billing toggle */}
          <div className="mt-8 inline-flex items-center gap-3 bg-white/10 p-1.5 rounded-xl">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                billing === "monthly"
                  ? "bg-white text-primary shadow"
                  : "text-blue-200 hover:text-white"
              }`}
            >
              Aylık
            </button>
            <button
              onClick={() => setBilling("yearly")}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                billing === "yearly"
                  ? "bg-white text-primary shadow"
                  : "text-blue-200 hover:text-white"
              }`}
            >
              Yıllık
              <span className="text-[10px] bg-accent text-white px-1.5 py-0.5 rounded-full font-bold">
                %20 İndirim
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Plans grid */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {pricingPlans.map((plan) => {
            const Icon = planIcons[plan.id];
            const price = billing === "yearly" ? plan.yearlyPrice : plan.price;
            const monthlyEquiv =
              billing === "yearly" && plan.yearlyPrice > 0
                ? Math.round(plan.yearlyPrice / 12)
                : plan.price;
            const isCurrentPlan =
              (plan.id === "free" && currentPlan === "FREE") ||
              (plan.id === "pro" && (currentPlan === "PRO" || currentPlan === "STARTER")) ||
              (plan.id === "enterprise" && currentPlan === "ENTERPRISE");

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl border-2 p-6 flex flex-col ${
                  plan.highlighted
                    ? "border-primary shadow-lg shadow-primary/10 relative"
                    : "border-border"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-4 py-1 rounded-full">
                    En Popüler
                  </div>
                )}

                <div className="flex items-center gap-2 mb-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-r ${planColors[plan.id]} text-white`}
                  >
                    <Icon size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">
                    {plan.name}
                  </h3>
                </div>

                <div className="mb-5">
                  {plan.price === 0 ? (
                    <p className="text-3xl font-bold text-foreground">Ücretsiz</p>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-foreground">
                          {formatCurrency(monthlyEquiv)}
                        </span>
                        <span className="text-sm text-foreground-light">/ay</span>
                      </div>
                      {billing === "yearly" && (
                        <p className="text-xs text-foreground-light mt-0.5">
                          Yıllık toplam: {formatCurrency(price)}
                          {plan.price > 0 && (
                            <span className="text-accent font-semibold ml-1">
                              ({formatCurrency(plan.price * 12 - plan.yearlyPrice)} tasarruf)
                            </span>
                          )}
                        </p>
                      )}
                    </>
                  )}
                </div>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm text-foreground-light"
                    >
                      <Check size={14} className="text-accent shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                {isCurrentPlan ? (
                  <div className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-foreground-light text-center">
                    Mevcut Planınız
                  </div>
                ) : plan.id === "free" ? (
                  <div className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-foreground-light text-center">
                    Ücretsiz
                  </div>
                ) : (
                  <button
                    onClick={() => handleCheckout(plan.id)}
                    disabled={loading !== null}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                      plan.highlighted
                        ? "bg-primary hover:bg-primary-dark text-white"
                        : "border-2 border-primary text-primary hover:bg-primary hover:text-white"
                    }`}
                  >
                    {loading === plan.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        Planı Seç
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Trial CTA */}
        {currentPlan === "FREE" && !trialStarted && (
          <div className="mt-8 bg-gradient-to-r from-primary/5 to-purple-50 rounded-2xl border border-primary/20 p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock size={18} className="text-primary" />
              <h3 className="text-lg font-bold text-foreground">14 Gün Ücretsiz Deneyin</h3>
            </div>
            <p className="text-sm text-foreground-light mb-4">
              Profesyonel planın tüm özelliklerini 14 gün boyunca ücretsiz kullanın. Kredi kartı gerekmez.
            </p>
            <button
              onClick={handleStartTrial}
              disabled={trialLoading}
              className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {trialLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <Zap size={16} />
                  Ücretsiz Denemeyi Başlat
                </>
              )}
            </button>
          </div>
        )}

        {trialStarted && (
          <div className="mt-8 bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
            <Check size={24} className="mx-auto text-emerald-600 mb-2" />
            <h3 className="text-lg font-bold text-emerald-800">Deneme Süresi Başlatıldı!</h3>
            <p className="text-sm text-emerald-700 mt-1">
              14 gün boyunca Profesyonel planın tüm özelliklerini kullanabilirsiniz.
            </p>
          </div>
        )}

        {/* Success toast */}
        {success && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-accent text-white px-6 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 animate-slide-down">
            <Check size={16} />
            Ödeme oturumu oluşturuldu
          </div>
        )}

        {/* Feature comparison */}
        <div className="mt-12 mb-8">
          <h2 className="text-xl font-bold text-foreground text-center mb-6">Plan Karşılaştırması</h2>
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-foreground-light">Özellik</th>
                  {pricingPlans.map((p) => (
                    <th key={p.id} className="text-center px-4 py-3 font-medium text-foreground">{p.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  { label: "İhale Görüntüleme", values: ["Günlük 10", "Sınırsız", "Sınırsız"] },
                  { label: "Favori İhale", values: ["3", "Sınırsız", "Sınırsız"] },
                  { label: "Bildirimler", values: ["Günlük 5", "Sınırsız", "Sınırsız"] },
                  { label: "Rakip Takibi", values: ["—", "5 firma", "Sınırsız"] },
                  { label: "Teklif Hazırlama", values: ["—", "Aylık 20", "Sınırsız"] },
                  { label: "AI Kredisi", values: ["—", "Ayda 50", "Sınırsız"] },
                  { label: "PDF Export", values: ["—", "check", "check"] },
                  { label: "İhale Avcısı (AI)", values: ["—", "—", "check"] },
                  { label: "Akıllı Teklif Opt.", values: ["—", "—", "check"] },
                  { label: "Haftalık AI Brifing", values: ["—", "—", "check"] },
                  { label: "API Erişimi", values: ["—", "—", "check"] },
                  { label: "Çoklu Kullanıcı", values: ["—", "—", "5 koltuk"] },
                  { label: "Öncelikli Destek", values: ["—", "check", "check"] },
                  { label: "SLA Garantisi", values: ["—", "—", "check"] },
                ].map((row) => (
                  <tr key={row.label}>
                    <td className="px-4 py-2.5 text-foreground">{row.label}</td>
                    {row.values.map((val, i) => (
                      <td key={i} className="text-center px-4 py-2.5">
                        {val === "check" ? (
                          <Check size={16} className="mx-auto text-accent" />
                        ) : val === "—" ? (
                          <span className="text-foreground-light">—</span>
                        ) : (
                          <span className="text-foreground font-medium">{val}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Trust section */}
        <div className="mb-12 text-center">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-foreground-light">
            <span className="flex items-center gap-1.5">
              <Shield size={16} className="text-accent" />
              256-bit SSL şifreleme
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={16} className="text-accent" />
              14 gün ücretsiz deneme
            </span>
            <span className="flex items-center gap-1.5">
              <Check size={16} className="text-accent" />
              İstediğiniz zaman iptal
            </span>
            <span className="flex items-center gap-1.5">
              <Users size={16} className="text-accent" />
              Kurumsal çoklu kullanıcı
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
