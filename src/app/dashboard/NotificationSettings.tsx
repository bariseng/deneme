"use client";

import { Bell, Mail, Smartphone, Save, CheckCircle2 } from "lucide-react";
import { useUserStore } from "@/lib/store";
import { useState } from "react";

export default function NotificationSettings() {
  const { notificationPrefs, updateNotificationPrefs } = useUserStore();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Bell size={20} className="text-primary" />
          Bildirim Tercihleri
        </h2>
        <p className="text-sm text-foreground-light mt-1">
          Hangi durumlarda bildirim almak istediğinizi ayarlayın.
        </p>
      </div>

      {/* E-posta bildirimleri */}
      <section className="bg-white rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <Mail size={18} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            E-posta Bildirimleri
          </h3>
        </div>

        <div className="space-y-4">
          <ToggleRow
            label="Yeni İhale Bildirimi"
            description="Takip ettiğiniz kategorilerde yeni ihale yayınlandığında"
            checked={notificationPrefs.emailNewTender}
            onChange={(v) => updateNotificationPrefs({ emailNewTender: v })}
          />
          <ToggleRow
            label="Son Başvuru Hatırlatması"
            description="Takip ettiğiniz ihalelerin son başvuru tarihi yaklaştığında"
            checked={notificationPrefs.emailDeadlineReminder}
            onChange={(v) =>
              updateNotificationPrefs({ emailDeadlineReminder: v })
            }
          />
          <ToggleRow
            label="Başvuru Durum Güncellemesi"
            description="Başvurularınızın durumu değiştiğinde"
            checked={notificationPrefs.emailApplicationUpdate}
            onChange={(v) =>
              updateNotificationPrefs({ emailApplicationUpdate: v })
            }
          />
        </div>
      </section>

      {/* SMS bildirimleri */}
      <section className="bg-white rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <Smartphone size={18} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            SMS Bildirimleri
          </h3>
        </div>

        <div className="space-y-4">
          <ToggleRow
            label="Son Başvuru Hatırlatması (SMS)"
            description="Son başvuru tarihi yaklaşan ihaleler için SMS gönder"
            checked={notificationPrefs.smsDeadlineReminder}
            onChange={(v) =>
              updateNotificationPrefs({ smsDeadlineReminder: v })
            }
          />
          <ToggleRow
            label="Başvuru Durum Güncellemesi (SMS)"
            description="Başvuru durumu değiştiğinde SMS gönder"
            checked={notificationPrefs.smsApplicationUpdate}
            onChange={(v) =>
              updateNotificationPrefs({ smsApplicationUpdate: v })
            }
          />
        </div>
      </section>

      {/* Hatırlatma süresi */}
      <section className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Hatırlatma Zamanı
        </h3>
        <p className="text-xs text-foreground-light mb-3">
          Son başvuru tarihinden kaç gün önce hatırlatılmak istiyorsunuz?
        </p>
        <div className="flex gap-3">
          {[1, 3, 7].map((d) => (
            <button
              key={d}
              onClick={() =>
                updateNotificationPrefs({ reminderDaysBefore: d })
              }
              className={`flex-1 h-11 rounded-lg text-sm font-medium border transition-colors ${
                notificationPrefs.reminderDaysBefore === d
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-foreground border-border hover:border-primary/30"
              }`}
            >
              {d} Gün Önce
            </button>
          ))}
        </div>
      </section>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className="inline-flex items-center gap-2 h-11 px-6 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-xl transition-colors"
        >
          {saved ? (
            <>
              <CheckCircle2 size={16} />
              Kaydedildi!
            </>
          ) : (
            <>
              <Save size={16} />
              Kaydet
            </>
          )}
        </button>
        {saved && (
          <span className="text-sm text-accent font-medium">
            Tercihleriniz başarıyla güncellendi.
          </span>
        )}
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-foreground-light">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
