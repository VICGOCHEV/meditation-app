export function buildKtProgressSnapshot(rows) {
  const ordered = [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  const ktHistory = ordered.map((e) => ({ date: e.createdAt.toISOString(), kt: e.kt }))
  return {
    ktHistory,
    lastKtEntry: ordered.at(-1) || null,
  }
}
