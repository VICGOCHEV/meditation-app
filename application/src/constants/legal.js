// Юридические документы — ФОЛБЭК на случай, когда бэкенд недоступен или
// приложение работает в mock-режиме.
//
// Основной источник — CMS: /api/content/legal (раздел «Юр. документы»).
// Но юр. ссылки не имеют права исчезнуть из-за сетевой ошибки: рядом с формой
// регистрации они обязательны по 152-ФЗ. Поэтому здесь лежит тот же набор
// документов, что был захардкожен до появления CMS-раздела, — три PDF из
// application/public/docs/.
//
// Зеркало на бэкенде: backend/sql/013_legal_docs.sql (сид тех же трёх
// документов) и backend/src/utils/legalDocs.js (дефолт реквизитов).

export const FALLBACK_LEGAL_DOCS = [
  {
    slug: 'user-agreement',
    title: 'Публичная оферта',
    shortTitle: 'Оферта',
    href: '/docs/user-agreement.pdf',
    isPage: false,
    version: null,
    showInFooter: true,
    showAtSignup: true,
  },
  {
    slug: 'privacy-policy',
    title: 'Политика конфиденциальности',
    shortTitle: 'Политика конфиденциальности',
    href: '/docs/privacy-policy.pdf',
    isPage: false,
    version: null,
    showInFooter: true,
    showAtSignup: true,
  },
  {
    slug: 'personal-data-consent',
    title: 'Согласие на обработку персональных данных',
    shortTitle: 'Согласие на обработку',
    href: '/docs/personal-data-consent.pdf',
    isPage: false,
    version: null,
    showInFooter: true,
    showAtSignup: true,
  },
]

export const LEGAL_REQUISITES_DEFAULT = 'ИП Смирнов А. В. · ИНН 590772796420'
