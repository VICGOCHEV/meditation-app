import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, errText } from '../lib/api.js'
import { useToast } from '../ui/Toast.jsx'
import { IconBack, IconUpload, IconTrash } from '../ui/icons.jsx'

// Редактор одного юридического документа. Два роута: /legal/new и /legal/:id.
//
// Текст хранится в упрощённой разметке (см. подсказку ниже) — клиент вставляет
// его из Word, а приложение рендерит абзацы, заголовки и списки само.
// Строка = абзац: именно так текст приходит из Word, где пустых строк между
// абзацами нет (см. application/components/ui/LegalBody.jsx).
// Нумерация пунктов («1.1.», «2.3.4.») остаётся частью текста как есть:
// в юридическом документе номер обязан совпадать с оригиналом.

const EMPTY = {
  slug: '',
  title: '',
  shortTitle: '',
  version: '',
  body: '',
  published: true,
  showInFooter: true,
  showAtSignup: false,
}

// Транслитерация названия в slug — чтобы владельцу не приходилось придумывать
// латинский адрес вручную.
const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

function slugify(text) {
  return text
    .toLowerCase()
    .split('')
    .map((ch) => (ch in TRANSLIT ? TRANSLIT[ch] : ch))
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function Flag({ checked, onChange, label, hint }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-violet"
      />
      <span>
        <span className="block text-sm text-fg-0">{label}</span>
        <span className="block text-xs text-fg-3">{hint}</span>
      </span>
    </label>
  )
}

