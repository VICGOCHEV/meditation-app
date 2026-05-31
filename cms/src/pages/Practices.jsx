import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, errText } from '../lib/api.js'
import { useToast } from '../ui/Toast.jsx'
import { BLOCKS, fmtMinutes } from '../lib/format.js'
import { IconPlus, IconGrip, IconTrash } from '../ui/icons.jsx'

// Индикатор заполненности матрицы: ●●○○○○ 2/6
function FillDots({ n }) {
  return (
    <span className="inline-flex items-center gap-1.5" title={`${n}/6 дорожек залито`}>
      <span className="font-mono text-[11px] tracking-tight text-fg-2">
        {'●'.repeat(n)}
        <span className="text-fg-4">{'○'.repeat(6 - n)}</span>
      </span>
      <span className="font-mono text-[11px] text-fg-3">{n}/6</span>
    </span>
  )
}

function PublishBadge({ on }) {
  return (
    <span className={`chip ${on ? 'bg-[oklch(0.4_0.1_300/0.25)] text-fg-1' : 'bg-bg-3 text-fg-3'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-violet' : 'bg-fg-4'}`} />
      {on ? 'опубликована' : 'черновик'}
    </span>
  )
}

export default function Practices() {
  const nav = useNavigate()
  const toast = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [dragId, setDragId] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/practices')
      setItems(data.items)
    } catch (e) {
      toast.err(errText(e))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  async function remove(p, e) {
    e.stopPropagation()
    if (!confirm(`Удалить практику «${p.title}»? Действие необратимо.`)) return
    try {
      await api.delete(`/admin/practices/${p.id}`)
      setItems((s) => s.filter((x) => x.id !== p.id))
      toast.ok('Практика удалена')
    } catch (err) {
      toast.err(errText(err))
    }
  }

  async function onDrop(block, targetId) {
    if (dragId == null || dragId === targetId) return
    const inBlock = items.filter((x) => x.block === block)
    const from = inBlock.findIndex((x) => x.id === dragId)
    const to = inBlock.findIndex((x) => x.id === targetId)
    if (from < 0 || to < 0) return
    const reordered = [...inBlock]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    // оптимистично обновляем
    const others = items.filter((x) => x.block !== block)
    setItems([...others, ...reordered].sort((a, b) => a.block.localeCompare(b.block)))
    setDragId(null)
    try {
      await api.post('/admin/practices/reorder', { block, orderedIds: reordered.map((x) => x.id) })
    } catch (e) {
      toast.err(errText(e))
      load()
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-fg-0">Практики</h1>
        <button className="btn-primary" onClick={() => nav('/practices/new')}>
          <IconPlus size={16} /> Добавить практику
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-fg-3">Загрузка…</div>
      ) : (
        <div className="flex flex-col gap-7">
          {BLOCKS.map((b) => {
            const list = items.filter((x) => x.block === b.key)
            return (
              <section key={b.key}>
                <div className="mb-2.5 flex items-baseline justify-between px-1">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-fg-1">
                    {b.title} <span className="ml-1 text-xs font-normal lowercase text-fg-4">· {b.note}</span>
                  </h2>
                  <span className="text-xs text-fg-3">
                    {list.length ? `${list.length} практ.` : 'пусто'}
                  </span>
                </div>

                {list.length === 0 ? (
                  <button
                    onClick={() => nav('/practices/new')}
                    className="card flex w-full items-center justify-center gap-2 border-dashed py-5 text-sm text-fg-3 transition-colors hover:border-violet/50 hover:text-fg-1"
                  >
                    <IconPlus size={15} /> Ещё нет практик — добавить
                  </button>
                ) : (
                  <div className="panel divide-y divide-line overflow-hidden">
                    {list.map((p) => (
                      <div
                        key={p.id}
                        draggable
                        onDragStart={() => setDragId(p.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => onDrop(b.key, p.id)}
                        onClick={() => nav(`/practices/${p.id}`)}
                        className={`group flex cursor-pointer items-center gap-3 px-3.5 py-3 transition-colors hover:bg-bg-2/60 ${
                          dragId === p.id ? 'opacity-40' : ''
                        }`}
                      >
                        <span className="cursor-grab text-fg-4 active:cursor-grabbing" onClick={(e) => e.stopPropagation()}>
                          <IconGrip size={16} />
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium text-fg-0">{p.title}</span>
                        <span className="hidden w-16 shrink-0 text-right font-mono text-xs text-fg-3 sm:block">
                          {fmtMinutes(p.durationSec)}
                        </span>
                        <span className="hidden shrink-0 sm:block"><FillDots n={p.audioFilled} /></span>
                        <span className="shrink-0"><PublishBadge on={p.published} /></span>
                        <button
                          onClick={(e) => remove(p, e)}
                          title="Удалить"
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-sm text-fg-4 opacity-0 transition-all hover:bg-bg-3 hover:text-err group-hover:opacity-100"
                        >
                          <IconTrash size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
