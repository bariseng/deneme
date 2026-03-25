"use client";

import Link from "next/link";
import { WifiOff, RefreshCw, Home } from "lucide-react";

export default function OfflineClient() {
  return (
    <div className="min-h-screen bg-background-alt flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <WifiOff size={36} className="text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Çevrimdışı Moddasınız
        </h1>
        <p className="text-foreground-light mb-6">
          İnternet bağlantınız kesilmiş görünüyor. Daha önce görüntülediğiniz
          sayfalar çevrimdışı olarak erişilebilir olabilir.
        </p>
        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-3 rounded-lg font-medium transition-colors"
          >
            <RefreshCw size={18} />
            Tekrar Dene
          </button>
          <Link
            href="/"
            className="w-full flex items-center justify-center gap-2 border border-border hover:border-primary text-foreground hover:text-primary px-5 py-3 rounded-lg font-medium transition-colors"
          >
            <Home size={18} />
            Ana Sayfaya Dön
          </Link>
        </div>
        <div className="mt-8 p-4 bg-white rounded-xl border border-border">
          <p className="text-sm font-medium text-foreground mb-2">
            Çevrimdışı özellikler:
          </p>
          <ul className="text-xs text-foreground-light space-y-1 text-left">
            <li>• Son görüntülenen ihale detay sayfaları</li>
            <li>• Takip ettiğiniz ihalelerin listesi</li>
            <li>• Teklif taslakları (otomatik kaydedilen)</li>
            <li>• Kontrol paneli verileri</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
