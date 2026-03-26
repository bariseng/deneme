// ─── Production Environment Validation ──────────────────────
// Validates all required ENV variables are set before launch

// ─── Types ──────────────────────────────────────────────────

interface EnvVar {
  name: string;
  required: boolean;
  category: string;
  description: string;
}

interface EnvCheckResult {
  valid: boolean;
  missing: string[];
  optional: string[];
  categories: Record<string, { set: number; missing: number }>;
}

// ─── Required ENV Variables ─────────────────────────────────

const ENV_VARS: EnvVar[] = [
  // Database
  { name: "DATABASE_URL", required: true, category: "Database", description: "PostgreSQL connection string" },

  // Auth
  { name: "NEXTAUTH_URL", required: true, category: "Auth", description: "Application URL" },
  { name: "NEXTAUTH_SECRET", required: true, category: "Auth", description: "NextAuth session secret" },
  { name: "GOOGLE_CLIENT_ID", required: false, category: "Auth", description: "Google OAuth client ID" },
  { name: "GOOGLE_CLIENT_SECRET", required: false, category: "Auth", description: "Google OAuth secret" },

  // External Providers
  { name: "EKAP_API_KEY", required: false, category: "Providers", description: "EKAP API key" },
  { name: "TED_API_KEY", required: false, category: "Providers", description: "TED API key" },

  // AI
  { name: "ANTHROPIC_API_KEY", required: false, category: "AI", description: "Claude API key" },
  { name: "OPENAI_API_KEY", required: false, category: "AI", description: "OpenAI API key" },

  // Payments
  { name: "IYZICO_API_KEY", required: false, category: "Payment", description: "iyzico API key" },
  { name: "IYZICO_SECRET_KEY", required: false, category: "Payment", description: "iyzico secret" },

  // Cache
  { name: "UPSTASH_REDIS_URL", required: false, category: "Cache", description: "Upstash Redis URL" },
  { name: "UPSTASH_REDIS_TOKEN", required: false, category: "Cache", description: "Upstash Redis token" },

  // Monitoring
  { name: "SENTRY_DSN", required: false, category: "Monitoring", description: "Sentry DSN" },

  // Background Jobs
  { name: "INNGEST_SIGNING_KEY", required: false, category: "Jobs", description: "Inngest signing key" },
  { name: "CRON_SECRET", required: true, category: "Jobs", description: "Cron job auth secret" },

  // Notifications
  { name: "RESEND_API_KEY", required: false, category: "Notifications", description: "Resend email API" },
  { name: "NETGSM_USERCODE", required: false, category: "Notifications", description: "NetGSM SMS user" },

  // Storage
  { name: "S3_BUCKET_NAME", required: false, category: "Storage", description: "S3/R2 bucket name" },
  { name: "S3_ACCESS_KEY_ID", required: false, category: "Storage", description: "S3 access key" },
  { name: "S3_SECRET_ACCESS_KEY", required: false, category: "Storage", description: "S3 secret key" },

  // Feature Flags
  { name: "USE_REAL_EKAP_DATA", required: false, category: "Feature Flags", description: "EKAP gerçek veri" },
  { name: "USE_REAL_TED_DATA", required: false, category: "Feature Flags", description: "TED gerçek veri" },
  { name: "USE_REAL_PRICE_INDEX", required: false, category: "Feature Flags", description: "Fiyat endeksi gerçek" },
  { name: "USE_REAL_PAYMENTS", required: false, category: "Feature Flags", description: "Gerçek ödeme" },

  // KEP
  { name: "TURKKEP_API_URL", required: false, category: "KEP", description: "TÜRKKEP API URL" },
  { name: "TURKKEP_API_KEY", required: false, category: "KEP", description: "TÜRKKEP API key" },
];

// ─── Check Function ─────────────────────────────────────────

export function checkProductionEnv(): EnvCheckResult {
  const missing: string[] = [];
  const optional: string[] = [];
  const categories: Record<string, { set: number; missing: number }> = {};

  for (const envVar of ENV_VARS) {
    const cat = envVar.category;
    if (!categories[cat]) categories[cat] = { set: 0, missing: 0 };

    const value = process.env[envVar.name];
    if (!value || value.trim() === "") {
      if (envVar.required) {
        missing.push(envVar.name);
        categories[cat].missing++;
      } else {
        optional.push(envVar.name);
      }
    } else {
      categories[cat].set++;
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    optional,
    categories,
  };
}

/**
 * Print env check results to console.
 */
export function printEnvCheck(): void {
  const result = checkProductionEnv();

  console.log("\n" + "═".repeat(50));
  console.log("PRODUCTION ENV CHECK");
  console.log("═".repeat(50));

  console.log(`\nDurum: ${result.valid ? "✅ HAZIR" : "❌ EKSİK DEĞİŞKEN VAR"}`);

  if (result.missing.length > 0) {
    console.log(`\n❌ Zorunlu eksikler (${result.missing.length}):`);
    for (const name of result.missing) {
      const v = ENV_VARS.find((e) => e.name === name);
      console.log(`   ${name} — ${v?.description}`);
    }
  }

  console.log("\nKategori bazlı:");
  for (const [cat, stats] of Object.entries(result.categories)) {
    const status = stats.missing > 0 ? "⚠️" : "✅";
    console.log(`  ${status} ${cat}: ${stats.set} set, ${stats.missing} eksik`);
  }

  if (result.optional.length > 0) {
    console.log(`\n💡 Opsiyonel eksikler (${result.optional.length}): ${result.optional.slice(0, 5).join(", ")}${result.optional.length > 5 ? "..." : ""}`);
  }

  console.log("═".repeat(50));
}

export { ENV_VARS };
