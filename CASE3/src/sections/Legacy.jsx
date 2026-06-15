import { useState } from 'react'
import { Sec, Title, Lead } from '../components/caseui'
import { Up, Cap } from '../components/story'
import PhoneMockup from '../components/PhoneMockup'
import Icon from '../lib/icons'

// Слот под реальный скриншот старого приложения / картинку заказчика.
// Если файла нет — показываем аккуратную «архивную» заглушку (не битую картинку).
function LegacyShot({ src, caption, hint, ratio = '300 / 620', phone = false }) {
  const [ok, setOk] = useState(true)
  const frame = (
    <div className="relative h-full w-full overflow-hidden rounded-2xl" style={{ background: 'rgba(8,6,16,0.6)', border: '1px dashed rgba(180,160,255,0.2)' }}>
      {ok ? (
        <img src={src} alt={caption} onError={() => setOk(false)} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
          <Icon name="doc" size={28} className="text-fg-3" />
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg-3">{hint}</p>
        </div>
      )}
      <span className="absolute left-3 top-3 rounded-full px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em]" style={{ background: 'rgba(8,6,16,0.7)', color: '#e08a6b', border: '1px solid rgba(224,138,107,0.35)' }}>было</span>
    </div>
  )
  return (
    <figure className="flex flex-col gap-3">
      {phone ? (
        <PhoneMockup width={250} withSphere={false} float={false}>{ok ? <img src={src} alt={caption} onError={() => setOk(false)} className="h-full w-full object-cover" /> : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
            <Icon name="doc" size={28} className="text-fg-3" />
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg-3">{hint}</p>
          </div>
        )}</PhoneMockup>
      ) : (
        <div style={{ aspectRatio: ratio }}>{frame}</div>
      )}
      <figcaption className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg-3">{caption}</figcaption>
    </figure>
  )
}

export default function Legacy() {
  return (
    <Sec id="legacy" num="02" tag="Отправная точка" ghost="02">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div className="max-w-xl">
          <Title className="text-[clamp(2rem,5vw,3.4rem)]">Я не начал<br className="hidden sm:block" /> с пустого листа</Title>
          <Lead className="mt-6">
            У заказчика уже было работающее приложение и собранные материалы. Задача — не «нарисовать с нуля», а вырастить из этого зрелую дизайн-систему: сохранить смысл, поднять планку.
          </Lead>
          <div className="mt-8 space-y-4">
            {[
              { icon: 'reflect', t: 'Аудит старого продукта', d: 'Разобрали логику экранов и наполнение, оставили рабочее ядро.' },
              { icon: 'scale', t: 'Дизайн-система поверх', d: 'Токены, типографика и компоненты — новый каркас на знакомой основе.' },
            ].map((b) => (
              <div key={b.t} className="flex gap-4">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lilac" style={{ background: 'rgba(97,69,194,0.12)', border: '1px solid rgba(180,160,255,0.16)' }}><Icon name={b.icon} size={18} /></span>
                <div>
                  <p className="text-[15px] text-fg-0">{b.t}</p>
                  <Cap size="sm" className="mt-1">{b.d}</Cap>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Up delay={0.1}>
          <LegacyShot phone src={`${import.meta.env.BASE_URL}legacy/old-1.jpg`} caption="Старая версия · скриншот экрана" hint="скриншот старого приложения" />
        </Up>
      </div>
    </Sec>
  )
}
