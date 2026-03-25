"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  User,
  Building2,
  Bell,
  CreditCard,
  Save,
  Loader2,
  Check,
  Mail,
  Phone,
  MapPin,
  FileText,
  Globe,
} from "lucide-react";

type Tab = "profil" | "firma" | "bildirim" | "abonelik";

export default function SettingsClient() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>("profil");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [profile, setProfile] = useState({
    name: session?.user?.name || "",
    email: session?.user?.email || "",
    phone: "",
  });

  const [company, setCompany] = useState({
    name: "",
    taxNumber: "",
    taxOffice: "",
    address: "",
    city: "",
    phone: "",
    email: "",
    website: "",
    sector: "",
  });

  const [notifications, setNotifications] = useState({
    emailNewTender: true,
    emailDeadline: true,
    emailResult: false,
    pushNewTender: false,
    pushDeadline: true,
  });

  async function handleSave() {
    setSaving(true);
    // Simulate save
    await new Promise((r) => setTimeout(r, 1000));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const tabs = [
    { id: "profil" as Tab, label: "Profil", icon: User },
    { id: "firma" as Tab, label: "Firma Bilgileri", icon: Building2 },
    { id: "bildirim" as Tab, label: "Bildirim Tercihleri", icon: Bell },
    { id: "abonelik" as Tab, label: "Abonelik", icon: CreditCard },
  ];

  return (
    <div className="bg-background-alt min-h-screen">
      <div className="bg-gradient-to-r from-background-dark to-primary py-8 md:py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white">Ayarlar</h1>
          <p className="text-blue-200 text-sm mt-1">
            Hesap ve profil ayarlarınızı yönetin
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <div className="md:w-56 shrink-0">
            <nav className="bg-white rounded-xl border border-border overflow-hidden">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? "bg-primary/5 text-primary border-l-2 border-primary"
                        : "text-foreground-light hover:bg-gray-50"
                    }`}
                  >
                    <Icon size={18} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="bg-white rounded-xl border border-border p-6">
              {activeTab === "profil" && (
                <div className="space-y-5">
                  <h2 className="text-lg font-bold text-foreground mb-4">Profil Bilgileri</h2>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Ad Soyad
                    </label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-light" />
                      <input
                        type="text"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        className="w-full h-11 pl-10 pr-4 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      E-posta
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-light" />
                      <input
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        className="w-full h-11 pl-10 pr-4 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Telefon
                    </label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-light" />
                      <input
                        type="tel"
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        placeholder="05XX XXX XX XX"
                        className="w-full h-11 pl-10 pr-4 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "firma" && (
                <div className="space-y-5">
                  <h2 className="text-lg font-bold text-foreground mb-4">Firma Bilgileri</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Firma Adı</label>
                      <div className="relative">
                        <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-light" />
                        <input type="text" value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} className="w-full h-11 pl-10 pr-4 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Vergi No</label>
                      <div className="relative">
                        <FileText size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-light" />
                        <input type="text" value={company.taxNumber} onChange={(e) => setCompany({ ...company, taxNumber: e.target.value })} className="w-full h-11 pl-10 pr-4 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Vergi Dairesi</label>
                      <input type="text" value={company.taxOffice} onChange={(e) => setCompany({ ...company, taxOffice: e.target.value })} className="w-full h-11 px-4 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Şehir</label>
                      <div className="relative">
                        <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-light" />
                        <input type="text" value={company.city} onChange={(e) => setCompany({ ...company, city: e.target.value })} className="w-full h-11 pl-10 pr-4 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Adres</label>
                    <textarea value={company.address} onChange={(e) => setCompany({ ...company, address: e.target.value })} rows={2} className="w-full px-4 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Telefon</label>
                      <input type="tel" value={company.phone} onChange={(e) => setCompany({ ...company, phone: e.target.value })} className="w-full h-11 px-4 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">E-posta</label>
                      <input type="email" value={company.email} onChange={(e) => setCompany({ ...company, email: e.target.value })} className="w-full h-11 px-4 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Web Sitesi</label>
                      <div className="relative">
                        <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-light" />
                        <input type="url" value={company.website} onChange={(e) => setCompany({ ...company, website: e.target.value })} className="w-full h-11 pl-10 pr-4 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Sektör</label>
                      <select value={company.sector} onChange={(e) => setCompany({ ...company, sector: e.target.value })} className="w-full h-11 px-4 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
                        <option value="">Seçiniz</option>
                        <option value="Yapım İşleri">Yapım İşleri</option>
                        <option value="Bilişim ve Teknoloji">Bilişim ve Teknoloji</option>
                        <option value="Sağlık">Sağlık</option>
                        <option value="Eğitim">Eğitim</option>
                        <option value="Enerji">Enerji</option>
                        <option value="Ulaşım">Ulaşım</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "bildirim" && (
                <div className="space-y-6">
                  <h2 className="text-lg font-bold text-foreground mb-4">Bildirim Tercihleri</h2>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3">E-posta Bildirimleri</h3>
                    <div className="space-y-3">
                      {[
                        { key: "emailNewTender", label: "Yeni ihale bildirimleri" },
                        { key: "emailDeadline", label: "Son başvuru tarihi hatırlatmaları" },
                        { key: "emailResult", label: "İhale sonuç bildirimleri" },
                      ].map((item) => (
                        <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notifications[item.key as keyof typeof notifications]}
                            onChange={(e) =>
                              setNotifications({ ...notifications, [item.key]: e.target.checked })
                            }
                            className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                          />
                          <span className="text-sm text-foreground">{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3">Push Bildirimleri</h3>
                    <div className="space-y-3">
                      {[
                        { key: "pushNewTender", label: "Yeni ihale push bildirimleri" },
                        { key: "pushDeadline", label: "Son başvuru push hatırlatmaları" },
                      ].map((item) => (
                        <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notifications[item.key as keyof typeof notifications]}
                            onChange={(e) =>
                              setNotifications({ ...notifications, [item.key]: e.target.checked })
                            }
                            className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                          />
                          <span className="text-sm text-foreground">{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "abonelik" && (
                <div className="space-y-6">
                  <h2 className="text-lg font-bold text-foreground mb-4">Abonelik Durumu</h2>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                        <CreditCard size={20} className="text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">
                          {session?.user ? "Pro Plan" : "Ücretsiz Plan"}
                        </p>
                        <p className="text-xs text-foreground-light">
                          {session?.user ? "Aylık abonelik aktif" : "Temel özellikler"}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-foreground-light mb-4">
                      Premium özelliklere erişmek için planınızı yükseltin.
                    </p>
                    <a
                      href="/premium"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Planı Yükselt
                    </a>
                  </div>
                </div>
              )}

              {/* Save button */}
              {activeTab !== "abonelik" && (
                <div className="mt-6 pt-4 border-t border-border flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : saved ? (
                      <Check size={16} />
                    ) : (
                      <Save size={16} />
                    )}
                    {saving ? "Kaydediliyor..." : saved ? "Kaydedildi" : "Kaydet"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