export default function LegalDocEditor({ mode }) {
  const isNew = mode === 'new'
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const fileRef = useRef(null)

  const [form, setForm] = useState(EMPTY)
  const [doc, setDoc] = useState(null)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  // slug правим вручную только осознанно: у существующего документа его смена
  // ломает уже разосланные ссылки.
  const [slugTouched, setSlugTouched] = useState(!isNew)

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  async function load() {
    try {
      const { data } = await api.get(`/admin/legal/${id}`)
      setDoc(data.doc)
      setForm({
        slug: data.doc.slug,
        title: data.doc.title,
        shortTitle: data.doc.shortTitle || '',
        version: data.doc.version || '',
        body: data.doc.body || '',
        published: data.doc.published,
        showInFooter: data.doc.showInFooter,
        showAtSignup: data.doc.showAtSignup,
      })
    } catch (e) {
      toast.err(errText(e))
      navigate('/legal')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (!isNew) load() }, [id]) // eslint-disable-line

  async function save() {
    if (!form.title.trim()) return toast.err('Название обязательно')
    if (!form.slug.trim()) return toast.err('Адрес документа обязателен')
    setSaving(true)
    try {
      if (isNew) {
        const { data } = await api.post('/admin/legal', form)
        toast.ok('Документ создан')
        navigate(`/legal/${data.doc.id}`, { replace: true })
      } else {
        const { data } = await api.put(`/admin/legal/${id}`, form)
        setDoc(data.doc)
        toast.ok('Сохранено')
      }
    } catch (e) {
      toast.err(errText(e))
    } finally {
      setSaving(false)
    }
  }

  async function uploadFile(file) {
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      // Content-Type не ставим вручную — иначе теряется multipart boundary
      // и Fastify не распарсит тело (та же причина, что в lib/api.js).
      const { data } = await api.post(`/admin/legal/${id}/file`, fd)
      setDoc(data.doc)
      toast.ok('Файл загружен')
    } catch (e) {
      toast.err(errText(e))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function removeFile() {
    if (!confirm('Удалить PDF? Если текста в документе нет, ссылка исчезнет из приложения.')) return
    try {
      const { data } = await api.delete(`/admin/legal/${id}/file`)
      setDoc(data.doc)
      toast.ok('Файл удалён')
    } catch (e) {
      toast.err(errText(e))
    }
  }

  if (loading) {
    return <div className="py-16 text-center text-fg-3">Загружаем…</div>
  }

  const hasText = !!form.body.trim()
  const mode_ = hasText
    ? 'Документ откроется страницей внутри приложения.'
    : doc?.fileUrl
      ? 'Текста нет — ссылка ведёт на загруженный PDF.'
      : 'Ни текста, ни файла — документ не показывается пользователям.'

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <button
        type="button"
        onClick={() => navigate('/legal')}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-fg-3 hover:text-fg-1"
      >
        <IconBack size={16} /> Все документы
      </button>

      <h1 className="mb-1 text-xl font-bold text-fg-0">
        {isNew ? 'Новый документ' : form.title || 'Документ'}
      </h1>
      <p className="mb-5 text-sm text-fg-3">{mode_}</p>

      <div className="panel mb-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="label">Название</span>
            <input
              type="text"
              value={form.title}
              onChange={(e) => {
                const title = e.target.value
                set({ title, ...(slugTouched ? {} : { slug: slugify(title) }) })
              }}
              maxLength={200}
              placeholder="Политика конфиденциальности"
              className="input mt-1"
            />
          </label>

          <label className="block">
            <span className="label">Короткое название (опц.)</span>
            <input
              type="text"
              value={form.shortTitle}
              onChange={(e) => set({ shortTitle: e.target.value })}
              maxLength={80}
              placeholder="Политика"
              className="input mt-1"
            />
            <span className="mt-1 block text-[11px] text-fg-3">
              Используется в подвале, где мало места. Пусто — берётся полное название.
            </span>
          </label>

          <label className="block">
            <span className="label">Редакция (опц.)</span>
            <input
              type="text"
              value={form.version}
              onChange={(e) => set({ version: e.target.value })}
              maxLength={80}
              placeholder="ред. от 25.08.2026"
              className="input mt-1"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="label">Адрес документа</span>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-mono text-xs text-fg-3">/legal/</span>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => { setSlugTouched(true); set({ slug: slugify(e.target.value) }) }}
                maxLength={60}
                placeholder="privacy-policy"
                className="input font-mono"
              />
            </div>
            {!isNew && (
              <span className="mt-1 block text-[11px] text-amber-300">
                Смена адреса ломает уже разосланные ссылки на документ.
              </span>
            )}
          </label>
        </div>
      </div>

      <div className="panel mb-5">
        <div className="mb-1 flex items-baseline justify-between gap-3">
          <span className="label mb-0">Текст документа</span>
          <span className="text-[11px] text-fg-3">{form.body.length} символов</span>
        </div>
        <textarea
          value={form.body}
          onChange={(e) => set({ body: e.target.value })}
          rows={22}
          maxLength={200000}
          placeholder="Вставьте текст документа. Пусто — документ будет открываться как PDF."
          className="input mt-1 font-mono text-[13px] leading-relaxed"
        />
        <div className="mt-3 rounded-sm border border-line bg-bg-0 px-3 py-2.5 text-[11px] leading-relaxed text-fg-3">
          <div className="mb-1 font-semibold text-fg-2">Разметка</div>
          Каждая строка — отдельный абзац: текст можно вставлять из Word как есть.
          <span className="font-mono"> ## Заголовок</span> — крупный заголовок,
          <span className="font-mono"> ### Заголовок</span> — помельче.
          Строка, начинающаяся с <span className="font-mono">- </span> — пункт списка.
          <span className="font-mono"> **текст**</span> — жирный.
          <span className="font-mono"> [текст](https://…)</span> — ссылка.
          Нумерацию пунктов (1.1., 2.3.) пишите как есть — она сохраняется дословно.
        </div>
      </div>

      <div className="panel mb-5">
        <h2 className="mb-1 text-sm font-bold text-fg-0">PDF-файл</h2>
        <p className="mb-3 text-xs text-fg-3">
          Нужен, если документ ведётся подписанным файлом. Пока в поле выше нет
          текста, ссылка в приложении будет открывать этот PDF.
        </p>

        {isNew ? (
          <div className="text-xs text-fg-3">Сначала сохраните документ — потом можно приложить файл.</div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            {doc?.fileUrl ? (
              <>
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border border-line-2 px-3 py-1.5 font-mono text-xs text-fg-1 hover:bg-white/5"
                >
                  {doc.fileUrl}
                </a>
                <button
                  type="button"
                  onClick={removeFile}
                  className="rounded-md border border-line-2 px-3 py-1.5 text-xs text-fg-1 hover:bg-err/10 hover:text-err"
                >
                  <IconTrash /> Удалить
                </button>
              </>
            ) : (
              <span className="text-xs text-fg-3">Файл не загружен.</span>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="btn-ghost"
            >
              <IconUpload /> {uploading ? 'Загружаем…' : doc?.fileUrl ? 'Заменить' : 'Загрузить PDF'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => uploadFile(e.target.files?.[0])}
            />
          </div>
        )}
      </div>

      <div className="panel mb-5">
        <h2 className="mb-3 text-sm font-bold text-fg-0">Где показывать</h2>
        <div className="flex flex-col gap-3">
          <Flag
            checked={form.published}
            onChange={(v) => set({ published: v })}
            label="Опубликован"
            hint="Выключено — документ не отдаётся приложению вообще."
          />
          <Flag
            checked={form.showInFooter}
            onChange={(v) => set({ showInFooter: v })}
            label="Ссылка в подвале"
            hint="Мелкие ссылки внизу профиля."
          />
          <Flag
            checked={form.showAtSignup}
            onChange={(v) => set({ showAtSignup: v })}
            label="Ссылка на регистрации"
            hint="В чекбоксе согласия при создании аккаунта."
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={() => navigate('/legal')}>
          Отмена
        </button>
        <button type="button" className="btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Сохраняем…' : isNew ? 'Создать' : 'Сохранить'}
        </button>
      </div>
    </div>
  )
}
