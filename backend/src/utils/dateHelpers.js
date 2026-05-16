// Returns today as a Date pinned to UTC midnight — Prisma stores @db.Date
// without time, so we hand it a date-only value to avoid TZ skew.
export function todayDateOnly() {
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}
