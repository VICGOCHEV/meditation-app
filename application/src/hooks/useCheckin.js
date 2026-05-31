import { useEffect } from 'react'
import { useCheckinStore } from '../store/useCheckinStore'

export function useCheckin() {
  const checkIfDoneToday = useCheckinStore((s) => s.checkIfDoneToday)
  const todayCheckinDone = useCheckinStore((s) => s.todayCheckinDone)

  useEffect(() => {
    checkIfDoneToday()
  }, [checkIfDoneToday])

  return { todayCheckinDone }
}
