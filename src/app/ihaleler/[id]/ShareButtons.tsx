"use client";

import { useState } from "react";
import {
  Share2,
  Copy,
  Check,
  Mail,
  Send,
  X,
} from "lucide-react";

interface Props {
  title: string;
  tenderId: string;
}

export default function ShareButtons({ title, tenderId }: Props) {
  const [copied, setCopied] = useState(false);
  const [showSendForm, setShowSendForm] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const url =
    typeof window !== "undefined"
      ? window.location.href
      : `https://ihalepro.com/ihaleler/${tenderId}`;

  const encodedTitle = encodeURIComponent(title);
  const encodedUrl = encodeURIComponent(url);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    // Demo: just show success
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setShowSendForm(false);
      setEmail("");
    }, 2000);
  };

  return (
    <section className="bg-white rounded-xl border border-border p-5">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <Share2 size={16} className="text-primary" />
        Paylaş
      </h3>

      <div className="flex flex-wrap gap-2 mb-3">
        {/* Twitter/X */}
        <a
          href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          𝕏 Twitter
        </a>

        {/* LinkedIn */}
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#0077b5] text-white rounded-lg hover:bg-[#006396] transition-colors"
        >
          LinkedIn
        </a>

        {/* WhatsApp */}
        <a
          href={`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#25d366] text-white rounded-lg hover:bg-[#1fb855] transition-colors"
        >
          WhatsApp
        </a>

        {/* Copy link */}
        <button
          onClick={copyLink}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-border rounded-lg hover:bg-gray-50 transition-colors"
        >
          {copied ? (
            <>
              <Check size={12} className="text-accent" />
              Kopyalandı
            </>
          ) : (
            <>
              <Copy size={12} />
              Linki Kopyala
            </>
          )}
        </button>
      </div>

      {/* Send to colleague */}
      {!showSendForm ? (
        <button
          onClick={() => setShowSendForm(true)}
          className="flex items-center gap-2 w-full py-2.5 text-xs font-medium text-primary border border-primary/20 rounded-lg hover:bg-primary/5 justify-center transition-colors"
        >
          <Mail size={14} />
          Meslektaşına Gönder
        </button>
      ) : (
        <form
          onSubmit={handleSend}
          className="border border-border rounded-lg p-3 space-y-2"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-foreground">
              Meslektaşına Gönder
            </p>
            <button
              type="button"
              onClick={() => setShowSendForm(false)}
              className="text-foreground-light hover:text-foreground"
            >
              <X size={14} />
            </button>
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-posta adresi"
            required
            className="w-full h-9 px-3 text-xs border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={sent}
            className={`w-full h-9 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              sent
                ? "bg-accent/10 text-accent"
                : "bg-primary text-white hover:bg-primary-dark"
            }`}
          >
            {sent ? (
              <>
                <Check size={12} />
                Gönderildi!
              </>
            ) : (
              <>
                <Send size={12} />
                Gönder
              </>
            )}
          </button>
        </form>
      )}
    </section>
  );
}
