"use client";

import { useState } from "react";
import { Crown, X, ArrowRight, Sparkles, Zap } from "lucide-react";
import Link from "next/link";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  feature?: string;
  message?: string;
}

const featureNames: Record<string, string> = {
  tender_view: "İhale Görüntüleme",
  favorite: "Favori İhale",
  notification: "Bildirim",
  bid: "Teklif Hazırlama",
  ai_credit: "AI Kredisi",
  competitor: "Rakip Takibi",
};

export default function UpgradeModal({ open, onClose, feature, message }: UpgradeModalProps) {
  if (!open) return null;

  const featureLabel = feature ? featureNames[feature] || feature : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-scale-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-foreground-light hover:text-foreground"
        >
          <X size={18} />
        </button>

        <div className="text-center">
          <div className="w-14 h-14 bg-gradient-to-r from-primary to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Crown size={28} className="text-white" />
          </div>

          <h2 className="text-xl font-bold text-foreground mb-2">
            {featureLabel ? `${featureLabel} Limitine Ulaştınız` : "Plan Yükseltme Gerekli"}
          </h2>

          <p className="text-sm text-foreground-light mb-6">
            {message || "Bu özelliği kullanmaya devam etmek için planınızı yükseltin."}
          </p>

          {/* Benefits */}
          <div className="bg-primary/5 rounded-xl p-4 mb-6 text-left">
            <p className="text-xs font-semibold text-primary mb-2">Profesyonel Plan ile:</p>
            <ul className="space-y-1.5 text-sm text-foreground-light">
              <li className="flex items-center gap-2">
                <Sparkles size={12} className="text-primary shrink-0" />
                Aylık 50 AI kredisi
              </li>
              <li className="flex items-center gap-2">
                <Zap size={12} className="text-primary shrink-0" />
                Sınırsız ihale görüntüleme ve favori
              </li>
              <li className="flex items-center gap-2">
                <Crown size={12} className="text-primary shrink-0" />
                5 rakip takibi, PDF export ve daha fazlası
              </li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-border text-foreground-light hover:bg-gray-50"
            >
              Vazgeç
            </button>
            <Link
              href="/premium"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark flex items-center justify-center gap-1.5"
            >
              Planları Gör
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
