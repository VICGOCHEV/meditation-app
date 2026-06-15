import ShaderCanvas from './ShaderCanvas'
import { sphereFragment } from '../shaders'

// Аморфная сфера. screen-бленд убирает тёмную каёмку (тёмное не добавляется
// поверх фона). autoPause замораживает рендер за экраном.
export default function AmorphSphere({ size = 320, blend = 'screen' }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        maxWidth: '100%',
        aspectRatio: '1 / 1',
        filter: 'drop-shadow(0 0 60px rgba(97,69,194,0.45))',
      }}
    >
      <ShaderCanvas fragmentShader={sphereFragment} dpr={[1, 1.6]} autoPause blend={blend} />
    </div>
  )
}
