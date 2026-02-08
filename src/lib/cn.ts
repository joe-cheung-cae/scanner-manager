export type ClassValue = string | false | null | undefined;

export function cn(...values: ClassValue[]): string {
  const tokens = values
    .filter(Boolean)
    .join(" ")
    .split(/\s+/)
    .filter(Boolean);

  return Array.from(new Set(tokens)).join(" ");
}
