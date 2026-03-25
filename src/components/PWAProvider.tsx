"use client";

import { useEffect, useState, useCallback } from "react";
import { Download, X, Smartphone, Bell, Wifi } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAProvider() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showOfflineToast, setShowOfflineToast] = useState(false);

  // Register service worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[PWA] Service worker registered:", reg.scope);
        })
        .catch((err) => {
          console.log("[PWA] Service worker registration failed:", err);
        });
    }
  }, []);

  // Capture install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show banner after 10 seconds
      setTimeout(() => {
        setShowInstallBanner(true);
      }, 10000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineToast(false);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineToast(true);
      setTimeout(() => setShowOfflineToast(false), 5000);
    };

    setIsOnline(navigator.onLine);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
    setShowInstallBanner(false);
  }, [deferredPrompt]);

  const dismissBanner = useCallback(() => {
    setShowInstallBanner(false);
  }, []);

  return (
    <>
      {/* Install Banner */}
      {showInstallBanner && deferredPrompt && (
        <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-[380px] z-[60] animate-slide-up">
          <div className="bg-white rounded-2xl shadow-2xl border border-border overflow-hidden">
            <div className="bg-gradient-to-r from-primary to-primary-dark p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                  <Smartphone size={24} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-bold text-sm">
                    İhalePro&apos;yu Ana Ekranına Ekle
                  </p>
                  <p className="text-blue-200 text-xs mt-0.5">
                    Hızlı erişim ve çevrimdışı kullanım
                  </p>
                </div>
                <button
                  onClick={dismissBanner}
                  className="p-1 text-blue-200 hover:text-white rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-4 mb-4 text-xs text-foreground-light">
                <span className="flex items-center gap-1.5">
                  <Wifi size={12} className="text-accent" />
                  Çevrimdışı erişim
                </span>
                <span className="flex items-center gap-1.5">
                  <Bell size={12} className="text-secondary" />
                  Anlık bildirimler
                </span>
                <span className="flex items-center gap-1.5">
                  <Download size={12} className="text-primary" />
                  Hızlı açılış
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={dismissBanner}
                  className="flex-1 py-2.5 text-sm text-foreground-light hover:text-foreground border border-border rounded-lg font-medium transition-colors"
                >
                  Daha Sonra
                </button>
                <button
                  onClick={handleInstall}
                  className="flex-1 py-2.5 text-sm bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5"
                >
                  <Download size={14} />
                  Yükle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Offline Toast */}
      {showOfflineToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] animate-slide-down">
          <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium">
            <Wifi size={16} className="text-yellow-600" />
            Çevrimdışı moddasınız — Önbellekteki veriler gösterilecek
            <button
              onClick={() => setShowOfflineToast(false)}
              className="ml-2 p-0.5 hover:bg-yellow-100 rounded"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Online restored toast */}
      {!showOfflineToast && isOnline && (
        <div id="online-toast" className="hidden" />
      )}
    </>
  );
}
