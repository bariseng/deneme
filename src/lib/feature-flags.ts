// ─── Feature Flag System ────────────────────────────────────
// ENV-based feature flags with gradual rollout support

// ─── Flag Definitions ───────────────────────────────────────

export type FeatureFlag =
  | "USE_REAL_EKAP_DATA"
  | "USE_REAL_TED_DATA"
  | "USE_REAL_PRICE_INDEX"
  | "USE_REAL_PAYMENTS"
  | "USE_REAL_COMPANY_DATA"
  | "USE_REAL_LEGAL_DATA";

interface FlagConfig {
  name: FeatureFlag;
  description: string;
  defaultValue: boolean;
  /** Rollout percentage 0-100. Only applies when flag is true. */
  rolloutPercentage: number;
}

const FLAG_CONFIGS: Record<FeatureFlag, FlagConfig> = {
  USE_REAL_EKAP_DATA: {
    name: "USE_REAL_EKAP_DATA",
    description: "EKAP API'den gerçek ihale verisi kullan",
    defaultValue: true,
    rolloutPercentage: 100,
  },
  USE_REAL_TED_DATA: {
    name: "USE_REAL_TED_DATA",
    description: "TED API'den uluslararası ihale verisi kullan",
    defaultValue: true,
    rolloutPercentage: 100,
  },
  USE_REAL_PRICE_INDEX: {
    name: "USE_REAL_PRICE_INDEX",
    description: "Gerçek fiyat endeksi verisi kullan",
    defaultValue: true,
    rolloutPercentage: 100,
  },
  USE_REAL_PAYMENTS: {
    name: "USE_REAL_PAYMENTS",
    description: "Gerçek iyzico ödeme entegrasyonu kullan",
    defaultValue: false,
    rolloutPercentage: 100,
  },
  USE_REAL_COMPANY_DATA: {
    name: "USE_REAL_COMPANY_DATA",
    description: "MERSİS/KAP'tan gerçek firma verisi kullan",
    defaultValue: true,
    rolloutPercentage: 100,
  },
  USE_REAL_LEGAL_DATA: {
    name: "USE_REAL_LEGAL_DATA",
    description: "mevzuat.gov.tr'den gerçek mevzuat verisi kullan",
    defaultValue: true,
    rolloutPercentage: 100,
  },
};

// ─── Core Functions ─────────────────────────────────────────

/**
 * Check if a feature flag is enabled.
 * Reads from environment variables: USE_REAL_EKAP_DATA=true
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  const envValue = process.env[flag];
  if (envValue === undefined) return FLAG_CONFIGS[flag].defaultValue;
  return envValue === "true" || envValue === "1";
}

/**
 * Check if a feature is enabled for a specific user (gradual rollout).
 * Uses deterministic hashing so same user always gets same result.
 */
export function isEnabledForUser(flag: FeatureFlag, userId: string): boolean {
  if (!isFeatureEnabled(flag)) return false;

  const config = FLAG_CONFIGS[flag];
  if (config.rolloutPercentage >= 100) return true;
  if (config.rolloutPercentage <= 0) return false;

  // Deterministic hash: same userId → same bucket
  const hash = simpleHash(`${flag}:${userId}`);
  const bucket = hash % 100;
  return bucket < config.rolloutPercentage;
}

/**
 * Get the rollout percentage for a flag.
 * Override via env: USE_REAL_EKAP_DATA_ROLLOUT=50
 */
export function getRolloutPercentage(flag: FeatureFlag): number {
  const envKey = `${flag}_ROLLOUT`;
  const envValue = process.env[envKey];
  if (envValue !== undefined) {
    const parsed = parseInt(envValue, 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) return parsed;
  }
  return FLAG_CONFIGS[flag].rolloutPercentage;
}

/**
 * Get status of all feature flags.
 */
export function getAllFlags(): Array<{
  name: FeatureFlag;
  enabled: boolean;
  rollout: number;
  description: string;
}> {
  return Object.values(FLAG_CONFIGS).map((config) => ({
    name: config.name,
    enabled: isFeatureEnabled(config.name),
    rollout: getRolloutPercentage(config.name),
    description: config.description,
  }));
}

/**
 * Get the data source to use for a given provider.
 * Returns "real" or "mock".
 */
export function getDataSource(flag: FeatureFlag, userId?: string): "real" | "mock" {
  if (userId) {
    return isEnabledForUser(flag, userId) ? "real" : "mock";
  }
  return isFeatureEnabled(flag) ? "real" : "mock";
}

// ─── Helpers ────────────────────────────────────────────────

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}
