/** Variable reward daily bonus — seeded by date for deterministic per-day amounts */
export function getDailyBonusAmount(dateStr: string): number {
  // Simple hash from date string
  let hash = 0
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash + dateStr.charCodeAt(i)) | 0
  }
  const rand = Math.abs(hash % 100)

  // Weighted distribution: 5 XP (40%), 10 (25%), 15 (20%), 20 (10%), 25 (5%)
  if (rand < 40) return 5
  if (rand < 65) return 10
  if (rand < 85) return 15
  if (rand < 95) return 20
  return 25
}
