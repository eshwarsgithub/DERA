export function inferIsOrphan(lastReferencedAt?: Date | null, days = 90): boolean {
  if (!lastReferencedAt) return true;
  const diff = Date.now() - new Date(lastReferencedAt).getTime();
  const threshold = days * 24 * 60 * 60 * 1000;
  return diff > threshold;
}
