import { useRef, useState } from 'react'
import { IconUpload, IconTrash } from './icons.jsx'
import MiniPlayer from './MiniPlayer.jsx'
import { uploadAudio, errText } from '../lib/api.js'
import { useToast } from './Toast.jsx'
import { fmtClock, fmtBytes } from '../lib/format.js'

// Универсальный слот аудио. Используется и в матрице практики, и в формах
// голоса/музыки. value — media|null, onChange(media|null).
export default function AudioCell({ value, onChange, required = false, hint }) {
  const inputRef = useRef(null)
  const [pct, setPct] = useState(null) // null = не грузим, 0..100 = прогресс
  const [drag, setDrag] = useState(false)
  const toast = useToast()

  async function handleFile(file) {
    if (!file) return
    if (!/audio\/(mpeg|mp3)/.test(file.type) && !file.name.toLowerCase().endsWith('.mp3')) {
      toast.err('Только mp3')
      return
    }
    setPct(0)
    try {
      const media = await uploadAudio(file, setPct)
      onChange(media)
      toast.ok('Файл загружен')
    } catch (e) {
      toast.err(errText(e))
    } finally {
      setPct(null)
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDrag(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  // ── загрузка ──
  if (pct !== null) {
    return (
      <div className="card flex h-[58px] flex-col justify-center gap-1.5 px-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-bg-0">
          <div className="h-full rounded-full bg-violet transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="font-mono text-[11px] text-fg-3">загрузка… {pct}%</span>
      </div>
    )
  }

  // ── залито ──
  if (value) {
    return (
      <div className="card flex h-[58px] items-center justify-between gap-2 px-2.5">
        <MiniPlayer url={value.url} durationSec={value.durationSec} compact />
        <div className="flex items-center gap-2">
          <span className="hidden font-mono text-[10px] text-fg-3 sm:block">
            {fmtClock(value.durationSec)} · {fmtBytes(value.sizeBytes)}
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            title="Убрать"
            className="grid h-7 w-7 place-items-center rounded-sm text-fg-3 transition-colors hover:bg-bg-3 hover:text-err"
          >
            <IconTrash size={15} />
          </button>
        </div>
      </div>
    )
  }

  // ── пусто ──
  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setDrag(true)
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      className={`flex h-[58px] w-full flex-col items-center justify-center gap-0.5 rounded-md border border-dashed text-xs transition-colors ${
        drag
          ? 'border-violet bg-violet/10 text-fg-0'
          : required
            ? 'border-violet/40 text-fg-2 hover:border-violet hover:text-fg-0'
            : 'border-line-2 text-fg-3 hover:border-violet/60 hover:text-fg-1'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="audio/mpeg,.mp3"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <span className="flex items-center gap-1.5">
        <IconUpload size={14} /> загрузить
      </span>
      {hint && <span className="text-[10px] text-fg-4">{hint}</span>}
    </button>
  )
}
