"use client";

import { useState } from "react";
import { ArrowRight, RefreshCw } from "lucide-react";
import { EXCHANGE_RATES, convertToTRY } from "@/lib/international-client";

interface CurrencyConverterProps {
  defaultCurrency?: string;
  defaultAmount?: number;
}

export default function CurrencyConverter({ defaultCurrency = "USD", defaultAmount = 1000000 }: CurrencyConverterProps) {
  const [amount, setAmount] = useState(defaultAmount);
  const [currency, setCurrency] = useState(defaultCurrency);
  const tryAmount = convertToTRY(amount, currency);
  const rate = EXCHANGE_RATES[currency] || 1;

  return (
    <div className="bg-white rounded-xl border p-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <RefreshCw size={14} className="text-blue-500" />
        Döviz Çevirici
      </h4>

      <div className="flex items-center gap-2">
        <div className="flex-1">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value) || 0)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="border rounded-lg px-2 py-2 text-sm bg-white"
        >
          {Object.keys(EXCHANGE_RATES).map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <ArrowRight size={16} className="text-gray-400 shrink-0" />
        <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-sm font-bold text-gray-900">
          {tryAmount.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺
        </div>
      </div>

      <p className="text-[10px] text-gray-400 mt-2 text-right">
        1 {currency} = {rate.toLocaleString("tr-TR")} ₺ (tahmini)
      </p>
    </div>
  );
}
