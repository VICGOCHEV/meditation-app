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
      // Imperatively ensure muted before play — iOS won't autoplay otherwise,
      // and React's `muted` prop occasionally fails to make it onto the
      // initial DOM attribute fast enough.
      v.muted = true
      v.defaultMuted = true
      const tryPlay = v.play()
      if (tryPlay && typeof tryPlay.catch === 'function') {
        // Autoplay denied (typical on touch devices without prior gesture).
        // Skip the preloader instead of leaving the user staring at the
        // browser's tap-to-play overlay.
        tryPlay.catch(() => finish())
      }
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
            className="pointer-events-none h-full w-full object-cover"
            autoPlay
            muted
            defaultMuted
            playsInline
            webkit-playsinline="true"
            x5-playsinline="true"
            preload="auto"
            controls={false}
            disableRemotePlayback
            disablePictureInPicture
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
