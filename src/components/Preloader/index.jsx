import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const SESSION_KEY = 'preloader_played'
const FALLBACK_TIMEOUT = 6500

export default function Preloader({ onDone }) {
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem(SESSION_KEY) !== '1'
  })
  const videoRef = useRef(null)

  useEffect(() => {
    if (!visible) {
      onDone?.()
      return
    }
    const finish = () => {
      sessionStorage.setItem(SESSION_KEY, '1')
      setVisible(false)
      onDone?.()
    }
    const v = videoRef.current
    if (v) {
      const tryPlay = v.play()
      if (tryPlay && typeof tryPlay.catch === 'function') tryPlay.catch(() => {})
    }
    const fallback = setTimeout(finish, FALLBACK_TIMEOUT)
    const onEnded = () => {
      clearTimeout(fallback)
      finish()
    }
    v?.addEventListener('ended', onEnded)
    return () => {
      clearTimeout(fallback)
      v?.removeEventListener('ended', onEnded)
    }
  }, [visible, onDone])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-bg-0"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.6, ease: [0.22, 0.8, 0.36, 1] }}
        >
          <video
            ref={videoRef}
            src="/preloader.mp4"
            className="h-full w-full object-cover"
            autoPlay
            muted
            playsInline
            preload="auto"
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
