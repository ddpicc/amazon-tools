import "server-only";

const MARKETPLACE_TO_DOMAIN = {
  US: 1,
  UK: 2,
  GB: 2,
  DE: 3,
  FR: 4,
  IN: 5,
  CA: 6,
  JP: 7,
  ES: 8,
  IT: 9,
  MX: 10,
  AE: 11,
  AU: 12,
  BR: 13,
  SA: 14
} as const;

const ZERO_DECIMAL_MARKETPLACES = new Set(["JP"]);

export function normalizeMarketplace(marketplace: string) {
  return marketplace.trim().toUpperCase();
}

export function getSorftimeDomain(marketplace: string) {
  const normalizedMarketplace = normalizeMarketplace(marketplace);
  const domain = MARKETPLACE_TO_DOMAIN[normalizedMarketplace as keyof typeof MARKETPLACE_TO_DOMAIN];

  if (!domain) {
    throw new Error(`Unsupported marketplace for Sorftime: ${marketplace}`);
  }

  return domain;
}

export function getCurrencyDivisor(marketplace: string) {
  return ZERO_DECIMAL_MARKETPLACES.has(normalizeMarketplace(marketplace)) ? 1 : 100;
}
