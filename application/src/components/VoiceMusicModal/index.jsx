import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { usePlayerStore } from '../../store/usePlayerStore'

const VOICES = [
  { id: 'male', label: 'Мужской' },
  { id: 'female', label: 'Женский' },
]

const MUSIC = [
  { id: 1, label: 'Спокойствие' },
  { id: 2, label: 'Природа' },
  { id: 3, label: 'Космос' },
]

export default function VoiceMusicModal({ open, onClose }) {
  const selectedVoice = usePlayerStore((s) => s.selectedVoice)
  const selectedMusic = usePlayerStore((s) => s.selectedMusic)
  const setVoice = usePlayerStore((s) => s.setVoice)
  const setMusic = usePlayerStore((s) => s.setMusic)

  return (
    <Modal open={open} onClose={onClose} title="Настройки">
      <div className="flex flex-col gap-5">
        <div>
          <div className="label-mono mb-2">Голос</div>
          <div className="flex rounded-full border border-line p-1">
            {VOICES.map((v) => {
              const on = selectedVoice === v.id
              return (
                <button
                  key={v.id}
                  onClick={() => setVoice(v.id)}
                  className={[
                    'flex-1 rounded-full py-2 text-[13px] transition',
                    on ? 'bg-white/10 text-fg-0' : 'text-fg-2 hover:text-fg-0',
                  ].join(' ')}
                >
                  {v.label}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <div className="label-mono mb-2">Музыка</div>
          <div className="flex flex-col gap-2">
            {MUSIC.map((m) => {
              const on = selectedMusic === m.id
              return (
                <button
                  key={m.id}
                  onClick={() => setMusic(m.id)}
                  className={[
                    'flex items-center justify-between rounded-sm border px-4 py-3 text-left transition',
                    on
                      ? 'border-lilac bg-white/10'
                      : 'border-line-2 bg-white/5 hover:bg-white/10',
                  ].join(' ')}
                >
                  <span className="text-fg-0">{m.label}</span>
                  <span className="text-[12px] text-fg-3">▶</span>
                </button>
              )
            })}
          </div>
        </div>

        <Button fullWidth onClick={onClose}>Готово</Button>
      </div>
    </Modal>
  )
}
