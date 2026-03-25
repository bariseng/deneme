"use client";

import { AlertCircle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={32} className="text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          Bir hata oluştu
        </h2>
        <p className="text-sm text-foreground-light mb-6">
          {error.message || "Beklenmeyen bir hata meydana geldi. Lütfen tekrar deneyin."}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw size={16} />
            Tekrar Dene
          </button>
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 border border-border text-foreground rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Home size={16} />
            Ana Sayfa
          </Link>
        </div>
      </div>
    </div>
  );
}
