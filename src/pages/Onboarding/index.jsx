import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/ui/Button'
import ScreenShell from '../../components/ui/ScreenShell'
import { usePlayerStore } from '../../store/usePlayerStore'

const MUSIC = [
  { id: 1, title: 'Спокойствие' },
  { id: 2, title: 'Природа' },
  { id: 3, title: 'Космос' },
]

function Dots({ count, active }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={[
            'h-1.5 rounded-full transition-all',
            i === active ? 'w-6 bg-lilac' : 'w-1.5 bg-white/20',
          ].join(' ')}
        />
      ))}
    </div>
  )
}

function Illustration() {
  return (
    <div
      className="mx-auto h-52 w-52 rounded-3xl"
      style={{
        background:
          'radial-gradient(circle at 35% 30%, oklch(0.78 0.14 310 / 0.6), transparent 55%), radial-gradient(circle at 70% 70%, oklch(0.50 0.22 290 / 0.55), transparent 55%), linear-gradient(180deg, #1a1134, #0e0820)',
        boxShadow: '0 0 80px -20px oklch(0.55 0.22 295 / 0.5)',
      }}
    />
  )
}

function PreviewButton({ label = 'Прослушать' }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-lilac">
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
      {label}
    </span>
  )
}

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const selectedVoice = usePlayerStore((s) => s.selectedVoice)
  const selectedMusic = usePlayerStore((s) => s.selectedMusic)
  const setVoice = usePlayerStore((s) => s.setVoice)
  const setMusic = usePlayerStore((s) => s.setMusic)

  const finish = () => {
    localStorage.setItem('onboarding_completed', 'true')
    navigate('/auth/login')
  }

  const skip = () => setStep(2)

  return (
    <ScreenShell>
      <div className="flex min-h-[90dvh] flex-col">
        <div className="flex items-center justify-between">
          <Dots count={4} active={step} />
          {step < 2 && (
            <button
              type="button"
              onClick={skip}
              className="text-[12px] text-fg-3 hover:text-fg-1"
            >
              Пропустить
            </button>
          )}
        </div>

        <div className="mt-8 flex-1 animate-fade-in">
          {step === 0 && (
            <div className="flex flex-col gap-8 text-center">
              <Illustration />
              <div>
                <h1 className="font-serif text-[32px] leading-tight text-fg-0">
                  Твой путь к внутреннему покою
                </h1>
                <p className="mt-4 text-[15px] leading-relaxed text-fg-2">
                  Медитации с системой прогрессии, которая открывает новые практики по мере твоего роста.
                </p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-8 text-center">
              <Illustration />
              <div>
                <h1 className="font-serif text-[32px] leading-tight text-fg-0">
                  Практики открываются каждые 3 дня
                </h1>
                <p className="mt-4 text-[15px] leading-relaxed text-fg-2">
                  Каждые 3 дня — новая практика. Проходи анализ состояния и отслеживай свой прогресс.
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-6">
              <h1 className="text-center font-serif text-3xl text-fg-0">
                Выбери свой голос
              </h1>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'male', label: 'Мужской' },
                  { id: 'female', label: 'Женский' },
                ].map((v) => {
                  const on = selectedVoice === v.id
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVoice(v.id)}
                      className={[
                        'flex flex-col items-center gap-3 rounded-lg border p-5 text-center transition',
                        on
                          ? 'border-lilac bg-white/10'
                          : 'border-line-2 bg-white/5 hover:bg-white/10',
                      ].join(' ')}
                    >
                      <div
                        className="h-16 w-16 rounded-full"
                        style={{
                          background:
                            'radial-gradient(circle at 35% 30%, oklch(0.78 0.14 310), oklch(0.40 0.2 290))',
                        }}
                      />
                      <span className="text-fg-0">{v.label}</span>
                      <PreviewButton />
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-6">
              <h1 className="text-center font-serif text-3xl text-fg-0">
                Выбери фоновую музыку
              </h1>
              <div className="flex flex-col gap-3">
                {MUSIC.map((m) => {
                  const on = selectedMusic === m.id
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMusic(m.id)}
                      className={[
                        'flex items-center gap-4 rounded-lg border p-4 text-left transition',
                        on
                          ? 'border-lilac bg-white/10'
                          : 'border-line-2 bg-white/5 hover:bg-white/10',
                      ].join(' ')}
                    >
                      <div
                        className="h-12 w-12 shrink-0 rounded-full"
                        style={{
                          background: `linear-gradient(135deg, oklch(${0.4 + m.id * 0.05} 0.22 ${280 + m.id * 10}), oklch(${0.6 + m.id * 0.03} 0.15 ${310 - m.id * 5}))`,
                        }}
                      />
                      <div className="flex-1">
                        <div className="text-fg-0">{m.title}</div>
                        <PreviewButton />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-col gap-3">
          {step < 2 && (
            <Button size="lg" fullWidth onClick={() => setStep(step + 1)}>
              Далее
            </Button>
          )}
          {step === 2 && (
            <Button
              size="lg"
              fullWidth
              disabled={!selectedVoice}
              onClick={() => setStep(3)}
            >
              Далее
            </Button>
          )}
          {step === 3 && (
            <Button
              size="lg"
              fullWidth
              disabled={!selectedMusic}
              onClick={finish}
            >
              Начать
            </Button>
          )}
        </div>
      </div>
    </ScreenShell>
  )
}
