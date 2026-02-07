export function generateOrderNo(now = new Date(), seq = 1): string {
  const yyyy = now.getFullYear().toString();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}-${String(seq).padStart(4, "0")}`;
}
