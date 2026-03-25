"use client";

interface CapacityMeterProps {
  activeTenders: number;
  totalCommitment: number;
  estimatedCapacity: number;
  utilizationPercent: number;
}

function getUtilizationColor(pct: number) {
  if (pct >= 90) return { bar: "bg-red-500", text: "text-red-600", label: "Kritik" };
  if (pct >= 70) return { bar: "bg-orange-500", text: "text-orange-600", label: "Yüksek" };
  if (pct >= 50) return { bar: "bg-yellow-500", text: "text-yellow-600", label: "Orta" };
  return { bar: "bg-green-500", text: "text-green-600", label: "Normal" };
}

function formatCurrency(val: number) {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M ₺`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K ₺`;
  return `${val.toLocaleString("tr-TR")} ₺`;
}

export default function CapacityMeter({
  activeTenders,
  totalCommitment,
  estimatedCapacity,
  utilizationPercent,
}: CapacityMeterProps) {
  const color = getUtilizationColor(utilizationPercent);

  return (
    <div className="bg-white rounded-xl border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Kapasite Kullanımı</h3>
        <span className={`text-sm font-bold ${color.text}`}>{color.label}</span>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Kullanım Oranı</span>
          <span className="font-bold">{utilizationPercent.toFixed(1)}%</span>
        </div>
        <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${color.bar} transition-all duration-700`}
            style={{ width: `${Math.min(100, utilizationPercent)}%` }}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 pt-2 border-t">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{activeTenders}</p>
          <p className="text-xs text-gray-500">Aktif İhale</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900">{formatCurrency(totalCommitment)}</p>
          <p className="text-xs text-gray-500">Toplam Taahhüt</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900">{formatCurrency(estimatedCapacity)}</p>
          <p className="text-xs text-gray-500">Tahmini Kapasite</p>
        </div>
      </div>
    </div>
  );
}
