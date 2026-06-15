import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Chapter, Split, StoryItem, Cap } from '../components/story'
import { Badge } from '../components/kit'
import AmorphSphere from '../components/AmorphSphere'

function SparkToSphere() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] })
  const sparkOpacity = useTransform(scrollYProgress, [0, 0.55, 0.8], [1, 1, 0])
  const sparkScale = useTransform(scrollYProgress, [0, 0.8], [0.25, 1.6])
  const sphereOpacity = useTransform(scrollYProgress, [0.5, 1], [0, 1])
  const sphereScale = useTransform(scrollYProgress, [0.5, 1], [0.6, 1])
  return (
    <div ref={ref} className="case-card relative flex aspect-square items-center justify-center overflow-hidden">
      <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% 60%, rgba(60,40,130,0.45), transparent 70%)' }} />
      <motion.span style={{ opacity: sparkOpacity, scale: sparkScale }} className="absolute h-24 w-24 rounded-full">
        <span className="block h-full w-full rounded-full" style={{ background: 'radial-gradient(circle, #ffffff, #d6c8ff 30%, #6145c2 60%, transparent 75%)', filter: 'blur(2px)' }} />
      </motion.span>
      <motion.div style={{ opacity: sphereOpacity, scale: sphereScale }} className="absolute"><AmorphSphere size={300} /></motion.div>
      <span className="absolute bottom-5 left-5 label-mono">scroll-scrub · искра → сфера</span>
    </div>
  )
}

export default function LandingDist() {
  return (
    <Chapter id="landing" kicker="Лендинг и дистрибуция" title="Маркетинговый лендинг и дистрибуция">
      <Split visual={<SparkToSphere />}>
        <div className="space-y-12">
          <StoryItem icon="spark" title="Скролл как нарратив" index="01">
            <Cap size="sm">Скролл управляет анимацией: световая искра превращается в интерфейсную сферу приложения.</Cap>
          </StoryItem>
          <StoryItem icon="rocket" title="Оптимизированная загрузка" index="02" delay={0.06}>
            <Cap size="sm">Тяжёлые ресурсы и шейдеры — лениво. Первый экран рендерится мгновенно.</Cap>
          </StoryItem>
          <StoryItem icon="platforms" title="Mini Apps" index="03" delay={0.12}>
            <Cap size="sm">Telegram и VK Mini App со сквозным распознаванием сессии в один тап.</Cap>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Badge icon="globe" active>Web</Badge><Badge icon="telegram">Telegram</Badge><Badge icon="platforms">VK</Badge>
            </div>
          </StoryItem>
        </div>
      </Split>
    </Chapter>
  )
}
