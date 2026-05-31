import ShaderCanvas from './ShaderCanvas'
import { fogFragment } from '../shaders'

// Прозрачный слой фиолетового тумана поверх фона. Плотность управляется
// через densityRef (мутабельный ref) — секции поднимают её в viewport.
export default function OnboardingFog({ densityRef }) {
  return (
    <div
      aria-hidden
      style={{ position: 'fixed', inset: 0, zIndex: -5, pointerEvents: 'none' }}
    >
      <ShaderCanvas
        fragmentShader={fogFragment}
        densityRef={densityRef}
        dpr={[0.6, 1.2]}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  )
}
