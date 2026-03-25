"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Heart,
  HeartOff,
  Share2,
  Bell,
  BellOff,
} from "lucide-react";
import { useUserStore } from "@/lib/store";

interface Props {
  tenderId: string;
  estimatedCost: string;
  daysLeft: number;
  status: "active" | "closed" | "upcoming";
}

export default function ActionSidebar({
  tenderId,
  estimatedCost,
  daysLeft,
  status,
}: Props) {
  const {
    followedTenderIds,
    toggleFollow,
    applications,
    addApplication,
  } = useUserStore();

  const isFollowed = followedTenderIds.includes(tenderId);
  const hasApplied = applications.some((a) => a.tenderId === tenderId);

  return (
    <div className="bg-white rounded-xl border border-border p-6 sticky top-28">
      {status === "active" && daysLeft > 0 && (
        <div className="bg-secondary/10 text-secondary border border-secondary/20 rounded-lg p-3 text-center mb-4">
          <p className="text-sm font-semibold">
            Son başvuruya {daysLeft} gün kaldı
          </p>
        </div>
      )}

      <div className="text-center mb-6">
        <p className="text-xs text-foreground-light mb-1">
          Tahmini Bedel
        </p>
        <p className="text-2xl font-extrabold text-primary">
          {estimatedCost}
        </p>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => addApplication(tenderId)}
          disabled={hasApplied}
          className={`w-full h-12 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 ${
            hasApplied
              ? "bg-accent/10 text-accent border border-accent/20 cursor-default"
              : "bg-primary hover:bg-primary-dark text-white"
          }`}
        >
          <CheckCircle2 size={18} />
          {hasApplied ? "Başvuruldu" : "İhaleye Başvur"}
        </button>

        <button
          onClick={() => toggleFollow(tenderId)}
          className={`w-full h-11 font-medium rounded-xl transition-colors flex items-center justify-center gap-2 ${
            isFollowed
              ? "bg-pink-50 text-pink-600 border border-pink-200 hover:bg-pink-100"
              : "border border-border hover:border-primary text-foreground hover:text-primary"
          }`}
        >
          {isFollowed ? (
            <>
              <HeartOff size={16} />
              Takipten Çıkar
            </>
          ) : (
            <>
              <Heart size={16} />
              Takibe Al
            </>
          )}
        </button>

        <button className="w-full h-11 border border-border hover:border-primary text-foreground hover:text-primary font-medium rounded-xl transition-colors flex items-center justify-center gap-2">
          <Share2 size={16} />
          Paylaş
        </button>
      </div>

      <div className="mt-6 pt-6 border-t border-border">
        <p className="text-xs text-foreground-light text-center">
          Bu ihaleye başvurmak için{" "}
          <Link href="/giris" className="text-primary hover:underline">
            giriş yapın
          </Link>{" "}
          veya{" "}
          <Link href="/kayit" className="text-primary hover:underline">
            kayıt olun
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
