// Strapi v5 middlewares config — appends a MIME allow-list to the default
// chain. Drop at /opt/meditation-cms/config/middlewares.js.
//
// REQUIRES the matching middleware file at
//   /opt/meditation-cms/src/middlewares/mimeFilter.js
// (see cms-middleware-mimeFilter.js in this bundle).

module.exports = [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  'strapi::cors',
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
  'global::mimeFilter',
]
