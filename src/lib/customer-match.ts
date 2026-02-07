import type { Customer } from "@/domain/types";

type Candidate = {
  customer: Customer;
  score: number;
};

export function normalizeCustomerName(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[\s\-_/·.]+/g, "");
}

export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j += 1) prev[j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost,
      );
    }
    for (let j = 0; j <= b.length; j += 1) prev[j] = curr[j];
  }
  return prev[b.length];
}

export function findLikelyCustomers(
  customers: Customer[],
  input: string,
  options?: { limit?: number },
): Customer[] {
  const normalizedInput = normalizeCustomerName(input);
  if (!normalizedInput) return [];

  const candidates: Candidate[] = [];
  const limit = options?.limit ?? 3;

  for (const customer of customers) {
    const normalizedName = normalizeCustomerName(customer.name);
    if (!normalizedName) continue;

    if (normalizedName.startsWith(normalizedInput) || normalizedInput.startsWith(normalizedName)) {
      candidates.push({ customer, score: 1000 - normalizedName.length });
      continue;
    }

    if (normalizedName.includes(normalizedInput) || normalizedInput.includes(normalizedName)) {
      candidates.push({ customer, score: 800 - normalizedName.length });
      continue;
    }

    if (Math.abs(normalizedName.length - normalizedInput.length) > 2) continue;

    const distance = levenshteinDistance(normalizedName, normalizedInput);
    if (distance <= 2) {
      candidates.push({ customer, score: 600 - distance * 100 - normalizedName.length });
    }
  }

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.customer);
}
