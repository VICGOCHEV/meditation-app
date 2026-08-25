import { Fragment } from 'react'

// Рендер текста юридического документа из CMS.
//
// Владелец вставляет текст из Word, поэтому разметка намеренно минимальная:
//   каждая строка      — отдельный абзац
//   ## / ###           — заголовки
//   строка с "- "      — пункт списка
//   **жирный**
//   [текст](https://…) — ссылка
//
// Почему строка = абзац, а не «абзац до пустой строки»: текст приходит
// копипастом из Word, где переносом разделены именно абзацы и пустых строк
// между ними нет. Склейка строк превратила бы весь документ в одно полотно,
// а пункты «1.1.» и «1.2.» слиплись бы в одну строку. Пустые строки при этом
// остаются безвредны — они просто ничего не разделяют дополнительно.
//
// Нумерацию пунктов («1.1.», «2.3.4.») НЕ трогаем и в <ol> не превращаем:
// в юридическом тексте номер пункта обязан совпадать с оригиналом дословно,
// а автонумерация браузера его переписала бы.
//
// HTML из строки не вставляется никогда (никакого dangerouslySetInnerHTML) —
// собираем React-элементы, поэтому вставленный в CMS <script> останется
// просто текстом.

const SAFE_HREF = /^(https?:\/\/|mailto:)/i

// Разбор инлайновой разметки одной строки. Возвращает массив React-узлов.
function inline(text, keyPrefix) {
  const nodes = []
  // Один проход по обоим шаблонам сразу: **жирный** и [текст](ссылка).
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g
  let last = 0
  let m
  let i = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    if (m[1] !== undefined) {
      nodes.push(
        <strong key={`${keyPrefix}-b${i}`} className="font-semibold text-fg-0">
          {m[1]}
        </strong>,
      )
    } else if (SAFE_HREF.test(m[3])) {
      nodes.push(
        <a
          key={`${keyPrefix}-a${i}`}
          href={m[3]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-lilac underline-offset-2 hover:underline"
        >
          {m[2]}
        </a>,
      )
    } else {
      // Небезопасная схема (javascript:, data:) — оставляем видимый текст,
      // ссылку не создаём.
      nodes.push(m[2])
    }
    last = m.index + m[0].length
    i += 1
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

// Разбивает текст на блоки: заголовки, списки, абзацы.
function toBlocks(source) {
  const lines = String(source || '').replace(/\r\n?/g, '\n').split('\n')
  const blocks = []
  let list = []

  const flushList = () => {
    if (list.length) {
      blocks.push({ type: 'ul', items: list })
      list = []
    }
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) { flushList(); continue }

    const heading = /^(#{2,3})\s+(.*)$/.exec(line)
    if (heading) {
      flushList()
      blocks.push({ type: heading[1].length === 2 ? 'h2' : 'h3', text: heading[2] })
      continue
    }

    const bullet = /^[-•]\s+(.*)$/.exec(line)
    if (bullet) {
      list.push(bullet[1])
      continue
    }

    flushList()
    blocks.push({ type: 'p', text: line })
  }
  flushList()
  return blocks
}

export default function LegalBody({ text }) {
  const blocks = toBlocks(text)
  if (blocks.length === 0) return null

  return (
    <div className="flex flex-col gap-4">
      {blocks.map((b, i) => {
        const key = `b${i}`
        if (b.type === 'h2') {
          return (
            <h2 key={key} className="mt-4 text-[17px] font-semibold leading-snug text-fg-0">
              {inline(b.text, key)}
            </h2>
          )
        }
        if (b.type === 'h3') {
          return (
            <h3 key={key} className="mt-2 text-[15px] font-semibold leading-snug text-fg-1">
              {inline(b.text, key)}
            </h3>
          )
        }
        if (b.type === 'ul') {
          return (
            <ul key={key} className="flex flex-col gap-2 pl-1">
              {b.items.map((item, j) => (
                <li key={`${key}-${j}`} className="flex gap-2.5 text-[14px] leading-relaxed text-fg-2">
                  <span aria-hidden className="mt-[9px] h-[3px] w-[3px] shrink-0 rounded-full bg-fg-3" />
                  <span>{inline(item, `${key}-${j}`)}</span>
                </li>
              ))}
            </ul>
          )
        }
        return (
          <p key={key} className="text-[14px] leading-relaxed text-fg-2">
            <Fragment>{inline(b.text, key)}</Fragment>
          </p>
        )
      })}
    </div>
  )
}
