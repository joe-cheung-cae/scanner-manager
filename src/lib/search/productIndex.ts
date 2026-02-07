import type { Product, ProductSearchFilters } from "@/domain/types";

interface IndexedProduct {
  product: Product;
  blob: string;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,，;；:：|/\\()\[\]{}]+/)
    .filter(Boolean);
}

function stringifyProduct(product: Product): string {
  const specs = product.specs;
  return [
    product.model,
    product.name,
    product.status,
    specs.notes,
    specs.keywords?.join(" "),
    specs.scan?.codeTypes?.join(" "),
    specs.scan?.sensorModel,
    specs.scan?.resolution,
    specs.scan?.depthOfField,
    specs.comms?.wired?.join(" "),
    specs.comms?.wireless?.join(" "),
    specs.comms?.moduleModel,
    specs.comms?.sdk,
    specs.env?.ipRating,
    specs.env?.operatingTempC,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function buildProductIndex(products: Product[]): IndexedProduct[] {
  return products.map((product) => ({
    product,
    blob: stringifyProduct(product),
  }));
}

function passesFilters(product: Product, filters: ProductSearchFilters): boolean {
  if (filters.status && product.status !== filters.status) return false;
  if (filters.codeType && !product.specs.scan?.codeTypes?.includes(filters.codeType)) return false;
  if (filters.wired && !product.specs.comms?.wired?.some((x) => x.includes(filters.wired!))) return false;
  if (filters.wireless && !product.specs.comms?.wireless?.some((x) => x.includes(filters.wireless!))) return false;
  return true;
}

export function searchProducts(
  indexed: IndexedProduct[],
  query: string,
  filters: ProductSearchFilters = {},
): Product[] {
  const clean = query.trim().toLowerCase();
  const qTokens = tokenize(clean);

  const scored = indexed
    .filter((entry) => passesFilters(entry.product, filters))
    .map((entry) => {
      if (!clean) return { product: entry.product, score: 1 };
      let score = 0;
      if (entry.product.model.toLowerCase().startsWith(clean)) score += 10;
      if (entry.blob.includes(clean)) score += 4;
      for (const token of qTokens) {
        if (entry.blob.includes(token)) score += 2;
      }
      return { product: entry.product, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.product.updatedAt - a.product.updatedAt);

  return scored.map((x) => x.product);
}
