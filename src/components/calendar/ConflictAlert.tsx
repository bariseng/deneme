"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { formatDateTR } from "@/lib/calendar-client";

interface ConflictGroup {
  date: string;
  events: { id: string; title: string }[];
}

interface ConflictAlertProps {
  conflicts: ConflictGroup[];
}

export default function ConflictAlert({ conflicts }: ConflictAlertProps) {
  if (conflicts.length === 0) return null;

  const total = conflicts.reduce((s, c) => s + c.events.length, 0);

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle size={20} className="text-orange-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold text-orange-800">
            Çakışma Uyarısı: {total} ihale aynı günlerde kapanıyor
          </h4>
          <div className="mt-2 space-y-1.5">
            {conflicts.slice(0, 3).map((c) => (
              <p key={c.date} className="text-sm text-orange-700">
                <strong>{formatDateTR(c.date)}:</strong> {c.events.map((e) => e.title.replace("Son Başvuru: ", "")).join(", ")}
              </p>
            ))}
          </div>
          <Link
            href="/takvim/cakismalar"
            className="inline-block mt-3 text-sm font-medium text-orange-700 hover:text-orange-900 underline"
          >
            Tüm çakışmaları gör →
          </Link>
        </div>
      </div>
    </div>
  );
}
