// Юридические документы (оферта, политика, согласие на ОПД). Единственное
// место, где заданы лимиты, валидация slug и публичная форма ответа.
//
// Режим показа выводится из данных, отдельного поля нет:
//   body не пустой            → страница аппки /legal/:slug   (isPage: true)
//   body пустой, есть fileUrl → ссылка на PDF                 (isPage: false)
//   пусто и там и там         → публично не отдаём вовсе

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const LIMITS = {
  slug: 60,
  title: 200,
  shortTitle: 80,
  version: 80,
  body: 200_000,
  requisites: 300,
}

// Реквизиты под ссылками в подвале аппки. Хранятся в AppSetting, потому что
// это одна строка, а не сущность (тот же приём, что у текстов приложения).
export const LEGAL_REQUISITES_KEY = 'legal.requisites'
export const LEGAL_REQUISITES_DEFAULT = 'ИП Смирнов А. В. · ИНН 590772796420'

// Нормализация необязательной строки: пустая/пробельная → null.
export const normStr = (v) =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : null

export function validateSlug(slug) {
  if (typeof slug !== 'string') return 'slug обязателен'
  const s = slug.trim()
  if (s.length < 2 || s.length > LIMITS.slug) {
    return `slug: от 2 до ${LIMITS.slug} символов`
  }
  if (!SLUG_RE.test(s)) {
    return 'slug: только строчные латинские буквы, цифры и дефис'
  }
  return null
}

// Есть ли что показать пользователю. Документ без текста и без файла —
// заготовка: он не должен появляться в подвале мёртвой ссылкой.
export function hasContent(doc) {
  return !!(doc.body && doc.body.trim()) || !!doc.fileUrl
}

// Форма для списка в аппке: подвал и чекбокс регистрации. Без body —
// он может быть на сотни килобайт, а списку нужна только ссылка.
export function legalListForm(doc) {
  const isPage = !!(doc.body && doc.body.trim())
  return {
    slug: doc.slug,
    title: doc.title,
    shortTitle: doc.shortTitle || doc.title,
    // href уже готов к вставке в ссылку: внутренний роут или прямой URL PDF.
    href: isPage ? `/legal/${doc.slug}` : doc.fileUrl,
    isPage,
    version: doc.version || null,
    showInFooter: doc.showInFooter,
    showAtSignup: doc.showAtSignup,
  }
}

// Полная форма одного документа для страницы /legal/:slug.
export function legalPublicForm(doc) {
  return {
    ...legalListForm(doc),
    body: doc.body || '',
    fileUrl: doc.fileUrl || null,
    updatedAt: doc.updatedAt,
  }
}

// Форма для CMS — отдаём всё, включая служебные поля.
export function legalAdminForm(doc) {
  return {
    id: doc.id,
    slug: doc.slug,
    title: doc.title,
    shortTitle: doc.shortTitle || '',
    body: doc.body || '',
    fileUrl: doc.fileUrl || null,
    filePath: doc.filePath || null,
    version: doc.version || '',
    published: doc.published,
    showInFooter: doc.showInFooter,
    showAtSignup: doc.showAtSignup,
    order: doc.order,
    isPage: !!(doc.body && doc.body.trim()),
    hasContent: hasContent(doc),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}
