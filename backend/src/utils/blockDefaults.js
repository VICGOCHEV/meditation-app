// Дефолтные заголовки секций блоков на главной аппки. Если в таблице
// BlockMeta нет строки для ключа — отдаём этот дефолт, поэтому и аппка, и CMS
// работают без предварительного сидирования (строки создаются при первом
// сохранении в CMS «Блоки»).
//
// key — структурный идентификатор блока (совпадает с Practice.block):
//   relaxation | awareness | awareness2 | author
export const BLOCK_DEFAULTS = {
  relaxation: {
    key: 'relaxation',
    eyebrow: '01 · СТАРТ',
    title: 'Точка тишины',
    sub: 'Бесплатные практики расслабления — мягкий вход в тело.',
    chip: 'Бесплатно · 4',
    order: 1,
  },
  awareness: {
    key: 'awareness',
    eyebrow: '02 · СИСТЕМА',
    title: 'Пароль от жизни',
    sub: 'Шесть практик осознанности — переход из тревоги в присутствие.',
    chip: 'По подписке · 6 практик/мес',
    order: 2,
  },
  awareness2: {
    key: 'awareness2',
    eyebrow: '03 · СИСТЕМА',
    title: 'Глубже в тишину',
    sub: 'Второй цикл практик осознанности — продолжение пути в присутствие.',
    chip: 'По подписке',
    order: 3,
  },
  author: {
    key: 'author',
    eyebrow: '04 · АВТОРСКОЕ',
    title: 'Авторские',
    sub: '',
    chip: 'Поштучно',
    order: 4,
  },
}

export const BLOCK_KEYS = Object.keys(BLOCK_DEFAULTS)

// Сливает дефолт с DB-строкой. Пустые/отсутствующие поля строки падают на
// дефолт, так что аппка никогда не получит секцию без заголовка.
export function mergeBlock(key, row) {
  const d = BLOCK_DEFAULTS[key] || { key, title: key, order: 99 }
  if (!row) return { ...d }
  return {
    key,
    eyebrow: row.eyebrow ?? d.eyebrow ?? null,
    title: row.title ?? d.title,
    sub: row.sub ?? d.sub ?? null,
    chip: row.chip ?? d.chip ?? null,
    order: row.order ?? d.order ?? 0,
  }
}
