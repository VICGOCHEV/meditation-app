import test from 'node:test'
import assert from 'node:assert/strict'
import {
  hasContent,
  legalListForm,
  legalPublicForm,
  validateSlug,
} from '../src/utils/legalDocs.js'

const doc = (over = {}) => ({
  slug: 'privacy-policy',
  title: 'Политика конфиденциальности',
  shortTitle: null,
  body: '',
  fileUrl: null,
  version: null,
  published: true,
  showInFooter: true,
  showAtSignup: false,
  updatedAt: new Date('2026-08-25T00:00:00Z'),
  ...over,
})

test('validateSlug: принимает корректные, отвергает мусор', () => {
  assert.equal(validateSlug('privacy-policy'), null)
  assert.equal(validateSlug('doc2'), null)
  assert.ok(validateSlug('Privacy_Policy'))  // подчёркивание и заглавные
  assert.ok(validateSlug('-leading'))        // дефис по краям
  assert.ok(validateSlug('trailing-'))
  assert.ok(validateSlug('политика'))        // кириллица
  assert.ok(validateSlug('a'))               // короче двух символов
  assert.ok(validateSlug(undefined))
})

test('hasContent: документ без текста и без файла не показывается', () => {
  assert.equal(hasContent(doc()), false)
  assert.equal(hasContent(doc({ body: '   ' })), false)
  assert.equal(hasContent(doc({ body: 'текст' })), true)
  assert.equal(hasContent(doc({ fileUrl: '/docs/x.pdf' })), true)
})

test('режим выводится из данных: текст важнее файла', () => {
  // Только файл — ссылка ведёт прямо на PDF.
  const file = legalListForm(doc({ fileUrl: '/docs/privacy-policy.pdf' }))
  assert.equal(file.isPage, false)
  assert.equal(file.href, '/docs/privacy-policy.pdf')

  // Появился текст — документ становится страницей приложения, даже если
  // файл всё ещё приложен (его можно скачать со страницы).
  const page = legalListForm(doc({ body: 'текст', fileUrl: '/docs/privacy-policy.pdf' }))
  assert.equal(page.isPage, true)
  assert.equal(page.href, '/legal/privacy-policy')
})

test('shortTitle падает на title, когда не задан', () => {
  assert.equal(legalListForm(doc({ body: 'x' })).shortTitle, 'Политика конфиденциальности')
  assert.equal(
    legalListForm(doc({ body: 'x', shortTitle: 'Политика' })).shortTitle,
    'Политика',
  )
})

test('legalPublicForm отдаёт тело и файл', () => {
  const out = legalPublicForm(doc({ body: 'текст', fileUrl: '/cms-media/a.pdf' }))
  assert.equal(out.body, 'текст')
  assert.equal(out.fileUrl, '/cms-media/a.pdf')
  assert.equal(out.slug, 'privacy-policy')
})
