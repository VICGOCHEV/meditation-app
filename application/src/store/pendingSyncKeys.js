export const CHECKIN_PENDING_KEY = 'checkin_pending_sync'
export const COMPLETION_PENDING_KEY = 'completion_pending_sync'

export function clearCheckinPending(storage = localStorage) {
  storage.removeItem(CHECKIN_PENDING_KEY)
}

export function clearCompletionPending(storage = localStorage) {
  storage.removeItem(COMPLETION_PENDING_KEY)
}
