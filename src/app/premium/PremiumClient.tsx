"use client";

import { useState, useCallback } from "react";
import {
  Check,
  X,
  Crown,
  Zap,
  Building2,
  Star,
  ArrowRight,
  Loader2,
  Shield,
} from "lucide-react";
import { pricingPlans, type PlanId } from "@/lib/integrations/payment";
import { formatCurrency } from "@/lib/format";

export default function PremiumClient() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState<PlanId | null>(null);
  const [success, setSuccess] = useState(false);

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
            userId: "demo-user",
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
    [billing]
  );

  const planIcons: Record<PlanId, React.ElementType> = {
    free: Star,
    starter: Zap,
    pro: Crown,
    enterprise: Building2,
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
                %17 İndirim
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Plans grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {pricingPlans.map((plan) => {
            const Icon = planIcons[plan.id];
            const price = billing === "yearly" ? plan.yearlyPrice : plan.price;
            const monthlyEquiv =
              billing === "yearly" && plan.yearlyPrice > 0
                ? Math.round(plan.yearlyPrice / 12)
                : plan.price;

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl border-2 p-5 flex flex-col ${
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

                <div className="flex items-center gap-2 mb-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      plan.highlighted
                        ? "bg-primary text-white"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    <Icon size={18} />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">
                    {plan.name}
                  </h3>
                </div>

                <div className="mb-4">
                  {plan.price === 0 ? (
                    <p className="text-3xl font-bold text-foreground">
                      Ücretsiz
                    </p>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-foreground">
                          {formatCurrency(monthlyEquiv)}
                        </span>
                        <span className="text-sm text-foreground-light">
                          /ay
                        </span>
                      </div>
                      {billing === "yearly" && (
                        <p className="text-xs text-foreground-light mt-0.5">
                          Yıllık toplam: {formatCurrency(price)}
                        </p>
                      )}
                    </>
                  )}
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm text-foreground-light"
                    >
                      <Check
                        size={14}
                        className="text-accent shrink-0 mt-0.5"
                      />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleCheckout(plan.id)}
                  disabled={loading !== null || plan.id === "free"}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                    plan.id === "free"
                      ? "bg-gray-100 text-foreground-light cursor-default"
                      : plan.highlighted
                        ? "bg-primary hover:bg-primary-dark text-white"
                        : "border-2 border-primary text-primary hover:bg-primary hover:text-white"
                  }`}
                >
                  {loading === plan.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : plan.id === "free" ? (
                    "Mevcut Plan"
                  ) : (
                    <>
                      Planı Seç
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Success toast */}
        {success && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-accent text-white px-6 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 animate-slide-down">
            <Check size={16} />
            Demo ödeme oturumu oluşturuldu
          </div>
        )}

        {/* Trust section */}
        <div className="mt-12 mb-8 text-center">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-foreground-light">
            <span className="flex items-center gap-1.5">
              <Shield size={16} className="text-accent" />
              256-bit SSL şifreleme
            </span>
            <span className="flex items-center gap-1.5">
              <Check size={16} className="text-accent" />
              7 gün ücretsiz deneme
            </span>
            <span className="flex items-center gap-1.5">
              <Check size={16} className="text-accent" />
              İstediğiniz zaman iptal
            </span>
            <span className="flex items-center gap-1.5">
              <Check size={16} className="text-accent" />
              iyzico güvencesi ile ödeme
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
